import { httpFetch } from '../../request'
import { weapi } from './utils/crypto'
import { dateFormat2 } from '../../index'
import { appSetting } from '@renderer/store/setting'

const emojis = [
  ['大笑', '😃'],
  ['可爱', '😊'],
  ['憨笑', '☺️'],
  ['色', '😍'],
  ['亲亲', '😙'],
  ['惊恐', '😱'],
  ['流泪', '😭'],
  ['亲', '😚'],
  ['呆', '😳'],
  ['哀伤', '😔'],
  ['呲牙', '😁'],
  ['吐舌', '😝'],
  ['撇嘴', '😒'],
  ['怒', '😡'],
  ['奸笑', '😏'],
  ['汗', '😓'],
  ['痛苦', '😖'],
  ['惶恐', '😰'],
  ['生病', '😨'],
  ['口罩', '😷'],
  ['大哭', '😂'],
  ['晕', '😵'],
  ['发怒', '👿'],
  ['开心', '😄'],
  ['鬼脸', '😜'],
  ['皱眉', '😞'],
  ['流感', '😢'],
  ['爱心', '❤️'],
  ['心碎', '💔'],
  ['钟情', '💘'],
  ['星星', '⭐️'],
  ['生气', '💢'],
  ['便便', '💩'],
  ['强', '👍'],
  ['弱', '👎'],
  ['拜', '🙏'],
  ['牵手', '👫'],
  ['跳舞', '👯‍♀️'],
  ['禁止', '🙅‍♀️'],
  ['这边', '💁‍♀️'],
  ['爱意', '💏'],
  ['示爱', '👩‍❤️‍👨'],
  ['嘴唇', '👄'],
  ['狗', '🐶'],
  ['猫', '🐱'],
  ['猪', '🐷'],
  ['兔子', '🐰'],
  ['小鸡', '🐤'],
  ['公鸡', '🐔'],
  ['幽灵', '👻'],
  ['圣诞', '🎅'],
  ['外星', '👽'],
  ['钻石', '💎'],
  ['礼物', '🎁'],
  ['男孩', '👦'],
  ['女孩', '👧'],
  ['蛋糕', '🎂'],
  ['18', '🔞'],
  ['圈', '⭕'],
  ['叉', '❌'],
]

const applyEmoji = text => {
  for (const e of emojis) text = text.replaceAll(`[${e[0]}]`, e[1])
  return text
}

let cursorTools = {
  cache: {},
  getCursor(id, page, limit) {
    let cacheData = this.cache[id]
    if (!cacheData) cacheData = this.cache[id] = {}
    let orderType
    let cursor
    let offset
    if (page == 1) {
      cacheData.page = 1
      cursor = cacheData.cursor = cacheData.prevCursor = Date.now()
      orderType = 1
      offset = 0
    } else if (cacheData.page) {
      cursor = cacheData.cursor
      if (page > cacheData.page) {
        orderType = 1
        offset = (page - cacheData.page - 1) * limit
      } else if (page < cacheData.page) {
        orderType = 0
        offset = (cacheData.page - page - 1) * limit
      } else {
        cursor = cacheData.cursor = cacheData.prevCursor
        offset = cacheData.offset
        orderType = cacheData.orderType
      }
    }
    return {
      orderType,
      cursor,
      offset,
    }
  },
  setCursor(id, cursor, orderType, offset, page) {
    let cacheData = this.cache[id]
    if (!cacheData) cacheData = this.cache[id] = {}
    cacheData.prevCursor = cacheData.cursor
    cacheData.cursor = cursor
    cacheData.orderType = orderType
    cacheData.offset = offset
    cacheData.page = page
  },
}

