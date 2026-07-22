<template lang="pug">
div(:class="$style.container")
  div(v-if="isLoading" :class="$style.loading") {{ $t('netease__loading') }}
  div(v-else-if="loadError" :class="$style.error" @click="loadData") {{ $t('netease__load_error') }}
  div(v-else-if="playlists.length === 0" :class="$style.empty") {{ $t('netease__no_data') }}
  div(v-else :class="$style.list")
    div(v-for="item in playlists" :key="item.id" :class="$style.card" @click="handlePlaylistClick(item)" @contextmenu.prevent="handleContextMenu($event, item)")
      div(:class="$style.cover")
        img(v-if="item.picUrl" :src="item.picUrl + '?param=200y200'" loading="lazy" :alt="item.name")
        div(v-else :class="$style.coverPlaceholder")
          svg-icon(name="music" :class="$style.placeholderIcon")
      div(:class="$style.info")
        h4(:class="$style.name") {{ item.name }}
        p(:class="$style.meta") {{ $t('netease__playlist_tracks', { num: item.trackCount }) }}
        span(v-if="item.playCount" :class="$style.playCount") {{ formatPlayCount(item.playCount) }}
  base-menu(v-model="isShowMenu" :menus="menus" :xy="menuLocation" item-name="name" @menu-click="handleMenuClick")
  playlist-edit-modal(v-model:show="isShowEditModal" :playlist="selectedPlaylist" @success="handleEditSuccess")
</template>

<script lang="ts">
import { ref, onMounted, reactive, computed } from '@common/utils/vueTools'
import musicSdk from '@renderer/utils/musicSdk'
import { useRouter } from '@common/utils/vueRouter'
import { useI18n } from '@renderer/plugins/i18n'
import { dialog } from '@renderer/plugins/Dialog'
import { toast, toastError } from '@renderer/utils/toast'
import PlaylistEditModal from './PlaylistEditModal.vue'

interface Playlist {
  id: number
  name: string
  picUrl: string
  trackCount: number
  playCount?: number
  creator?: { nickname: string, userId?: number }
  description?: string
}

export default {
  name: 'PlaylistsTab',
  components: {
    PlaylistEditModal,
  },
  props: {
    uid: { type: String, required: true },
    cookie: { type: String, required: true },
  },
  setup(props: { uid: string, cookie: string }) {
    const t = useI18n()
    const router = useRouter()
    const isLoading = ref(false)
    const loadError = ref(false)
    const playlists = ref<Playlist[]>([])
    const isShowMenu = ref(false)
    const menuLocation = reactive({ x: 0, y: 0 })
    const selectedPlaylist = ref<Playlist | null>(null)
    const isShowEditModal = ref(false)

    const isOwnPlaylist = (playlist: Playlist) => {
      return String(playlist.creator?.userId ?? '') === props.uid
    }

    const menus = computed(() => {
      const playlist = selectedPlaylist.value
      const canEdit = playlist && isOwnPlaylist(playlist)
      return [
        { name: t('netease__edit_playlist'), action: 'edit', disabled: !canEdit },
        { name: t('netease__delete_playlist'), action: 'delete', disabled: !canEdit },
      ]
    })

    const loadData = async() => {
      if (isLoading.value) return
      isLoading.value = true
      loadError.value = false
      try {
        const result = await musicSdk.wy.user.getUserPlaylists(props.uid, props.cookie)
        if (Array.isArray(result)) {
          playlists.value = result.map((p: any) => ({
            id: p.id,
            name: p.name || '',
            picUrl: p.picUrl || p.coverImgUrl || '',
            trackCount: p.trackCount || 0,
            playCount: p.playCount,
            creator: p.creator,
            description: p.description,
          }))
        }
      } catch (err) {
        console.error('Failed to load playlists:', err)
        loadError.value = true
      } finally {
        isLoading.value = false
      }
    }

    const handlePlaylistClick = (item: Playlist) => {
      void router.push({
        path: '/songList/detail',
        query: {
          source: 'wy',
          id: String(item.id),
        },
      })
    }

    const handleContextMenu = (event: MouseEvent, item: Playlist) => {
      selectedPlaylist.value = item
      menuLocation.x = event.pageX
      menuLocation.y = event.pageY
      isShowMenu.value = true
    }

    const handleDelete = async(playlist: Playlist) => {
      const isRemove = await dialog.confirm({
        message: t('netease__delete_playlist_confirm', { name: playlist.name }),
        confirmButtonText: t('lists__remove_tip_button'),
        cancelButtonText: t('btn_cancel'),
      })
      if (!isRemove) return
      try {
        await musicSdk.wy.user.deletePlaylist(String(playlist.id))
        toast(t('netease__delete_playlist_success'))
        playlists.value = playlists.value.filter(p => p.id !== playlist.id)
      } catch (err: any) {
        console.error('Delete playlist failed:', err)
        toastError(err?.message || t('netease__delete_playlist_failed'))
      }
    }

    const handleMenuClick = (action: { action: string }) => {
      isShowMenu.value = false
      if (!action || !selectedPlaylist.value) return
      switch (action.action) {
        case 'edit':
          isShowEditModal.value = true
          break
        case 'delete':
          void handleDelete(selectedPlaylist.value)
          break
      }
    }

    const handleEditSuccess = (updates: { name: string, desc: string }) => {
      if (!selectedPlaylist.value) return
      const target = playlists.value.find(p => p.id === selectedPlaylist.value!.id)
      if (target) {
        target.name = updates.name
        target.description = updates.desc
      }
    }

    const formatPlayCount = (count: number) => {
      if (count >= 100000000) return (count / 100000000).toFixed(1) + '亿'
      if (count >= 10000) return (count / 10000).toFixed(1) + '万'
      return String(count)
    }

    onMounted(() => {
      void loadData()
    })

    return {
      isLoading,
      loadError,
      playlists,
      loadData,
      handlePlaylistClick,
      formatPlayCount,
      isShowMenu,
      menus,
      menuLocation,
      handleContextMenu,
      handleMenuClick,
      selectedPlaylist,
      isShowEditModal,
      handleEditSuccess,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  padding: 15px 0 15px 15px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;

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

.list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  padding-right: 15px;
}

.card {
  cursor: pointer;
  transition: transform @transition-fast;

  &:hover {
    transform: translateY(-2px);

    .cover img {
      opacity: 0.9;
    }
  }
}

.cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: @radius-border;
  overflow: hidden;
  background-color: var(--color-primary-light-400-alpha-700);
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity @transition-fast;
  }
}

.coverPlaceholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholderIcon {
  width: 40px;
  height: 40px;
  opacity: 0.3;
}

.info {
  margin-top: 8px;
}

.name {
  font-size: 13px;
  font-weight: normal;
  margin: 0;
  color: var(--color-font);
  .mixin-ellipsis-1();
}

.meta {
  font-size: 12px;
  color: var(--color-font-label);
  margin: 3px 0 0;
}

.playCount {
  font-size: 11px;
  color: var(--color-primary);
}
</style>
