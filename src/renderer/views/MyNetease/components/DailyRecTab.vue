<template lang="pug">
div(:class="$style.container")
  div(:class="$style.toolbar")
    div(:class="$style.leftActions")
      template(v-if="stylizedMode")
        base-btn.btn(min @click="handlePlayAll") {{ $t('netease__play_all') }}
        base-btn.btn(min @click="openStylizedModal") {{ $t('netease__select_stylized_tags') }}
        span(v-if="selectedTagsText" :class="$style.selectedTags") {{ selectedTagsText }}
      template(v-else)
        base-btn.btn(v-if="activeMainTab === 'songs'" min @click="handlePlayAll") {{ $t('netease__play_all') }}
    base-tab(v-if="!stylizedMode" v-model="activeMainTab" :list="mainTabs" align="right")

  div(v-if="activeMainTab === 'songs'" :class="$style.songsView")
    div(v-if="isLoading" :class="$style.loading") {{ $t('netease__loading') }}
    div(v-else-if="loadError" :class="$style.error" @click="loadData") {{ $t('netease__load_error') }}
    div(v-else-if="songs.length === 0" :class="$style.empty") {{ $t('netease__no_data') }}
    div(v-else :class="$style.listWrap")
      material-online-list(
        ref="listRef"
        :list="songs"
        :page="pageInfo.page"
        :limit="pageInfo.limit"
        :total="pageInfo.total"
        :no-item="songs.length === 0 ? $t('netease__no_data') : ''"
        @play-list="handlePlayList"
        @show-menu="hideMenu"
      )
    search-list(
      :list="songs"
      :visible="isShowSearchBar"
      @action="handleMusicSearchAction"
    )

  div(v-else :class="$style.playlistsView")
    div(v-if="isLoading" :class="$style.loading") {{ $t('netease__loading') }}
    div(v-else-if="loadError" :class="$style.error" @click="loadPlaylists") {{ $t('netease__load_error') }}
    div(v-else-if="playlists.length === 0" :class="$style.empty") {{ $t('netease__no_data') }}
    div(v-else :class="$style.playlistGrid")
      div(v-for="item in playlists" :key="item.id" :class="$style.playlistCard" @click="openPlaylist(item)")
        div(:class="$style.coverWrap")
          img(v-if="item.coverImgUrl" :src="item.coverImgUrl" :class="$style.playlistCover")
          div(v-else :class="$style.coverPlaceholder")
            svg(version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="40" height="40" viewBox="0 0 24 24" space="preserve")
              use(xlink:href="#icon-list")
        div(:class="$style.playlistInfo")
          span(:class="$style.playlistName") {{ item.name }}
          span(:class="$style.playlistMeta") {{ $t('netease__playlist_tracks', { num: item.trackCount }) }} · {{ $t('netease__playlist_play_count', { num: formatPlayCount(item.playCount) }) }}
</template>

<script lang="ts">
import { ref, computed, onMounted, watch, markRawList, onBeforeUnmount } from '@common/utils/vueTools'
import musicSdk from '@renderer/utils/musicSdk'
import { appSetting } from '@renderer/store/setting'
import { setTempList } from '@renderer/store/list/action'
import { playList } from '@renderer/core/player/action'
import { LIST_IDS } from '@common/constants'
import { toNewMusicInfo, formatPlayCount } from '@renderer/utils'
import { useRouter } from '@common/utils/vueRouter'
import { toast, toastError } from '@renderer/utils/toast'
import { useI18n } from '@renderer/plugins/i18n'
import SearchList from '@renderer/views/List/MusicList/components/SearchList.vue'
import { stylizedSelection } from './stylizedState'
import type { SetupContext } from 'vue'

