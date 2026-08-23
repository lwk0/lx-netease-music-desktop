import { addTempPlayList } from '@renderer/store/player/action'
import { playList } from '@renderer/core/player'
import { LIST_IDS } from '@common/constants'

export default ({ props, selectedList, list, removeAllSelect }) => {
  let clickTime = 0
  let clickIndex = -1

  const handlePlayMusic = (index) => {
    playList(props.listId, index)
  }

  const handlePlayMusicLater = (index, single) => {
    if (selectedList.value.length && !single) {
      addTempPlayList(selectedList.value.map(s => ({ listId: props.listId, musicInfo: s })))
      removeAllSelect()
    } else {
      addTempPlayList([{ listId: props.listId, musicInfo: list.value[index] }])
    }
  }

  const handlePlaySelected = () => {
    if (!selectedList.value.length) return
    addTempPlayList(selectedList.value.map(s => ({ listId: props.listId, musicInfo: s })))
    removeAllSelect()
    playList(LIST_IDS.TEMP, 0)
  }

  const doubleClickPlay = index => {
    if (
      window.performance.now() - clickTime > 400 ||
      clickIndex !== index
    ) {
      clickTime = window.performance.now()
      clickIndex = index
      return
    }
    handlePlayMusic(index, true)
    clickTime = 0
    clickIndex = -1
  }

  return {
    handlePlayMusic,
    handlePlayMusicLater,
    handlePlaySelected,
    doubleClickPlay,
  }
}
