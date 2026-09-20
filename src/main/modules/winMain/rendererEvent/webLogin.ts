import { session } from 'electron'
import { mainHandle } from '@common/mainIpc'
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { openNeteaseLoginWindow, closeNeteaseLoginWindow } from '../neteaseLoginWindow'

export default () => {
  // 触发主进程打开一个独立的网易云登录窗口（不再使用内嵌 webview）。
  // 返回值：成功登录后的 Cookie 字符串；用户取消 / 超时返回 null。
  mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.netease_open_login_window, async() => {
    return openNeteaseLoginWindow()
  })

  // 主动关闭已打开的网易云登录窗口（备用入口，预留接口）
  mainHandle(WIN_MAIN_RENDERER_EVENT_NAME.netease_web_clear_cookie, async() => {
    closeNeteaseLoginWindow()
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
