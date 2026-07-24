/* eslint-disable no-template-curly-in-string */

const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')
const builder = require('electron-builder')
const beforePack = require('./build-before-pack')
const afterPack = require('./build-after-pack')

// 定位 Windows SDK 自带的 signtool（electron-builder 内置的 2019 版 winCodeSign signtool
// 在 Windows 11 上对 AppX 签名会报 "A required function is not present"）。
function findRealSignTool() {
  if (process.env.REAL_SIGNTOOL && fs.existsSync(process.env.REAL_SIGNTOOL)) {
    return process.env.REAL_SIGNTOOL
  }
  // 标准 Windows 10/11 SDK 安装路径
  const kits = 'C:/Program Files (x86)/Windows Kits/10/bin'
  if (fs.existsSync(kits)) {
    const dirs = fs
      .readdirSync(kits)
      .filter((d) => /^10\./.test(d))
      .sort()
      .reverse()
    for (const d of dirs) {
      const p = path.join(kits, d, 'x64', 'signtool.exe')
      if (fs.existsSync(p)) return p
    }
  }
  // NuGet microsoft.windows.sdk.buildtools（部分沙箱/CI 环境）
  const nuget = 'C:/Users/lwk/.nuget/packages/microsoft.windows.sdk.buildtools'
  if (fs.existsSync(nuget)) {
    const vers = fs.readdirSync(nuget).sort().reverse()
    for (const v of vers) {
      const p = path.join(nuget, v, 'bin', '10.0.28000.0', 'x64', 'signtool.exe')
      if (fs.existsSync(p)) return p
    }
  }
  return null
}

// 自定义签名函数：接管 electron-builder 默认的 AppX/EXE 签名。
// 使用 Windows SDK 自带的 signtool；在 ELECTRON_BUILDER_OFFLINE=true 或 LX_STRIP_TS=1 时，
// computeSignToolArgs 已不含时间戳参数（沙箱/离线环境无法访问时间戳服务器时必需）。
function customCodeSign(configuration, packager) {
  // 允许通过 SKIP_SIGN=1 跳过签名（用于无 Windows SDK 环境下产出未签名包）
  if (process.env.SKIP_SIGN === '1') {
    console.log('[customCodeSign] SKIP_SIGN=1，跳过签名')
    return
  }
  const real = findRealSignTool()
  if (!real) {
    throw new Error(
      '[customCodeSign] 未找到 Windows SDK 的 signtool.exe，请安装 Windows 10/11 SDK，或通过 REAL_SIGNTOOL 环境变量指定，或设置 SKIP_SIGN=1 跳过签名'
    )
  }
  const isWin = process.platform === 'win32'
  let args = configuration.computeSignToolArgs(isWin)
  // 新版 Windows SDK 的 signtool 必须显式指定文件摘要算法，否则报
  // "No file digest algorithm specified"。electron-builder 26.x 的
  // computeSignToolArgs 在某些配置下不会带 /fd，这里防御性补齐。
  if (!args.includes('/fd')) {
    const trIndex = args.indexOf('/tr')
    // 放在时间戳服务器参数之前（/fd 必须先于 /tr 生效），其余情况放在文件参数之前
    const insertAt = trIndex > -1 ? trIndex : args.length - 1
    args.splice(insertAt, 0, '/fd', 'SHA256')
    // 若带 RFC3161 时间戳，补充时间戳自身的摘要算法
    if (trIndex > -1 && !args.includes('/td')) {
      args.splice(args.length - 1, 0, '/td', 'SHA256')
    }
  }
  // 防御性剥离时间戳参数（部分 electron-builder 版本在离线判断上有差异）
  if (process.env.ELECTRON_BUILDER_OFFLINE === 'true' || process.env.LX_STRIP_TS) {
    args = args.filter((a, i) => {
      if (a === '/tr' || a === '/td' || a === '/t') return false
      if (i > 0 && (args[i - 1] === '/tr' || args[i - 1] === '/td' || args[i - 1] === '/t')) return false
      return true
    })
  }
  const r = spawnSync(real, args, { stdio: 'inherit', windowsHide: true })
  if (r.status !== 0) {
    throw new Error(`[customCodeSign] signtool 退出码 ${r.status}`)
  }
}

