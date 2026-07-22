<template lang="pug">
dt#netease {{ $t('setting__netease') }}
dd
  h3#netease_login {{ $t('netease__login') }}
  div
    .p.gap-top
      span(:class="$style.statusLabel")
        span(v-if="isLoggedIn" :class="[$style.badge, $style.badgePrimary]") {{ $t('netease__login_status_on') }}
        span(v-if="isVip" :class="[$style.badge, $style.badgeSuccess]") {{ $t('netease__login_status_vip') }}
        span(v-if="!isLoggedIn" :class="[$style.badge, $style.badgeInfo]") {{ $t('netease__login_status_off') }}
    .p.gap-top
      input(:class="$style.cookieInput" type="text" :placeholder="$t('netease__cookie_input_tip')" :value="cookieValue" @input="handleCookieInput" @keydown.enter="handleSaveCookie")
    .p.gap-top
      base-btn.btn(min @click="handleSaveCookie") {{ $t('netease__cookie_save') }}
      base-btn.btn(min @click="handleClearCookie") {{ $t('netease__cookie_clear') }}
      base-btn.btn(min :disabled="!isLoggedIn" @click="handleRefreshInfo") {{ $t('netease__login_refresh') }}
      base-btn.btn(min @click="handleWebLogin") {{ $t('netease__web_login') }}
    .p.gap-top(v-if="isLoggedIn && userInfo")
      span(:class="$style.userInfo")
        | {{ userInfo.nickname }}
        span(v-if="userInfo.level" :class="$style.level") Lv.{{ userInfo.level }}
    .p.gap-top(:class="$style.help")
      span {{ $t('netease__cookie_help') }}

</template>

<script>
import { ref, computed, onMounted } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { userState, setWyUid, setWyVipType, setWyLikedSongs, setWyLikedPlaylistId, setWyPlaylists, applyWyPlaylists, setWySubscribedPlaylists, setWyFollowedArtists, setWySubscribedAlbums } from '@renderer/store/user'
import musicSdk from '@renderer/utils/musicSdk'
import { dialog } from '@renderer/plugins/Dialog'
import { useI18n } from '@root/lang'
import { rendererInvoke } from '@common/rendererIpc'
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'

export default {
  name: 'SettingNetEase',
  setup() {
    const t = useI18n()
    const router = useRouter()
    const cookieValue = ref(appSetting['common.wy_cookie'] || '')
    const userInfo = ref(null)
    const isLoading = ref(false)

    const isLoggedIn = computed(() => !!userState.wy_uid)
    const isVip = computed(() => userState.wy_vip_type > 0)

    const handleCookieInput = (e) => {
      cookieValue.value = e.target.value
    }

    const handleSaveCookie = async() => {
      const cookie = cookieValue.value.trim()
      if (!cookie) {
        void dialog({
          message: t('netease__cookie_input_tip'),
          confirmButtonText: t('btn_confirm'),
        })
        return
      }
      updateSetting({ 'common.wy_cookie': cookie })
      await refreshUserInfo(cookie)
    }

    const handleClearCookie = () => {
      cookieValue.value = ''
      updateSetting({ 'common.wy_cookie': '' })
      setWyUid(null)
      setWyVipType(0)
      setWyLikedSongs([])
      setWyLikedPlaylistId(null)
      setWyPlaylists([])
      setWySubscribedPlaylists([])
      setWyFollowedArtists([])
      setWySubscribedAlbums([])
      userInfo.value = null
      // 同时清除网易云网页登录窗口持久化 Session 中的真实 Cookie，
      // 否则再次打开网页登录会复用旧登录态，无法切换账号
      void rendererInvoke(WIN_MAIN_RENDERER_EVENT_NAME.netease_web_clear_cookie).catch((e) => {
        console.error('清除网易云网页 Cookie 失败:', e)
      })
    }

    const refreshUserInfo = async(cookie) => {
      if (isLoading.value) return
      isLoading.value = true
      try {
        const wyUser = musicSdk.wy.user
        if (!wyUser?.getUid) {
          isLoading.value = false
          return
        }
        const uid = await wyUser.getUid(cookie)
        if (uid) {
          setWyUid(String(uid))
          // Fetch user playlists to get nickname info and detect "我喜欢的音乐" playlist
          try {
            const playlists = await wyUser.getUserPlaylists(uid, cookie)
            if (playlists && playlists.length > 0) {
              userInfo.value = {
                nickname: playlists[0].creator?.nickname || `UID: ${uid}`,
                level: playlists[0].creator?.accountStatus,
              }
              // 网易云"我喜欢的音乐"歌单通常 specialType === 5，否则取第一个歌单
              const likedPlaylist = playlists.find(p => p.specialType === 5) || playlists[0]
              setWyLikedPlaylistId(String(likedPlaylist.id))
            }
            applyWyPlaylists(playlists)
          } catch (e) {
            userInfo.value = { nickname: `UID: ${uid}`, level: null }
          }
          // 同步账号内"我喜欢的音乐"歌曲集合，使爱心状态与账号一致
          try {
            const likedIds = await wyUser.getLikedSongList(uid, cookie)
            if (Array.isArray(likedIds)) {
              setWyLikedSongs(likedIds.map(String))
            }
          } catch (e) {
            console.warn('获取网易云喜欢列表失败', e)
          }
        } else {
          void dialog({
            message: t('netease__login_status_off'),
            confirmButtonText: t('btn_confirm'),
          })
        }
      } catch (err) {
        console.error('Failed to refresh NetEase user info:', err)
        void dialog({
          message: t('netease__login_status_off'),
          confirmButtonText: t('btn_confirm'),
        })
      } finally {
        isLoading.value = false
      }
    }

    const handleRefreshInfo = () => {
      if (!isLoggedIn.value) return
      void refreshUserInfo(appSetting['common.wy_cookie'])
    }

    const handleWebLogin = () => {
      // 跳转至主窗口内嵌的全屏网页登录页（<webview> 实现）
      void router.push({ path: '/netease/login' })
    }

    onMounted(() => {
      const cookie = appSetting['common.wy_cookie']
      if (cookie) {
        void refreshUserInfo(cookie)
      }
    })

    return {
      appSetting,
      updateSetting,
      cookieValue,
      userInfo,
      isLoggedIn,
      isVip,
      isLoading,
      handleCookieInput,
      handleSaveCookie,
      handleClearCookie,
      handleRefreshInfo,
      handleWebLogin,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.statusLabel {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: @radius-border;
  display: inline-block;
}

.badgePrimary {
  background-color: var(--color-primary-alpha-300);
  color: var(--color-primary-font-active);
}

.badgeSuccess {
  background-color: #52c41a;
  color: #fff;
  margin-left: 8px;
}

.badgeInfo {
  background-color: var(--color-button-background);
  color: var(--color-font-label);
}

.cookieInput {
  width: 100%;
  max-width: 500px;
  padding: 6px 10px;
  border: 1px solid var(--color-primary-light-100-alpha-500);
  border-radius: @radius-border;
  background-color: var(--color-main-background);
  color: var(--color-font);
  font-size: 13px;
  outline: none;
  transition: border-color @transition-fast;

  &:focus {
    border-color: var(--color-primary);
  }

  &::placeholder {
    color: var(--color-font-label);
  }
}

.userInfo {
  font-size: 14px;
  color: var(--color-font);

  .level {
    margin-left: 8px;
    color: var(--color-primary);
    font-size: 12px;
  }
}

.help {
  font-size: 12px;
  color: var(--color-font-label);
  line-height: 1.6;
  max-width: 500px;
}
</style>
