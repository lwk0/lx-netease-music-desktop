import log from 'electron-log/node'


export const isLinux = process.platform == 'linux'
export const isWin = process.platform == 'win32'
export const isMac = process.platform == 'darwin'
export const isProd = process.env.NODE_ENV == 'production'

// 是否以 APPX / MSIX（Windows 应用包）形式安装。
// APPX 的 exe 位于 C:\Program Files\WindowsApps\<Package>...\ 下，
// 该路径可可靠区分传统 NSIS/便携版安装。APPX 不支持 electron-updater 的
// quitAndInstall 自更新，也不支持 app.setLoginItemSettings 的开机自启动，
// 相关功能需走 Windows 设置或手动覆盖安装。
export const isAppx = isWin && process.execPath.toLowerCase().includes('windowsapps')

export const getPlatform = (platform: NodeJS.Platform = process.platform) => {
  switch (platform) {
    case 'win32': return 'windows'
    case 'darwin': return 'mac'
    default: return 'linux'
  }
}


// https://stackoverflow.com/a/53387532
export function compareVer(currentVer: string, targetVer: string): -1 | 0 | 1 {
  // treat non-numerical characters as lower version
  // replacing them with a negative number based on charcode of each character
  const fix = (s: string) => `.${s.toLowerCase().charCodeAt(0) - 2147483647}.`

  const currentVerArr: Array<string | number> = ('' + currentVer).replace(/[^0-9.]/g, fix).split('.')
  const targetVerArr: Array<string | number> = ('' + targetVer).replace(/[^0-9.]/g, fix).split('.')
  let c = Math.max(currentVerArr.length, targetVerArr.length)
  for (let i = 0; i < c; i++) {
    // convert to integer the most efficient way
    currentVerArr[i] = ~~currentVerArr[i]
    targetVerArr[i] = ~~targetVerArr[i]
    if (currentVerArr[i] > targetVerArr[i]) return 1
    else if (currentVerArr[i] < targetVerArr[i]) return -1
  }
  return 0
}


export {
  log,
}

export * from './common'
