import { BrowserWindow, session } from 'electron'
import { getTheme } from '../../utils'
import { closeOAuthWindow, setOAuthWindow } from './neteaseOAuth'

// 通过 Cookie 轮询听登录成功。返回的 Promise：
//   - resolve(cookieString)  登录成功（拿到 MUSIC_U）
//   - resolve(null)          超时 / partition 上不存在 MUSIC_U / 登录窗口被手动关
const CHECK_INTERVAL = 2000
const TIMEOUT = 5 * 60 * 1000

interface Watcher {
  timer: ReturnType<typeof setInterval>
  timeoutTimer: ReturnType<typeof setTimeout>
  resolve: (value: string | null) => void
}

let watcher: Watcher | null = null

const stopWatcher = (resolveValue: string | null) => {
  if (watcher == null) return
  const { timer, timeoutTimer, resolve } = watcher
  clearInterval(timer)
  clearTimeout(timeoutTimer)
  watcher = null
  resolve(resolveValue)
}

const formatCookies = (cookies: Electron.Cookie[]) => {
  return cookies.map(c => `${c.name}=${c.value}`).join('; ')
}

const checkCookies = async(ses: Electron.Session, onSuccess: (cookie: string) => void) => {
  try {
    const cookies = await ses.cookies.get({ url: 'https://music.163.com' })
    const musicU = cookies.find(c => c.name === 'MUSIC_U')
    if (musicU?.value) {
      onSuccess(formatCookies(cookies))
    }
  } catch (e) {
    console.error('[LX netease] check cookies failed:', e)
  }
}

// 监听指定 partition 上的网易云登录 Cookie。返回 Promise：
//   - 拿到 MUSIC_U → resolve(cookieString) 并自动清理监听
//   - 超时 / partition 不存在 → resolve(null)
// 单实例：同时只允许一个 watcher，旧 watcher 被静默取代（resolve(null)）。
export const watchNeteaseCookies = async(
  partition: string,
): Promise<string | null> => {
  return new Promise<string | null>((resolve) => {
    if (watcher != null) {
      // 兜底：上一轮还在时直接终止
      stopWatcher(null)
    }
    let ses: Electron.Session
    try {
      ses = session.fromPartition(partition)
    } catch (e) {
      console.error('[LX netease] invalid partition', partition, e)
      resolve(null)
      return
    }
    const onSuccess = (cookie: string) => { stopWatcher(cookie) }
    const timer = setInterval(() => {
      void checkCookies(ses, onSuccess).catch(() => {})
    }, CHECK_INTERVAL)
    const timeoutTimer = setTimeout(() => {
      console.warn('[LX netease] login watcher timeout (5min)')
      stopWatcher(null)
    }, TIMEOUT)
    watcher = { timer, timeoutTimer, resolve }
    // 立即检查一次（如果分区已残留旧 Cookie 则直接成功）
    void checkCookies(ses, onSuccess).catch(() => {})
  })
}

export const stopNeteaseCookieWatch = () => {
  if (watcher == null) return
  stopWatcher(null)
}

// 滚动条样式与主进程 app.ts 中历史实现保持一致：6px、track 浅绿 0.2、thumb 主色绿 0.4 / hover 0.6。
// 颜色取当前主题的 CSS 变量，颜色不对则用绿色兜底（theme 尚未初始化时不阻塞）。
const buildScrollbarCss = (): string => {
  let track = 'rgba(113, 191, 150, 0.20)'
  let thumb = 'rgba(77, 175, 124, 0.40)'
  let thumbHover = 'rgba(77, 175, 124, 0.60)'
  try {
    const colors = getTheme().theme.colors
    if (typeof colors === 'object' && colors) {
      const t = colors['--color-primary-light-100-alpha-800']
      const p = colors['--color-primary-alpha-600']
      const ph = colors['--color-primary-alpha-400']
      if (typeof t === 'string' && t) track = t
      if (typeof p === 'string' && p) thumb = p
      if (typeof ph === 'string' && ph) thumbHover = ph
    }
  } catch {}
  return [
    '::-webkit-scrollbar{width:6px !important;height:6px !important;background-color:rgba(0,0,0,0) !important;-webkit-appearance:none !important;}',
    '*::-webkit-scrollbar{width:6px !important;height:6px !important;background-color:rgba(0,0,0,0) !important;-webkit-appearance:none !important;}',
    `::-webkit-scrollbar-track,*::-webkit-scrollbar-track{background-color:${track} !important;border-radius:3px !important;}`,
    `::-webkit-scrollbar-thumb,*::-webkit-scrollbar-thumb{border-radius:3px !important;background-color:${thumb} !important;transition:background-color .4s ease;}`,
    `::-webkit-scrollbar-thumb:hover,*::-webkit-scrollbar-thumb:hover{background-color:${thumbHover} !important;}`,
    '::-webkit-scrollbar-corner,*::-webkit-scrollbar-corner{background-color:rgba(0,0,0,0) !important;}',
  ].join('')
}

