import leaderboard from './leaderboard'
import { apis } from '../api-source'
import getLyric from './lyric'
import getMusicInfo from './musicInfo'
import musicSearch from './musicSearch'
import songList from './songList'
import hotSearch from './hotSearch'
import comment from './comment'
import dailyRec from './dailyRec'
import * as apiCookie from './api-cookie'
import artist from './artist'
import album from './album'
import user from './user'
import musicDetail from './musicDetail'
import { getMvUrl } from './mv'
import { getMusicQualityInfo, getBatchMusicQualityInfo } from './quality_detail'
import { resolveQualityAlias } from '../utils'
// import tipSearch from './tipSearch'

const wy = {
  // tipSearch,
  leaderboard,
  musicSearch,
  songList,
  hotSearch,
  comment,
  artist,
  album,
  dailyRec,
  cookie: apiCookie,
  user,
  musicDetail,
  mv: { getMvUrl },
  quality: { getMusicQualityInfo, getBatchMusicQualityInfo },
  getMusicUrl(songInfo, type) {
    const qualityToRequest = resolveQualityAlias('wy', type)
    return apis('wy').getMusicUrl(songInfo, qualityToRequest)
  },
  getLyric(songInfo) {
    return getLyric(songInfo.songmid)
  },
  getPic(songInfo) {
    const requestObj = getMusicInfo(songInfo.songmid)
    return requestObj.promise.then(info => info.al.picUrl)
  },
  getMusicDetailPageUrl(songInfo) {
    return `https://music.163.com/#/song?id=${songInfo.songmid}`
  },
}

export default wy