/**
* @type {import('electron-builder').Configuration}
* @see https://www.electron.build/configuration/configuration
*/
const options = {
  appId: 'cn.lwk0.lxneteasemusic.desktop',
  productName: 'LX-N Music',
  beforePack,
  afterPack,
  protocols: {
    name: 'lx-music-protocol',
    schemes: [
      'lxmusic',
    ],
  },
  directories: {
    buildResources: './resources',
    output: './build',
  },
  files: [
    '!node_modules/**/*',
    'node_modules/font-list',
    'node_modules/better-sqlite3/lib',
    'node_modules/better-sqlite3/package.json',
    'node_modules/better-sqlite3/build/Release/better_sqlite3.node',
    // 本地测试临时移除：electron-font-manager 未安装（fontManage.ts 已改用 font-list）
    // 'node_modules/electron-font-manager/index.js',
    // 'node_modules/electron-font-manager/package.json',
    // 'node_modules/electron-font-manager/build/Release/font_manager.node',
    'node_modules/node-gyp-build',
    'node_modules/bufferutil',
    'node_modules/utf-8-validate',
    'build/Release/qrc_decode.node',
    'dist/**/*',
  ],
  asar: {
    smartUnpack: false,
  },
  // 显式解包所有原生模块（.node），否则它们会被打进 app.asar 导致运行时 dlopen 失败
  asarUnpack: ['**/*.node'],
  // 默认行为：由 electron-builder 自动重建原生模块；当环境无 Visual Studio 时可通过 SKIP_NPM_REBUILD=1 跳过
  npmRebuild: !process.env.SKIP_NPM_REBUILD,
  buildDependenciesFromSource: false,
  extraResources: [
    './licenses',
  ],
  publish: [
    {
      provider: 'github',
      owner: 'lwk0',
      repo: 'lx-netease-music-desktop',
    },
  ],
}
/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const winOptions = {
  win: {
    icon: './resources/icons/icon.ico',
    legalTrademarks: 'lwk0',
    // 代码签名证书（同时用于 NSIS 安装包与 APPX 包签名），密码 123456，可用环境变量覆盖
    signtoolOptions: {
      certificateFile: process.env.MSIX_CERT_FILE || './cer/lwk-sign.pfx',
      certificatePassword: process.env.MSIX_CERT_PASSWORD || '123456',
      // 自定义签名函数：使用 Windows SDK 自带的 signtool（内置 2019 版在 Win11 上签 AppX 会报
      // "A required function is not present"）。构建时请设置 ELECTRON_BUILDER_OFFLINE=true 以跳过
      // 时间戳服务器（自签名证书离线/沙箱环境无需时间戳；联网机器可去掉该变量以保留时间戳）。
      sign: customCodeSign,
    },
    // artifactName: '${productName}-v${version}-${env.ARCH}-${env.TARGET}.${ext}',
  },
  // APPX / MSIX 打包
  // 注意：electron-builder 26.x 已移除独立的 msix 目标，仅保留 appx 目标，
  // 其产出的 .appx 容器在封装格式上与 MSIX 一致（可改名 .msix 或配合 Windows 10 SDK 的 MakeAppx 进一步处理）。
  // 需要本机安装 Windows 10 SDK（MakeAppx.exe / SignTool.exe 在 PATH 中）。
  appx: {
    // publisher 必须与签名证书 Subject 严格一致（MakeAppx 校验 + SignTool 签名都依赖它）。
    // 证书 Subject 为 C=CN, O=lwk, CN=lwk，必须按此顺序书写，否则 MakeAppx 报 DN 格式错误。
    publisher: 'C=CN, O=lwk, CN=lwk',
    identityName: 'lx-netease-music-desktop',
    // applicationId 必须是点分、字母开头、不含连字符（与 identityName 的连字符不兼容），故显式指定
    applicationId: 'lx.netease.music.desktop',
    displayName: 'LX-N Music',
    publisherDisplayName: 'lwk0',
  },
  nsis: {
    oneClick: false,
    language: '2052',
    allowToChangeInstallationDirectory: true,
    // differentialPackage: true,
    license: './licenses/license.rtf',
    shortcutName: 'LX-N Music',
  },
}

