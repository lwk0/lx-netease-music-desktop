<template lang="pug">
transition(enter-active-class="animated slideInRight" leave-active-class="animated slideOutDown" @after-enter="handleAfterEnter" @after-leave="handleAfterLeave")
  div(v-if="isShowPlayerDetail" :class="[$style.container, { fullscreen: isFullscreen }]" @contextmenu="handleContextMenu")
    div(:class="$style.bg")
    //- div(:class="$style.bg" :style="bgStyle")
    //- div(:class="$style.bg2")
    ControlBtnsLeftHeader(v-if="appSetting['common.controlBtnPosition'] == 'left'")
    ControlBtnsRightHeader(v-else)
    div(:class="[$style.main, {[$style.showComment]: isShowPlayComment}]")
      div(:class="$style.leftColumn")
        div.left(:class="$style.left")
          //- div(:class="$style.info")
          div(:class="$style.info")
            div(:class="[$style.cover, { [$style.playing]: isPlay, [$style.vinyl]: isVinyl }]")
              img(v-if="musicInfo.pic" :class="[$style.img, { [$style.vinylImg]: isVinyl }]" :src="musicInfo.pic")
            div.description(:class="['scroll', $style.description]")
              p {{ $t('player__music_name') }}{{ musicInfo.name }}
              p
                span(:class="$style.label") {{ $t('player__music_singer') }}
                template(v-if="artistList.length")
                  span(v-for="(a, i) in artistList" :key="a.id" :class="$style.link" @click="goArtist(a.id)")
                    | {{ a.name }}
                    span(v-if="i < artistList.length - 1") {{ ' / ' }}
                span(v-else) {{ musicInfo.singer }}
              p(v-if="musicInfo.album")
                span(:class="$style.label") {{ $t('player__music_album') }}
                span(v-if="albumId" :class="$style.link" @click="goAlbum(albumId)") {{ musicInfo.album }}
                span(v-else) {{ musicInfo.album }}

        transition(enter-active-class="animated fadeIn" leave-active-class="animated fadeOut")
          LyricPlayer(v-if="visibled")
      music-comment(v-if="visibled" :class="$style.comment" :show="isShowPlayComment" :music-info="playMusicInfo.musicInfo" @close="hideComment")
    transition(enter-active-class="animated fadeIn" leave-active-class="animated fadeOut")
      play-bar(v-if="visibled")
    transition(enter-active-class="animated-slow fadeIn" leave-active-class="animated-slow fadeOut")
      common-audio-visualizer(v-if="appSetting['player.audioVisualization'] && visibled")
</template>


<script>
import { ref, watch, computed } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { isFullscreen } from '@renderer/store'
import {
  isShowPlayerDetail,
  isShowPlayComment,
  musicInfo,
  playMusicInfo,
  isPlay,
} from '@renderer/store/player/state'
import {
  setShowPlayerDetail,
  setShowPlayComment,
  setShowPlayLrcSelectContentLrc,
} from '@renderer/store/player/action'
import LyricPlayer from './LyricPlayer.vue'
import PlayBar from './PlayBar.vue'
import MusicComment from './components/MusicComment/index.vue'
import ControlBtnsLeftHeader from './ControlBtnsLeftHeader.vue'
import ControlBtnsRightHeader from './ControlBtnsRightHeader.vue'
import { registerAutoHideMounse, unregisterAutoHideMounse } from './autoHideMounse'
import { appSetting } from '@renderer/store/setting'
import { closeWindow, maxWindow, minWindow, setFullScreen } from '@renderer/utils/ipc'

