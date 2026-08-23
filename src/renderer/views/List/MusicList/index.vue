<template>
  <div :class="$style.list">
    <div :class="$style.toolbar">
      <h2 :class="$style.toolbarTitle">{{ currentListName }}</h2>
      <div :class="$style.toolbarSearch">
        <svg :class="$style.toolbarSearchIcon" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" space="preserve">
          <use xlink:href="#icon-search" />
        </svg>
        <input
          ref="dom_searchInput" v-model.trim="searchText" type="text" :placeholder="$t('list__search')"
          @input="handleSearchInput" @keyup.escape="clearSearch" @focus="handleSearchFocus" @blur="handleSearchBlur"
          @keydown="handleSearchKeyDown"
        >
        <button v-if="searchText.length" :class="$style.toolbarSearchClear" @click="clearSearch">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="70%" viewBox="0 0 212.982 212.982" space="preserve">
            <use xlink:href="#icon-delete" />
          </svg>
        </button>
        <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut">
          <div v-if="isSearchFocused && searchText.length" :class="$style.searchDropdown">
            <div v-if="!searchResult.length" :class="$style.searchEmpty">{{ $t('no_item') }}</div>
            <div
              v-for="(item, index) in searchResult" :key="item.id"
              :class="[$style.searchItem, { [$style.searchItemActive]: searchSelectIndex === index }]"
              @mouseenter="searchSelectIndex = index" @mousedown.prevent="handleSearchResultClick(item)"
            >
              <span :class="$style.searchItemName">{{ item.name }}</span>
              <span :class="$style.searchItemSinger"> - {{ item.singer }}</span>
            </div>
          </div>
        </transition>
      </div>
      <button
        :class="[$style.toolbarBatchBtn, { [$style.toolbarBatchBtnActive]: isBatchSelectMode }]"
        :title="$t('list__batch_select')" :aria-label="$t('list__batch_select')"
        @click="isBatchSelectMode = !isBatchSelectMode"
      >
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="70%" viewBox="0 0 24 24" space="preserve">
          <use xlink:href="#icon-check-box" />
        </svg>
      </button>
    </div>
    <div class="thead">
      <div :class="$style.headerRow">
        <div :class="[$style.headerCell, $style.numCell]" :title="$t('list__toggle_cover')" :aria-label="$t('list__toggle_cover')" ignore-tip @click="toggleCoverShow">
          <svg v-if="isShowCover" :class="$style.headerIcon" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" space="preserve"><use xlink:href="#icon-cover" /></svg>
          <span v-else>#</span>
        </div>
        <div :class="$style.headerCell" style="flex: auto;">{{ $t('music_name') }}</div>
        <div :class="$style.headerCell" :style="{ flex: actionButtonsVisible ? '0 0 22%' : '0 0 25%' }">{{ $t('music_singer') }}</div>
        <div :class="$style.headerCell" :style="{ flex: actionButtonsVisible ? '0 0 22%' : '0 0 28%' }">{{ $t('music_album') }}</div>
        <div :class="$style.headerCell" :style="{ flex: actionButtonsVisible ? '0 0 9%' : '0 0 10%' }">{{ $t('music_time') }}</div>
        <div v-if="actionButtonsVisible" :class="$style.headerCell" :style="{ flex: '0 0 16%' }">{{ $t('action') }}</div>
      </div>
    </div>
    <div v-show="list.length" ref="dom_listContent" :class="$style.content">
      <base-virtualized-list
        v-if="actionButtonsVisible" ref="listRef" v-slot="{ item, index }" :list="list" key-name="id"
        :item-height="listItemHeight" container-class="scroll" content-class="list"
        @scroll="saveListPosition" @contextmenu.capture="handleListRightClick"
      >
        <div
          class="list-item" :class="[{ [$style.active]: playerInfo.isPlayList && playerInfo.playIndex === index }, { selected: selectedIndex == index || rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { disabled: !assertApiSupport(item.source) }]"
          @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
        >
          <div class="list-item-cell no-select" :class="$style.num" style="flex: 0 0 5%;">
            <transition name="play-active">
              <img v-if="isShowCover && item.meta?.picUrl && !failedCovers.has(item.meta.picUrl)" :src="item.meta.picUrl" :class="$style.coverImg" @error="handleCoverError">
              <div v-else-if="isShowCover" :class="$style.coverPlaceholder">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="60%" viewBox="0 0 24 24" space="preserve">
                  <use xlink:href="#icon-cover" />
                </svg>
              </div>
              <div v-else class="num">{{ index + 1 }}</div>
            </transition>
            <transition name="play-active">
              <div v-if="playerInfo.isPlayList && playerInfo.playIndex === index" :class="$style.playIcon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="50%" viewBox="0 0 512 512" space="preserve">
                  <use xlink:href="#icon-play-outline" />
                </svg>
              </div>
            </transition>
          </div>
          <div class="list-item-cell auto name" :aria-label="item.name">
            <span class="select name">{{ item.name }}</span>
            <span v-if="isShowSource" class="no-select label-source">{{ item.source }}</span>
          </div>
          <div class="list-item-cell" style="flex: 0 0 22%;"><span class="select" :aria-label="item.singer">{{ item.singer }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 22%;"><span class="select" :aria-label="item.meta.albumName">{{ item.meta.albumName }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 9%;"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
          <div class="list-item-cell" :class="$style.actionCell" style="flex: 0 0 16%; padding-left: 0; padding-right: 0;">
            <wy-like-btn :class="$style.likeBtn" :music-info="item" />
            <material-list-buttons :index="index" :download-btn="assertApiSupport(item.source) && item.source != 'local'" @btn-click="handleListBtnClick" />
          </div>
        </div>
      </base-virtualized-list>
      <base-virtualized-list
        v-else ref="listRef" v-slot="{ item, index }" :list="list" key-name="id"
        :item-height="listItemHeight" container-class="scroll" content-class="list"
        @scroll="saveListPosition" @contextmenu.capture="handleListRightClick"
      >
        <div
          class="list-item"
          :class="[{ [$style.active]: playerInfo.isPlayList && playerInfo.playIndex === index }, { selected: selectedIndex == index || rightClickSelectedIndex == index }, { active: selectedList.includes(item) }, { disabled: !assertApiSupport(item.source) }]"
          @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
        >
          <div class="list-item-cell no-select" :class="$style.num" style="flex: 0 0 5%;">
            <transition name="play-active">
              <img v-if="isShowCover && item.meta?.picUrl && !failedCovers.has(item.meta.picUrl)" :src="item.meta.picUrl" :class="$style.coverImg" @error="handleCoverError">
              <div v-else-if="isShowCover" :class="$style.coverPlaceholder">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="60%" viewBox="0 0 24 24" space="preserve">
                  <use xlink:href="#icon-cover" />
                </svg>
              </div>
              <div v-else class="num">{{ index + 1 }}</div>
            </transition>
            <transition name="play-active">
              <div v-if="playerInfo.isPlayList && playerInfo.playIndex === index" :class="$style.playIcon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="50%" viewBox="0 0 512 512" space="preserve">
                  <use xlink:href="#icon-play-outline" />
                </svg>
              </div>
            </transition>
          </div>
          <div class="list-item-cell auto name">
            <span class="select name" :aria-label="item.name">{{ item.name }}</span>
            <span v-if="isShowSource" class="no-select label-source">{{ item.source }}</span>
          </div>
          <div class="list-item-cell" style="flex: 0 0 25%;"><span class="select" :aria-label="item.singer">{{ item.singer }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 28%;"><span class="select" :aria-label="item.meta.albumName">{{ item.meta.albumName }}</span></div>
          <div class="list-item-cell" style="flex: 0 0 10%;"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
        </div>
      </base-virtualized-list>
    </div>
    <div v-show="!list.length" :class="$style.noItem">
      <p v-text="$t('no_item')" />
    </div>
    <common-list-add-modal
      v-model:show="isShowListAdd" :is-move="isMove" :from-list-id="listId"
      :music-info="selectedAddMusicInfo" :exclude-list-id="excludeListIds" teleport="#view"
    />
    <common-list-add-multiple-modal
      v-model:show="isShowListAddMultiple" :from-list-id="listId"
      :is-move="isMoveMultiple" :music-list="selectedList" :exclude-list-id="excludeListIds" teleport="#view" @confirm="removeAllSelect"
    />
    <common-download-modal v-model:show="isShowDownload" :music-info="selectedDownloadMusicInfo" teleport="#view" :list-id="listId" />
    <common-download-multiple-modal v-model:show="isShowDownloadMultiple" :list="selectedList" teleport="#view" :list-id="listId" @confirm="removeAllSelect" />
    <search-list :list="list" :visible="isShowSearchBar" position="right" @action="handleMusicSearchAction" />
    <music-sort-modal v-model:show="isShowMusicSortModal" :music-info="selectedSortMusicInfo" :selected-num="selectedNum" @confirm="sortMusic" />
    <music-toggle-modal v-model:show="isShowMusicToggleModal" :music-info="selectedToggleMusicInfo" @toggle="toggleSource" />
    <base-menu v-model="isShowItemMenu" :menus="menus" :xy="menuLocation" item-name="name" @menu-click="handleMenuClick" />
    <transition enter-active-class="animated-fast slideInUp" leave-active-class="animated-fast slideOutDown">
      <div v-if="selectedList.length" :class="$style.batchToolbar">
        <span :class="$style.batchCount">{{ $t('list__selected_count', { count: selectedList.length }) }}</span>
        <div :class="$style.batchActions">
          <button :title="$t('list__play')" :aria-label="$t('list__play')" @click="handlePlaySelected">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="70%" viewBox="0 0 1024 1024" space="preserve"><use xlink:href="#icon-play" /></svg>
          </button>
          <button :title="$t('list__add_to')" :aria-label="$t('list__add_to')" @click="handleShowMusicAddModal(-1, false)">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="70%" viewBox="0 0 24 24" space="preserve"><use xlink:href="#icon-list-add" /></svg>
          </button>
          <button :title="$t('list__download')" :aria-label="$t('list__download')" @click="handleShowDownloadModal(-1, false)">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="70%" viewBox="0 0 475.078 475.077" space="preserve"><use xlink:href="#icon-download" /></svg>
          </button>
          <button :title="$t('list__remove')" :aria-label="$t('list__remove')" @click="handleRemoveMusic(-1)">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="70%" viewBox="0 0 212.982 212.982" space="preserve"><use xlink:href="#icon-delete" /></svg>
          </button>
          <button :title="$t('cancel_button_text_2')" :aria-label="$t('cancel_button_text_2')" @click="removeAllSelect">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="70%" viewBox="0 0 24 24" space="preserve"><use xlink:href="#icon-close" /></svg>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { clipboardWriteText } from '@common/utils/electron'
import { debounce } from '@common/utils'
import { assertApiSupport } from '@renderer/store/utils'
import SearchList from './components/SearchList.vue'
import MusicSortModal from './components/MusicSortModal.vue'
import MusicToggleModal from './components/MusicToggleModal.vue'
import useListInfo from './useListInfo'
import useList from './useList'
import useMenu from './useMenu'
import usePlay from './usePlay'
import useMusicDownload from './useMusicDownload'
import useMusicAdd from './useMusicAdd'
import useSort from './useSort'
import useMusicActions from './useMusicActions'
import useSearch from './useSearch'
import useListScroll from './useListScroll'
import useMusicToggle from './useMusicToggle'
import WyLikeBtn from '@renderer/components/common/WyLikeBtn.vue'
import { ref, computed, toRaw } from '@common/utils/vueTools'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { useI18n } from '@renderer/plugins/i18n'
import { defaultList, loveList, tempList, userLists } from '@renderer/store/list/state'
export default {
  name: 'MusicList',
  components: {
    SearchList,
    MusicSortModal,
    MusicToggleModal,
    WyLikeBtn,
  },
  props: {
    listId: {
      type: String,
      required: true,
    },
  },
  emits: ['show-menu'],
  setup(props, { emit }) {
    const t = useI18n()
    const actionButtonsVisible = appSetting['list.actionButtonsVisible']
    const isShowCover = computed(() => appSetting['list.isShowCover'])
    const currentListName = computed(() => {
      switch (props.listId) {
        case defaultList.id: return t(defaultList.name)
        case loveList.id: return t(loveList.name)
        case tempList.id: return t(tempList.name)
        default:
          return userLists.find(l => l.id == props.listId)?.name ?? ''
      }
    })
    const failedCovers = ref(new Set())
    const handleCoverError = (event) => {
      const target = event.target
      if (target?.src) failedCovers.value.add(target.src)
    }
    const toggleCoverShow = () => {
      updateSetting({ 'list.isShowCover': !appSetting['list.isShowCover'] })
    }
    let scrollIndex = null
    let isAnimation = false
    const handleRestoreScroll = (_scrollIndex, _isAnimation) => {
      scrollIndex = _scrollIndex
      isAnimation = _isAnimation
      if (isAnimation) void restoreScroll(scrollIndex, isAnimation)
      // console.log('handleRestoreScroll', scrollIndex, isAnimation)
    }
    const onLoadedList = () => {
      // console.log('restoreScroll', scrollIndex, isAnimation)
      void restoreScroll(scrollIndex, isAnimation)
    }

    const {
      rightClickSelectedIndex,
      selectedIndex,
      dom_listContent,
      listRef,
      list,
      playerInfo,
      setSelectedIndex,
      isShowSource,
      excludeListIds,
    } = useListInfo({ props, onLoadedList })

    const {
      selectedList,
      isBatchSelectMode,
      listItemHeight,
      handleSelectData,
      removeAllSelect,
    } = useList({ listRef, list })

    const {
      handlePlayMusic,
      handlePlayMusicLater,
      handlePlaySelected,
      doubleClickPlay,
    } = usePlay({ props, selectedList, list, removeAllSelect })

    const {
      isShowListAdd,
      isMove,
      isShowListAddMultiple,
      isMoveMultiple,
      selectedAddMusicInfo,
      handleShowMusicAddModal,
      handleShowMusicMoveModal,
    } = useMusicAdd({ selectedList, list })

    const {
      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,
      handleShowDownloadModal,
    } = useMusicDownload({ selectedList, list })

    const {
      isShowMusicSortModal,
      selectedNum,
      selectedSortMusicInfo,
      handleShowSortModal,
      sortMusic,
    } = useSort({ props, list, selectedList, removeAllSelect })

    const {
      handleShowMusicToggleModal,
      isShowMusicToggleModal,
      selectedToggleMusicInfo,
      toggleSource,
    } = useMusicToggle(props, list)

    const {
      handleSearch,
      handleOpenMusicDetail,
      handleCopyName,
      handleDislikeMusic,
      handleLikeMusic,
      handleRemoveMusic,
    } = useMusicActions({ props, list, removeAllSelect, selectedList })

    const {
      menus,
      menuLocation,
      isShowItemMenu,
      showMenu,
      menuClick,
    } = useMenu({
      assertApiSupport,
      emit,

      handleShowDownloadModal,
      handlePlayMusic,
      handlePlayMusicLater,
      handleShowMusicToggleModal,
      handleSearch,
      handleShowMusicAddModal,
      handleShowMusicMoveModal,
      handleShowSortModal,
      handleOpenMusicDetail,
      handleCopyName,
      handleDislikeMusic,
      handleLikeMusic,
      handleRemoveMusic,
    })

    const {
      isShowSearchBar,
      searchList,
      handleMusicSearchAction,
      handleShowSearchBar,
    } = useSearch({
      setSelectedIndex,
      handlePlayMusic,
      listRef,
    })

    const dom_searchInput = ref(null)
    const searchText = ref('')
    const searchResult = ref([])
    const isSearchFocused = ref(false)
    const searchSelectIndex = ref(-1)

    const doSearch = debounce(async() => {
      if (!searchText.value.length) {
        searchResult.value = []
        searchSelectIndex.value = -1
        return
      }
      searchResult.value = await window.lx.worker.main.searchListMusic(toRaw(list.value), searchText.value)
      searchSelectIndex.value = searchResult.value.length ? 0 : -1
    }, 250)

    const handleSearchInput = () => {
      doSearch()
    }

    const clearSearch = () => {
      searchText.value = ''
      searchResult.value = []
      searchSelectIndex.value = -1
      dom_searchInput.value?.focus()
    }

    const handleSearchFocus = () => {
      isSearchFocused.value = true
      if (searchText.value.length) doSearch()
    }

    const handleSearchBlur = () => {
      setTimeout(() => {
        isSearchFocused.value = false
      }, 200)
    }

    const handleSearchResultClick = (item) => {
      const idx = list.value.findIndex(m => m.id == item.id)
      if (idx < 0) return
      listRef.value.scrollToIndex(idx, -150, true, () => {
        setSelectedIndex(idx)
        setTimeout(() => {
          setSelectedIndex(-1)
        }, 600)
      })
      clearSearch()
    }

    const handleSearchKeyDown = (event) => {
      if (!searchResult.value.length) return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        searchSelectIndex.value = searchSelectIndex.value + 1 < searchResult.value.length ? searchSelectIndex.value + 1 : 0
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        searchSelectIndex.value = searchSelectIndex.value - 1 < -1 ? searchResult.value.length - 1 : searchSelectIndex.value - 1
      } else if (event.key === 'Enter') {
        event.preventDefault()
        const item = searchResult.value[searchSelectIndex.value]
        if (item) handleSearchResultClick(item)
      }
    }

    const { saveListPosition, restoreScroll } = useListScroll({ props, listRef, list, handleRestoreScroll })


    const handleListItemClick = (event, index) => {
      if (rightClickSelectedIndex.value > -1) return
      handleSelectData(index)
      doubleClickPlay(index)
    }
    const handleListItemRightClick = (event, index) => {
      rightClickSelectedIndex.value = index
      showMenu(event, list.value[index], index)
    }
    const handleMenuClick = (action) => {
      let index = rightClickSelectedIndex.value
      rightClickSelectedIndex.value = -1
      menuClick(action, index)
    }
    const handleListRightClick = (event) => {
      if (!event.target.classList.contains('select')) return
      event.stopImmediatePropagation()
      let classList = dom_listContent.value.classList
      classList.add('copying')
      window.requestAnimationFrame(() => {
        let str = window.getSelection().toString()
        classList.remove('copying')
        str = str.split(/\n\n/).map(s => s.replace(/\n/g, '  ')).join('\n').trim()
        if (!str.length) return
        clipboardWriteText(str)
      })
    }
    const handleListBtnClick = ({ action, index }) => {
      switch (action) {
        case 'download':
          handleShowDownloadModal(index, true)
          break
        case 'play':
          handlePlayMusic(index, true)
          break
        case 'search':
          handleSearch(index)
          break
        case 'listAdd':
          handleShowMusicAddModal(index, true)
          break
      }
    }
    const scrollToTop = () => {
      listRef.value.scrollTo(0, true)
    }

    return {
      listItemHeight,
      handleListItemClick,
      selectedList,
      isBatchSelectMode,
      handleListItemRightClick,
      removeAllSelect,
      handlePlaySelected,
      handleListBtnClick,
      rightClickSelectedIndex,
      selectedIndex,
      dom_listContent,
      listRef,
      excludeListIds,

      menus,
      isShowItemMenu,
      menuLocation,
      handleMenuClick,

      handleListRightClick,
      assertApiSupport,

      isShowListAdd,
      isMove,
      isShowListAddMultiple,
      isMoveMultiple,
      selectedAddMusicInfo,

      isShowMusicSortModal,
      selectedNum,
      selectedSortMusicInfo,
      sortMusic,

      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,

      scrollToTop,

      isShowSearchBar,
      searchList,
      handleMusicSearchAction,
      handleShowSearchBar,

      dom_searchInput,
      searchText,
      searchResult,
      isSearchFocused,
      searchSelectIndex,
      handleSearchInput,
      clearSearch,
      handleSearchFocus,
      handleSearchBlur,
      handleSearchResultClick,
      handleSearchKeyDown,

      list,
      playerInfo,

      saveListPosition,
      isShowSource,
      handleRestoreScroll,

      actionButtonsVisible,
      isShowCover,
      failedCovers,
      handleCoverError,
      toggleCoverShow,
      currentListName,

      isShowMusicToggleModal,
      selectedToggleMusicInfo,
      toggleSource,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.list {
  position: relative;
  overflow: hidden;
  height: 100%;
  flex: auto;
  display: flex;
  flex-flow: column nowrap;

  :global(.list-item) {
    &.active {
      color: var(--color-button-font);
    }
  }
  :global {
    .label-source {
      color: var(--color-primary);
      padding: 5px;
      font-size: .8em;
      line-height: 1.2;
      opacity: .75;
      display: inline-block;
    }
  }
}
.toolbar {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  border-bottom: var(--color-list-header-border-bottom);
  background-color: var(--color-content-background);
}
.toolbarTitle {
  flex: auto;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-button-font);
  line-height: 44px;
  .mixin-ellipsis-1();
}
.toolbarSearch {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  gap: 5px;
  width: 160px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 12px;
  background-color: var(--color-button-background-hover);
  color: var(--color-font-label);
  cursor: text;
  transition: border-color @transition-fast, background-color .2s ease;
  &:hover {
    border-color: var(--color-primary-background-hover);
  }
  &:focus-within {
    background-color: var(--color-content-background);
    border-color: var(--color-primary);
  }
  input {
    flex: auto;
    width: 0;
    min-width: 0;
    height: 100%;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--color-button-font);
    font-size: 11px;
    outline: none;
    &::placeholder {
      color: var(--color-font-label);
    }
  }
}
.toolbarSearchIcon {
  flex: none;
  width: 12px;
  height: 12px;
  fill: currentColor;
}
.toolbarSearchClear {
  flex: none;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-font-label);
  cursor: pointer;
  opacity: .7;
  transition: opacity @transition-fast, background-color .2s ease;
  &:hover {
    opacity: 1;
    background-color: var(--color-button-background-hover);
  }
}
.toolbarBatchBtn {
  flex: none;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: @radius-border;
  background: transparent;
  color: var(--color-font-label);
  cursor: pointer;
  opacity: .7;
  transition: opacity @transition-fast, background-color .2s ease, color .2s ease;
  svg {
    display: block;
    width: 16px;
    height: 16px;
    fill: currentColor;
  }
  &:hover {
    opacity: 1;
    background-color: var(--color-button-background-hover);
  }
  &:active {
    background-color: var(--color-button-background-active);
  }
}
.toolbarBatchBtnActive {
  color: var(--color-primary);
  opacity: 1;
  background-color: var(--color-primary-light-100-alpha-800);
}
.searchDropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 5px);
  max-height: 220px;
  overflow-y: auto;
  padding: 4px;
  border-radius: @radius-border;
  background-color: var(--color-content-background);
  box-shadow: 0 4px 16px rgba(0, 0, 0, .18);
  border: 1px solid var(--color-button-background-hover);
  z-index: 100;
  // 统一滚动条风格（与项目 .scroll 保持一致）
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
    background-color: rgba(0, 0, 0, 0);
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
    border-radius: 3px;
    background-color: var(--color-primary-alpha-400);
    transition: background-color 0.4s ease;
  }
}
.searchEmpty {
  padding: 8px;
  text-align: center;
  font-size: 12px;
  color: var(--color-font-label);
}
.searchItem {
  padding: 5px 8px;
  border-radius: @radius-border;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-button-font);
  transition: background-color .2s ease;
  .mixin-ellipsis-1();
  &:hover, &.searchItemActive {
    background-color: var(--color-primary-background-hover);
  }
}
.searchItemName {
  .mixin-ellipsis-1();
}
.searchItemSinger {
  opacity: .7;
  .mixin-ellipsis-1();
}
.headerRow {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  height: 38px;
}
.headerCell {
  flex: none;
  padding: 0 6px;
  box-sizing: border-box;
  font-size: 12px;
  color: var(--color-font-label);
  line-height: 38px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.numCell {
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  cursor: pointer;
  flex: 0 0 5%;
  color: var(--color-font-label);
}
.headerIcon {
  display: block;
  width: 20px;
  height: 20px;
  fill: var(--color-button-font);
}
.num {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.playIcon {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  color: var(--color-button-font);
  opacity: .7;
}
.coverImg {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 5px;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.2);
  display: block;
}
.coverPlaceholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 5px;
  background-color: var(--color-primary-light-900-alpha-200);
  color: var(--color-primary-light-400-alpha-500);
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.2);
}
.content {
  min-height: 0;
  font-size: 14px;
  display: flex;
  flex-flow: column nowrap;
  flex: auto;
}

.noItem {
  position: relative;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;

  p {
    font-size: 24px;
    color: var(--color-font-label);
  }
}

.actionCell {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
}

.likeBtn {
  width: 17px;
  height: 17px;
}

.batchToolbar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 15px;
  width: fit-content;
  margin: 0 auto;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-radius: @radius-border * 2;
  background-color: var(--color-content-background);
  box-shadow: 0 4px 16px rgba(0, 0, 0, .18);
  border: 1px solid var(--color-button-background-hover);
}
.batchCount {
  font-size: 13px;
  color: var(--color-button-font);
  white-space: nowrap;
}
.batchActions {
  display: flex;
  align-items: center;
  gap: 4px;
  button {
    flex: none;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    border-radius: @radius-border;
    background: transparent;
    color: var(--color-button-font);
    cursor: pointer;
    opacity: .75;
    transition: opacity @transition-fast, background-color .2s ease;
    svg {
      display: block;
      width: 18px;
      height: 18px;
      fill: currentColor;
    }
    &:hover {
      opacity: 1;
      background-color: var(--color-button-background-hover);
    }
    &:active {
      background-color: var(--color-button-background-active);
    }
  }
}

</style>
