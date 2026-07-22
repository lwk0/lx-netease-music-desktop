import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'
import { formatPlayTime, sizeFormate } from '../../index'
import { getBatchMusicQualityInfo } from './quality_detail'

// https://github.com/Binaryify/NeteaseCloudMusicApi/blob/master/module/song_detail.js

export default {
  getSinger(singers) {
    let arr = []
    singers?.forEach(singer => {
      arr.push(singer.name)
    })
    return arr.join('、')
  },
  async filterList({ songs, privileges }) {
    // console.log(songs, privileges)
    const list = []
    const hasSelfQuality = songs.length && (songs[0].h || songs[0].m || songs[0].l || songs[0].sq || songs[0].hr)
    const hasPrivileges = Array.isArray(privileges) && privileges.length > 0
    let qualityInfoMap = {}

    if (hasSelfQuality) {
      // 从歌曲自带音质信息构建（如日推接口）
      songs.forEach(item => {
        const types = []
        const _types = {}
        let size
        if (item.hr) {
          size = sizeFormate(item.hr.size)
          types.push({ type: 'hires', size })
          _types.hires = { size }
        }
        if (item.sq) {
          size = sizeFormate(item.sq.size)
          types.push({ type: 'flac', size })
          _types.flac = { size }
        }
        if (item.h) {
          size = sizeFormate(item.h.size)
          types.push({ type: '320k', size })
          _types['320k'] = { size }
        }
        if (item.m) {
          size = sizeFormate(item.m.size)
          if (!_types['128k']) {
            types.push({ type: '128k', size })
            _types['128k'] = { size }
          }
        }
        if (item.l) {
          size = sizeFormate(item.l.size)
          if (!_types['128k']) {
            types.push({ type: '128k', size })
            _types['128k'] = { size }
          }
        }
        types.reverse()
        qualityInfoMap[item.id] = { types, _types }
      })
    } else if (hasPrivileges) {
      // 从 privileges 构建（如歌曲详情接口）
      songs.forEach((item, index) => {
        const types = []
        const _types = {}
        let size
        let privilege = privileges[index]
        if (privilege.id !== item.id) privilege = privileges.find(p => p.id === item.id)
        if (!privilege) return

        if (privilege.maxBrLevel == 'hires') {
          size = item.hr ? sizeFormate(item.hr.size) : null
          types.push({ type: 'flac24bit', size })
          _types.flac24bit = { size }
        }
        switch (privilege.maxbr) {
          case 999000:
            size = item.sq ? sizeFormate(item.sq.size) : null
            types.push({ type: 'flac', size })
            _types.flac = { size }
          case 320000:
            size = item.h ? sizeFormate(item.h.size) : null
            types.push({ type: '320k', size })
            _types['320k'] = { size }
          case 192000:
          case 128000:
            size = item.l ? sizeFormate(item.l.size) : null
            types.push({ type: '128k', size })
            _types['128k'] = { size }
        }
        types.reverse()
        qualityInfoMap[item.id] = { types, _types }
      })
    } else {
      // 都没有则批量查询音质信息
      const idList = songs.map(item => item.id)
      qualityInfoMap = await getBatchMusicQualityInfo(idList)
    }

    songs.forEach(item => {
      const { types = [], _types = {} } = qualityInfoMap[item.id] || { types: [], _types: {} }

      if (item.pc) {
        list.push({
          singer: item.pc.ar ?? '',
          name: item.pc.sn ?? '',
          albumName: item.pc.alb ?? '',
          albumId: item.al?.id,
          artists: item.ar,
          source: 'wy',
          interval: formatPlayTime(item.dt / 1000),
          songmid: item.id,
          img: item.al?.picUrl ?? '',
          lrc: null,
          otherSource: null,
          types,
          _types,
          typeUrl: {},
        })
      } else {
        list.push({
          singer: this.getSinger(item.ar),
          name: item.name ?? '',
          albumName: item.al?.name,
          albumId: item.al?.id,
          artists: item.ar,
          source: 'wy',
          interval: formatPlayTime(item.dt / 1000),
          songmid: item.id,
          img: item.al?.picUrl,
          lrc: null,
          otherSource: null,
          types,
          _types,
          typeUrl: {},
        })
      }
    })
    // console.log(list)
    return list
  },
  async getList(ids = [], retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('try max num'))

    const requestObj = httpFetch('https://music.163.com/weapi/v3/song/detail', {
      method: 'post',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        origin: 'https://music.163.com',
      },
      form: weapi({
        c: '[' + ids.map(id => ('{"id":' + id + '}')).join(',') + ']',
        ids: '[' + ids.join(',') + ']',
      }),
    })
    const { body, statusCode } = await requestObj.promise
    if (statusCode != 200 || body.code !== 200) throw new Error('获取歌曲详情失败')
    // console.log(body)
    return { source: 'wy', list: await this.filterList(body) }
  },
  async getSongRedCount(id, retryNum = 0) {
    if (retryNum > 2) return Promise.reject(new Error('获取歌曲红心数量失败'))

    const requestObj = httpFetch('https://music.163.com/weapi/song/red/count', {
      method: 'post',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        origin: 'https://music.163.com',
        Referer: 'https://music.163.com/',
      },
      form: weapi({ id }),
    })

    try {
      const { body } = await requestObj.promise
      if (body.code !== 200) throw new Error(body.message || '获取歌曲红心数量失败')
      // 返回结构：{ code: 200, data: { count: number, countDesc: string } }
      return body.data?.count ?? null
    } catch (error) {
      return this.getSongRedCount(id, retryNum + 1)
    }
  },
}
