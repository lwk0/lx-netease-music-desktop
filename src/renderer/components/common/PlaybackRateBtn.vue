<template>
  <button
    :class="[$style.btn, { [$style.active]: playbackRate != 1 }]"
    :aria-label="`${$t('player__playback_rate')}${playbackRate}x`"
    :title="`${$t('player__playback_rate')}${playbackRate}x`"
    @click="handleClick"
  >
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="100%" viewBox="0 0 24 24" space="preserve">
      <use xlink:href="#icon-plex" />
    </svg>
  </button>
</template>

<script setup>
import { playbackRate } from '@renderer/store/player/playbackRate'

const handleClick = () => {
  window.app_event.emit('showSoundEffect')
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.btn {
  position: relative;
  justify-content: center;
  align-items: center;
  transition: color @transition-normal;
  cursor: pointer;
  background-color: transparent;
  border: none;
  width: 24px;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  padding: 0;

  svg {
    transition: opacity @transition-fast;
    opacity: .5;
  }
  &:hover {
    svg {
      opacity: .9;
    }
  }
  &:active {
    svg {
      opacity: 1;
    }
  }

  &.active {
    svg {
      color: var(--color-primary);
      opacity: .8;
    }
  }
}
</style>
