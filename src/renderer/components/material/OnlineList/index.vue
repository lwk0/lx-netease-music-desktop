<template>
  <div :class="$style.songList">
    <!-- <transition enter-active-class="animated-fast fadeIn" leave-active-class="animated-fast fadeOut"> -->
    <div :class="$style.list">
      <div class="thead" :class="$style.headerWrap">
        <div v-if="actionButtonsVisible" :class="$style.headerRow">
          <div :class="[$style.headerCell, $style.numCell]" :style="getColStyle('num')" :title="$t('list__toggle_cover')" :aria-label="$t('list__toggle_cover')" ignore-tip @click="toggleCoverShow">
            <template v-if="isShowCover"><svg :class="$style.headerIcon" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 739.96 763.59" space="preserve"><use xlink:href="#icon-album" /></svg></template>
            <template v-else>#</template>
          </div>
          <div :class="$style.headerCell" :style="getColStyle('name')">{{ $t('music_name') }}</div>
          <div :class="$style.headerCell" :style="getColStyle('singer')">{{ $t('music_singer') }}</div>
          <div :class="$style.headerCell" :style="getColStyle('album')">{{ $t('music_album') }}</div>
          <div :class="$style.headerCell" :style="getColStyle('time')">{{ $t('music_time') }}</div>
          <div :class="$style.headerCell" :style="getColStyle('action')">{{ $t('action') }}</div>
        </div>
        <div v-else :class="$style.headerRow">
          <div :class="[$style.headerCell, $style.numCell]" :style="getColStyle('num')" :title="$t('list__toggle_cover')" :aria-label="$t('list__toggle_cover')" ignore-tip @click="toggleCoverShow">
            <template v-if="isShowCover"><svg :class="$style.headerIcon" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 739.96 763.59" space="preserve"><use xlink:href="#icon-album" /></svg></template>
            <template v-else>#</template>
          </div>
          <div :class="$style.headerCell" :style="getColStyle('name')">{{ $t('music_name') }}</div>
          <div :class="$style.headerCell" :style="getColStyle('singer')">{{ $t('music_singer') }}</div>
          <div :class="$style.headerCell" :style="getColStyle('album')">{{ $t('music_album') }}</div>
          <div :class="$style.headerCell" :style="getColStyle('time')">{{ $t('music_time') }}</div>
        </div>
        <button v-if="columnCustomizationEnabled" :class="$style.columnSettingBtn" :title="$t('list__column_setting')" :aria-label="$t('list__column_setting')" @click="openColumnSetting">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="16" height="16" viewBox="0 0 493.23 436.47" space="preserve">
            <use xlink:href="#icon-setting" />
          </svg>
        </button>
      </div>
      <div :class="$style.content">
        <div v-show="!noItem" ref="dom_listContent" :class="$style.content">
          <base-virtualized-list v-if="actionButtonsVisible" ref="listRef" :list="list" key-name="id" :item-height="listItemHeight" container-class="scroll" content-class="list" @contextmenu.capture="handleListRightClick">
            <template #default="{ item, index }">
              <div
                class="list-item" :class="[{ selected: rightClickSelectedIndex == index }, { active: selectedList.includes(item) }]"
                @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
              >
                <div class="list-item-cell no-select num" :class="$style.coverCell" :style="getColStyle('num')" @click.stop>
                  <transition name="play-active">
                    <img v-if="isShowCover && item.meta?.picUrl && !failedCovers.has(item.meta.picUrl)" :src="item.meta.picUrl" :class="$style.coverImg" @error="handleCoverError">
                    <span v-else>{{ index + 1 }}</span>
                  </transition>
                  <transition name="play-active">
                    <div v-if="isActiveItem(item)" :class="$style.playIcon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="50%" viewBox="0 0 512 512" space="preserve">
                        <use xlink:href="#icon-play-outline" />
                      </svg>
                    </div>
                  </transition>
                </div>
                <div class="list-item-cell auto name" :style="getColStyle('name')">
                  <span class="select name" :aria-label="item.name">{{ item.name }}</span>
                  <span v-if="item.meta?._qualitys?.flac24bit" class="no-select badge badge-theme-primary">{{ $t('tag__lossless_24bit') }}</span>
                  <span v-else-if="item.meta?._qualitys?.ape || item.meta?._qualitys?.flac || item.meta?._qualitys?.wav" class="no-select badge badge-theme-primary">{{ $t('tag__lossless') }}</span>
                  <span v-else-if="item.meta?._qualitys?.['320k']" class="no-select badge badge-theme-secondary">{{ $t('tag__high_quality') }}</span>
                  <span v-if="sourceTag" class="no-select badge badge-theme-tertiary">{{ item.source }}</span>
                </div>
                <div class="list-item-cell" :style="getColStyle('singer')"><span class="select" :aria-label="item.singer">{{ item.singer }}</span></div>
                <div class="list-item-cell" :style="getColStyle('album')"><span class="select" :aria-label="item.meta?.albumName">{{ item.meta?.albumName }}</span></div>
                <div class="list-item-cell" :style="getColStyle('time')"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
                <div class="list-item-cell" :class="$style.actionCell" :style="getColStyle('action')">
                  <wy-like-btn :class="$style.likeBtn" :music-info="item" />
                  <material-list-buttons :index="index" :remove-btn="false" :download-btn="assertApiSupport(item.source)" :play-btn="checkApiSource ? assertApiSupport(item.source) : true" @btn-click="handleListBtnClick" />
                </div>
              </div>
            </template>
            <template #footer>
              <div :class="$style.pagination">
                <material-pagination :count="total" :limit="limit" :page="page" @btn-click="$emit('togglePage', $event)" />
              </div>
            </template>
          </base-virtualized-list>
          <base-virtualized-list v-else ref="listRef" :list="list" key-name="id" :item-height="listItemHeight" container-class="scroll" content-class="list" @contextmenu.capture="handleListRightClick">
            <template #default="{ item, index }">
              <div
                class="list-item" :class="[{ selected: rightClickSelectedIndex == index }, { active: selectedList.includes(item) }]"
                @click="handleListItemClick($event, index)" @contextmenu="handleListItemRightClick($event, index)"
              >
                <div class="list-item-cell no-select num" :class="$style.coverCell" :style="getColStyle('num')" @click.stop>
                  <transition name="play-active">
                    <img v-if="isShowCover && item.meta?.picUrl && !failedCovers.has(item.meta.picUrl)" :src="item.meta.picUrl" :class="$style.coverImg" @error="handleCoverError">
                    <span v-else>{{ index + 1 }}</span>
                  </transition>
                  <transition name="play-active">
                    <div v-if="isActiveItem(item)" :class="$style.playIcon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="50%" viewBox="0 0 512 512" space="preserve">
                        <use xlink:href="#icon-play-outline" />
                      </svg>
                    </div>
                  </transition>
                </div>
                <div class="list-item-cell auto name" :style="getColStyle('name')">
                  <span class="select name" :aria-label="item.name">{{ item.name }}</span>
                  <span v-if="item.meta?._qualitys?.flac24bit" class="no-select badge badge-theme-primary">{{ $t('tag__lossless_24bit') }}</span>
                  <span v-else-if="item.meta?._qualitys?.ape || item.meta?._qualitys?.flac || item.meta?._qualitys?.wav" class="no-select badge badge-theme-primary">{{ $t('tag__lossless') }}</span>
                  <span v-else-if="item.meta?._qualitys?.['320k']" class="no-select badge badge-theme-secondary">{{ $t('tag__high_quality') }}</span>
                  <span v-if="sourceTag" class="no-select badge badge-theme-tertiary">{{ item.source }}</span>
                </div>
                <div class="list-item-cell" :style="getColStyle('singer')"><span class="select" :aria-label="item.singer">{{ item.singer }}</span></div>
                <div class="list-item-cell" :style="getColStyle('album')"><span class="select" :aria-label="item.meta?.albumName">{{ item.meta?.albumName }}</span></div>
                <div class="list-item-cell" :style="getColStyle('time')"><span class="no-select">{{ item.interval || '--/--' }}</span></div>
              </div>
            </template>
            <template #footer>
              <div :class="$style.pagination">
                <material-pagination :count="total" :limit="limit" :page="page" @btn-click="$emit('togglePage', $event)" />
              </div>
            </template>
          </base-virtualized-list>
        </div>
        <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
          <div v-show="noItem" :class="$style.noitem">
            <p v-text="noItem" />
          </div>
        </transition>
      </div>
    </div>
    <!-- </transition> -->
    <!-- <material-flow-btn :show="isShowEditBtn && assertApiSupport(source)" :remove-btn="false" @btn-click="handleFlowBtnClick" /> -->
    <!-- <common-download-modal v-model:show="isShowDownload" :music-info="selectedDownloadMusicInfo" teleport="#view" />
    <common-download-multiple-modal v-model:show="isShowDownloadMultiple" :list="selectedList" teleport="#view" @confirm="removeAllSelect" /> -->
    <common-list-add-modal v-model:show="isShowListAdd" :music-info="selectedAddMusicInfo" teleport="#view" />
    <common-list-add-multiple-modal v-model:show="isShowListAddMultiple" :music-list="selectedList" teleport="#view" @confirm="removeAllSelect" />
    <common-download-modal v-model:show="isShowDownload" :music-info="selectedDownloadMusicInfo" teleport="#view" />
    <common-download-multiple-modal v-model:show="isShowDownloadMultiple" :list="selectedList" teleport="#view" @confirm="removeAllSelect" />
    <base-menu v-model="isShowItemMenu" :menus="menus" :xy="menuLocation" item-name="name" @menu-click="handleMenuClick" />
    <column-setting-modal :show="showColumnSetting" :columns="columns" @close="closeColumnSetting" />
  </div>
