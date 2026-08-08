// import { writeFileSync } from 'atomically'
import { dialog, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { log } from '@common/utils'

type Stores = Record<string, Store>

const stores: Stores = {}

// 跨设备安全的同步重命名：rename 在跨盘（EXDEV: cross-device link not permitted）时
// 降级为 copy + unlink。APPX 等场景下数据目录可能被 junction/符号链接重定向到其他盘符，
// 普通的 rename 会失败导致初始化中断，这里做容错。
const renameFileSync = (srcPath: string, dstPath: string) => {
  try {
    fs.renameSync(srcPath, dstPath)
  } catch (err: any) {
    if (err?.code === 'EXDEV') {
      fs.copyFileSync(srcPath, dstPath)
      fs.unlinkSync(srcPath)
    } else {
      throw err
    }
  }
}


class Store {
  private readonly filePath: string
  private readonly dirPath: string
  private store: Record<string, any>

  private writeFile() {
    const tempPath = this.filePath + '.' + Math.random().toString().substring(2, 10) + '.temp'
    try {
      fs.writeFileSync(tempPath, JSON.stringify(this.store, null, '\t'), 'utf8')
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        fs.mkdirSync(this.dirPath, { recursive: true })
        fs.writeFileSync(tempPath, JSON.stringify(this.store, null, '\t'), 'utf8')
      } else throw err
    }
    renameFileSync(tempPath, this.filePath)
  }

  constructor(filePath: string, clearInvalidConfig: boolean = false) {
    this.filePath = filePath
    this.dirPath = path.dirname(this.filePath)

    let store: Record<string, any>
    if (fs.existsSync(this.filePath)) {
      if (clearInvalidConfig) {
        try {
          store = JSON.parse(fs.readFileSync(this.filePath, 'utf8'))
        } catch {
          store = {}
        }
      } else store = JSON.parse(fs.readFileSync(this.filePath, 'utf8'))
    } else store = {}

    if (typeof store != 'object') {
      if (clearInvalidConfig) store = {}
      else throw new Error('parse data error: ' + String(store))
    }
    this.store = store
  }

  get<Value>(key: string): Value {
    return this.store[key]
  }

  has(key: string): boolean {
    return key in this.store
  }

  set(key: string, value: any) {
    this.store[key] = value
    this.writeFile()
  }

  override(value: Record<string, any>) {
    this.store = value
    this.writeFile()
  }
}

/**
 * 获取 Store 对象
 * @param name store 名
 * @param isIgnoredError 是否忽略错误
 * @param isShowErrorAlert=true 是否显示错误弹窗
 * @returns Store
 */
export default (name: string, isIgnoredError = true, isShowErrorAlert = true): Store => {
  if (stores[name]) return stores[name]
  let store: Store
  const storePath = path.join(global.lxDataPath, name + '.json')
  try {
    store = stores[name] = new Store(storePath, false)
  } catch (err: any) {
    const error = err as Error
    log.error(error)

    if (!isIgnoredError) throw error


    const backPath = storePath + '.bak'
    renameFileSync(storePath, backPath)
    if (isShowErrorAlert) {
      dialog.showMessageBoxSync({
        type: 'error',
        message: name + ' data load error',
        detail: `We have helped you back up the old ${name} file to: ${backPath}\nYou can try to repair and restore it manually\n\nError detail: ${error.message}`,
      })
      shell.showItemInFolder(backPath)
    }


    store = new Store(storePath, true)
  }
  return store
}

export {
  Store,
}
