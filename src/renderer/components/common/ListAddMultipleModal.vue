<template>
  <material-modal :show="show" :bg-close="bgClose" max-width="70%" :teleport="teleport" @close="handleClose">
    <main :class="$style.main">
      <h2>{{ $t('list_add__multiple_' + (isMove ? 'title_move' : 'title_add'), { num: musicList.length }) }}</h2>
      <div :class="$style.tabs">
        <button
          :class="[$style.tab, activeTab === 'local' ? $style.active : null]"
          @click="activeTab = 'local'"
        >{{ $t('list_add__tab_local') }}</button>
        <button
          :class="[$style.tab, activeTab === 'online' ? $style.active : null]"
          :disabled="!isOnlineEnabled"
          :title="onlineDisabledTip"
          @click="activeTab = 'online'"
        >{{ $t('list_add__tab_online') }}</button>
      </div>
      <div v-if="activeTab === 'local'" class="scroll" :class="$style.btnContent">
        <base-btn v-for="(item, index) in lists" :key="item.id" :class="$style.btn" :aria-label="$t('list_add__multiple_btn_title', { name: item.name })" @click="handleClick(index)">{{ item.name }}</base-btn>
        <base-btn :class="[$style.btn, $style.newList, isEditing ? $style.editing : null]" :aria-label="$t('lists__new_list_btn')" @click="handleEditing($event)">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 42 42" space="preserve">
            <use xlink:href="#icon-addTo" />
          </svg>
          <base-input :class="$style.newListInput" :value="newListName" :placeholder="$t('lists__new_list_input')" @keyup.enter="handleSaveList($event)" @blur="handleSaveList($event)" />
        </base-btn>
        <span v-for="i in spaceNum" :key="i" :class="$style.btn" />
      </div>
      <div v-else class="scroll" :class="$style.btnContent">
        <base-btn v-for="(item, index) in onlineLists" :key="item.id" :class="$style.btn" :aria-label="$t('list_add__multiple_btn_title', { name: item.name })" :disabled="!item.isOwn" :title="item.isOwn ? '' : $t('list_add__online_not_own')" @click="handleOnlineClick(index)">{{ item.name }}</base-btn>
        <base-btn :class="[$style.btn, $style.newList, isOnlineEditing ? $style.editing : null]" :aria-label="$t('list_add__online_new_list')" @click="handleOnlineEditing($event)">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 42 42" space="preserve">
            <use xlink:href="#icon-addTo" />
          </svg>
          <base-input :class="$style.newListInput" :value="newOnlineListName" :placeholder="$t('list_add__online_new_list_input')" @keyup.enter="handleSaveOnlineList($event)" @blur="handleSaveOnlineList($event)" />
        </base-btn>
        <span v-for="i in onlineSpaceNum" :key="i" :class="$style.btn" />
      </div>
    </main>
  </material-modal>
</template>

<script>
import { computed, ref, watch } from '@common/utils/vueTools'
import { defaultList, loveList, userLists } from '@renderer/store/list/state'
import { addListMusics, moveListMusics, createUserList } from '@renderer/store/list/action'
import { userState, loadWyPlaylists } from '@renderer/store/user'
import musicSdk from '@renderer/utils/musicSdk'
import useKeyDown from '@renderer/utils/compositions/useKeyDown'
import { useI18n } from '@root/lang'
import { dialog } from '@renderer/plugins/Dialog'
import { toast, toastError } from '@renderer/utils/toast'

