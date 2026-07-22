<template lang="pug">
div(:class="$style.container")
  div(v-if="isLoading" :class="$style.loading") {{ $t('netease__loading') }}
  div(v-else-if="loadError" :class="$style.error" @click="loadData") {{ $t('netease__load_error') }}
  template(v-else-if="artistInfo")
    //- Header
    div(:class="$style.header")
      div(v-if="bgUrl && appSetting['artistDetail.isShowBackground']" :class="$style.headerBg" :style="{ backgroundImage: 'url(' + bgUrl + '?param=800y800)', filter: 'blur(' + appSetting['artistDetail.backgroundBlur'] + 'px)', opacity: appSetting['artistDetail.backgroundOpacity'] }")
      div(:class="$style.cover" :style="{ backgroundImage: 'url(' + avatarUrl + '?param=400y400)' }")
      div(:class="$style.headerInfo")
        div(:class="$style.nameRow")
          h2(:class="$style.name") {{ artistInfo.name }}
          span(v-if="artistInfo.albumSize != null" :class="$style.nameStat") {{ artistInfo.albumSize }} {{ $t('netease__artist_albums') }}
          span(v-if="artistInfo.mvSize != null" :class="$style.nameStat") {{ artistInfo.mvSize }} MV
        p(v-if="artistInfo.alias && artistInfo.alias.length" :class="$style.alias") {{ artistInfo.alias.join(' / ') }}
        p(v-if="artistInfo.briefDesc" :class="$style.desc") {{ showTranslatedBio && bioTranslated ? bioTranslated : artistInfo.briefDesc }}
        div(v-if="artistInfo.briefDesc" :class="$style.descActions")
          span(
            :class="[$style.tab, $style.transBtn, {[$style.active]: showTranslatedBio}]"
            @click="handleTranslateBio"
          ) {{ bioTranslating ? $t('comment__translating') : (showTranslatedBio ? $t('comment__show_original') : $t('comment__translate')) }}
        div(v-if="artistInfo.fansCount != null" :class="$style.stats")
          span {{ formatFans(artistInfo.fansCount) }} {{ $t('artist__fans') }}
      div(:class="$style.headerRight")
        base-btn(
          :class="$style.followBtn"
          :disabled="!isLoggedIn"
          @click="handleToggleFollow"
        ) {{ isFollowed ? $t('artist__unfollow') : $t('artist__follow') }}
        base-btn(:class="$style.backBtn" @click="handleBack") {{ $t('back') }}

    //- Hot songs
    div(v-if="activeTab === 'songs'" :class="[$style.section, $style.songsSection]")
      div(:class="$style.sectionHeader")
        div(:class="$style.sectionHeaderLeft")
          h3(:class="$style.sectionTitle") {{ $t('artist__all_songs') }}
          div(:class="$style.sortToggle")
            span(:class="[$style.sortItem, {[$style.active]: songSort === 'hot'}]" @click="handleSortChange('hot')") {{ $t('artist__sort_hot') }}
            span(:class="$style.sortDivider") |
            span(:class="[$style.sortItem, {[$style.active]: songSort === 'time'}]" @click="handleSortChange('time')") {{ $t('artist__sort_time') }}
        div(:class="$style.sectionHeaderRight")
          div(:class="$style.tabs")
            span(
              v-for="tab in tabs"
              :key="tab.key"
              :class="[$style.tab, {[$style.active]: activeTab === tab.key}]"
              @click="activeTab = tab.key"
            ) {{ tab.label }}
      div(:class="$style.songsListWrap")
        material-online-list(
          ref="listRef"
          :list="songs"
          :page="1"
          :limit="songs.length || 1"
          :total="songs.length"
          :no-item="songs.length === 0 ? $t('netease__no_data') : ''"
          source-tag
          @play-list="handlePlayList"
        )

    //- Albums
    div(v-if="activeTab === 'albums'" :class="$style.section")
      div(:class="$style.sectionHeader")
        h3(:class="$style.sectionTitle") {{ $t('artist__albums') }}
        div(:class="$style.sectionHeaderRight")
          div(:class="$style.tabs")
            span(
              v-for="tab in tabs"
              :key="tab.key"
              :class="[$style.tab, {[$style.active]: activeTab === tab.key}]"
              @click="activeTab = tab.key"
            ) {{ tab.label }}
      div(:class="$style.grid")
        div(v-for="item in albums" :key="item.id" :class="$style.card" @click="goAlbum(item.id)")
          div(:class="$style.cardCover")
            img(v-if="item.picUrl || item.blurPicUrl" :src="(item.picUrl || item.blurPicUrl) + '?param=200y200'" loading="lazy" :alt="item.name")
            div(v-else :class="$style.cardPlaceholder")
              svg-icon(name="music")
          div(:class="$style.cardName") {{ item.name }}

    //- Similar artists
    div(v-if="activeTab === 'similar'" :class="$style.section")
      div(:class="$style.sectionHeader")
        h3(:class="$style.sectionTitle") {{ $t('artist__similar') }}
        div(:class="$style.sectionHeaderRight")
          div(:class="$style.tabs")
            span(
              v-for="tab in tabs"
              :key="tab.key"
              :class="[$style.tab, {[$style.active]: activeTab === tab.key}]"
              @click="activeTab = tab.key"
            ) {{ tab.label }}
      div(v-if="!similar.length" :class="$style.empty") {{ $t('netease__no_data') }}
      div(v-else :class="$style.similarList")
        div(v-for="item in similar" :key="item.id" :class="$style.similarCard" @click="goArtist(item.id)")
          div(:class="$style.similarAvatar")
            img(v-if="item.img1v1Url || item.picUrl || item.cover" :src="((item.img1v1Url || item.picUrl || item.cover) + '?param=200y200')" loading="lazy" :alt="item.name")
            div(v-else :class="$style.similarPlaceholder")
              svg-icon(name="music")
          div(:class="$style.similarInfo")
            h4(:class="$style.similarName") {{ item.name }}
            p(v-if="item.fansCount != null" :class="$style.similarMeta") {{ formatFans(item.fansCount) }} {{ $t('artist__fans') }}

    search-list(
      :list="songs"
      :visible="isShowSearchBar"
      @action="handleMusicSearchAction"
    )
