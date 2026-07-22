<template>
  <div ref="dom_btn" :class="$style.content" @click="handleShowPopup" @mouseenter="handlMsEnter" @mouseleave="handlMsLeave">
    <button :class="[$style.titleBtn, { [$style.active]: visible }]" :aria-label="$t('list__name_temp')">
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" viewBox="0 0 24 24" space="preserve">
        <use xlink:href="#icon-temp-list" />
      </svg>
    </button>
    <base-popup v-model:visible="visible" :btn-el="dom_btn" @mouseenter="handlMsEnter" @mouseleave="handlMsLeave">
      <div :class="$style.popupContent">
        <div :class="$style.header">
          <span :class="$style.title">{{ $t('list__name_temp') }}</span>
          <span v-if="activeIndex > -1" :class="$style.count">{{ activeIndex + 1 }} / {{ list.length }}</span>
        </div>
        <div v-if="list.length" ref="dom_list" :class="['scroll', $style.list]">
          <div
            v-for="(item, index) in list"
            :key="item.id"
            :class="[$style.item, { [$style.active]: activeIndex === index }]"
            @click="handlePlay(index)"
          >
            <span :class="$style.index">{{ activeIndex === index ? '▶' : index + 1 }}</span>
            <span :class="$style.name">{{ item.name }}</span>
            <span :class="$style.singer">{{ item.singer }}</span>
            <span :class="$style.interval">{{ item.interval || '--/--' }}</span>
          </div>
        </div>
        <div v-else :class="$style.empty">{{ $t('no_item') }}</div>
      </div>
    </base-popup>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick } from '@common/utils/vueTools'
import { playInfo, playMusicInfo } from '@renderer/store/player/state'
import { getListMusics } from '@renderer/store/list/action'
import { playList } from '@renderer/core/player'

export default {
  name: 'PlayerPlaylist',
  setup() {
    const visible = ref(false)
    const dom_btn = ref(null)
    const dom_list = ref(null)
    const list = ref([])

    const activeIndex = computed(() => {
      const currentId = playMusicInfo.musicInfo?.id
      if (!currentId || !list.value.length) return -1
      return list.value.findIndex(item => item.id === currentId)
    })

    const loadList = async() => {
      const listId = playInfo.playerListId
      if (!listId) {
        list.value = []
        return
      }
      try {
        list.value = await getListMusics(listId)
      } catch (err) {
        console.error('加载播放队列失败', err)
        list.value = []
      }
    }

    const scrollToActive = () => {
      if (!dom_list.value || activeIndex.value < 0) return
      const activeEl = dom_list.value.children[activeIndex.value]
      if (activeEl) activeEl.scrollIntoView({ block: 'center', behavior: 'auto' })
    }

    const handlePlay = (index) => {
      const listId = playInfo.playerListId
      if (!listId) return
      visible.value = false
      playList(listId, index)
    }

    let timeout = null
    const handlMsEnter = () => {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      if (visible.value) return
      timeout = setTimeout(() => {
        visible.value = true
      }, 100)
    }
    const handlMsLeave = () => {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      if (!visible.value) return
      timeout = setTimeout(() => {
        timeout = null
        visible.value = false
      }, 100)
    }
    const handleShowPopup = (evt) => {
      if (visible.value) {
        evt.stopPropagation()
        handlMsLeave()
      } else {
        handlMsEnter()
      }
    }

    watch(() => playInfo.playerListId, loadList, { immediate: true })

    watch(() => visible.value, (v) => {
      if (!v) return
      void loadList().then(() => {
        void nextTick(() => {
          scrollToActive()
        })
      })
    })

    return {
      visible,
      dom_btn,
      dom_list,
      list,
      activeIndex,
      handlePlay,
      handleShowPopup,
      handlMsEnter,
      handlMsLeave,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.content {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.titleBtn {
  flex: none;
  height: 100%;
  width: 100%;
  transition: @transition-fast;
  transition-property: color, opacity;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
  background-color: transparent;
  border: none;
  padding: 0;
  color: var(--color-button-font);
  opacity: 1;
  cursor: pointer;

  svg {
    height: 100%;
    width: auto;
    fill: currentColor;
    filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.2));
  }
  &:hover {
    opacity: .8;
  }
  &:active {
    opacity: .6;
  }
  &.active {
    color: var(--color-primary);
    opacity: .8;
  }
}

.popupContent {
  width: 320px;
  display: flex;
  flex-flow: column nowrap;
  max-height: 100%;
}

.header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  border-bottom: 1px solid var(--color-primary-alpha-900);
  user-select: none;
}

.title {
  font-size: 14px;
  color: var(--color-font);
  font-weight: 500;
}

.count {
  font-size: 12px;
  color: var(--color-font-label);
}

.list {
  flex: auto;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 0;
  max-height: 360px;
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 15px;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  transition: @transition-fast;
  transition-property: background-color, color;
  color: var(--color-font);

  &:hover {
    background-color: var(--color-primary-alpha-900);
  }

  &.active {
    color: var(--color-primary);
  }

  .index {
    flex: none;
    width: 22px;
    text-align: center;
    color: var(--color-font-label);
    font-size: 12px;
  }
  .name {
    flex: 1 1 auto;
    min-width: 0;
    .mixin-ellipsis-1();
  }
  .singer {
    flex: 0 0 30%;
    min-width: 0;
    color: var(--color-font-label);
    font-size: 12px;
    .mixin-ellipsis-1();
  }
  .interval {
    flex: none;
    width: 40px;
    text-align: right;
    color: var(--color-font-label);
    font-size: 12px;
  }

  &.active .index {
    color: var(--color-primary);
  }
}

.empty {
  padding: 30px 15px;
  text-align: center;
  color: var(--color-font-label);
  font-size: 13px;
}
</style>
