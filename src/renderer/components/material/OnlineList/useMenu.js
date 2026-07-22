import { computed, ref, reactive, nextTick } from '@common/utils/vueTools'
import musicSdk from '@renderer/utils/musicSdk'
import { useI18n } from '@renderer/plugins/i18n'
import { hasDislike } from '@renderer/core/dislikeList'
import { appSetting } from '@renderer/store/setting'
import { userState } from '@renderer/store/user'

export default ({
  props,
  assertApiSupport,
  emit,

  handleShowDownloadModal,
  handlePlayMusic,
  handlePlayMusicLater,
  handleSearch,
  handleShowMusicAddModal,
  handleOpenMusicDetail,
  handleDislikeMusic,
  handleLikeMusic,
  handleRemoveFromList,
}) => {
  const itemMenuControl = reactive({
    play: true,
    addTo: true,
    playLater: true,
    download: true,
    search: true,
    sourceDetail: true,
    dislike: true,
    like: true,
    likeDisabled: true,
    isLiked: false,
  })
  const t = useI18n()
  const menuLocation = reactive({ x: 0, y: 0 })
  const isShowItemMenu = ref(false)

  const menus = computed(() => {
    const list = [
      {
        name: t('list__play'),
        action: 'play',
        disabled: !itemMenuControl.play,
      },
      {
        name: t('list__download'),
        action: 'download',
        disabled: !itemMenuControl.download,
      },
      {
        name: t('list__play_later'),
        action: 'playLater',
        disabled: !itemMenuControl.playLater,
      },
      {
        name: t('list__search'),
        action: 'search',
        disabled: !itemMenuControl.search,
      },
      {
        name: t('list__add_to'),
        action: 'addTo',
        disabled: !itemMenuControl.addTo,
      },
      {
        name: t('list__source_detail'),
        action: 'sourceDetail',
        disabled: !itemMenuControl.sourceDetail,
      },
      {
        name: itemMenuControl.isLiked ? t('list__unlike') : t('list__like'),
        action: 'like',
        disabled: itemMenuControl.likeDisabled,
      },
      {
        name: t('list__dislike'),
        action: 'dislike',
        disabled: !itemMenuControl.dislike,
      },
    ]
    if (props.editable) {
      list.push({
        name: t('netease__remove_from_list'),
        action: 'removeFromList',
        disabled: false,
      })
    }
    return list
  })

  const showMenu = (event, musicInfo) => {
    itemMenuControl.sourceDetail = !!musicSdk[musicInfo.source]?.getMusicDetailPageUrl
    // this.listMenu.itemMenuControl.play =
    //   this.listMenu.itemMenuControl.playLater =
    itemMenuControl.download = assertApiSupport(musicInfo.source)

    itemMenuControl.dislike = !hasDislike(musicInfo)

    const isWySong = musicInfo.source === 'wy'
    const isLoggedIn = !!appSetting['common.wy_cookie'] && !!userState.wy_uid
    const id = musicInfo.songmid ?? musicInfo.meta?.songId
    itemMenuControl.likeDisabled = !isWySong || !isLoggedIn
    itemMenuControl.isLiked = isWySong && isLoggedIn && id != null && userState.wy_liked_song_ids.has(String(id))

    menuLocation.x = event.pageX
    menuLocation.y = event.pageY

    if (isShowItemMenu.value) return
    emit('show-menu')
    nextTick(() => {
      isShowItemMenu.value = true
    })
  }

  const hideMenu = () => {
    isShowItemMenu.value = false
  }

  const menuClick = (action, index) => {
    // console.log(action)
    hideMenu()
    if (!action) return

    switch (action.action) {
      case 'download':
        handleShowDownloadModal(index)
        break
      case 'play':
        handlePlayMusic(index)
        break
      case 'playLater':
        handlePlayMusicLater(index)
        break
      case 'search':
        handleSearch(index)
        break
      case 'addTo':
        handleShowMusicAddModal(index)
        break
      case 'sourceDetail':
        handleOpenMusicDetail(index)
        break
      case 'dislike':
        handleDislikeMusic(index)
        break
      case 'like':
        handleLikeMusic(index)
        break
      case 'removeFromList':
        if (handleRemoveFromList) handleRemoveFromList(index)
        break
    }
  }

  return {
    menus,
    menuLocation,
    isShowItemMenu,
    showMenu,
    menuClick,
  }
}