export default {
  name: 'CorePlayDetail',
  components: {
    ControlBtnsLeftHeader,
    ControlBtnsRightHeader,
    LyricPlayer,
    PlayBar,
    MusicComment,
  },
  setup() {
    const visibled = ref(false)
    const router = useRouter()

    const artistList = computed(() => {
      const m = playMusicInfo.musicInfo
      if (!m) return []
      // 网易云等在线歌曲的歌手/专辑信息位于 meta 或顶层字段
      const artists = m.meta?.artists ?? m.artists
      if (Array.isArray(artists) && artists.length) {
        return artists.map(a => ({ id: a.id, name: a.name })).filter(a => a.id != null)
      }
      return []
    })
    const albumId = computed(() => {
      const m = playMusicInfo.musicInfo
      if (!m) return null
      return m.meta?.albumId ?? m.albumId ?? null
    })
    const isVinyl = computed(() => appSetting['playDetail.coverEffect'] === 'vinyl')

    const goArtist = (artistId) => {
      const source = playMusicInfo.musicInfo?.source ?? 'wy'
      setShowPlayerDetail(false)
      void router.push({ path: '/artist/detail', query: { source, id: String(artistId) } })
    }
    const goAlbum = (albumIdVal) => {
      const source = playMusicInfo.musicInfo?.source ?? 'wy'
      setShowPlayerDetail(false)
      void router.push({ path: '/album/detail', query: { source, id: String(albumIdVal) } })
    }

    let clickTime = 0

    const hide = () => {
      setShowPlayerDetail(false)
    }
    const handleContextMenu = () => {
      if (window.performance.now() - clickTime > 400) {
        clickTime = window.performance.now()
        return
      }
      clickTime = 0
      hide()
    }

    const hideComment = () => {
      setShowPlayComment(false)
    }

    const handleAfterEnter = () => {
      if (isFullscreen.value) registerAutoHideMounse()

      visibled.value = true
    }

    const handleAfterLeave = () => {
      setShowPlayLrcSelectContentLrc(false)
      hideComment(false)
      visibled.value = false

      unregisterAutoHideMounse()
    }

    watch(isFullscreen, isFullscreen => {
      (isFullscreen ? registerAutoHideMounse : unregisterAutoHideMounse)()
    })


    return {
      appSetting,
      playMusicInfo,
      isShowPlayerDetail,
      isShowPlayComment,
      musicInfo,
      isPlay,
      artistList,
      albumId,
      isVinyl,
      goArtist,
      goAlbum,
      hide,
      handleContextMenu,
      hideComment,
      handleAfterEnter,
      handleAfterLeave,
      visibled,
      isFullscreen,
      fullscreenExit() {
        void setFullScreen(false).then((fullscreen) => {
          isFullscreen.value = fullscreen
        })
      },
      min() {
        minWindow()
      },
      max() {
        maxWindow()
      },
      close() {
        closeWindow()
      },
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@control-btn-width: @height-toolbar * .26;

.container {
  position: absolute;
  display: flex;
  flex-flow: column nowrap;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: var(--color-content-background);
  z-index: 10;
  // -webkit-app-region: drag;
  overflow: hidden;
  border-radius: @radius-border;
  color: var(--color-font);
  // border-left: 12px solid var(--color-primary-alpha-900);
  -webkit-app-region: no-drag;
  contain: strict;

  box-sizing: border-box;

  * {
    box-sizing: border-box;
  }
}
.bg {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background: var(--background-image) var(--background-image-position) no-repeat;
  background-size: var(--background-image-size);
  // background-size: 110% 110%;
  // filter: blur(60px);
  opacity: .7;
  z-index: -1;
  &:before {
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    background-color: var(--color-app-background);
  }
  &:after {
    position: absolute;
    left: 0;
    top: 0;
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    background-color: var(--color-main-background);
  }
}
// .bg2 {
//   position: absolute;
//   width: 100%;
//   height: 100%;
//   top: 0;
//   left: 0;
//   z-index: -1;
//   background-color: rgba(255, 255, 255, .8);
// }

.main {
  flex: auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  margin: 0 30px;
  position: relative;

  .leftColumn {
    flex: 0 0 100%;
    display: flex;
    flex-flow: row nowrap;
    overflow: hidden;
    transition: flex-basis @transition-normal;
    min-width: 0;
  }

  &.showComment {
    .leftColumn {
      flex: 0 0 35%;
      flex-flow: column nowrap;
    }

    .left {
      flex: 0 0 auto;
      width: 100%;
      max-width: none;
      padding: 13px 13px 0;

      .info {
        max-width: 100%;
      }

      .cover {
        max-width: 220px;
        align-self: center;
      }

      .description {
        display: none;
      }
    }

    :global(.right) {
      flex: 1 1 auto;
      width: 100%;
      .lyricSelectContent {
        font-size: 14px;
      }
    }

    .comment {
      width: 65%;
      margin-left: 0;
      opacity: 1;
      transform: scaleX(1);
    }
  }
}
.left {
  flex: 0 0 40%;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  padding: 13px;
  overflow: hidden;
  transition: flex-basis @transition-normal;
}

.info {
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: flex-start;
  width: 100%;
  max-width: 300px;
  min-height: 0;
}
.img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: @radius-border;
  box-shadow: 0 4px 20px rgba(0, 0, 0, .25);

  &.vinylImg {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 62%;
    height: 62%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    box-shadow: 0 0 0 4px rgba(0, 0, 0, .45);
    opacity: .95;
  }
}
.cover {
  position: relative;
  width: 100%;
  max-width: 240px;
  aspect-ratio: 1 / 1;
  border-radius: @radius-border;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  box-shadow: 0 4px 20px rgba(0, 0, 0, .2);

  &.vinyl {
    border-radius: 50%;
    background:
      radial-gradient(circle at center, #1c1c1c 0 17%, #0d0d0d 17% 100%);
    box-shadow: 0 0 10px var(--color-primary-alpha-500), 0 0 0 8px rgba(0, 0, 0, .12);
    animation: coverSpin 22s linear infinite;
    animation-play-state: paused;
    // 黑胶纹路
    &:before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: repeating-radial-gradient(circle at center, rgba(255, 255, 255, .045) 0 2px, transparent 2px 7px);
      pointer-events: none;
    }
    // 中心孔
    &:after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 12px;
      height: 12px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: var(--color-content-background);
      box-shadow: 0 0 0 3px rgba(0, 0, 0, .55);
      z-index: 1;
    }
    &.playing {
      animation-play-state: running;
    }
  }
}
@keyframes coverSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.description {
  max-width: 300px;
  margin-top: 15px;
  padding-bottom: 15px;
  min-height: 0;
  p {
    line-height: 1.5;
    font-size: 14px;
    overflow-wrap: break-word;
    pointer-events: auto;
  }
  .label {
    color: var(--color-font-label);
    margin-right: 2px;
  }
  .link {
    display: inline;
    color: var(--color-primary);
    cursor: pointer;
    pointer-events: auto;
    transition: opacity @transition-fast;
    &:hover {
      opacity: .8;
      text-decoration: underline;
    }
  }
}


.comment {
  position: absolute;
  right: 0;
  top: 0;
  width: 50%;
  height: 100%;
  opacity: 1;
  margin-left: 10px;
  transform: scaleX(0);
}


</style>
