<template lang="pug">
dt#netease {{ $t('setting__netease') }}
dd
  h3#netease_login {{ $t('netease__login') }}

  // 登录状态卡片
  .p.gap-top(:class="$style.statusCard")
    span(:class="$style.statusLabel")
      span(v-if="isLoggedIn" :class="[$style.badge, $style.badgePrimary]") {{ $t('netease__login_status_on') }}
      span(v-if="isVip" :class="[$style.badge, $style.badgeSuccess]") {{ $t('netease__login_status_vip') }}
      span(v-if="!isLoggedIn" :class="[$style.badge, $style.badgeInfo]") {{ $t('netease__login_status_off') }}
    img(v-if="userInfo?.avatar" :class="$style.userAvatar" :src="userInfo.avatar" :alt="userInfo.nickname")
    span(v-else-if="userInfo" :class="[$style.userAvatar, $style.userAvatarFallback]") {{ (userInfo.nickname || 'U').slice(0, 1).toUpperCase() }}
    span(v-if="userInfo" :class="$style.userName") {{ userInfo.nickname }}
    span(v-if="userInfo?.level" :class="$style.level") Lv.{{ userInfo.level }}
    span(v-if="isLoggedIn && !userInfo" :class="$style.loading") {{ $t('netease__loading') }}

  // 主操作按钮
  .p.gap-top(:class="$style.actionRow")
    base-btn.btn(min @click="handleWebLogin") {{ isLoggedIn ? $t('netease__login_again') : $t('netease__web_login') }}
    base-btn.btn(v-if="isLoggedIn" min :disabled="isLoading" @click="handleRefreshInfo") {{ $t('netease__login_refresh') }}
    base-btn.btn(v-if="isLoggedIn" min @click="handleLogout") {{ $t('netease__logout') }}

  // 已保存账号
  .p.gap-top
    .p(:class="$style.sectionTitle") {{ $t('netease__account_saved_list') }}
    .p(v-if="!savedAccounts.length" :class="$style.empty") {{ $t('netease__account_empty') }}
    ul(v-else :class="$style.accountList")
      li(v-for="acc in savedAccounts" :key="acc.id" :class="getAccountItemClass(acc)")
        img(v-if="acc.avatar" :class="$style.accountAvatar" :src="acc.avatar" :alt="acc.nickname" loading="lazy")
        span(v-else :class="[$style.accountAvatar, $style.accountAvatarFallback]") {{ (acc.nickname || 'C').slice(0, 1).toUpperCase() }}
        span(:class="$style.accountName" :title="acc.nickname") {{ acc.nickname || `Cookie ${acc.cookie.slice(0, 8)}...` }}
        span(v-if="acc.vip > 0" :class="$style.vipBadge") VIP
        span(:class="$style.cookiePreview") {{ acc.cookie.slice(0, 28) }}...
        span(:class="$style.accountActions")
          span(v-if="acc.cookie === currentCookie" :class="$style.activeBadge") {{ $t('netease__account_current') }}
          base-btn.btn(v-else min :class="$style.actionBtn" @click="handleSwitchAccount(acc)") {{ $t('netease__account_switch') }}
          svg-icon(:class="$style.accountActionIcon" name="copy" :title="$t('netease__account_copy_cookie')" @click="handleCopyCookie(acc)")
          svg-icon(:class="$style.accountActionIcon" name="times" :title="$t('btn_delete')" @click="handleDeleteAccount(acc)")

  // 保存当前账号
  .p.gap-top(v-if="isLoggedIn && !isCurrentAccountSaved")
    base-btn.btn(min @click="handleSaveCurrentAccount()") {{ $t('netease__account_save_current') }}

  // 手动输入 Cookie（常驻显示）
  .p.gap-top
    .p(:class="$style.manualTitle") {{ $t('netease__cookie_manual_toggle') }}
    .p(:class="$style.manualPanel")
      input(type="text" :class="$style.cookieInput" :placeholder="$t('netease__cookie_input_tip')" :value="cookieValue" @input="handleCookieInput")
      .p(:class="$style.manualActions")
        base-btn.btn(min :disabled="isLoading" @click="handleSaveCookie") {{ $t('netease__cookie_save_login') }}
        base-btn.btn(min @click="handleClearCookie") {{ $t('netease__cookie_clear') }}
      .p(:class="$style.help") {{ $t('netease__cookie_help') }}

</template>

