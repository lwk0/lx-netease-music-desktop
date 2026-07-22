import crypto from 'crypto'
import dns from 'dns'
import { decodeName } from '@renderer/utils'
import { appSetting } from '@renderer/store/setting'
import { qualityList } from '@renderer/store'

export const toMD5 = str => crypto.createHash('md5').update(str).digest('hex')


const ipMap = new Map()
export const getHostIp = hostname => {
  const result = ipMap.get(hostname)
  if (typeof result === 'object') return result
  if (result === true) return
  ipMap.set(hostname, true)
  // console.log(hostname)
  dns.lookup(hostname, {
    // family: 4,
    all: false,
  }, (err, address, family) => {
    if (err) return console.log(err)
    // console.log(address, family)
    ipMap.set(hostname, { address, family })
  })
}

export const dnsLookup = (hostname, options, callback) => {
  const result = getHostIp(hostname)
  if (result) return callback(null, result.address, result.family)

  dns.lookup(hostname, options, callback)
}


/**
 * 格式化歌手
 * @param singers 歌手数组
 * @param nameKey 歌手名键值
 * @param join 歌手分割字符
 */
export const formatSingerName = (singers, nameKey = 'name', join = '、') => {
  if (Array.isArray(singers)) {
    const singer = []
    singers.forEach(item => {
      let name = item[nameKey]
      if (!name) return
      singer.push(name)
    })
    return decodeName(singer.join(join))
  }
  return decodeName(String(singers ?? ''))
}

/**
 * 根据当前激活的自定义API配置，解析音质的别名。
 * 例如，如果应用请求 'hires'，但API配置只支持 'flac24bit'，则将其映射回去。
 * @param {LX.OnlineSource} source 音乐源ID, e.g., 'kw', 'wy'
 * @param {LX.Quality} type 应用请求的音质类型
 * @returns {LX.Quality} 应该传递给API的实际音质类型
 */
export const resolveQualityAlias = (source, type) => {
  const activeApiId = appSetting['common.apiSource']
  if (!activeApiId || !/^user_api/.test(activeApiId)) return type

  const supportedQualities = qualityList.value?.[source]
  if (!supportedQualities) return type

  if (type === 'hires' && !supportedQualities.includes('hires')) {
    return 'flac24bit'
  }

  return type
}
