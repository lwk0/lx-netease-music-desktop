import { session } from 'electron'
import { mainHandle, mainOn } from '@common/mainIpc'
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'

const CHECK_INTERVAL = 2000
const TIMEOUT = 5 * 60 * 1000

const formatCookies = (cookies: Electron.Cookie[]) => {
  return cookies.map(c => `${c.name}=${c.value}`).join('; ')
}

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

const checkCookies = async(ses: Electron.Session) => {
  try {
    const cookies = await ses.cookies.get({ url: 'https://music.163.com' })
    const musicU = cookies.find(c => c.name === 'MUSIC_U')
    if (musicU?.value) {
      stopWatcher(formatCookies(cookies))
    }
  } catch (e) {
    console.error('获取登录 Cookie 失败:', e)
  }
}

export default () => {
  // 渲染进程内嵌 <webview> 登录页通过 partition 名通知主进程开始监听该分区的 Cookie
  mainHandle<string, string | null>(WIN_MAIN_RENDERER_EVENT_NAME.netease_web_login_start, async({ params }) => {
    const partition = params
    return new Promise<string | null>((resolve) => {
      // 替换上一次监听（避免叠加）
      if (watcher != null) stopWatcher(null)
      const ses = session.fromPartition(partition)
      const timer = setInterval(() => {
        void checkCookies(ses)
      }, CHECK_INTERVAL)
      const timeoutTimer = setTimeout(() => {
        stopWatcher(null)
      }, TIMEOUT)
      watcher = { timer, timeoutTimer, resolve }
      // 立即检查一次
      void checkCookies(ses)
    })
  })

  // 渲染进程离开登录页时停止监听
  mainOn(WIN_MAIN_RENDERER_EVENT_NAME.netease_web_login_stop, () => {
    stopWatcher(null)
  })

  mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.netease_web_clear_cookie, async() => {
    try {
      // 兜底：清除主窗口 persist:win-main 中残留的网易云 Cookie
      const ses = session.fromPartition('persist:win-main')
      await ses.clearStorageData({ origin: 'https://music.163.com' })
      return true
    } catch (e) {
      console.error('清除网易云网页 Cookie 失败:', e)
      return false
    }
  })
}
