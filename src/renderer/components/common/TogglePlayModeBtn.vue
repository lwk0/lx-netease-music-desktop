<template>
  <material-popup-btn ref="btn_ref" :class="$style.btnContent">
    <button :class="$style.btn" :aria-label="nextTogglePlayName">
      <svg
        v-if="appSetting['player.togglePlayMethod'] == 'listLoop'"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        xlink="http://www.w3.org/1999/xlink"
        height="80%" viewBox="0 0 24 24" space="preserve"
      >
        <use xlink:href="#icon-list-loop" />
      </svg>
      <svg
        v-else-if="appSetting['player.togglePlayMethod'] == 'random'"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        xlink="http://www.w3.org/1999/xlink"
        width="100%" viewBox="0 0 24 24" space="preserve"
      >
        <use xlink:href="#icon-list-random" />
      </svg>
      <svg
        v-else-if="appSetting['player.togglePlayMethod'] == 'list'"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        xlink="http://www.w3.org/1999/xlink"
        width="100%" viewBox="0 0 32 32" space="preserve"
      >
        <use xlink:href="#icon-list-order" />
      </svg>
      <svg
        v-else-if="appSetting['player.togglePlayMethod'] == 'singleLoop'"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        xlink="http://www.w3.org/1999/xlink"
        width="100%" viewBox="0 0 24 24" space="preserve"
      >
        <use xlink:href="#icon-single-loop" />
      </svg>
      <svg
        v-else-if="appSetting['player.togglePlayMethod'] == 'heartbeat'"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        xlink="http://www.w3.org/1999/xlink"
        width="19" height="19" viewBox="0 0 1165 1024" space="preserve"
      >
        <use xlink:href="#icon-heartbeat" />
      </svg>
      <svg v-else version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 32 32" space="preserve">
        <use xlink:href="#icon-single" />
      </svg>
    </button>
    <template #content>
      <div :class="$style.setting">
        <button :class="$style.btn" :aria-label="$t('player__play_toggle_mode_list_loop')" @click="toggleMode('listLoop')">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" viewBox="0 0 24 24" space="preserve">
            <use xlink:href="#icon-list-loop" />
          </svg>
        </button>
        <button :class="$style.btn" :aria-label="$t('player__play_toggle_mode_random')" @click="toggleMode('random')">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 24 24" space="preserve">
            <use xlink:href="#icon-list-random" />
          </svg>
        </button>
        <button :class="$style.btn" :aria-label="$t('player__play_toggle_mode_list')" @click="toggleMode('list')">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 32 32" space="preserve">
            <use xlink:href="#icon-list-order" />
          </svg>
        </button>
        <button :class="$style.btn" :aria-label="$t('player__play_toggle_mode_single_loop')" @click="toggleMode('singleLoop')">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 24 24" space="preserve">
            <use xlink:href="#icon-single-loop" />
          </svg>
        </button>
        <button v-if="isShowHeartbeat" :class="$style.btn" :aria-label="$t('player__play_toggle_mode_heartbeat')" @click="toggleMode('heartbeat')">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="19" height="19" viewBox="0 0 1165 1024" space="preserve">
            <use xlink:href="#icon-heartbeat" />
          </svg>
        </button>
        <button :class="$style.btn" :aria-label="$t('player__play_toggle_mode_off')" @click="toggleMode('none')">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 32 32" space="preserve">
            <use xlink:href="#icon-single" />
          </svg>
        </button>
      </div>
    </template>
  </material-popup-btn>
</template>

<script setup>
import { ref, computed } from '@common/utils/vueTools'
import { appSetting } from '@renderer/store/setting'
import { playMusicInfo } from '@renderer/store/player/state'
import { playList } from '@renderer/core/player/action'
import { setTempList } from '@renderer/store/list/action'
import { userState } from '@renderer/store/user/state'
import useNextTogglePlay from '@renderer/utils/compositions/useNextTogglePlay'
import musicSdk from '@renderer/utils/musicSdk'
import { LIST_IDS } from '@common/constants'
import { toast, toastError } from '@renderer/utils/toast'
import { normalizeWySongs } from '@renderer/utils'

const btn_ref = ref(null)

const {
  nextTogglePlayName,
  toggleNextPlayMode,
} = useNextTogglePlay()

const getHeartbeatSongId = (musicInfo) => musicInfo?.meta?.songId ?? musicInfo?.songmid ?? musicInfo?.id
const getHeartbeatPlaylistId = () => userState.wy_liked_playlist_id ?? userState.wy_subscribed_playlists[0]?.id ?? null

const isShowHeartbeat = computed(() => {
  const musicInfo = playMusicInfo.musicInfo
  if (!musicInfo || musicInfo.source !== 'wy') return false
  const songId = getHeartbeatSongId(musicInfo)
  return !!songId && userState.wy_liked_song_ids.has(String(songId)) && !!getHeartbeatPlaylistId()
})

const loadHeartbeatMode = async() => {
  const musicInfo = playMusicInfo.musicInfo
  if (!musicInfo || musicInfo.source !== 'wy') {
    toastError(window.i18n.t('player__play_toggle_mode_heartbeat_unavailable') || '当前歌曲不支持心动模式')
    return
  }
  const songId = getHeartbeatSongId(musicInfo)
  const playlistId = getHeartbeatPlaylistId()
  if (!songId || !userState.wy_liked_song_ids.has(String(songId)) || !playlistId) {
    toastError(window.i18n.t('player__play_toggle_mode_heartbeat_unavailable') || '当前歌曲不支持心动模式')
    return
  }

  toast(window.i18n.t('player__play_toggle_mode_heartbeat'))
  try {
    const res = await musicSdk.wy.dailyRec.getHeartbeatModeList(appSetting['common.wy_cookie'], playlistId, songId)
    if (!res?.list?.length) {
      toast('心动模式获取歌曲为空')
      return
    }
    // 当前歌曲置顶，并用 normalizeWySongs 规范化后再按 id 去重，避免原始对象缺少 id 导致写入 SQLite 失败
    const seen = new Set()
    const heartbeatList = normalizeWySongs([musicInfo, ...res.list]).filter((m) => {
      if (!m) return false
      const key = m.id
      if (key == null || seen.has(key)) return false
      seen.add(key)
      return true
    })
    if (!heartbeatList.length) {
      toast('心动模式没有可播放的歌曲')
      return
    }
    await setTempList('heartbeat', heartbeatList)
    playList(LIST_IDS.TEMP, 0)
  } catch (err) {
    console.error(err)
    toastError('心动模式加载失败' + (err?.message ? '：' + err.message : ''))
  }
}

const toggleMode = (mode) => {
  btn_ref.value.hide()
  if (mode === 'heartbeat') {
    toggleNextPlayMode(mode)
    void loadHeartbeatMode()
  } else {
    toggleNextPlayMode(mode)
  }
}

</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.btnContent {
  flex: none;
  height: 100%;
}

.btn {
  position: relative;
  // color: var(--color-button-font);
  justify-content: center;
  align-items: center;
  transition: color @transition-normal;
  cursor: pointer;
  background-color: transparent;
  border: none;
  width: 24px;
  display: flex;
  flex-flow: column nowrap;
  padding: 0;

  svg {
    transition: opacity @transition-fast;
    opacity: .6;
    filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.2));
  }
  &:hover {
    svg {
      opacity: .9;
    }
  }
  &:active {
    svg {
      opacity: 1;
    }
  }
}

.setting {
  display: flex;
  flex-flow: row nowrap;
  font-size: 14px;
  gap: 10px;
}


</style>
