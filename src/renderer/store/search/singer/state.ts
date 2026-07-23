import { reactive, markRaw } from '@common/utils/vueTools'

export interface SingerInfo {
  id: string
  name: string
  picUrl: string
  alias?: string[]
  albumSize?: number
  source: 'wy'
}

export interface SingerListInfo {
  list: SingerInfo[]
  total: number
  page: number
  maxPage: number
  limit: number
  key: string | null
  noItemLabel: string
}

export const listInfo: SingerListInfo = markRaw(reactive<SingerListInfo>({
  page: 1,
  maxPage: 0,
  limit: 30,
  total: 0,
  list: [],
  key: null,
  noItemLabel: '',
}))