</template>

<script lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, onActivated } from '@common/utils/vueTools'
import { useRoute, useRouter, onBeforeRouteUpdate } from '@common/utils/vueRouter'
import musicSdk from '@renderer/utils/musicSdk'
import { appSetting } from '@renderer/store/setting'
import { userState, addWyFollowedArtist, removeWyFollowedArtist } from '@renderer/store/user'
import { toast, toastError } from '@renderer/utils/toast'
import { useI18n } from '@renderer/plugins/i18n'
import { setTempList } from '@renderer/store/list/action'
import { playList } from '@renderer/core/player/action'
import { LIST_IDS } from '@common/constants'
import { normalizeWySongs } from '@renderer/utils'
import { translateText } from '@renderer/utils/translate'
import SearchList from '@renderer/views/List/MusicList/components/SearchList.vue'

interface ArtistInfo {
  id: number | string
  name: string
  avatar?: string
  cover?: string
  picUrl?: string
  img1v1Url?: string
  alias?: string[]
  briefDesc?: string
  albumSize?: number
  mvSize?: number
  fansCount?: number
}

export default {
  name: 'ArtistDetail',
  components: {
    SearchList,
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const t = useI18n()

    const id = computed(() => String(route.query.id ?? ''))
    const source = computed(() => String(route.query.source ?? 'wy'))

    const isLoading = ref(false)
    const loadError = ref(false)
    const artistInfo = ref<ArtistInfo | null>(null)
    const songs = ref<any[]>([])
    const albums = ref<any[]>([])
    const similar = ref<any[]>([])
    const listRef = ref<any>(null)
    const activeTab = ref<'songs' | 'albums' | 'similar'>('songs')
    const songSort = ref<'hot' | 'time'>('hot')

    const tabs = computed(() => [
      { key: 'songs', label: t('artist__songs') },
      { key: 'albums', label: t('artist__albums') },
      { key: 'similar', label: t('artist__similar') },
    ])

    const isLoggedIn = computed(() => !!userState.wy_uid)
    const avatarUrl = computed(() => {
      const a = artistInfo.value
      if (!a) return ''
      return a.avatar ?? a.picUrl ?? a.img1v1Url ?? ''
    })
    const bgUrl = computed(() => {
      const a = artistInfo.value
      if (!a) return ''
      return a.cover ?? a.picUrl ?? ''
    })

    const isFollowed = computed(() =>
      userState.wy_followed_artists.some(a => String(a.id) === String(id.value)),
    )

    const formatFans = (n: number) => {
      if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
      return String(n)
    }

    const bioTranslated = ref('')
    const bioTranslating = ref(false)
    const showTranslatedBio = ref(false)
    const handleTranslateBio = async() => {
      if (bioTranslating.value) return
      if (bioTranslated.value) {
        showTranslatedBio.value = !showTranslatedBio.value
        return
      }
      bioTranslating.value = true
      try {
        bioTranslated.value = await translateText(artistInfo.value?.briefDesc ?? '')
        showTranslatedBio.value = true
      } catch (err) {
        console.error('翻译歌手简介失败', err)
        toastError(t('comment__translate_failed'))
      } finally {
        bioTranslating.value = false
      }
    }

    const loadData = async(resetSort = true) => {
      if (!id.value) return
      if (isLoading.value) return
      isLoading.value = true
      loadError.value = false
      artistInfo.value = null
      songs.value = []
      albums.value = []
      similar.value = []
      // 只在切换不同歌手（resetSort=true）时复位标签与排序；
      // 从专辑详情返回或切换排序时不应跳回「全部歌曲」页。
      if (resetSort) {
        activeTab.value = 'songs'
        songSort.value = 'hot'
      }
      bioTranslated.value = ''
      try {
        const detail = await musicSdk.wy.artist.getDetail(id.value)
        const rawArtist = detail?.artist ?? detail ?? null
        if (!rawArtist?.id) {
          throw new Error('invalid artist data')
        }
        // 合并顶层可能存在的统计字段（如 videoCount/fansCount）到 artist 对象
        const artistData: ArtistInfo = {
          ...rawArtist,
          mvSize: rawArtist.mvSize ?? detail.videoCount ?? detail.mvSize ?? null,
          fansCount: rawArtist.fansCount ?? detail.fansCount ?? null,
        }
        artistInfo.value = artistData
      } catch (err) {
        console.error('获取歌手详情失败', err)
        loadError.value = true
        isLoading.value = false
        return
      }
      try {
        const { list } = await musicSdk.wy.artist.getSongs(id.value, songSort.value)
        songs.value = normalizeWySongs(list)
      } catch (err) {
        console.error('获取歌手歌曲失败', err)
      }
      try {
        const { hotAlbums } = await musicSdk.wy.artist.getAlbums(id.value)
        albums.value = hotAlbums || []
      } catch (err) {
        console.error('获取歌手专辑失败', err)
      }
      try {
        similar.value = await musicSdk.wy.artist.getSimilar(id.value)
      } catch (err) {
        console.error('获取相似歌手失败', err)
      } finally {
        isLoading.value = false
      }
    }

    const handleSortChange = (sort: 'hot' | 'time') => {
      if (songSort.value === sort) return
      songSort.value = sort
      void loadData(false)
    }

    const handlePlayList = async(index: number) => {
      if (!songs.value.length) return
      await setTempList(`wy__artist_${id.value}`, [...songs.value])
      playList(LIST_IDS.TEMP, index)
    }

    const handleToggleFollow = async() => {
      if (!isLoggedIn.value) {
        toastError(t('netease__login_required'))
        return
      }
      try {
        if (isFollowed.value) {
          await musicSdk.wy.user.followSinger(id.value, false)
          removeWyFollowedArtist(id.value)
          toast(t('artist__unfollow_success'))
        } else {
          await musicSdk.wy.user.followSinger(id.value, true)
          addWyFollowedArtist({
            id: id.value,
            name: artistInfo.value?.name ?? '',
            picUrl: avatarUrl.value,
          } as any)
          toast(t('artist__follow_success'))
        }
      } catch (err: any) {
        toastError(err?.message || t('artist__follow_failed'))
      }
    }

    const goAlbum = (albumId: number | string) => {
      void router.push({ path: '/album/detail', query: { source: 'wy', id: String(albumId) } })
    }
    const goArtist = (artistId: number | string) => {
      void router.push({ path: '/artist/detail', query: { source: 'wy', id: String(artistId) } })
    }

    const handleBack = () => {
      router.back()
    }

    const isShowSearchBar = ref(false)
    const handleMusicSearchAction = ({ action, data }: { action: string, data?: { index?: number, isPlay?: boolean } }) => {
      isShowSearchBar.value = false
      if (action !== 'listClick') return
      const index = data?.index
      if (index == null || index < 0) return
      listRef.value?.scrollToIndex(index, -150, true, () => {
        if (data?.isPlay) void handlePlayList(index)
      })
    }

    const handle_key_mod_f_down = () => {
      if (activeTab.value !== 'songs') return
      isShowSearchBar.value = true
    }
    window.key_event.on('key_mod+f_down', handle_key_mod_f_down)
    onBeforeUnmount(() => {
      window.key_event.off('key_mod+f_down', handle_key_mod_f_down)
    })

    // 模块级缓存：组件重建（keep-alive 未命中）时恢复标签与排序状态，
    // 确保从专辑详情页返回歌手详情页能停在原标签页（如「专辑」）。
    const artistTabCache = new Map<string, { activeTab: 'songs' | 'albums' | 'similar', songSort: 'hot' | 'time' }>()
    const restoreTabState = () => {
      const cached = artistTabCache.get(id.value)
      if (!cached) return
      activeTab.value = cached.activeTab
      songSort.value = cached.songSort
    }
    const saveTabState = () => {
      artistTabCache.set(id.value, { activeTab: activeTab.value, songSort: songSort.value })
    }

    onMounted(() => {
      restoreTabState()
      // 重建时加载数据；loadData(false) 不复位标签/排序，保留恢复的状态
      void loadData(false)
    })
    onActivated(() => {
      restoreTabState()
      // keep-alive 命中且为同一歌手时不重新加载，保留当前标签
      if (artistInfo.value?.id && String(artistInfo.value.id) === String(id.value)) return
      void loadData(false)
    })
    watch([activeTab, songSort], () => {
      saveTabState()
    })
    // 仅在同组件复用且歌手 id 变化（如点击相似歌手）时重载；
    // 离开到专辑详情/返回都不会触发，避免错误地复位标签或加载错误数据
    onBeforeRouteUpdate((to) => {
      if (String(to.query.id ?? '') !== id.value) void loadData(true)
    })
    watch(activeTab, () => {
      isShowSearchBar.value = false
    })

    return {
      id,
      source,
      isLoading,
      loadError,
      artistInfo,
      songs,
      albums,
      similar,
      activeTab,
      tabs,
      listRef,
      songSort,
      isLoggedIn,
      avatarUrl,
      bgUrl,
      appSetting,
      isFollowed,
      formatFans,
      bioTranslated,
      bioTranslating,
      showTranslatedBio,
      handleTranslateBio,
      loadData,
      handlePlayList,
      handleSortChange,
      handleToggleFollow,
      goAlbum,
      goArtist,
      handleBack,
      isShowSearchBar,
      handleMusicSearchAction,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  display: flex;
  flex-flow: column nowrap;
  height: 100%;
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

.empty {
  text-align: center;
  padding: 40px 0;
  color: var(--color-font-label);
  font-size: 14px;
}

.loading, .error {
  text-align: center;
  padding: 60px 0;
  color: var(--color-font-label);
  font-size: 14px;
}
.error {
  cursor: pointer;
  color: var(--color-primary);
}

.header {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: flex-start;
  position: relative;
  padding: 18px 18px 14px;
  gap: 16px;
  overflow: hidden;

  > * {
    position: relative;
    z-index: 1;
  }
}
.headerBg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-position: center;
  background-size: cover;
  opacity: .15;
  pointer-events: none;
}
.cover {
  flex: none;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-position: center;
  background-size: cover;
  box-shadow: 0 0 4px 0 rgba(0, 0, 0, .2);
}
.headerInfo {
  flex: auto;
  min-width: 0;
  width: 100%;
  padding-right: 110px;
  box-sizing: border-box;
}
.name {
  margin: 0 0 4px;
  font-size: 20px;
  color: var(--color-font);
  .mixin-ellipsis-1();
}
.nameRow {
  display: flex;
  flex-flow: row nowrap;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 4px;

  .name {
    flex: none;
    min-width: 0;
    margin: 0;
  }
}
.nameStat {
  font-size: 12px;
  color: var(--color-font);
  white-space: nowrap;
}
.alias {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--color-font-label);
  .mixin-ellipsis-1();
}
.desc {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-font-label);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 120px;
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
.descActions {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: flex-start;
  margin: 6px 0 8px;
}
.transBtn {
  flex: none;
  min-width: 72px;
  text-align: center;
}
.descTrans {
  margin: 0 0 8px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-font);
  background-color: var(--color-primary-light-400-alpha-700);
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}
.stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--color-font);
}
.headerRight {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 2;
  display: flex;
  flex-flow: column nowrap;
  gap: 8px;
  align-items: flex-end;
}

