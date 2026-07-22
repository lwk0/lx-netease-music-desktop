<template lang="pug">
div(:class="$style.container")
  //- Login required prompt
  div(v-if="!isLoggedIn" :class="$style.loginPrompt")
    p {{ $t('netease__no_login') }}
    base-btn.btn(min @click="goToSetting") {{ $t('netease__login') }}

  //- Main content
  div(v-else :class="$style.content")
    //- Header with user info
    div(:class="$style.header")
      div(:class="$style.headerLeft")
        h2(:class="$style.title") {{ $t('netease__title') }}
        span(v-if="isVip" :class="$style.vipBadge") VIP
      div(:class="$style.headerRight")
        base-btn.btn(:class="[$style.btn, {[$style.activeTab]: activeTab === 'dailyRec'}]" min @click="setTab('dailyRec')") {{ $t('netease__daily_rec') }}
        base-btn.btn(:class="[$style.btn, {[$style.activeTab]: activeTab === 'stylized'}]" min @click="openStylizedSelect") {{ $t('netease__stylized_rec') }}
        base-btn.btn(:class="[$style.btn, {[$style.activeTab]: activeTab === 'playlists'}]" min @click="setTab('playlists')") {{ $t('netease__my_playlists') }}
        base-btn.btn(:class="[$style.btn, {[$style.activeTab]: activeTab === 'artists'}]" min @click="setTab('artists')") {{ $t('netease__followed_artists') }}
        base-btn.btn(:class="[$style.btn, {[$style.activeTab]: activeTab === 'albums'}]" min @click="setTab('albums')") {{ $t('netease__subscribed_albums') }}

    //- Tab content
    div(:class="$style.tabContent")
      //- Playlists tab
      div(v-show="activeTab === 'playlists'" :class="$style.tabPane")
        playlists-tab(v-if="activeTab === 'playlists'" :uid="uid" :cookie="cookie")

    //- Daily recommendations tab
    div(v-show="activeTab === 'dailyRec'" :class="$style.tabPane")
      daily-rec-tab(v-if="activeTab === 'dailyRec'" @switch-stylized="setTab('stylized')")

    //- Stylized recommendations tab
    div(v-show="activeTab === 'stylized'" :class="$style.tabPane")
      daily-rec-tab(v-if="activeTab === 'stylized'" stylized-mode @switch-stylized="setTab('dailyRec')" @open-stylized-modal="showStylizedModal = true")

    //- Stylized tag selection modal (shared, controlled by parent)
    stylized-select-modal(:show="showStylizedModal" @confirm="onStylizedConfirm" @close="showStylizedModal = false")

    //- Followed artists tab
    div(v-show="activeTab === 'artists'" :class="$style.tabPane")
      artists-tab(v-if="activeTab === 'artists'" :uid="uid" :cookie="cookie")

    //- Subscribed albums tab
    div(v-show="activeTab === 'albums'" :class="$style.tabPane")
      albums-tab(v-if="activeTab === 'albums'" :uid="uid" :cookie="cookie")
</template>

<script lang="ts">
import { ref, computed, watch } from '@common/utils/vueTools'
import { appSetting } from '@renderer/store/setting'
import { userState } from '@renderer/store/user'
import { useRouter, useRoute } from '@common/utils/vueRouter'
import PlaylistsTab from './components/PlaylistsTab.vue'
import DailyRecTab from './components/DailyRecTab.vue'
import ArtistsTab from './components/ArtistsTab.vue'
import AlbumsTab from './components/AlbumsTab.vue'
import StylizedSelectModal from './components/StylizedSelectModal.vue'
import { stylizedSelection } from './components/stylizedState'

export default {
  name: 'MyNetease',
  components: {
    PlaylistsTab,
    DailyRecTab,
    ArtistsTab,
    AlbumsTab,
    StylizedSelectModal,
  },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const VALID_TABS = ['dailyRec', 'stylized', 'playlists', 'artists', 'albums']
    const getInitialTab = (): string => {
      const t = route.query.tab
      return typeof t === 'string' && VALID_TABS.includes(t) ? t : 'dailyRec'
    }
    const activeTab = ref(getInitialTab())
    const showStylizedModal = ref(false)

    // URL 中固化当前 Tab：从子页（歌手/专辑/歌单详情）router.back() 返回时，
    // 重建的 MyNetease 会读取 query.tab 还原到对应 Tab，而不是默认的每日推荐。
    watch(() => route.query.tab, () => {
      const t = getInitialTab()
      if (t !== activeTab.value) activeTab.value = t
    })

    // 切换 Tab 时用 replace 更新 URL（不污染返回历史），同时即时更新视图
    const setTab = (tab: string) => {
      activeTab.value = tab
      const q = { ...route.query }
      if (tab === 'dailyRec') delete q.tab
      else q.tab = tab
      void router.replace({ path: '/myNetease', query: q })
    }

    const isLoggedIn = computed(() => !!userState.wy_uid)
    const isVip = computed(() => userState.wy_vip_type > 0)
    const uid = computed(() => userState.wy_uid)
    const cookie = computed(() => appSetting['common.wy_cookie'])

    const goToSetting = () => {
      void router.push({ path: '/setting', query: { name: 'SettingNetEase' } })
    }

    // 点击顶部「风格化推荐」只弹出选择窗口，不切换界面；选完风格后再跳转
    const openStylizedSelect = () => {
      showStylizedModal.value = true
    }

    const onStylizedConfirm = (selection: { categoryId: number, tagIds: number[] }) => {
      stylizedSelection.value = selection
      showStylizedModal.value = false
      setTab('stylized')
    }

    return {
      activeTab,
      showStylizedModal,
      isLoggedIn,
      isVip,
      uid,
      cookie,
      goToSetting,
      openStylizedSelect,
      onStylizedConfirm,
      setTab,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  overflow: hidden;
}

.loginPrompt {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 15px;

  p {
    font-size: 16px;
    color: var(--color-font-label);
  }
}

.content {
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  overflow: hidden;
}

.header {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  padding: 10px 15px;
  border-bottom: 1px solid var(--color-primary-light-100-alpha-300);
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-size: 16px;
  margin: 0;
  color: var(--color-font);
}

.vipBadge {
  background: linear-gradient(135deg, #f0c36d, #e8a317);
  color: #fff;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: bold;
}

.headerRight {
  display: flex;
  gap: 8px;

  .btn {
    padding: 4px 14px;
    font-size: 13px;
    color: var(--color-font-label);
    background-color: var(--color-primary-light-400-alpha-700) !important;
    border: none;
    border-radius: @radius-border;
    transition: background-color @transition-fast, color @transition-fast;

    &:hover {
      color: var(--color-font);
      background-color: var(--color-primary-light-300-alpha-700) !important;
    }

    &.activeTab {
      color: #fff;
      background-color: var(--color-primary) !important;
      border-radius: @radius-border;
    }
  }
}

.tabContent {
  flex: auto;
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
    background-color: transparent;
  }
  &::-webkit-scrollbar-track {
    background-color: var(--color-primary-light-100-alpha-800);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 3px;
    background-color: var(--color-primary-alpha-600);
    transition: background-color 0.4s ease;
  }
  &::-webkit-scrollbar-thumb:hover {
    background-color: var(--color-primary-alpha-400);
  }
}

// 每个 Tab 面板填满 TabContent，使内部 material-online-list 的虚拟滚动列表
// 能拿到确定高度（否则 height:100% 解析为 0，列表空白）。
.tabPane {
  height: 100%;
  min-height: 0;
}
</style>
