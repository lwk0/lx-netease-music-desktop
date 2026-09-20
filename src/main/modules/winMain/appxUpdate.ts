import { app, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { mainOn } from '@common/mainIpc'
import { isExistWindow, sendEvent } from './index'
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { log, isWin, isAppx } from '@common/utils'

// APPX / MSIX 版本的“半自动”更新：
// APPX 无法像 NSIS 那样用 electron-updater 的 quitAndInstall 自更新（安装目录只读、包由系统部署服务托管），
// 因此改为：从 GitHub Releases 下载新版 APPX 到用户「下载」目录，再调用系统默认方式打开安装包，
// 用户点击安装即可完成覆盖升级（证书受信任时为原地升级，保留数据、无需卸载）。
//
// 安全说明：这里只访问公开仓库的 Releases API，**不携带任何令牌**。
// 绝不可把个人访问令牌（PAT）写入应用源码——它会被打进安装包并泄露给所有使用者。

const OWNER = 'lwk0'
const REPO = 'lx-netease-music-desktop'
const API_HOST = 'api.github.com'

interface AppxAssetInfo {
  version: string
  url: string
  size: number
  name: string
}

const userAgent = () => `LX-N-Music/${app.getVersion()}`

const httpsGetJson = async(pathname: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const req = https.get(
      {
        host: API_HOST,
        path: pathname,
        headers: {
          // GitHub API 要求带 UA
          'User-Agent': userAgent(),
          Accept: 'application/vnd.github+json',
        },
        timeout: 15000,
      },
      (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          res.resume()
          reject(new Error(`GitHub API 返回 ${res.statusCode}`))
          return
        }
        let data = ''
        res.setEncoding('utf-8')
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)))
          }
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy(new Error('GitHub API 请求超时'))
    })
  })
}

// 根据当前架构挑选匹配的 APPX 资源名，例如 LX-N.Music-v1.0.1-x64-msix.appx
const pickAppxAsset = (assets: any[], arch: string): any | null => {
  if (!Array.isArray(assets)) return null
  const keyword = arch == 'arm64' ? 'arm64' : arch == 'x64' ? 'x64' : 'x86'
  return (
    assets.find(a => typeof a?.name == 'string' && a.name.endsWith('.appx') && a.name.includes(keyword)) ??
    assets.find(a => typeof a?.name == 'string' && a.name.endsWith('.appx')) ??
    null
  )
}

const getLatestAppxInfo = async(): Promise<AppxAssetInfo> => {
  const release = await httpsGetJson(`/repos/${OWNER}/${REPO}/releases/latest`)
  const arch = process.arch == 'arm64' ? 'arm64' : process.arch == 'ia32' ? 'x86' : 'x64'
  const asset = pickAppxAsset(release?.assets, arch)
  if (!asset?.browser_download_url) throw new Error('发布中没有找到 APPX 安装包')
  return {
    version: String(release.tag_name ?? '').replace(/^v/, ''),
    url: asset.browser_download_url as string,
    size: Number(asset.size ?? 0),
    name: asset.name as string,
  }
}

const downloadFile = async(url: string, destPath: string, onProgress: (percent: number) => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = (redirectCount: number): void => {
      if (redirectCount > 5) {
        reject(new Error('下载重定向次数过多'))
        return
      }
      const req = https.get(url, { headers: { 'User-Agent': userAgent() } }, (res) => {
        // GitHub 下载会 302 到对象存储，需跟随重定向
        if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume()
          request(redirectCount + 1)
          return
        }
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`下载失败，HTTP ${res.statusCode}`))
          return
        }
        const total = Number(res.headers['content-length'] ?? 0)
        let received = 0
        const fileStream = fs.createWriteStream(destPath)
        res.on('data', (chunk) => {
          received += chunk.length
          if (total) onProgress(Math.min(100, (received / total) * 100))
        })
        res.pipe(fileStream)
        fileStream.on('finish', () => {
          fileStream.close(() => {
            resolve()
          })
        })
        fileStream.on('error', (err) => {
          fileStream.close()
          reject(err)
        })
        res.on('error', reject)
      })
      req.on('error', reject)
    }
    request(0)
  })
}

let isDownloading = false

const runDownload = async(): Promise<void> => {
  const sendProgress = (percent: number) => {
    if (isExistWindow()) sendEvent(WIN_MAIN_RENDERER_EVENT_NAME.update_appx_progress, { percent })
  }
  const sendError = (message: string) => {
    if (isExistWindow()) sendEvent(WIN_MAIN_RENDERER_EVENT_NAME.update_appx_error, { message })
  }

  try {
    log.info('[appxUpdate] 获取最新 APPX 信息...')
    const info = await getLatestAppxInfo()
    const dir = app.getPath('downloads')
    const destPath = path.join(dir, info.name)

    // 已存在同名文件则先删除，避免写入失败或装到旧包
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath)
    }

    log.info(`[appxUpdate] 开始下载 ${info.url} -> ${destPath}`)
    await downloadFile(info.url, destPath, sendProgress)

    if (isExistWindow()) {
      sendEvent(WIN_MAIN_RENDERER_EVENT_NAME.update_appx_downloaded, { path: destPath, version: info.version })
    }

    // 打开安装包：Windows 会唤起 APPX 安装界面，用户点击“安装”即可
    const err = await shell.openPath(destPath)
    if (err) {
      log.warn('[appxUpdate] 打开安装包失败，改为在文件夹中显示：', err)
      shell.showItemInFolder(destPath)
    }
  } catch (err) {
    log.error('[appxUpdate] 下载 APPX 失败：', err)
    sendError((err as Error)?.message || '下载失败')
  }
}

export default () => {
  mainOn(WIN_MAIN_RENDERER_EVENT_NAME.update_download_appx, () => {
    if (!isWin || !isAppx) return
    if (isDownloading) return
    isDownloading = true
    void runDownload().finally(() => {
      isDownloading = false
    })
  })
}
