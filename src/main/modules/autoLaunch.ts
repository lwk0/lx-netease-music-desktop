import { app } from 'electron'
import { isWin, isAppx } from '@common/utils'

// 开机自启动（Windows 登录后自动运行）。
// - 传统 NSIS / 便携版：electron 的 app.setLoginItemSettings 通过注册表 Run 键实现，可靠。
// - APPX / MSIX：setLoginItemSettings 指向虚拟化 exe 路径无效，必须在 Windows 设置 →
//   应用 → 启动 中手动开启（或由带 windows.startup 能力的 StartupTask 实现）。本模块对
//   APPX 直接跳过，由渲染端设置页禁用开关并给出提示。
const AUTO_LAUNCH_KEY = 'common.autoLaunch'

export default () => {
  const apply = (openAtLogin: boolean) => {
    if (!isWin || isAppx) return
    // --hidden 让开机自启时直接最小化到系统托盘，避免弹窗；
    // 若托盘被禁用，主进程会在启动时强制开启托盘（见 main/utils 的 hidden 处理），不会“隐身”。
    app.setLoginItemSettings({
      openAtLogin,
      path: process.execPath,
      args: openAtLogin ? ['--hidden'] : [],
    })
  }

  // 初始化时按当前设置应用一次（global.lx.appSetting 此时已就绪）
  apply(Boolean(global.lx.appSetting[AUTO_LAUNCH_KEY]))

  global.lx.event_app.on('updated_config', (keys: Array<keyof LX.AppSetting>) => {
    if (keys.includes(AUTO_LAUNCH_KEY as keyof LX.AppSetting)) {
      apply(Boolean(global.lx.appSetting[AUTO_LAUNCH_KEY]))
    }
  })
}