export default {
  _requestObj: null,
  _requestObj2: null,
  async getComment({ songmid }, page = 1, limit = 20) {
    if (this._requestObj) this._requestObj.cancelHttp()

    const id = 'R_SO_4_' + songmid

    const cursorInfo = cursorTools.getCursor(songmid, page, limit)

    const _requestObj = httpFetch('https://music.163.com/weapi/comment/resource/comments/get', {
      method: 'post',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        origin: 'https://music.163.com',
        Refere: 'http://music.163.com/',
      },
      form: weapi({
        cursor: cursorInfo.cursor,
        offset: cursorInfo.offset,
        orderType: cursorInfo.orderType,
        pageNo: page,
        pageSize: limit,
        rid: id,
        threadId: id,
      }),
    })
    const { body, statusCode } = await _requestObj.promise
    // console.log(body)
    if (statusCode != 200 || body.code !== 200) throw new Error('获取评论失败')
    cursorTools.setCursor(songmid, body.data.cursor, cursorInfo.orderType, cursorInfo.offset, page)
    return { source: 'wy', comments: this.filterComment(body.data.comments), total: body.data.totalCount, page, limit, maxPage: Math.ceil(body.data.totalCount / limit) || 1 }
  },
  async getHotComment({ songmid }, page = 1, limit = 100) {
    if (this._requestObj2) this._requestObj2.cancelHttp()

    const id = 'R_SO_4_' + songmid
    page = page - 1

    const _requestObj2 = httpFetch(`https://music.163.com/weapi/v1/resource/hotcomments/${id}`, {
      method: 'post',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        origin: 'https://music.163.com',
        Refere: 'http://music.163.com/',
      },
      form: weapi({
        rid: id,
        limit,
        offset: limit * page,
        beforeTime: Date.now().toString(),
      }),
    })
    const { body, statusCode } = await _requestObj2.promise
    if (statusCode != 200 || body.code !== 200) throw new Error('获取热门评论失败')
    const total = body.total ?? 0
    return { source: 'wy', comments: this.filterComment(body.hotComments), total, page, limit, maxPage: Math.ceil(total / limit) || 1 }
  },
  filterComment(rawList) {
    // 先建立同页评论的 id -> likedCount/liked 映射，用于补全 beReplied 父评论的点赞数与点赞状态
    const likedCountMap = new Map()
    const likedMap = new Map()
    for (const item of rawList) {
      if (item.commentId != null) {
        likedCountMap.set(String(item.commentId), item.likedCount)
        likedMap.set(String(item.commentId), item.liked)
      }
    }

    return rawList.map(item => {
      let data = {
        id: item.commentId,
        text: item.content ? applyEmoji(item.content) : '',
        time: item.time ? item.time : '',
        timeStr: item.time ? dateFormat2(item.time) : '',
        location: item.ipLocation?.location,
        userName: item.user.nickname,
        avatar: item.user.avatarUrl,
        userId: item.user.userId,
        likedCount: item.likedCount,
        liked: item.liked ?? false,
        reply: [],
      }

      let replyData = item.beReplied && item.beReplied[0]
      if (!replyData) return data

      const parentId = replyData.beRepliedCommentId
      let parentLikedCount = likedCountMap.get(String(parentId))
      if (parentLikedCount == null) {
        // 部分接口会在 beReplied 里直接返回 likedCount
        parentLikedCount = replyData.likedCount ?? null
      }
      const parentLiked = likedMap.get(String(parentId)) ?? replyData.liked ?? false

      return {
        id: parentId,
        rootId: parentId,
        text: replyData.content ? applyEmoji(replyData.content) : '',
        time: item.time,
        timeStr: null,
        location: replyData.ipLocation?.location,
        userName: replyData.user.nickname,
        avatar: replyData.user.avatarUrl,
        userId: replyData.user.userId,
        likedCount: parentLikedCount,
        liked: parentLiked,
        reply: [data],
      }
    })
  },

  async sendComment({ songmid }, content, retryNum = 0) {
    const cookie = appSetting['common.wy_cookie']
    if (!cookie) return Promise.reject(new Error('请先登录网易云'))
    const threadId = 'R_SO_4_' + songmid
    const csrfToken = (cookie.match(/_csrf=([^(;|$)]+)/) || [])[1] || ''
    const requestObj = httpFetch('https://music.163.com/weapi/resource/comments/add', {
      method: 'post',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        origin: 'https://music.163.com',
        Referer: 'https://music.163.com',
        cookie,
      },
      form: weapi({
        threadId,
        content,
        csrf_token: csrfToken,
      }),
    })
    try {
      const { body, statusCode } = await requestObj.promise
      if (statusCode != 200 || body.code !== 200) throw new Error(body.message || '发送评论失败')
      return body
    } catch (error) {
      if (retryNum < 2) return this.sendComment({ songmid }, content, retryNum + 1)
      throw error
    }
  },

  async replyComment({ songmid }, commentId, content, retryNum = 0) {
    const cookie = appSetting['common.wy_cookie']
    if (!cookie) return Promise.reject(new Error('请先登录网易云'))
    const threadId = 'R_SO_4_' + songmid
    const csrfToken = (cookie.match(/_csrf=([^(;|$)]+)/) || [])[1] || ''
    const requestObj = httpFetch('https://music.163.com/weapi/resource/comments/reply', {
      method: 'post',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        origin: 'https://music.163.com',
        Referer: 'https://music.163.com',
        cookie,
      },
      form: weapi({
        threadId,
        content,
        commentId,
        csrf_token: csrfToken,
      }),
    })
    try {
      const { body, statusCode } = await requestObj.promise
      if (statusCode != 200 || body.code !== 200) throw new Error(body.message || '回复评论失败')
      return body
    } catch (error) {
      if (retryNum < 2) return this.replyComment({ songmid }, commentId, content, retryNum + 1)
      throw error
    }
  },

  async deleteComment({ songmid }, commentId, retryNum = 0) {
    const cookie = appSetting['common.wy_cookie']
    if (!cookie) return Promise.reject(new Error('请先登录网易云'))
    const threadId = 'R_SO_4_' + songmid
    const csrfToken = (cookie.match(/_csrf=([^(;|$)]+)/) || [])[1] || ''
    const requestObj = httpFetch('https://music.163.com/weapi/resource/comments/delete', {
      method: 'post',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        origin: 'https://music.163.com',
        Referer: 'https://music.163.com',
        cookie,
      },
      form: weapi({
        threadId,
        commentId,
        csrf_token: csrfToken,
      }),
    })
    try {
      const { body, statusCode } = await requestObj.promise
      if (statusCode != 200 || body.code !== 200) throw new Error(body.message || '删除评论失败')
      return body
    } catch (error) {
      if (retryNum < 2) return this.deleteComment({ songmid }, commentId, retryNum + 1)
      throw error
    }
  },

  async likeComment({ songmid }, commentId, isLike = true, retryNum = 0) {
    const cookie = appSetting['common.wy_cookie']
    if (!cookie) return Promise.reject(new Error('请先登录网易云'))
    const threadId = 'R_SO_4_' + songmid
    const csrfToken = (cookie.match(/_csrf=([^(;|$)]+)/) || [])[1] || ''
    const requestObj = httpFetch(`https://music.163.com/weapi/v1/comment/${isLike ? 'like' : 'unlike'}`, {
      method: 'post',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        origin: 'https://music.163.com',
        Referer: 'https://music.163.com',
        cookie,
      },
      form: weapi({
        threadId,
        commentId,
        csrf_token: csrfToken,
      }),
    })
    try {
      const { body, statusCode } = await requestObj.promise
      if (statusCode != 200 || body.code !== 200) throw new Error(body.message || '操作失败')
      return body
    } catch (error) {
      if (retryNum < 2) return this.likeComment({ songmid }, commentId, isLike, retryNum + 1)
      throw error
    }
  },
}