export default {
  name: 'DailyRecTab',
  components: {
    SearchList,
  },
  props: {
    stylizedMode: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['switch-stylized', 'open-stylized-modal'],
  setup(props: { stylizedMode: boolean }, { emit }: SetupContext) {
    const t = useI18n()
    const router = useRouter()
    const activeMainTab = ref<'songs' | 'playlists'>('playlists')
    const recType = ref<'default' | 'stylized'>('default')
    const isStylized = computed(() => recType.value === 'stylized')

    const selectedTagsText = computed(() => {
      const sel = stylizedSelection.value
      if (!sel?.tagNames?.length) return ''
      return `${sel.categoryName || ''}：${sel.tagNames.join('、')}`
    })

    const isLoading = ref(false)
    const loadError = ref(false)
    const songs = ref<any[]>([])
    const playlists = ref<any[]>([])
    const listRef = ref<any>(null)
    const isShowSearchBar = ref(false)

    const pageInfo = computed(() => ({
      page: 1,
      limit: songs.value.length,
      total: songs.value.length,
    }))

    const mainTabs = computed(() => [
      { id: 'songs', label: t('netease__rec_songs') },
      { id: 'playlists', label: t('netease__rec_playlists') },
    ])

    const cookie = computed(() => appSetting['common.wy_cookie'])

    const loadSongs = async() => {
      if (!cookie.value) {
        loadError.value = true
        return
      }
      isLoading.value = true
      loadError.value = false
      try {
        if (isStylized.value && stylizedSelection.value) {
          await musicSdk.wy.dailyRec.saveStylizedTag(cookie.value, stylizedSelection.value.categoryId, stylizedSelection.value.tagIds)
          const result = await musicSdk.wy.dailyRec.getStylizedList(cookie.value)
          songs.value = markRawList((result.list || []).map((m: any) => toNewMusicInfo(m)))
        } else {
          const result = await musicSdk.wy.dailyRec.getList(cookie.value)
          songs.value = markRawList((result.list || []).map((m: any) => toNewMusicInfo(m)))
        }
      } catch (err: any) {
        console.error('Failed to load daily recommendations:', err)
        toastError(err?.message || t('netease__load_error'))
        loadError.value = true
      } finally {
        isLoading.value = false
      }
    }

    const loadPlaylists = async() => {
      if (!cookie.value) {
        loadError.value = true
        return
      }
      isLoading.value = true
      loadError.value = false
      try {
        const list = await musicSdk.wy.dailyRec.getRecPlaylists(cookie.value)
        const adapted = (list || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          trackCount: item.trackCount,
          coverImgUrl: item.picUrl,
          creator: { nickname: item.creator?.nickname ?? '推荐' },
          playCount: item.playcount,
          description: item.copywriter,
        }))
        for (let i = 0; i < adapted.length; i++) {
          if (adapted[i].name.includes('私人雷达') && adapted[i].trackCount === 0) {
            try {
              const detail = await musicSdk.wy.songList.getListDetail(String(adapted[i].id), 1)
              if (detail?.info) {
                adapted[i].name = detail.info.name || adapted[i].name
                adapted[i].trackCount = detail.total ?? adapted[i].trackCount
                adapted[i].coverImgUrl = detail.info.img || adapted[i].coverImgUrl
              }
            } catch (e) {
              console.log('Failed to fetch radar detail:', e)
            }
          }
        }
        playlists.value = adapted
      } catch (err: any) {
        console.error('Failed to load recommended playlists:', err)
        toastError(err?.message || t('netease__load_error'))
        loadError.value = true
      } finally {
        isLoading.value = false
      }
    }

    const loadData = async() => {
      if (activeMainTab.value === 'songs') return loadSongs()
      return loadPlaylists()
    }

    const openStylizedModal = () => {
      emit('open-stylized-modal')
    }

    const handlePlayAll = async() => {
      if (songs.value.length === 0) return
      const listId = 'wy__daily_rec'
      await setTempList(listId, [...songs.value])
      playList(LIST_IDS.TEMP, 0)
    }

    const handlePlayList = async(index: number) => {
      if (songs.value.length === 0) return
      const listId = 'wy__daily_rec'
      await setTempList(listId, [...songs.value])
      playList(LIST_IDS.TEMP, index)
    }

    const openPlaylist = (item: any) => {
      void router.push({ path: '/songList/detail', query: { source: 'wy', id: String(item.id) } })
    }

    const handleFindMore = () => {
      toast('相似歌曲功能开发中')
    }

    const handleMusicSearchAction = ({ action, data }: { action: string, data?: { index?: number, isPlay?: boolean } }) => {
      isShowSearchBar.value = false
      if (action !== 'listClick') return
      const index = data?.index
      if (index == null || index < 0) return
      listRef.value?.scrollToIndex(index, -150, true, () => {
        if (data?.isPlay) void handlePlayList(index)
      })
    }

    const hideMenu = () => {
      listRef.value?.handleMenuClick?.()
    }

    const handle_key_mod_f_down = () => {
      if (activeMainTab.value !== 'songs') return
      isShowSearchBar.value = true
    }

    window.key_event.on('key_mod+f_down', handle_key_mod_f_down)

    onBeforeUnmount(() => {
      window.key_event.off('key_mod+f_down', handle_key_mod_f_down)
    })

    watch(activeMainTab, tab => {
      if (props.stylizedMode) return
      if (tab === 'playlists' && playlists.value.length === 0) void loadPlaylists()
      else if (tab === 'songs' && songs.value.length === 0) void loadSongs()
    })

    watch(stylizedSelection, () => {
      if (!props.stylizedMode) return
      if (stylizedSelection.value) {
        recType.value = 'stylized'
        void loadSongs()
      }
    })

    onMounted(() => {
      if (props.stylizedMode) {
        activeMainTab.value = 'songs'
        if (stylizedSelection.value) {
          recType.value = 'stylized'
          void loadSongs()
        } else {
          emit('switch-stylized')
        }
      } else {
        void loadData()
      }
    })

    return {
      activeMainTab,
      recType,
      isStylized,
      selectedTagsText,
      mainTabs,
      isLoading,
      loadError,
      songs,
      playlists,
      pageInfo,
      listRef,
      isShowSearchBar,
      loadData,
      loadPlaylists,
      openStylizedModal,
      handlePlayAll,
      handlePlayList,
      openPlaylist,
      handleFindMore,
      formatPlayCount,
      stylizedSelection,
      handleMusicSearchAction,
      hideMenu,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  padding: 15px 0 15px 15px;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  overflow: hidden;
  box-sizing: border-box;
}

.toolbar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-right: 15px;
  gap: 10px;
}