// 网易云登录页清理：隐藏顶部导航 / 底部播放器 / 下载广告等；不删 DOM。
// 跨域子 frame 的样式同样由主进程 webFrameMain.executeJavaScript 注入。
const buildLoginCss = (): string => [
  '#g_top,.m-top,#g_nav,.m-subnav,.g-ft,.m-ft,footer,.m-download,.m-banner,.m-hd,.g-hd,.m-playbar{display:none !important;}',
  '#login-wrapper,.g-bd{padding-top:0 !important;margin-top:0 !important;}',
  'html,body{padding-top:0 !important;margin-top:0 !important;}',
  buildScrollbarCss(),
].join('')

// 创建 <style> 节点用的微脚本（按 id 幂等去重），用于跨域子 frame 注入。
// 主 frame 已用 insertCSS 覆盖，跨域 iframe 才走这一段。
const buildFrameStyleJs = (css: string) =>
  ';(function(){var o=document.getElementById("lx-login-css");if(o)o.remove();' +
  'var s=document.createElement("style");s.id="lx-login-css";s.textContent=' +
  JSON.stringify(css) +
  ';(document.head||document.documentElement).appendChild(s)})()'

// 给子窗口（QQ/微信/微博 OAuth 弹窗）注入 LX 风格滚动条 + 清理必要元素。
const buildPopupCss = (): string => [
  // 第三方登录页（QQ / 微信 / 微博）的滚动条统一风格
  buildScrollbarCss(),
].join('')

interface OpenOptions {
  // 已经被另一组入口（e.g. 自动登录尝试）打开时，是否仍重新打开
  force?: boolean
}

// 打开网易云独立登录窗口。返回：
//   - Promise<string>        登录成功，value 为 Cookie 字符串
//   - Promise<null>          用户手动关闭登录窗口 / 超时 / 重新打开被 force=false 拒绝
//
// partition 使用临时非持久化名称，每次打开都换新的，避免自动复用旧账号。
let currentLoginWin: BrowserWindow | null = null

const LOGIN_URL = 'https://music.163.com/login'