<script>
import { ref, computed, onMounted, watch, useCssModule } from '@common/utils/vueTools'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { userState, setWyUid, setWyVipType, setWyLikedSongs, setWyLikedPlaylistId, setWyPlaylists, applyWyPlaylists, setWySubscribedPlaylists, setWyFollowedArtists, setWySubscribedAlbums } from '@renderer/store/user'
import musicSdk from '@renderer/utils/musicSdk'
import { dialog } from '@renderer/plugins/Dialog'
import { useI18n } from '@root/lang'
import { rendererInvoke } from '@common/rendererIpc'
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { toast } from '@renderer/utils/toast'

const generateId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const copyText = async(text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (e) {
    const input = document.createElement('textarea')
    input.value = text
    input.style.position = 'fixed'
    input.style.left = '-9999px'
    document.body.appendChild(input)
    input.select()
    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(input)
    }
  }
}

export default {
  name: 'SettingNetEase',
  setup() {
    const t = useI18n()
    const cookieValue = ref(appSetting['common.wy_cookie'] || '')
    const userInfo = ref(null)
    const isLoading = ref(false)

    const isLoggedIn = computed(() => !!userState.wy_uid)
    const isVip = computed(() => userState.wy_vip_type > 0)
    const currentCookie = computed(() => appSetting['common.wy_cookie'] || '')
    const savedAccounts = computed(() => appSetting['common.wy_cookie_accounts'] || [])
    const isCurrentAccountSaved = computed(() => {
      if (!currentCookie.value) return false
      return savedAccounts.value.some(a => a.cookie === currentCookie.value)
    })

    const handleCookieInput = (e) => {
      cookieValue.value = e.target.value
    }

    const applyCookie = async(cookie) => {
      cookieValue.value = cookie
      updateSetting({ 'common.wy_cookie': cookie })
      if (cookie) {
        await refreshUserInfo(cookie)
      } else {
        handleClearCookie()
      }
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
      await refreshUserInfo(cookie, { silent: true })
      const verified = !!userState.wy_uid
      if (verified) {
        updateSetting({ 'common.wy_cookie': cookie })
        cookieValue.value = cookie
      }
      // 无论验证是否成功，用户明确点击了保存，均写入账号列表
      handleSaveCurrentAccount(cookie)
      if (verified) {
        toast(t('netease__cookie_save_success'))
      } else {
        toast(t('netease__cookie_saved_unverified'))
      }
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

    const handleLogout = () => {
      void dialog({
        message: t('netease__logout_confirm'),
        confirmButtonText: t('btn_confirm'),
        cancelButtonText: t('btn_cancel'),
      }).then((confirmed) => {
        if (!confirmed) return
        handleClearCookie()
      })
    }

    const refreshUserInfo = async(cookie, options = {}) => {
      const { silent = false } = options
      if (isLoading.value) return
      isLoading.value = true
      try {
        const wyUser = musicSdk.wy.user
        if (!wyUser?.getUid) {
          isLoading.value = false
          return
        }
        // getProfile 与 getUid 同接口，但额外返回昵称/头像（含缓存，不增加请求）
        const profile = await wyUser.getProfile(cookie).catch(() => null)
        const uid = profile?.uid ?? await wyUser.getUid(cookie)
        if (uid) {
          setWyUid(String(uid))
          // Fetch user playlists to get nickname info and detect "我喜欢的音乐" playlist
          try {
            const playlists = await wyUser.getUserPlaylists(uid, cookie)
            if (playlists && playlists.length > 0) {
              userInfo.value = {
                nickname: playlists[0].creator?.nickname || profile?.nickname || `UID: ${uid}`,
                level: playlists[0].creator?.accountStatus,
                avatar: profile?.avatarUrl || '',
              }
              // 网易云"我喜欢的音乐"歌单通常 specialType === 5，否则取第一个歌单
              const likedPlaylist = playlists.find(p => p.specialType === 5) || playlists[0]
              setWyLikedPlaylistId(String(likedPlaylist.id))
            }
            applyWyPlaylists(playlists)
          } catch (e) {
            userInfo.value = { nickname: profile?.nickname || `UID: ${uid}`, level: null, avatar: profile?.avatarUrl || '' }
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
          if (!silent) {
            void dialog({
              message: t('netease__login_status_off'),
              confirmButtonText: t('btn_confirm'),
            })
          }
        }
      } catch (err) {
        console.error('Failed to refresh NetEase user info:', err)
        if (!silent) {
          void dialog({
            message: t('netease__login_status_off'),
            confirmButtonText: t('btn_confirm'),
          })
        }
      } finally {
        isLoading.value = false
      }
    }

    const handleRefreshInfo = () => {
      if (!isLoggedIn.value) return
      void refreshUserInfo(appSetting['common.wy_cookie'])
    }

    const handleWebLogin = async() => {
      // 主进程会独立打开一个网易云登录窗口；用户在其中走完 QQ / 微信 / 手机号等流程
      // → MUSIC_U Cookie 落进 partition → 轮询拿到 Cookie → 主进程关登录窗口并返回 Cookie。
      // 我们拿到 Cookie 写进 setting、刷新用户信息、按情况 toast。
      let cookie = null
      try {
        cookie = await rendererInvoke(WIN_MAIN_RENDERER_EVENT_NAME.netease_open_login_window)
      } catch (e) {
        console.error('[LX netease] open login window failed', e)
        toast(t('netease__web_login_failed'))
        return
      }
      if (!cookie) return // 用户取消 / 超时
      updateSetting({ 'common.wy_cookie': cookie })
      cookieValue.value = cookie
      await refreshUserInfo(cookie)
      if (userState.wy_uid) {
        handleSaveCurrentAccount(cookie)
        toast(t('netease__web_login_success'))
      } else {
        // 拿到 Cookie 但 getUid 失败：仍让用户保存（类似手动粘贴的「验证失败」路径）
        handleSaveCurrentAccount(cookie)
        toast(t('netease__cookie_saved_unverified'))
      }
    }

    const handleSaveCurrentAccount = (cookieToSave = currentCookie.value) => {
      const cookie = cookieToSave || currentCookie.value
      if (!cookie) return
      const accounts = [...savedAccounts.value]
      const existingIndex = accounts.findIndex(a => a.cookie === cookie)
      const nickname = userInfo.value?.nickname || `Cookie ${cookie.slice(0, 8)}...`
      const account = {
        id: existingIndex >= 0 ? accounts[existingIndex].id : generateId(),
        nickname,
        cookie,
        avatar: userInfo.value?.avatar || accounts[existingIndex]?.avatar || '',
        vip: accounts[existingIndex]?.vip || userState.wy_vip_type || 0,
        createdAt: existingIndex >= 0 ? accounts[existingIndex].createdAt : Date.now(),
      }
      if (existingIndex >= 0) {
        accounts[existingIndex] = account
      } else {
        accounts.push(account)
      }
      // 立即写入 reactive 列表（避免等 IPC 来回期间 UI 显示「暂无保存的账号」闪一下），
      // 再异步同步给主进程持久化。
      appSetting['common.wy_cookie_accounts'] = accounts
      updateSetting({ 'common.wy_cookie_accounts': accounts })
      toast(t('netease__account_save_success'))
    }

    const handleSwitchAccount = (account) => {
      void applyCookie(account.cookie).then(() => {
        toast(t('netease__account_switch_success'))
      })
    }

    const handleCopyCookie = async(account) => {
      const ok = await copyText(account.cookie)
      if (ok) {
        toast(t('netease__copy_success'))
      } else {
        toast(t('netease__copy_failed'))
      }
    }

    // CSS Modules：$style 只在模板中自动可用，script 里必须用 useCssModule() 获取
    const $style = useCssModule()

    const getAccountItemClass = (account) => {
      return {
        [$style.accountItem]: true,
        [$style.accountItemActive]: account.cookie === currentCookie.value,
      }
    }

    const handleDeleteAccount = (account) => {
      void dialog({
        message: t('netease__account_delete_confirm', { name: account.nickname || account.id }),
        confirmButtonText: t('btn_confirm'),
        cancelButtonText: t('btn_cancel'),
      }).then((confirmed) => {
        if (!confirmed) return
        const accounts = savedAccounts.value.filter(a => a.id !== account.id)
        // 同上：先本地 reactive 立即删，避免 IPC 来回期间残留
        appSetting['common.wy_cookie_accounts'] = accounts
        updateSetting({ 'common.wy_cookie_accounts': accounts })
        toast(t('netease__account_delete_success'))
        if (currentCookie.value === account.cookie) {
          handleClearCookie()
        }
      })
    }

    watch(currentCookie, (newCookie) => {
      if (cookieValue.value !== newCookie) cookieValue.value = newCookie
    })

    // 为缺失头像的已保存账号补拉资料（Cookie 失效的账号静默跳过）
    const syncAccountAvatars = async() => {
      const accounts = [...savedAccounts.value]
      let changed = false
      await Promise.all(accounts.map(async(account) => {
        if (account.avatar || !account.cookie) return
        try {
          const profile = await musicSdk.wy.user.getProfile(account.cookie)
          if (profile?.avatarUrl || profile?.vipType) {
            if (profile?.avatarUrl) account.avatar = profile.avatarUrl
            if (profile?.nickname && !account.nickname) account.nickname = profile.nickname
            account.vip = profile.vipType || 0
            changed = true
          }
        } catch (e) {
          // 无效 Cookie 不阻塞其余账号
        }
      }))
      if (changed) {
        appSetting['common.wy_cookie_accounts'] = accounts
        updateSetting({ 'common.wy_cookie_accounts': accounts })
      }
    }

    onMounted(() => {
      const cookie = appSetting['common.wy_cookie']
      if (cookie) {
        void refreshUserInfo(cookie)
      }
      void syncAccountAvatars()
    })

    return {
      appSetting,
      updateSetting,
      cookieValue,
      userInfo,
      isLoggedIn,
      isVip,
      isLoading,
      currentCookie,
      savedAccounts,
      isCurrentAccountSaved,
      handleCookieInput,
      handleSaveCookie,
      handleClearCookie,
      handleRefreshInfo,
      handleWebLogin,
      handleLogout,
      handleSaveCurrentAccount,
      handleSwitchAccount,
      handleCopyCookie,
      handleDeleteAccount,
      getAccountItemClass,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.statusCard {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

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
}

.badgeInfo {
  background-color: var(--color-button-background);
  color: var(--color-font-label);
}

.userName {
  font-size: 14px;
  color: var(--color-font);
  font-weight: 500;
}

.level {
  font-size: 12px;
  color: var(--color-primary);
}

.loading {
  font-size: 13px;
  color: var(--color-font-label);
}

.actionRow {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sectionTitle {
  font-size: 13px;
  color: var(--color-font-label);
  margin-bottom: 8px;
}

.empty {
  font-size: 13px;
  color: var(--color-font-label);
}

.accountList {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 500px;
}

.accountItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: @radius-border;
  background-color: var(--color-primary-light-100-alpha-100);
  color: var(--color-font);
  font-size: 13px;
  transition: background-color @transition-fast, border-color @transition-fast;

  &:hover {
    background-color: var(--color-primary-light-100-alpha-200);
  }

  &.accountItemActive {
    border-color: var(--color-primary);
    background-color: var(--color-primary-light-100-alpha-200);
  }
}

.accountAvatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
}

.accountAvatarFallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary-alpha-300);
  color: var(--color-primary-font-active);
  font-size: 13px;
  font-weight: 500;
}

.accountName {
  flex: 0 1 auto;
  max-width: 140px;
  .mixin-ellipsis-1();
  font-weight: 500;
}

.cookiePreview {
  flex: 1 1 auto;
  font-size: 11px;
  color: var(--color-font-label);
  .mixin-ellipsis-1();
  font-family: monospace;
}

.accountActions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.activeBadge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: @radius-border;
  border: 1px solid var(--color-primary);
  background-color: var(--color-main-background);
  color: var(--color-primary);
  flex-shrink: 0;
}

.vipBadge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: @radius-border;
  background-color: #d85a30;
  color: #fff;
  flex-shrink: 0;
}

.actionBtn {
  font-size: 12px;
}

.accountActionIcon {
  width: 12px;
  height: 12px;
  cursor: pointer;
  opacity: 0.55;
  transition: opacity @transition-fast;

  &:hover {
    opacity: 1;
  }
}

.userAvatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;

  &.userAvatarFallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-primary-alpha-300);
    color: var(--color-primary-font-active);
    font-size: 13px;
    font-weight: 500;
  }
}

.manualTitle {
  font-size: 13px;
  color: var(--color-font-label);
  margin-bottom: 8px;
}

.manualPanel {
  margin-top: 0;
  max-width: 500px;
}

.cookieInput {
  box-sizing: border-box;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--color-primary-light-100-alpha-500);
  border-radius: @radius-border;
  background-color: var(--color-main-background);
  color: var(--color-font);
  font-size: 13px;
  font-family: monospace;
  outline: none;
  transition: border-color @transition-fast;

  &:focus {
    border-color: var(--color-primary);
  }

  &::placeholder {
    color: var(--color-font-label);
  }
}

.manualActions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.help {
  font-size: 12px;
  color: var(--color-font-label);
  line-height: 1.6;
  margin-top: 10px;
}
</style>
