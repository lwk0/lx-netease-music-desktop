import music from '@renderer/utils/musicSdk'

import { listInfo, type SingerInfo } from './state'

export const resetListInfo = (): [] => {
  listInfo.page = 1
  listInfo.maxPage = 0
  listInfo.total = 0
  listInfo.list = []
  listInfo.key = null
  listInfo.noItemLabel = ''
  return []
}

export const search = async(text: string, page: number): Promise<SingerInfo[]> => {
  if (!text) return resetListInfo()
  const key = `${page}__${text}`
  if (listInfo.key == key && listInfo.list.length) return listInfo.list
  listInfo.noItemLabel = window.i18n.t('list__loading')
  listInfo.key = key
  return music.wy.musicSearch.searchSinger(text, page, listInfo.limit).then((data: {
    list: SingerInfo[]
    total: number
    allPage: number
    limit: number
    source: 'wy'
  }) => {
    if (key != listInfo.key) return []
    listInfo.list = data.list
    listInfo.total = data.total
    listInfo.maxPage = data.allPage
    listInfo.page = page
    listInfo.limit = data.limit
    if (text && !data.list.length && page == 1) listInfo.noItemLabel = window.i18n.t('no_item')
    else listInfo.noItemLabel = ''
    return data.list
  }).catch((error: any) => {
    resetListInfo()
    listInfo.noItemLabel = window.i18n.t('list__load_failed')
    console.log(error)
    throw error
  })
}