// CI 环境（如 GitHub Actions）默认没有代码签名证书（cer/lwk-sign.pfx 已被 .gitignore 排除），
// 此时不要启用 Windows 签名，否则 customCodeSign 会因找不到证书而让打包失败。
// 只有证书文件存在时才保留 signtoolOptions；也可通过 CODESIGN_PFX secret 在 CI 上注入证书后自动生效。
const winCertFile = process.env.MSIX_CERT_FILE || './cer/lwk-sign.pfx'
if (!fs.existsSync(winCertFile)) {
  delete winOptions.win.signtoolOptions
}
/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const linuxOptions = {
  linux: {
    maintainer: 'lwk0',
    // artifactName: '${productName}-${version}.${env.ARCH}.${ext}',
    icon: './resources/icons',
    category: 'Utility;AudioVideo;Audio;Player;Music;',
    desktop: {
      // https://www.electron.build/app-builder-lib.interface.linuxdesktopfile
      // https://www.electronjs.org/docs/latest/tutorial/linux-desktop-actions
      // https://specifications.freedesktop.org/desktop-entry-spec/latest/example.html
      // https://developer.gnome.org/documentation/guidelines/maintainer/integrating.html#desktop-files
      entry: {
        Name: 'LX Music',
        'Name[zh_CN]': 'LX Music',
        'Name[zh_TW]': 'LX Music',
        Encoding: 'UTF-8',
        MimeType: 'x-scheme-handler/lxmusic',
        StartupNotify: 'false',
      },
    },
  },
  appImage: {
    license: './licenses/license_zh.txt',
    category: 'Utility;AudioVideo;Audio;Player;Music;',
  },
}
/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const macOptions = {
  mac: {
    icon: './resources/icons/icon.icns',
    category: 'public.app-category.music',
    // artifactName: '${productName}-${version}.${ext}',
  },
  dmg: {
    window: {
      width: 530,
      height: 380,
    },
    contents: [
      {
        x: 140,
        y: 200,
      },
      {
        x: 390,
        y: 200,
        type: 'link',
        path: '/Applications',
      },
    ],
    title: 'LX Music v${version}',
  },
}

// win: {
// tagret: {
//   setup: ['nsis', '${productName}-v${version}-${env.ARCH}-Setup.${ext}'],
//   green: ['7z', '${productName}-v${version}-${env.ARCH}-green.${ext}'],
//   portable: ['portable', '${productName}-v${version}-${env.ARCH}-portable.${ext}'],
// },
// },
// linux: {
// platform: Platform.WINDOWS,
// arch: {
//   x64: builder.Arch.x64,
//   arm64: builder.Arch.arm64,
//   armv7l: builder.Arch.armv7l,
// },
// tagret: {
//   deb: ['deb', '${productName}_${version}_${env.ARCH}.${ext}'],
//   appImage: ['AppImage', '${productName}_${version}_${env.ARCH}.${ext}'],
//   pacman: ['pacman', '${productName}_${version}_${env.ARCH}.${ext}'],
//   rpm: ['rpm', '${productName}-${version}.${env.ARCH}.${ext}'],
// },
// },
// mac: {
// arch: {
//   x64: builder.Arch.x64,
//   x86: builder.Arch.ia32,
//   arm64: builder.Arch.arm64,
// },
// tagret: {
//   dmg: ['dmg', '${productName}-${version}-${env.ARCH}.${ext}'],
// },
// },

