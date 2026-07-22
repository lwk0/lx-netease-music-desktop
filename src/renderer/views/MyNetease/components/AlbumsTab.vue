<template lang="pug">
div(:class="$style.container")
  div(v-if="isLoading" :class="$style.loading") {{ $t('netease__loading') }}
  div(v-else-if="loadError" :class="$style.error" @click="loadData") {{ $t('netease__load_error') }}
  div(v-else-if="albums.length === 0" :class="$style.empty") {{ $t('netease__no_data') }}
  div(v-else :class="$style.list")
    div(v-for="item in albums" :key="item.id" :class="$style.card" @click="handleAlbumClick(item)")
      div(:class="$style.cover")
        img(v-if="item.picUrl" :src="item.picUrl + '?param=200y200'" loading="lazy" :alt="item.name")
        div(v-else :class="$style.coverPlaceholder")
          svg-icon(name="music" :class="$style.placeholderIcon")
      div(:class="$style.info")
        h4(:class="$style.name") {{ item.name }}
        p(:class="$style.meta") {{ item.artists?.map(a => a.name).join('、') || '' }}

</template>

<script lang="ts">
import { ref, onMounted } from '@common/utils/vueTools'
import musicSdk from '@renderer/utils/musicSdk'
import { useRouter } from '@common/utils/vueRouter'
import { setWySubscribedAlbums } from '@renderer/store/user'

interface Album {
  id: number | string
  name: string
  picUrl?: string
  artists?: Array<{ id: number | string, name: string }>
}

export default {
  name: 'AlbumsTab',
  props: {
    uid: { type: String, required: true },
    cookie: { type: String, required: true },
  },
  setup(props: { uid: string, cookie: string }) {
    const router = useRouter()
    const isLoading = ref(false)
    const loadError = ref(false)
    const albums = ref<Album[]>([])

    const loadData = async() => {
      if (isLoading.value) return
      isLoading.value = true
      loadError.value = false
      try {
        const result = await musicSdk.wy.user.getSubAlbumList()
        if (result && Array.isArray(result.albums)) {
          albums.value = result.albums
          setWySubscribedAlbums(result.albums)
        } else if (Array.isArray(result)) {
          albums.value = result
          setWySubscribedAlbums(result)
        }
      } catch (err) {
        console.error('Failed to load subscribed albums:', err)
        loadError.value = true
      } finally {
        isLoading.value = false
      }
    }

    const handleAlbumClick = (item: Album) => {
      void router.push({
        path: '/album/detail',
        query: {
          source: 'wy',
          id: String(item.id),
        },
      })
    }

    onMounted(() => {
      void loadData()
    })

    return {
      isLoading,
      loadError,
      albums,
      loadData,
      handleAlbumClick,
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
  .mixin-ellipsis-1();
}
</style>
