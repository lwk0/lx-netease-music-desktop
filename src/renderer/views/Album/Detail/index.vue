<template lang="pug">
div(:class="$style.container")
  div(v-if="isLoading" :class="$style.loading") {{ $t('netease__loading') }}
  div(v-else-if="loadError" :class="$style.error" @click="loadData") {{ $t('netease__load_error') }}
  template(v-else-if="albumInfo")
    //- Header
    div(:class="$style.header" :style="{ '--album-cover': 'url(' + (albumInfo.picUrl || '') + '?param=400y400)' }")
      div(:class="$style.cover" :style="{ backgroundImage: 'url(' + (albumInfo.picUrl || '') + '?param=400y400)' }")
      div(:class="$style.headerInfo")
        h2(:class="$style.name") {{ albumInfo.name }}
        p(v-if="albumInfo.artist" :class="$style.artist" @click="goArtist(albumInfo.artist.id)") {{ albumInfo.artist.name }}
        div(:class="$style.meta")
          span(v-if="albumInfo.publishTime") {{ $t('album__publish_time') }}：{{ formatDate(albumInfo.publishTime) }}
          span(v-if="albumInfo.company") {{ $t('album__company') }}：{{ albumInfo.company }}
          span(v-if="albumInfo.size != null") {{ albumInfo.size }} {{ $t('music_song') }}
        p(v-if="albumInfo.description" :class="$style.desc") {{ albumInfo.description }}
      div(:class="$style.headerRight")
        base-btn(
          :class="$style.subBtn"
          :disabled="!isLoggedIn"
          @click="handleToggleSub"
        ) {{ isSubscribed ? $t('album__unsubscribe') : $t('album__subscribe') }}
        base-btn(:class="$style.backBtn" @click="handleBack") {{ $t('back') }}

    //- Songs
    div(:class="[$style.section, $style.songsSection]")
      h3(:class="$style.sectionTitle") {{ $t('album__songs') }}
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
    search-list(
      :list="songs"
      :visible="isShowSearchBar"
      @action="handleMusicSearchAction"
    )
</template>

<script lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from '@common/utils/vueTools'
import { useRoute, useRouter, onBeforeRouteUpdate } from '@common/utils/vueRouter'
import musicSdk from '@renderer/utils/musicSdk'
import { userState, addWySubscribedAlbum, removeWySubscribedAlbum } from '@renderer/store/user'
import { toast, toastError } from '@renderer/utils/toast'
import { useI18n } from '@renderer/plugins/i18n'
import { setTempList } from '@renderer/store/list/action'
import { playList } from '@renderer/core/player/action'
import { LIST_IDS } from '@common/constants'
import { normalizeWySongs } from '@renderer/utils'
import SearchList from '@renderer/views/List/MusicList/components/SearchList.vue'

interface AlbumInfo {
  id: number | string
  name: string
  picUrl?: string
  artist?: { id: number | string, name: string }
  publishTime?: number
  company?: string
  description?: string
  size?: number
}

export default {
  name: 'AlbumDetail',
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
    const albumInfo = ref<AlbumInfo | null>(null)
    const songs = ref<any[]>([])
    const listRef = ref<any>(null)

    const isLoggedIn = computed(() => !!userState.wy_uid)
    const isSubscribed = computed(() =>
      userState.wy_subscribed_albums.some(a => String(a.id) === String(id.value)),
    )

    const formatDate = (ts: number) => {
      if (!ts) return ''
      const d = new Date(ts)
      const pad = (n: number) => (n < 10 ? '0' + n : '' + n)
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }

    const loadData = async() => {
      if (!id.value) return
      if (isLoading.value) return
      isLoading.value = true
      loadError.value = false
      albumInfo.value = null
      songs.value = []
      try {
        const { list, info } = await musicSdk.wy.album.getAlbum(id.value)
        albumInfo.value = (info || {}) as AlbumInfo
        songs.value = normalizeWySongs(list)
      } catch (err) {
        console.error('获取专辑详情失败', err)
        loadError.value = true
      } finally {
        isLoading.value = false
      }
    }

    const handlePlayList = async(index: number) => {
      if (!songs.value.length) return
      await setTempList(`wy__album_${id.value}`, [...songs.value])
      playList(LIST_IDS.TEMP, index)
    }

    const handleToggleSub = async() => {
      if (!isLoggedIn.value) {
        toastError(t('netease__login_required'))
        return
      }
      try {
        if (isSubscribed.value) {
          await musicSdk.wy.user.subAlbum(id.value, false)
          removeWySubscribedAlbum(id.value)
          toast(t('album__unsubscribe_success'))
        } else {
          await musicSdk.wy.user.subAlbum(id.value, true)
          addWySubscribedAlbum({
            id: id.value,
            name: albumInfo.value?.name ?? '',
            picUrl: albumInfo.value?.picUrl ?? '',
            artists: albumInfo.value?.artist ? [albumInfo.value.artist] : [],
          } as any)
          toast(t('album__subscribe_success'))
        }
      } catch (err: any) {
        toastError(err?.message || t('album__sub_failed'))
      }
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
      isShowSearchBar.value = true
    }
    window.key_event.on('key_mod+f_down', handle_key_mod_f_down)
    onBeforeUnmount(() => {
      window.key_event.off('key_mod+f_down', handle_key_mod_f_down)
    })

    onMounted(() => {
      void loadData()
    })
    onBeforeRouteUpdate((to) => {
      if (String(to.query.id ?? '') !== id.value) void loadData()
    })

    return {
      id,
      source,
      isLoading,
      loadError,
      albumInfo,
      songs,
      listRef,
      isLoggedIn,
      isSubscribed,
      isShowSearchBar,
      formatDate,
      loadData,
      handlePlayList,
      handleToggleSub,
      goArtist,
      handleBack,
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
  padding: 22px 18px 18px;
  gap: 18px;
  position: relative;
  overflow: hidden;
  border-radius: @radius-border;
  margin: 10px 10px 0;
  // 模糊封面作为背景（移动端风格），叠加深色/浅色蒙版保证文字可读
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: var(--album-cover);
    background-size: cover;
    background-position: center;
    filter: blur(36px) saturate(1.4);
    transform: scale(1.5);
    opacity: .55;
    z-index: 0;
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-color: var(--color-content-background);
    opacity: .82;
    z-index: 0;
  }
}
.cover {
  position: relative;
  z-index: 1;
  flex: none;
  width: 150px;
  height: 150px;
  border-radius: @radius-border;
  background-position: center;
  background-size: cover;
  box-shadow: 0 4px 14px 0 rgba(0, 0, 0, .28);
}
.headerInfo {
  position: relative;
  z-index: 1;
  flex: auto;
  min-width: 0;
  padding-right: 110px;
  box-sizing: border-box;
}
.name {
  margin: 0 0 6px;
  font-size: 20px;
  color: var(--color-font);
  .mixin-ellipsis-1();
}
.artist {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--color-primary);
  cursor: pointer;
  .mixin-ellipsis-1();
  &:hover {
    text-decoration: underline;
  }
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
  color: var(--color-font-label);
  margin-bottom: 6px;
}
.desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-font-label);
  .mixin-ellipsis(3);
}
.headerRight {
  position: relative;
  z-index: 1;
  flex: none;
  display: flex;
  flex-flow: column nowrap;
  gap: 8px;
  align-items: flex-end;
}
.subBtn {
  min-width: 84px;
}
.backBtn {
  min-width: 84px;
}

.section {
  padding: 6px 18px 18px;
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
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-font);
  border-left: 3px solid var(--color-primary);
  padding-left: 8px;
}
</style>
