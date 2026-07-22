<template>
  <button
    :class="[$style.likeBtn, $style[size], { [$style.active]: isLiked, [$style.disabled]: !canInteract }]"
    :aria-label="likeTitle"
    :title="likeTitle"
    ignore-tip
    :disabled="!canInteract"
    @click.stop="handleToggle"
  >
    <svg v-if="isLiked" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" viewBox="0 0 24 24" space="preserve">
      <use xlink:href="#icon-love" />
    </svg>
    <svg v-else version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" viewBox="0 0 24 24" space="preserve">
      <use xlink:href="#icon-love-outline" />
    </svg>
  </button>
</template>

<script lang="ts">
import { computed } from '@common/utils/vueTools'
import { playMusicInfo } from '@renderer/store/player/state'
import { userState } from '@renderer/store/user'
import { appSetting } from '@renderer/store/setting'
import { toggleWyLikedSong } from '@renderer/store/user/action'
import { useI18n } from '@renderer/plugins/i18n'
import { toast, toastSuccess } from '@renderer/utils/toast'

export default {
  name: 'WyLikeBtn',
  props: {
    musicInfo: {
      type: Object,
      default: null,
    },
    size: {
      type: String,
      default: 'sm',
    },
  },
  setup(props: { musicInfo: any, size: string }) {
    const t = useI18n()

    const getMusicInfo = (m: any) => {
      if (m == null) return null
      if (typeof m === 'object' && 'progress' in m && m.metadata?.musicInfo) return m.metadata.musicInfo
      return m
    }

    const currentMusic = computed(() => getMusicInfo(props.musicInfo ?? playMusicInfo.musicInfo))
    const songId = computed(() => {
      const id = currentMusic.value?.songmid ?? currentMusic.value?.meta?.songId
      return id != null ? String(id) : null
    })
    const isWySong = computed(() => currentMusic.value?.source === 'wy')
    const isLoggedIn = computed(() => !!appSetting['common.wy_cookie'] && !!userState.wy_uid)

    // 仅在“网易云歌曲 + 已登录”时可交互；其它情况（其它平台 / 未登录）显示为灰色禁用态
    const canInteract = computed(() => isWySong.value && isLoggedIn.value)

    // 网易云账号内的喜欢状态（“我喜欢的音乐”歌单）
    const isWyLiked = computed(() => {
      const id = songId.value
      if (!canInteract.value || id == null) return false
      return userState.wy_liked_song_ids.has(id)
    })

    const isLiked = computed(() => isWySong.value && isLoggedIn.value ? isWyLiked.value : false)

    const handleToggle = async() => {
      const m = currentMusic.value
      if (!canInteract.value) return
      if (!m) {
        toast(t('netease__like_no_music'))
        return
      }
      const id = songId.value
      if (id == null) {
        toast(t('netease__like_failed'))
        return
      }
      const willLike = !isWyLiked.value
      // 乐观更新：先立即改变爱心状态，再异步请求接口，失败回滚
      if (willLike) userState.wy_liked_song_ids.add(id)
      else userState.wy_liked_song_ids.delete(id)
      try {
        await toggleWyLikedSong(id, willLike)
        toastSuccess(willLike ? 'netease__like_success' : 'netease__unlike_success')
      } catch (e: any) {
        // 回滚乐观更新
        if (willLike) userState.wy_liked_song_ids.delete(id)
        else userState.wy_liked_song_ids.add(id)
        console.error('喜欢操作失败', e)
        toast(e?.message || t('netease__like_failed'))
      }
    }

    const likeTitle = computed(() => {
      if (!isWySong.value) return t('netease__like_not_wy')
      if (!isLoggedIn.value) return t('netease__like_login_required')
      return isLiked.value ? t('netease__liked') : t('netease__like')
    })

    return {
      isLiked,
      canInteract,
      handleToggle,
      likeTitle,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.likeBtn {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--like-btn-size, 24px);
  height: var(--like-btn-size, 24px);
  background-color: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-button-font);
  opacity: .6;
  transition: @transition-fast;
  transition-property: color, opacity;
  padding: 0;

  &.md {
    height: 100%;
    width: auto;
    aspect-ratio: 1;
  }

  svg {
    width: 100%;
    height: 100%;
    flex: none;
    filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.2));
  }

  &:hover {
    opacity: 1;
  }
  &.active {
    color: #ec4141;
    opacity: 1;
  }
  // 其它平台歌曲 / 未登录：灰色禁用态
  &.disabled {
    opacity: .3;
    cursor: not-allowed;
    color: var(--color-button-font);
    &:hover {
      opacity: .3;
    }
  }
}
</style>
