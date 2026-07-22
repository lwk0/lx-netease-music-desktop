<template lang="pug">
dt#search {{ $t('setting__search') }}
dd
  .gap-top
    base-checkbox(id="setting_search_showHot_enable" :model-value="appSetting['search.isShowHotSearch']" :label="$t('setting__search_hot')" @update:model-value="updateSetting({'search.isShowHotSearch': $event})")
  .gap-top
    base-checkbox(id="setting_search_showHistory_enable" :model-value="appSetting['search.isShowHistorySearch']" :label="$t('setting__search_history')" @update:model-value="updateSetting({'search.isShowHistorySearch': $event})")
  .gap-top
    base-checkbox(id="setting_search_focusSearchBox_enable" :model-value="appSetting['search.isFocusSearchBox']" :label="$t('setting__search_focus_search_box')" @update:model-value="updateSetting({'search.isFocusSearchBox': $event})")
  .gap-top
    h3#search_box_align {{ $t('setting__search_box_align') }}
    div(style="--selection-width: 12rem;")
      base-selection.gap-left(:list="alignList" :model-value="appSetting['search.searchBoxAlign']" item-key="id" item-name="name" @update:model-value="updateSetting({'search.searchBoxAlign': $event})")
  .gap-top
    h3#search_box_style {{ $t('setting__search_box_style') }}
    div(style="--selection-width: 12rem;")
      base-selection.gap-left(:list="styleList" :model-value="appSetting['search.searchBoxStyle']" item-key="id" item-name="name" @update:model-value="updateSetting({'search.searchBoxStyle': $event})")

</template>

<script>
// import { ref, onBeforeUnmount } from '@common/utils/vueTools'
import { appSetting, updateSetting } from '@renderer/store/setting'

export default {
  name: 'SettingSearch',
  setup() {
    const alignList = [
      { id: 'center', name: window.i18n.t('setting__search_box_align_center') },
      { id: 'left', name: window.i18n.t('setting__search_box_align_left') },
    ]
    const styleList = [
      { id: 'rounded', name: window.i18n.t('setting__search_box_style_rounded') },
      { id: 'original', name: window.i18n.t('setting__search_box_style_original') },
    ]
    return {
      appSetting,
      updateSetting,
      alignList,
      styleList,
    }
  },
}
</script>
