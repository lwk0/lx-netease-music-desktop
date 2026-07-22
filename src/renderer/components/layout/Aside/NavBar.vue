<template>
  <div ref="dom_menu" :class="$style.menu">
    <ul :class="$style.list" role="toolbar">
      <li v-for="item in menus" :key="item.to" :class="$style.navItem" role="presentation">
        <router-link :class="[$style.link, {[$style.active]: $route.meta.name == item.name}]" role="tab" :aria-selected="$route.meta.name == item.name" :to="item.to" :aria-label="item.tips">
          <span v-if="item.isNeteaseIcon" :class="$style.neteaseIcon" />
          <svg v-else version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" :viewBox="item.iconSize" :height="item.size" :width="item.size" space="preserve">
            <use :xlink:href="item.icon" />
          </svg>
        </router-link>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { appSetting } from '@renderer/store/setting'
import { useI18n } from '@root/lang'
import { ref, computed } from '@common/utils/vueTools'
import { useIconSize } from '@renderer/utils/compositions/useIconSize'

export default {
  name: 'NavBar',
  setup() {
    const t = useI18n()
    const dom_menu = ref<HTMLElement>()
    const iconSize = useIconSize(dom_menu, 0.32)

    const menus = computed(() => {
      const size = iconSize.value
      return [
        {
          to: '/search',
          tips: t('search'),
          icon: '#icon-search-2',
          iconSize: '0 0 425.2 425.2',
          size,
          name: 'Search',
          enable: true,
        },
        {
          to: '/songList/list',
          tips: t('song_list'),
          icon: '#icon-album',
          iconSize: '0 0 425.2 425.2',
          size,
          name: 'SongList',
          enable: true,
        },
        {
          to: '/leaderboard',
          tips: t('leaderboard'),
          icon: '#icon-leaderboard',
          iconSize: '0 0 425.22 425.2',
          size,
          name: 'Leaderboard',
          enable: true,
        },
        {
          to: '/list',
          tips: t('my_list'),
          icon: '#icon-love-outline',
          iconSize: '0 0 24 24',
          size,
          name: 'List',
          enable: true,
        },
        {
          to: '/myNetease',
          tips: t('netease__title'),
          isNeteaseIcon: true,
          size,
          name: 'MyNetease',
          enable: true,
        },
        {
          to: '/download',
          tips: t('download'),
          icon: '#icon-download-2',
          iconSize: '0 0 425.2 425.2',
          size,
          enable: appSetting['download.enable'],
          name: 'Download',
        },
        {
          to: '/setting',
          tips: t('setting'),
          icon: '#icon-setting',
          iconSize: '0 0 493.23 436.47',
          size,
          enable: true,
          name: 'Setting',
        },
      ].filter(m => m.enable)
    })
    return {
      appSetting,
      menus,
      dom_menu,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.menu {
  flex: auto;
}
.list {
  -webkit-app-region: no-drag;
  &:last-child {
    margin-bottom: 0;
  }
}
.navItem {
  position: relative;
  &:before {
    content: '';
    display: block;
    width: 100%;
    padding-bottom: 84%;
  }
}
.link {
  position: absolute;
  left: 0%;
  top: 0%;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  transition: @transition-fast;
  transition-property: background-color, opacity;
  color: var(--color-nav-font);
  cursor: pointer;
  text-align: center;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;

  .mixin-ellipsis-1();
  &:before {
    .mixin-after();
    left: 0;
    top: 0;
    width: 3px;
    height: 100%;
    background-color: var(--color-primary-dark-200-alpha-700);
    border-radius: 4px;
    transform: translateX(-100%);
    transition: transform @transition-fast;
  }

  &.active {
    background-color: var(--color-primary-light-300-alpha-700);

    &:before {
      transform: translateX(0);
    }

    &:hover {
      background-color: var(--color-primary-light-300-alpha-800);
    }
  }


  &:hover {
    color: var(--color-nav-font);

    &:not(.active) {
      opacity: .8;
      background-color: var(--color-primary-light-400-alpha-700);
    }
  }
  &:active:not(.active) {
    opacity: .6;
    background-color: var(--color-primary-light-300-alpha-600);
  }
}

.neteaseIcon {
  display: block;
  width: 55%;
  height: 55%;
  background-color: currentColor;
  -webkit-mask-image: url("data:image/png;base64,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");
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
  mask-image: url("data:image/png;base64,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");
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
}

</style>
