<template lang="pug">
div(:class="$style.container")
  div(v-if="isLoading" :class="$style.loading") {{ $t('netease__loading') }}
  div(v-else-if="loadError" :class="$style.error" @click="loadData") {{ $t('netease__load_error') }}
  div(v-else-if="artists.length === 0" :class="$style.empty") {{ $t('netease__no_data') }}
  div(v-else :class="$style.list")
    div(v-for="item in artists" :key="item.id" :class="$style.card" @click="handleArtistClick(item)")
      div(:class="$style.avatar")
        img(v-if="item.picUrl || item.img1v1Url" :src="(item.picUrl || item.img1v1Url) + '?param=200y200'" loading="lazy" :alt="item.name")
        div(v-else :class="$style.avatarPlaceholder")
          svg-icon(name="music" :class="$style.placeholderIcon")
      div(:class="$style.info")
        h4(:class="$style.name") {{ item.name }}
        p(v-if="item.fansCount != null" :class="$style.meta") {{ formatFans(item.fansCount) }} {{ $t('artist__fans') }}

</template>

<script lang="ts">
import { ref, onMounted } from '@common/utils/vueTools'
import musicSdk from '@renderer/utils/musicSdk'
import { useRouter } from '@common/utils/vueRouter'
import { setWyFollowedArtists } from '@renderer/store/user'

interface Artist {
  id: number | string
  name: string
  picUrl?: string
  img1v1Url?: string
  albumSize?: number
  fansCount?: number
}

export default {
  name: 'ArtistsTab',
  props: {
    uid: { type: String, required: true },
    cookie: { type: String, required: true },
  },
  setup(props: { uid: string, cookie: string }) {
    const router = useRouter()
    const isLoading = ref(false)
    const loadError = ref(false)
    const artists = ref<Artist[]>([])

    const loadData = async() => {
      if (isLoading.value) return
      isLoading.value = true
      loadError.value = false
      try {
        const result = await musicSdk.wy.user.getSublist()
        const raw = (result && Array.isArray(result.artists))
          ? result.artists
          : (Array.isArray(result) ? result : [])
        if (raw.length) {
          artists.value = raw
          setWyFollowedArtists(raw)
          void enrichFans(raw)
        }
      } catch (err) {
        console.error('Failed to load followed artists:', err)
        loadError.value = true
      } finally {
        isLoading.value = false
      }
    }

    // sublist 接口不含粉丝数，加载后按歌手详情异步补充，避免阻塞列表展示
    const enrichFans = async(list: Artist[]) => {
      const concurrency = 5
      for (let i = 0; i < list.length; i += concurrency) {
        const batch = list.slice(i, i + concurrency)
        await Promise.allSettled(batch.map(async item => {
          try {
            const detail = await musicSdk.wy.artist.getDetail(item.id)
            const fans = detail?.fansCount ?? detail?.artist?.fansCount
            if (fans == null) return
            const idx = artists.value.findIndex(a => String(a.id) === String(item.id))
            if (idx > -1) artists.value[idx].fansCount = fans
          } catch {
            // 单个歌手粉丝数获取失败则忽略
          }
        }))
      }
    }

    const formatFans = (n: number) => {
      if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
      return String(n)
    }

    const handleArtistClick = (item: Artist) => {
      void router.push({
        path: '/artist/detail',
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
      artists,
      loadData,
      handleArtistClick,
      formatFans,
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
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 15px;
  padding-right: 15px;
}

.card {
  cursor: pointer;
  text-align: center;
  transition: transform @transition-fast;

  &:hover {
    transform: translateY(-2px);
  }
}

.avatar {
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

.avatarPlaceholder {
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
</style>
