import { addHistoryWord } from '@renderer/store/search/action'
import { search as searchSinger, listInfo, type SingerInfo } from '@renderer/store/search/singer'

export type { SingerInfo }

export default () => {
  const search = async(text: string, page: number): Promise<SingerInfo[]> => {
    if (text.length) void addHistoryWord(text)
    return searchSinger(text, page)
  }

  return {
    listInfo,
    search,
  }
}
