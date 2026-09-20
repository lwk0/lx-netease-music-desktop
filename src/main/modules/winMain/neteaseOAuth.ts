import { BrowserWindow } from 'electron'

let oauthWin: BrowserWindow | null = null

export const setOAuthWindow = (win: BrowserWindow | null) => {
  oauthWin = win
}

export const closeOAuthWindow = () => {
  if (!oauthWin || oauthWin.isDestroyed()) return
  try {
    oauthWin.close()
  } catch (e) {
    console.warn('[LX netease] close oauth window failed', e)
  }
  oauthWin = null
}

// 创建 OAuth 第三方登录弹窗（QQ/微信/微博等 window.open 触发）。
// 不再叠加任何防堆叠逻辑：开窗直接走默认 Electron 行为，让 NetEase 自己处理 OAuth state。
// 窗口被关闭时自动 setOAuthWindow(null)，下次点第三方登录会重新开。
// 不能指定 partition：用户从哪个登录窗口点开 OAuth，Cookie 就应该落在那个窗口的 session。
// 调用方如需调整 webPreferences，通过 options 参数传入。
export const createOAuthPopupWindow = (
  options: Electron.BrowserWindowConstructorOptions = {},
): BrowserWindow => {
  const win = new BrowserWindow({
    show: true,
    width: 520,
    height: 720,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
    ...options,
  })
  setOAuthWindow(win)
  win.on('closed', () => {
    if (oauthWin === win) setOAuthWindow(null)
  })
  return win
}