export default {
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    musicList: {
      type: Array,
      default() {
        return []
      },
    },
    bgClose: {
      type: Boolean,
      default: true,
    },
    excludeListId: {
      type: Array,
      default() {
        return []
      },
    },
    // listName: {
    //   type: String,
    //   default: '',
    // },
    fromListId: {
      type: String,
      default: null,
    },
    isMove: {
      type: Boolean,
      default: false,
    },
    teleport: {
      type: String,
      default: '#root',
    },
  },
  emits: ['update:show', 'confirm'],
  setup(props) {
    const keyModDown = useKeyDown('mod')
    const t = useI18n()
    const activeTab = ref('local')

    const rawList = computed(() => {
      return 'progress' in props.musicList[0] ? props.musicList.map(t => t.metadata.musicInfo) : props.musicList
    })

    const wySongs = computed(() => rawList.value.filter(m => m.source === 'wy'))
    const isLoggedIn = computed(() => !!userState.wy_uid)
    const isOnlineEnabled = computed(() => isLoggedIn.value && wySongs.value.length > 0)
    const onlineDisabledTip = computed(() => {
      if (!isLoggedIn.value) return t('list_add__online_login_tip')
      if (wySongs.value.length === 0) return t('list_add__online_only_wy')
      return ''
    })

    const lists = computed(() => {
      return [
        { ...defaultList, name: t(defaultList.name) },
        { ...loveList, name: t(loveList.name) },
        ...userLists,
      ].filter(l => !props.excludeListId.includes(l.id))
    })
    const onlineLists = computed(() => {
      const uid = userState.wy_uid
      return userState.wy_playlists.map(p => ({
        ...p,
        isOwn: String(p.userId) === String(uid),
      }))
    })

    watch(() => props.show, show => {
      if (show) {
        activeTab.value = 'local'
        if (isOnlineEnabled.value) void loadWyPlaylists()
      }
    })

    return {
      keyModDown,
      t,
      lists,
      activeTab,
      onlineLists,
      isOnlineEnabled,
      onlineDisabledTip,
      wySongs,
      userState,
    }
  },
  data() {
    return {
      isEditing: false,
      isOnlineEditing: false,
      newListName: '',
      newOnlineListName: '',
      rowNum: 3,
    }
  },
  computed: {

    spaceNum() {
      return this.lists.length < 2 ? 0 : (this.rowNum - this.lists.length % this.rowNum - 1)
    },
    onlineSpaceNum() {
      const len = this.onlineLists.length
      return len < 2 ? 0 : (this.rowNum - len % this.rowNum - 1)
    },
  },
  mounted() {
    window.addEventListener('resize', this.handleResize)
    this.handleResize()
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    handleResize() {
      const width = window.innerWidth
      this.rowNum = width < 1920
        ? 3
        : width < 2560
          ? 4
          : width < 3840 ? 5 : 6
    },
    handleClick(index) {
      const list = 'progress' in this.musicList[0] ? this.musicList.map(t => t.metadata.musicInfo) : this.musicList

      if (this.isMove) void moveListMusics(this.fromListId, this.lists[index].id, list)
      else void addListMusics(this.lists[index].id, list)

      if (this.keyModDown && !this.isMove) return
      this.$nextTick(() => {
        this.handleClose()
        this.$emit('confirm')
      })
    },
    handleOnlineClick(index) {
      const list = this.onlineLists[index]
      if (!list.isOwn) return
      const trackIds = this.wySongs.map(m => m.songmid).filter(Boolean)
      if (trackIds.length === 0) {
        toastError(this.t('list_add__online_add_failed'))
        return
      }
      void musicSdk.wy.user.manipulatePlaylistTracks('add', list.id, trackIds).then(() => {
        toast(this.t('list_add__online_add_success', { name: list.name }))
      }).catch((err) => {
        console.error('批量添加到网易云歌单失败', err)
        toastError(err.message || this.t('list_add__online_add_failed'))
      })
      if (this.keyModDown && !this.isMove) return
      this.$nextTick(() => {
        this.handleClose()
        this.$emit('confirm')
      })
    },
    handleClose() {
      this.$emit('update:show', false)
    },
    handleEditing(event) {
      if (this.isEditing) return
      this.isEditing = true
      this.$nextTick(() => event.currentTarget.querySelector('.' + this.$style.newListInput).focus())
    },
    handleOnlineEditing(event) {
      if (this.isOnlineEditing) return
      this.isOnlineEditing = true
      this.$nextTick(() => event.currentTarget.querySelector('.' + this.$style.newListInput).focus())
    },
    async handleSaveList(event) {
      let name = event.target.value
      this.newListName = event.target.value = ''
      this.isEditing = false
      if (!name || (
        userLists.some(l => l.name == name) && !(await dialog.confirm(window.i18n.t('list_duplicate_tip'))))
      ) return
      void createUserList({ name })
    },
    async handleSaveOnlineList(event) {
      let name = event.target.value.trim()
      this.newOnlineListName = event.target.value = ''
      this.isOnlineEditing = false
      if (!name) return
      const duplicate = userState.wy_playlists.some(p => p.name === name)
      if (duplicate && !(await dialog.confirm(window.i18n.t('list_duplicate_tip')))) return
      try {
        await musicSdk.wy.user.createPlaylist(name)
        toast(this.t('list_add__online_create_success'))
        await loadWyPlaylists()
      } catch (err) {
        console.error('创建网易云歌单失败', err)
        toastError(err.message || this.t('list_add__online_create_failed'))
      }
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  // padding: 15px 0;
  // max-width: 620px;
  min-width: 200px;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  min-height: 0;
  // max-height: 100%;
  // overflow: hidden;
  h2 {
    font-size: 13px;
    color: var(--color-font);
    line-height: 1.3;
    text-align: center;
    padding: 15px;
  }
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
}

.tab {
  background: transparent;
  border: 1px solid var(--color-primary-font-hover);
  border-radius: @form-radius;
  color: var(--color-font);
  padding: 5px 15px;
  cursor: pointer;
  font-size: 13px;
  outline: none;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;

  &:hover:not(:disabled) {
    background-color: var(--color-button-background-hover);
  }

  &.active {
    background-color: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btnContent {
  flex: auto;
  max-height: 100%;
  padding-right: 15px;
  display: flex;
  flex-flow: row wrap;
  justify-content: space-evenly;
}

@item-width: (100% / 3);
.btn {
  position: relative;
  box-sizing: border-box;
  margin-left: 15px;
  margin-bottom: 15px;
  height: 36px;
  line-height: 36px;
  padding: 0 10px !important;
  width: calc(@item-width - 15px);
  min-width: 160px;
  .mixin-ellipsis-1();
}

.newList {
  border: 1px dashed var(--color-primary-font-hover);
  // background-color: var(--color-main-background);
  color: var(--color-primary-font-hover);
  opacity: .7;

  svg {
    height: 18px;
    margin-top: 9px;
  }

  &.editing {
    opacity: 1;

    svg {
      display: none;
    }
    .newListInput {
      display: block;
    }
  }
}
.newListInput {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 34px;
  line-height: 34px;
  background: none !important;
  font-size: 14px;
  text-align: center;
  box-sizing: border-box;
  padding: 0 10px;
  border-radius: 0;
  display: none;
}

@item-width2: (100% / 4);
@media (min-width: 1920px){
  .btn {
    width: calc(@item-width2 - 15px);
  }
}
@item-width3: (100% / 5);
@media (min-width: 2560px){
  .btn {
    width: calc(@item-width3 - 15px);
  }
}
@item-width4: (100% / 6);
@media (min-width: 3840px){
  .btn {
    width: calc(@item-width4 - 15px);
  }
}

</style>
