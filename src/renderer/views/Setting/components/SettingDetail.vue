<template lang="pug">
dt#play_detail {{ $t('setting__play_detail') }}
dd
  .gap-top
    base-checkbox(id="setting_play_detail_font_zoom_enable" :model-value="appSetting['playDetail.isZoomActiveLrc']" :label="$t('setting__play_detail_font_zoom')" @update:model-value="updateSetting({'playDetail.isZoomActiveLrc': $event})")
  .gap-top
    base-checkbox(id="setting_play_detail_lyric_delayScroll" :model-value="appSetting['playDetail.isDelayScroll']" :label="$t('setting__play_detail_lyric_delay_scroll')" @update:model-value="updateSetting({ 'playDetail.isDelayScroll': $event })")
  .gap-top
    base-checkbox(id="setting_play_detail_lyric_progress_enable" :model-value="appSetting['playDetail.isShowLyricProgressSetting']" :label="$t('setting__play_detail_lyric_progress')" @update:model-value="updateSetting({'playDetail.isShowLyricProgressSetting': $event})")

dd
  h3#play_detail_cover_effect {{ $t('setting__play_detail_cover_effect') }}
  div
    base-checkbox.gap-left(id="setting_play_detail_cover_effect_original" :model-value="appSetting['playDetail.coverEffect']" need value="original" :label="$t('setting__play_detail_cover_effect_original')" @update:model-value="updateSetting({ 'playDetail.coverEffect': $event })")
    base-checkbox.gap-left(id="setting_play_detail_cover_effect_vinyl" :model-value="appSetting['playDetail.coverEffect']" need value="vinyl" :label="$t('setting__play_detail_cover_effect_vinyl')" @update:model-value="updateSetting({ 'playDetail.coverEffect': $event })")

dd
  h3#play_detail_align {{ $t('setting__play_detail_align') }}
  div
    base-checkbox.gap-left(id="setting_play_detail_align_left" :model-value="appSetting['playDetail.style.align']" need value="left" :label="$t('setting__play_detail_align_left')" @update:model-value="updateSetting({ 'playDetail.style.align': $event })")
    base-checkbox.gap-left(id="setting_play_detail_align_center" :model-value="appSetting['playDetail.style.align']" need value="center" :label="$t('setting__play_detail_align_center')" @update:model-value="updateSetting({ 'playDetail.style.align': $event })")
    base-checkbox.gap-left(id="setting_play_detail_align_right" :model-value="appSetting['playDetail.style.align']" need value="right" :label="$t('setting__play_detail_align_right')" @update:model-value="updateSetting({ 'playDetail.style.align': $event })")

dt#artist_detail {{ $t('setting__artist_detail') }}
dd
  .gap-top
    base-checkbox(id="setting_artist_detail_show_background" :model-value="appSetting['artistDetail.isShowBackground']" :label="$t('setting__artist_detail_show_background')" @update:model-value="updateSetting({ 'artistDetail.isShowBackground': $event })")
  .gap-top
    div(:class="$style.settingRow")
      span(:class="$style.label") {{ $t('setting__artist_detail_background_blur') }}
      input(
        :class="$style.slider"
        type="range"
        min="0"
        max="30"
        step="1"
        :value="appSetting['artistDetail.backgroundBlur']"
        @input="updateSetting({ 'artistDetail.backgroundBlur': Number($event.target.value) })"
      )
      span(:class="$style.value") {{ appSetting['artistDetail.backgroundBlur'] }}px
  .gap-top
    div(:class="$style.settingRow")
      span(:class="$style.label") {{ $t('setting__artist_detail_background_opacity') }}
      input(
        :class="$style.slider"
        type="range"
        min="0"
        max="100"
        step="5"
        :value="Math.round(appSetting['artistDetail.backgroundOpacity'] * 100)"
        @input="updateSetting({ 'artistDetail.backgroundOpacity': Math.round(Number($event.target.value)) / 100 })"
      )
      span(:class="$style.value") {{ Math.round(appSetting['artistDetail.backgroundOpacity'] * 100) }}%
</template>

<script>
// import { ref, onBeforeUnmount } from '@common/utils/vueTools'
import { appSetting, updateSetting } from '@renderer/store/setting'

export default {
  name: 'SettingDetail',
  setup() {
    return {
      appSetting,
      updateSetting,
    }
  },
}
</script>

<style lang="less" module>
.settingRow {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 10px;
}
.label {
  flex: none;
  width: 8em;
  font-size: 13px;
  color: var(--color-font);
}
.value {
  flex: none;
  min-width: 3em;
  font-size: 13px;
  color: var(--color-primary);
  text-align: right;
}
.slider {
  flex: 1;
  max-width: 200px;
  height: 4px;
  -webkit-appearance: none;
  background-color: var(--color-primary-light-400-alpha-700);
  border-radius: 2px;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background-color: var(--color-primary);
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  &::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }
}
</style>
