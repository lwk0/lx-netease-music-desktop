<template>
  <div :class="[$style.toolbar, { [$style.fullscreen]: isFullscreen }, appSetting['common.controlBtnPosition'] == 'left' ? $style.controlBtnLeft : $style.controlBtnRight]">
    <div :class="[$style.searchWrapper, appSetting['search.searchBoxAlign'] === 'left' ? $style.searchLeft : '']">
      <SearchInput />
    </div>
    <div v-if="appSetting['common.controlBtnPosition'] == 'left'" :class="$style.logo">L X</div>
    <ControlBtns v-else />
  </div>
</template>

<script setup>
import { isFullscreen } from '@renderer/store'
import { appSetting } from '@renderer/store/setting'
import ControlBtns from './ControlBtns.vue'
import SearchInput from './SearchInput.vue'

</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.toolbar {
  display: flex;
  height: @height-toolbar;
  align-items: center;
  justify-content: space-between;
  padding-left: 15px;
  -webkit-app-region: drag;
  z-index: 2;

  &.fullscreen {
    -webkit-app-region: no-drag;
    .logo {
      display: none;
    }
  }

  &.controlBtnLeft {
    .control {
      display: none;
    }
  }
  &.controlBtnRight {
    justify-content: space-between;
  }
}

.searchWrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.searchLeft {
  justify-content: flex-start;
}

.logo {
  box-sizing: border-box;
  padding: 0 @height-toolbar * .4;
  height: @height-toolbar;
  color: var(--color-primary);
  flex: none;
  text-align: center;
  line-height: @height-toolbar;
  font-weight: bold;
  // -webkit-app-region: no-drag;
}

</style>