</template>

<script>
import { clipboardWriteText } from '@common/utils/electron'
import { assertApiSupport } from '@renderer/store/utils'
import { ref, computed } from '@common/utils/vueTools'
import { playMusicInfo } from '@renderer/store/player/state'
import useList from './useList'
import useMenu from './useMenu'
import usePlay from './usePlay'
import useMusicDownload from './useMusicDownload'
import useMusicAdd from './useMusicAdd'
import useMusicActions from './useMusicActions'
import WyLikeBtn from '@renderer/components/common/WyLikeBtn.vue'
import ColumnSettingModal from './ColumnSettingModal.vue'
import { useI18n } from '@renderer/plugins/i18n'
import { appSetting, updateSetting } from '@renderer/store/setting'
export default {
  name: 'MaterialOnlineList',
  components: {
    WyLikeBtn,
    ColumnSettingModal,
  },
  props: {
    list: {
      type: Array,
      default() {
        return []
      },
    },
    page: {
      type: Number,
      required: true,
    },
    limit: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    sourceTag: {
      type: Boolean,
      default: false,
    },
    noItem: {
      type: String,
      default: '',
    },
    checkApiSource: {
      type: Boolean,
      default: false,
    },
    // 是否可编辑（用于"从歌单移除"）。仅在查看自己拥有的网易云歌单时为 true
    editable: {
      type: Boolean,
      default: false,
    },
    playlistId: {
      type: String,
      default: '',
    },
    playlistSource: {
      type: String,
      default: '',
    },
  },
  emits: ['show-menu', 'play-list', 'togglePage', 'remove-from-list'],
  setup(props, { emit }) {
    const actionButtonsVisible = appSetting['list.actionButtonsVisible']
    const isShowCover = computed(() => appSetting['list.isShowCover'])
    const rightClickSelectedIndex = ref(-1)
    const dom_listContent = ref(null)
    const listRef = ref(null)
    const failedCovers = ref(new Set())
    const handleCoverError = (event) => {
      const target = event.target
      if (target?.src && !failedCovers.value.has(target.src)) {
        failedCovers.value = new Set([...failedCovers.value, target.src])
      }
    }
    const toggleCoverShow = () => {
      updateSetting({ 'list.isShowCover': !appSetting['list.isShowCover'] })
    }

    const isActiveItem = (item) => {
      const info = playMusicInfo.musicInfo
      if (!info) return false
      return String(info.id) === String(item.id) && info.source === item.source
    }

    const t = useI18n()
    const columnCustomizationEnabled = computed(() => appSetting['list.columnCustomizationEnabled'])

    const parseColumnConfig = () => {
      try {
        const parsed = JSON.parse(appSetting['list.columnConfig'] || '{}')
        return {
          widths: typeof parsed.widths === 'object' && parsed.widths != null ? parsed.widths : {},
          aligns: typeof parsed.aligns === 'object' && parsed.aligns != null ? parsed.aligns : {},
        }
      } catch {
        return { widths: {}, aligns: {} }
      }
    }

    const getDefaultColumns = () => {
      const cols = [
        { key: 'num', width: '40px', align: 'center', label: '' },
        { key: 'name', width: 'auto', align: 'left', label: t('music_name') },
        { key: 'singer', width: actionButtonsVisible ? '20%' : '22%', align: 'center', label: t('music_singer') },
        { key: 'album', width: actionButtonsVisible ? '20%' : '22%', align: 'center', label: t('music_album') },
        { key: 'time', width: '60px', align: 'center', label: t('music_time') },
      ]
      if (actionButtonsVisible) {
        cols.push({ key: 'action', width: '110px', align: 'center', label: t('action') })
      }
      return cols
    }

    const columns = computed(() => {
      const enabled = columnCustomizationEnabled.value
      const { widths, aligns } = enabled ? parseColumnConfig() : { widths: {}, aligns: {} }
      return getDefaultColumns().map(col => ({
        ...col,
        width: widths[col.key] ?? col.width,
        align: aligns[col.key] ?? col.align,
      }))
    })

    const getColStyle = (key) => {
      const col = columns.value.find(c => c.key === key)
      if (!col) return {}
      const justify = col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start'
      return {
        flex: col.width === 'auto' ? 'auto' : `0 0 ${col.width}`,
        textAlign: col.align,
        justifyContent: justify,
      }
    }

    const showColumnSetting = ref(false)
    const openColumnSetting = () => {
      showColumnSetting.value = true
    }
    const closeColumnSetting = () => {
      showColumnSetting.value = false
    }

    const {
      selectedList,
      listItemHeight,
      handleSelectData,
      removeAllSelect,
    } = useList({ props, listRef })

    const {
      handlePlayMusic,
      handlePlayMusicLater,
      doubleClickPlay,
    } = usePlay({ selectedList, props, removeAllSelect, emit })

    const {
      isShowListAdd,
      isShowListAddMultiple,
      selectedAddMusicInfo,
      handleShowMusicAddModal,
    } = useMusicAdd({ selectedList, props })

    const {
      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,
      handleShowDownloadModal,
    } = useMusicDownload({ selectedList, props })

    const {
      handleSearch,
      handleOpenMusicDetail,
      handleDislikeMusic,
      handleLikeMusic,
    } = useMusicActions({ props })

    const handleRemoveFromList = (index) => {
      emit('remove-from-list', index)
    }

    const {
      menus,
      menuLocation,
      isShowItemMenu,
      showMenu,
      menuClick,
    } = useMenu({
      props,
      assertApiSupport,
      emit,

      handleShowDownloadModal,
      handlePlayMusic,
      handlePlayMusicLater,
      handleSearch,
      handleShowMusicAddModal,
      handleOpenMusicDetail,
      handleDislikeMusic,
      handleLikeMusic,
      handleRemoveFromList,
    })

    const handleListItemClick = (event, index) => {
      if (rightClickSelectedIndex.value > -1) return
      handleSelectData(index)
      doubleClickPlay(index)
    }
    const handleListItemRightClick = (event, index) => {
      rightClickSelectedIndex.value = index
      showMenu(event, props.list[index], index)
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
          void handlePlayMusic(index, true)
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
      listRef.value?.scrollTo(0, true)
    }
    const scrollToIndex = (index, offset = 0, animate = false, onScrollEnd) => {
      listRef.value?.scrollToIndex(index, offset, animate, onScrollEnd)
    }

    return {
      listItemHeight,
      handleListItemClick,
      selectedList,
      handleListItemRightClick,
      removeAllSelect,
      handleListBtnClick,
      rightClickSelectedIndex,
      dom_listContent,
      listRef,

      menus,
      isShowItemMenu,
      menuLocation,
      handleMenuClick,

      handleListRightClick,
      assertApiSupport,

      isShowListAdd,
      isShowListAddMultiple,
      selectedAddMusicInfo,

      isShowDownload,
      isShowDownloadMultiple,
      selectedDownloadMusicInfo,

      scrollToTop,
      scrollToIndex,
      actionButtonsVisible,
      isShowCover,
      failedCovers,
      handleCoverError,
      toggleCoverShow,
      isActiveItem,
      playMusicInfo,

      t,
      columnCustomizationEnabled,
      columns,
      getColStyle,
      showColumnSetting,
      openColumnSetting,
      closeColumnSetting,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.songList {
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  position: relative;
}

.list {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  font-size: 14px;
}

.content {
  flex: auto;
  min-height: 0;
  position: relative;
  height: 100%;
}

.pagination {
  text-align: center;
  padding: 15px 0;
  // left: 50%;
  // transform: translateX(-50%);
}
.noitem {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
  // background-color: var(--color-000);

  p {
    font-size: 24px;
    color: var(--color-font-label);
  }
}

.headerWrap {
  position: relative;
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
}

.columnSettingBtn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: var(--color-font-label);
  cursor: pointer;
  padding: 5px;
  line-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--color-primary-font);
    background-color: var(--color-primary-light-100-alpha-200);
  }
}

.actionCell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.likeBtn {
  width: 17px;
  height: 17px;
  flex: none;
}

.coverCell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: hidden;
}

.coverImg {
  width: 28px;
  height: 28px;
  object-fit: cover;
  border-radius: 4px;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.15);
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

.headerIcon {
  display: block;
  width: 26px;
  height: 26px;
  fill: var(--color-button-font);
  transform: translate(8px, 4px);
}

</style>
