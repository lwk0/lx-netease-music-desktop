<template>
  <div :class="$style.list">
    <div class="thead">
      <table>
        <thead>
          <tr v-if="actionButtonsVisible">
            <th class="num" :class="{ [$style.coverHeader]: isShowCover }" style="width: 5%; cursor: pointer;" :title="$t('list__toggle_cover')" :aria-label="$t('list__toggle_cover')" ignore-tip @click="toggleCoverShow">
              <template v-if="isShowCover"><svg :class="$style.headerIcon" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="24" height="24" viewBox="0 0 425.2 425.2" preserveAspectRatio="xMidYMid meet" space="preserve" fill="currentColor"><path d="M20,371.91a20,20,0,0,1-20-20V20A20,20,0,0,1,20,0H333.91a20,20,0,0,1,0,40H40V351.91A20,20,0,0,1,20,371.91Z" /><path d="M405.2,425.2h-306a20,20,0,0,1-20-20V258a20,20,0,0,1,40,0V385.2h266V122h-214a20,20,0,1,1,0-40h234a20,20,0,0,1,20,20V405.2A20,20,0,0,1,405.2,425.2Z" /><path d="M259,326.69a18,18,0,0,1-18-18V165A18,18,0,0,1,277,165v143.6A18,18,0,0,1,259,326.69Z" /><path d="M317.24,241.35a18,18,0,0,1-12.76-5.29l-58.26-58.26a18,18,0,0,1,25.52-25.52L330,210.55a18,18,0,0,1-12.76,30.81Z" /><path d="M223.08,360.18A53.95,53.95,0,1,1,277,306.23,54,54,0,0,1,223.08,360.18Zm0-71.8a17.85,17.85,0,1,0,17.85,17.85A17.87,17.87,0,0,0,223.08,288.38Z" /></svg></template>
              <template v-else>#</template>
            </th>
            <th class="nobreak">{{ $t('music_name') }}</th>
            <th class="nobreak" style="width: 22%;">{{ $t('music_singer') }}</th>
            <th class="nobreak" style="width: 22%;">{{ $t('music_album') }}</th>
            <th class="nobreak" style="width: 9%;">{{ $t('music_time') }}</th>
            <th class="nobreak" style="width: 16%;">{{ $t('action') }}</th>
          </tr>
          <tr v-else>
            <th class="num" :class="{ [$style.coverHeader]: isShowCover }" style="width: 5%; cursor: pointer;" :title="$t('list__toggle_cover')" :aria-label="$t('list__toggle_cover')" ignore-tip @click="toggleCoverShow">
              <template v-if="isShowCover"><svg :class="$style.headerIcon" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="24" height="24" viewBox="0 0 425.2 425.2" preserveAspectRatio="xMidYMid meet" space="preserve" fill="currentColor"><path d="M20,371.91a20,20,0,0,1-20-20V20A20,20,0,0,1,20,0H333.91a20,20,0,0,1,0,40H40V351.91A20,20,0,0,1,20,371.91Z" /><path d="M405.2,425.2h-306a20,20,0,0,1-20-20V258a20,20,0,0,1,40,0V385.2h266V122h-214a20,20,0,1,1,0-40h234a20,20,0,0,1,20,20V405.2A20,20,0,0,1,405.2,425.2Z" /><path d="M259,326.69a18,18,0,0,1-18-18V165A18,18,0,0,1,277,165v143.6A18,18,0,0,1,259,326.69Z" /><path d="M317.24,241.35a18,18,0,0,1-12.76-5.29l-58.26-58.26a18,18,0,0,1,25.52-25.52L330,210.55a18,18,0,0,1-12.76,30.81Z" /><path d="M223.08,360.18A53.95,53.95,0,1,1,277,306.23,54,54,0,0,1,223.08,360.18Zm0-71.8a17.85,17.85,0,1,0,17.85,17.85A17.87,17.87,0,0,0,223.08,288.38Z" /></svg></template>
              <template v-else>#</template>
            </th>
            <th class="nobreak">{{ $t('music_name') }}</th>
            <th class="nobreak" style="width: 25%;">{{ $t('music_singer') }}</th>
            <th class="nobreak" style="width: 28%;">{{ $t('music_album') }}</th>
            <th class="nobreak" style="width: 10%;">{{ $t('music_time') }}</th>
          </tr>
        </thead>
      </table>
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
    <search-list :list="list" :visible="isShowSearchBar" @action="handleMusicSearchAction" />
    <music-sort-modal v-model:show="isShowMusicSortModal" :music-info="selectedSortMusicInfo" :selected-num="selectedNum" @confirm="sortMusic" />
    <music-toggle-modal v-model:show="isShowMusicToggleModal" :music-info="selectedToggleMusicInfo" @toggle="toggleSource" />
    <base-menu v-model="isShowItemMenu" :menus="menus" :xy="menuLocation" item-name="name" @menu-click="handleMenuClick" />
  </div>
</template>

<script>
import { clipboardWriteText } from '@common/utils/electron'
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
import { ref, computed } from '@common/utils/vueTools'
import { appSetting, updateSetting } from '@renderer/store/setting'
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
    const actionButtonsVisible = appSetting['list.actionButtonsVisible']
    const isShowCover = computed(() => appSetting['list.isShowCover'])
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
      listItemHeight,
      handleSelectData,
      removeAllSelect,
    } = useList({ listRef, list })

    const {
      handlePlayMusic,
      handlePlayMusicLater,
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
    } = useSearch({
      setSelectedIndex,
      handlePlayMusic,
      listRef,
    })

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
      handleListItemRightClick,
      removeAllSelect,
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
.coverHeader {
  display: flex !important;
  align-items: center;
  justify-content: center;
}
.headerIcon {
  display: block;
  fill: var(--color-button-font);
  flex: none;
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

</style>