.tabs {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  gap: 8px;
  padding: 0;
}
.tab {
  padding: 4px 14px;
  font-size: 13px;
  color: var(--color-font-label);
  background-color: var(--color-primary-light-400-alpha-700);
  border-radius: @radius-border;
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast;
  &:hover {
    color: var(--color-font);
    background-color: var(--color-primary-light-300-alpha-700);
  }
  &.active {
    color: #fff;
    background-color: var(--color-primary);
  }
}

.followBtn {
  min-width: 84px;
}
.backBtn {
  min-width: 84px;
}

.section {
  padding: 0 18px 18px;
}
.sectionHeader {
  display: flex;
  flex-flow: row nowrap;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 6px;
  padding-top: 14px;
}
.sectionHeaderRight {
  flex: none;
  display: flex;
  flex-flow: column nowrap;
  align-items: flex-end;
  gap: 6px;
}
.sectionHeaderLeft {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: row nowrap;
  align-items: baseline;
  gap: 14px;
}
.sortToggle {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-font-label);
}
.sortItem {
  cursor: pointer;
  transition: color @transition-fast;
  &:hover {
    color: var(--color-font);
  }
  &.active {
    color: var(--color-primary);
    font-weight: 600;
  }
}
.sortDivider {
  opacity: .4;
}
.songsSection {
  display: flex;
  flex-flow: column nowrap;
  height: 420px;
  padding-bottom: 0;
}
.songsListWrap {
  flex: auto;
  min-height: 0;
  position: relative;
  border-radius: @radius-border;
  overflow: hidden;
  background-color: transparent;

  :global(.scroll) {
    overflow-x: hidden;
    background-color: transparent;

    &::-webkit-scrollbar:horizontal {
      display: none;
    }
    &::-webkit-scrollbar-track:horizontal {
      display: none;
    }
    &::-webkit-scrollbar-thumb:horizontal {
      display: none;
    }
    &::-webkit-scrollbar-corner {
      background-color: transparent;
    }
  }
}
.sectionTitle {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-font);
  border-left: 3px solid var(--color-primary);
  padding-left: 8px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 14px;
}
.card {
  cursor: pointer;
  transition: transform @transition-fast;
  &:hover {
    transform: translateY(-2px);
    .cardCover img { opacity: .9; }
  }
}
.cardCover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: @radius-border;
  overflow: hidden;
  background-color: var(--color-primary-light-400-alpha-700);
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity @transition-fast;
  }
}
.cardPlaceholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: .3;
}
.cardName {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-font);
  .mixin-ellipsis-1();
}

// 相似歌手：圆形头像，与「关注的歌手」页一致
.similarList {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 14px;
}
.similarCard {
  cursor: pointer;
  text-align: center;
  transition: transform @transition-fast;
  &:hover {
    transform: translateY(-2px);
  }
}
.similarAvatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto;
  background-color: var(--color-primary-light-400-alpha-700);
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.similarPlaceholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: .3;
}
.similarInfo {
  margin-top: 8px;
}
.similarName {
  font-size: 13px;
  font-weight: normal;
  margin: 0;
  color: var(--color-font);
  .mixin-ellipsis-1();
}
.similarMeta {
  font-size: 12px;
  color: var(--color-font-label);
  margin: 3px 0 0;
}
</style>
