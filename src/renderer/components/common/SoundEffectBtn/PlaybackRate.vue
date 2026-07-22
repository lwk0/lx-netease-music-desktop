<template>
  <div :class="$style.contnet">
    <div class="player__sound_effect_title" :class="$style.header">
      <h3>{{ $t('player__sound_effect_playback_rate') }}</h3>
      <base-btn min @click="handleUpdatePlaybackRate(100)">{{ $t('player__playback_rate_reset_btn') }}</base-btn>
    </div>
    <div :class="$style.info">
      <span>{{ playbackRate.toFixed(2) }}x</span>
      <base-checkbox
        id="player__sound_effect_preserves_pitch"
        :model-value="appSetting['player.preservesPitch']"
        :label="$t('player__playback_preserves_pitch')"
        @update:model-value="updatePreservesPitch"
      />
    </div>
    <base-slider-bar :class="$style.slider" :value="playbackRate * 100" :min="50" :max="200" @change="handleUpdatePlaybackRate" />
  </div>
</template>

<script setup>
import { playbackRate } from '@renderer/store/player/playbackRate'
import { appSetting, updateSetting } from '@renderer/store/setting'

const handleUpdatePlaybackRate = (val) => {
  window.app_event.setPlaybackRate(Math.round(val) / 100)
}

const updatePreservesPitch = (enabled) => {
  updateSetting({ 'player.preservesPitch': enabled })
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.contnet {
  padding-top: 15px;
  position: relative;
  display: flex;
  flex-flow: column nowrap;
  gap: 10px;
  min-height: 0;
  flex: none;
  &:before {
    .mixin-after();
    position: absolute;
    top: 0;
    height: 1px;
    width: 100%;
    border-top: 1px dashed var(--color-primary-light-100-alpha-700);
  }
}
.header {
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 5px;
}
.info {
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  span {
    line-height: 1.2;
  }
}
.slider {
  width: 100%;
}
</style>