const createTarget = {
  /**
   *
   * @param {*} arch
   * @param {*} packageType
   * @returns {{ buildOptions: import('electron-builder').CliOptions, options: import('electron-builder').Configuration }}
   */
  win(arch, packageType) {
    switch (packageType) {
      case 'setup':
        winOptions.artifactName = `\${productName}-v\${version}-${arch}-Setup.\${ext}`
        return {
          buildOptions: { win: ['nsis'] },
          options: winOptions,
        }
      case 'green':
        winOptions.artifactName = `\${productName}-v\${version}-win_${arch}-green.\${ext}`
        return {
          buildOptions: { win: ['7z'] },
          options: winOptions,
        }
      case 'win7_setup':
        winOptions.artifactName = `\${productName}-v\${version}-win7_${arch}-Setup.\${ext}`
        return {
          buildOptions: { win: ['nsis'] },
          options: winOptions,
        }
      case 'win7_green':
        winOptions.artifactName = `\${productName}-v\${version}-win7_${arch}-green.\${ext}`
        return {
          buildOptions: { win: ['7z'] },
          options: winOptions,
        }
      case 'portable':
        winOptions.artifactName = `\${productName}-v\${version}-${arch}-portable.\${ext}`
        return {
          buildOptions: { win: ['portable'] },
          options: winOptions,
        }
      case 'msix':
        // electron-builder 26.x 已无独立 msix 目标，使用 appx 目标产出 MSIX 兼容的 .appx 容器
        winOptions.artifactName = `\${productName}-v\${version}-${arch}-msix.\${ext}`
        return {
          buildOptions: { win: ['appx'] },
          options: winOptions,
        }
      default: throw new Error('Unknown package type: ' + packageType)
    }
  },
  /**
   *
   * @param {*} arch
   * @param {*} packageType
   * @returns {{ buildOptions: import('electron-builder').CliOptions, options: import('electron-builder').Configuration }}
   */
  linux(arch, packageType) {
    switch (packageType) {
      case 'deb':
        linuxOptions.artifactName = `\${productName}_\${version}_${arch == 'x64' ? 'amd64' : arch}.\${ext}`
        return {
          buildOptions: { linux: ['deb'] },
          options: linuxOptions,
        }
      case 'appImage':
        linuxOptions.artifactName = `\${productName}_\${version}_${arch}.\${ext}`
        return {
          buildOptions: { linux: ['AppImage'] },
          options: linuxOptions,
        }
      case 'pacman':
        linuxOptions.artifactName = `\${productName}_\${version}_${arch}.\${ext}`
        return {
          buildOptions: { linux: ['pacman'] },
          options: linuxOptions,
        }
      case 'rpm':
        linuxOptions.artifactName = `\${productName}-\${version}.${arch}.\${ext}`
        return {
          buildOptions: { linux: ['rpm'] },
          options: linuxOptions,
        }
      default: throw new Error('Unknown package type: ' + packageType)
    }
  },
  /**
   *
   * @param {*} arch
   * @param {*} packageType
   * @returns {{ buildOptions: import('electron-builder').CliOptions, options: import('electron-builder').Configuration }}
   */
  mac(arch, packageType) {
    switch (packageType) {
      case 'dmg':
        macOptions.artifactName = `\${productName}-\${version}-${arch}.\${ext}`
        return {
          buildOptions: { mac: ['dmg'] },
          options: macOptions,
        }
      default: throw new Error('Unknown package type: ' + packageType)
    }
  },
}

/**
 *
 * @param {'win' | 'mac' | 'linux' | 'dir'} target 构建目标平台
 * @param {'x86_64' | 'x64' | 'x86' | 'arm64' | 'armv7l'} arch 包架构
 * @param {*} packageType 包类型
 * @param {'onTagOrDraft' | 'always' | 'never'} publishType 发布类型
 */
const build = async(target, arch, packageType, publishType) => {
  if (target == 'dir') {
    await builder.build({
      dir: true,
      config: { ...options, ...winOptions, ...linuxOptions, ...macOptions },
    })
    return
  }
  const targetInfo = createTarget[target](arch, packageType)
  // Promise is returned
  await builder.build({
    ...targetInfo.buildOptions,
    publish: publishType ?? 'never',
    x64: arch == 'x64' || arch == 'x86_64',
    ia32: arch == 'x86' || arch == 'x86_64',
    arm64: arch == 'arm64',
    armv7l: arch == 'armv7l',
    config: { ...options, ...targetInfo.options },
  })
  // .then((result) => {
  //   console.log(JSON.stringify(result))
  // })
  // .catch((error) => {
  //   console.error(error)
  // })
}

const params = {}

for (const param of process.argv.slice(2)) {
  const [name, value] = param.split('=')
  params[name] = value
}

if (params.target == null) throw new Error('Missing target')
if (params.target != 'dir' && params.arch == null) throw new Error('Missing arch')
if (params.target != 'dir' && params.type == null) throw new Error('Missing type')

console.log(params.target, params.arch, params.type, params.publish ?? '')
build(params.target, params.arch, params.type, params.publish)