export const openNeteaseLoginWindow = async(opts: OpenOptions = {}): Promise<string | null> => {
  // 已有登录窗口存活：force=false 时聚焦并拒（视为用户点过两次）。
  if (!opts.force && currentLoginWin && !currentLoginWin.isDestroyed()) {
    if (currentLoginWin.isMinimized()) currentLoginWin.restore()
    currentLoginWin.focus()
    return Promise.resolve(null)
  }
  // 强制重开时关掉旧 window
  if (currentLoginWin && !currentLoginWin.isDestroyed()) {
    try { currentLoginWin.close() } catch {}
  }
  currentLoginWin = null
  stopNeteaseCookieWatch()

  const partition = `netease-login-window-${Date.now()}`

  const win = new BrowserWindow({
    title: '网易云登录',
    width: 920,
    height: 720,
    autoHideMenuBar: true,
    backgroundColor: '#fff',
    webPreferences: {
      partition,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  })
  currentLoginWin = win
  setOAuthWindow(win)

  // 注入 Login 清理 CSS：主 frame 用 insertCSS（author + user 两种 origin），
  // 跨域子 frame 用 executeJavaScript 建 <style>（按 id 幂等）。
  const injectLoginCss = () => {
    if (win.isDestroyed() || win.webContents.isDestroyed()) return
    const css = buildLoginCss()
    void win.webContents.insertCSS(css).catch(() => {})
    void win.webContents.insertCSS(css, { cssOrigin: 'user' }).catch(() => {})
    let frames: Electron.WebFrameMain[] = []
    try { frames = win.webContents.mainFrame.framesInSubtree } catch {}
    const frameJs = buildFrameStyleJs(css)
    for (const frame of frames) {
      if (!frame.url || !/^https?:/i.test(frame.url)) continue
      void frame.executeJavaScript(frameJs, false).catch(() => {})
    }
  }

  // window.open 在登录页内被触发（点 QQ / 微信 / 微博 等第三方登录）。
  // 直接用默认 OAuth 弹窗：partition 继承自父（did-create-window 的 webContents 默认继承父 webContents 的 partition）。
  // 不再叠加防堆叠 / 跨域 iframe 点击转发这些逻辑，让 NetEase 自己处理 OAuth 流程。
  win.webContents.setWindowOpenHandler(() => ({ action: 'allow' as const }))

  // did-create-window：给 OAuth 弹窗注入滚动条样式 + 简单的关闭清理。
  win.webContents.on('did-create-window', (newWin) => {
    setOAuthWindow(newWin)
    const inject = () => {
      if (newWin.isDestroyed() || newWin.webContents.isDestroyed()) return
      const css = buildPopupCss()
      void newWin.webContents.insertCSS(css).catch(() => {})
      void newWin.webContents.insertCSS(css, { cssOrigin: 'user' }).catch(() => {})
    }
    newWin.webContents.on('dom-ready', inject)
    newWin.webContents.on('did-navigate', inject)
    newWin.webContents.on('did-finish-load', inject)
    // OAuth 关闭时清掉引用（独立登录窗口由主登录窗口的 close 处理）
    newWin.on('closed', () => {
      setOAuthWindow(null)
    })
  })

  // did-create-window：给 OAuth 弹窗注入滚动条样式。OAuth 弹窗由 did-create-window
  // 默认继承父 webContents 的 partition（均无 `persist:` 前缀 → 同 in-memory session），
  // 因此 Cookie 自然落在同 session，watcher 的轮询可捕获。
  win.webContents.on('dom-ready', injectLoginCss)
  win.webContents.on('did-navigate', injectLoginCss)
  win.webContents.on('did-navigate-in-page', injectLoginCss)
  win.webContents.on('did-finish-load', injectLoginCss)

  void win.loadURL(LOGIN_URL).catch((err) => {
    console.error('[LX netease] load login url failed:', err)
  })

  return new Promise<string | null>((resolve) => {
    let settled = false
    const settle = (value: string | null) => {
      if (settled) return
      settled = true
      stopNeteaseCookieWatch()
      // 登录成功 / 用户主动取消时，统一关掉 OAuth 弹窗（QQ/微信/微博等的回调页），
      // 避免 OAuth 弹窗停留在屏幕上变成白屏。
      closeOAuthWindow()
      if (currentLoginWin === win) currentLoginWin = null
      if (!win.isDestroyed()) {
        try { win.close() } catch {}
      }
      resolve(value)
    }

    // 登录成功分支：watcher 拿 cookie 后关 OAuth + 登录窗口
    watchNeteaseCookies(partition).then((cookie) => {
      if (cookie) settle(cookie)
      // settle(null) 由用户手动关闭 win.closed 触发，避免重复
    }).catch((err) => {
      console.error('[LX netease] watch cookies failed', err)
    })

    // 用户手动关窗 = 取消登录
    win.on('closed', () => {
      settle(null)
    })

    // 兜底：8 分钟内未登录成功也强制结束（watcher 内部 5 分钟就会超时）
    setTimeout(() => {
      if (!settled) settle(null)
    }, 8 * 60 * 1000)
  })
}

// 暴露 IPC 给 renderer 端"网页登录"按钮触发
export const closeNeteaseLoginWindow = () => {
  if (currentLoginWin && !currentLoginWin.isDestroyed()) {
    try { currentLoginWin.close() } catch {}
  }
  currentLoginWin = null
}