.leftActions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selectedTags {
  font-size: 12px;
  color: var(--color-font-label);
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn {
  color: var(--color-font);
  background: none !important;
  transition: color @transition-fast, border-color @transition-fast;
  border: 1px solid transparent;
  border-radius: 0;

  &:hover {
    color: var(--color-primary-font-hover);
  }
}

.arrow {
  margin-left: 4px;
  font-size: 10px;
}

.loading, .error, .empty {
  text-align: center;
  padding: 40px 15px;
  color: var(--color-font-label);
  font-size: 14px;
}

.error {
  cursor: pointer;
  color: var(--color-primary);
}

.songsView, .playlistsView {
  flex: auto;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
  padding-right: 15px;
}

.listWrap {
  flex: auto;
  min-height: 0;
  position: relative;
  border-radius: @radius-border;
  overflow: hidden;
}

.moreSimilar {
  text-align: center;
  padding: 15px 0;
}

.playlistsView {
  overflow-y: auto;

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

.playlistGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 15px;
  padding-bottom: 15px;
}

.playlistCard {
  cursor: pointer;
  transition: transform @transition-fast;

  &:hover {
    transform: translateY(-2px);
  }
}

.coverWrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background-color: var(--color-button-background-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.playlistCover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.coverPlaceholder {
  color: var(--color-font-label);
}

.playlistInfo {
  display: flex;
  flex-flow: column nowrap;
  gap: 4px;
}

.playlistName {
  font-size: 13px;
  color: var(--color-font);
  .mixin-ellipsis-2();
  line-height: 1.4;
}

.playlistMeta {
  font-size: 11px;
  color: var(--color-font-label);
}
</style>
