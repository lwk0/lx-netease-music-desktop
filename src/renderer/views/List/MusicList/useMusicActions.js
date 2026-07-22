import { useRouter } from '@common/utils/vueRouter'
import musicSdk from '@renderer/utils/musicSdk'
import { openUrl, clipboardWriteText } from '@common/utils/electron'
import { dialog } from '@renderer/plugins/Dialog'
import { useI18n } from '@renderer/plugins/i18n'
import { removeListMusics } from '@renderer/store/list/action'
import { appSetting } from '@renderer/store/setting'
import { formatMusicName, toOldMusicInfo } from '@renderer/utils/index'
import { addDislikeInfo, hasDislike } from '@renderer/core/dislikeList'
import { playNext } from '@renderer/core/player'
import { playMusicInfo } from '@renderer/store/player/state'
import { userState } from '@renderer/store/user'
import { toggleWyLikedSong } from '@renderer/store/user/action'
import { toast, toastSuccess } from '@renderer/utils/toast'


export default ({ props, list, selectedList, removeAllSelect }) => {
  const router = useRouter()
  const t = useI18n()

  const handleSearch = index => {
    const info = list.value[index]
    router.push({
      path: '/search',
      query: {
        text: `${info.name} ${info.singer}`,
      },
    })
  }

  const handleOpenMusicDetail = index => {
    const minfo = list.value[index]
    const url = musicSdk[minfo.source]?.getMusicDetailPageUrl(toOldMusicInfo(minfo))
    if (!url) return
    openUrl(url)
  }

  const handleCopyName = index => {
    const minfo = list.value[index]
    clipboardWriteText(formatMusicName(appSetting['download.fileName'], minfo.name, minfo.singer))
  }

  const handleDislikeMusic = async(index) => {
    const minfo = list.value[index]
    const confirm = await dialog.confirm({
      message: minfo.singer ? t('lists__dislike_music_singer_tip', { name: minfo.name, singer: minfo.singer }) : t('lists__dislike_music_tip', { name: minfo.name }),
      cancelButtonText: t('cancel_button_text_2'),
      confirmButtonText: t('confirm_button_text'),
    })
    if (!confirm) return
    await addDislikeInfo([{ name: minfo.name, singer: minfo.singer }])
    if (hasDislike(playMusicInfo.musicInfo)) {
      playNext(true)
    }
  }

  const handleLikeMusic = async(index) => {
    const minfo = list.value[index]
    const id = minfo.songmid ?? minfo.meta?.songId
    if (id == null) {
      toast(t('netease__like_failed'))
      return
    }
    const songId = String(id)
    const isLiked = userState.wy_liked_song_ids.has(songId)
    const willLike = !isLiked
    if (willLike) userState.wy_liked_song_ids.add(songId)
    else userState.wy_liked_song_ids.delete(songId)
    try {
      await toggleWyLikedSong(songId, willLike)
      toastSuccess(willLike ? 'netease__like_success' : 'netease__unlike_success')
    } catch (e) {
      if (willLike) userState.wy_liked_song_ids.delete(songId)
      else userState.wy_liked_song_ids.add(songId)
      console.error('喜欢操作失败', e)
      toast(e?.message || t('netease__like_failed'))
    }
  }

  const handleRemoveMusic = async(index, single) => {
    if (selectedList.value.length && !single) {
      const confirm = await (selectedList.value.length > 1
        ? dialog.confirm({
          message: t('lists__remove_music_tip', { len: selectedList.value.length }),
          confirmButtonText: t('lists__remove_tip_button'),
        })
        : Promise.resolve(true)
      )
      if (!confirm) return
      removeListMusics({ listId: props.listId, ids: selectedList.value.map(m => m.id) })
      removeAllSelect()
    } else {
      removeListMusics({ listId: props.listId, ids: [list.value[index].id] })
    }
  }

  return {
    handleSearch,
    handleOpenMusicDetail,
    handleCopyName,
    handleDislikeMusic,
    handleLikeMusic,
    handleRemoveMusic,
  }
}
