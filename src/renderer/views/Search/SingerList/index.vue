<template>
  <div ref="dom_list" :class="$style.container">
    <div v-if="listInfo.list.length" :class="$style.list">
      <div
        v-for="singer in listInfo.list"
        :key="singer.id"
        :class="$style.item"
        tabindex="0"
        :aria-label="singer.name"
        @click="handleClick(singer)"
        @keydown.enter="handleClick(singer)"
      >
        <div :class="$style.cover">
          <img v-if="singer.picUrl" :src="singer.picUrl" :alt="singer.name" loading="lazy">
          <svg v-else version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32">
            <use xlink:href="#icon-user" />
          </svg>
        </div>
        <div :class="$style.info">
          <span :class="$style.name" v-text="singer.name" />
          <span v-if="singer.alias && singer.alias.length" :class="$style.alias" v-text="singer.alias.join(' / ')" />
        </div>
      </div>
    </div>
    <div v-else-if="listInfo.noItemLabel" :class="$style.noItem" v-text="listInfo.noItemLabel" />
    <div v-if="listInfo.maxPage > 1" :class="$style.pagination">
      <material-pagination
        :page="listInfo.page"
        :count="listInfo.total"
        :limit="listInfo.limit"
        @btn-click="handleTogglePage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from '@common/utils/vueTools'
import { searchText } from '@renderer/store/search/state'
import { useRouter, useRoute } from '@common/utils/vueRouter'
import useList, { type SingerInfo } from './useList'

interface Props {
  page: number
}

const props = defineProps<Props>()
const router = useRouter()
const route = useRoute()
const dom_list = ref<HTMLElement | null>(null)

const {
  listInfo,
  search,
} = useList()

const scrollToTop = () => {
  if (dom_list.value) dom_list.value.scrollTop = 0
}

const handleSearch = (text: string, page: number) => {
  void search(text, page).then((list) => {
    if (list.length) scrollToTop()
  })
}

watch(() => props.page, (page) => {
  setTimeout(() => {
    handleSearch(searchText.value, page || 1)
  })
})
watch(searchText, (text) => {
  setTimeout(() => {
    handleSearch(text, props.page)
  })
}, {
  immediate: true,
})

const handleTogglePage = (page: number) => {
  void router.replace({
    path: route.path,
    query: {
      ...route.query,
      page,
    },
  })
}

const handleClick = (singer: SingerInfo) => {
  void router.push({
    path: '/artist/detail',
    query: {
      source: 'wy',
      id: singer.id,
    },
  })
}

</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 5px 0 15px;
}

.list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 15px;
  padding: 0 15px;
}

.item {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  cursor: pointer;
  outline: none;
  border-radius: 4px;
  padding: 8px;
  transition: background-color .3s ease;
  &:hover {
    background-color: var(--color-button-background-hover);
  }
  &:focus {
    background-color: var(--color-button-background-hover);
  }
}

.cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--color-button-background);
  margin-bottom: 8px;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  svg {
    width: 60%;
    height: 60%;
    margin: 20%;
    fill: currentColor;
    opacity: .5;
  }
}

.info {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  width: 100%;
  text-align: center;
}

.name {
  font-size: 13px;
  color: var(--color-font);
  .mixin-ellipsis-1();
  width: 100%;
}

.alias {
  font-size: 12px;
  color: var(--color-font-label);
  .mixin-ellipsis-1();
  width: 100%;
  margin-top: 2px;
}

.noItem {
  padding: 30px 15px;
  text-align: center;
  color: var(--color-font-label);
  font-size: 14px;
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 15px 0;
}
</style>
