<template>
  <teleport :to="teleport">
    <div v-if="showModal" ref="dom_container" :class="$style.container">
      <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
        <div v-show="showContent" :class="[$style.modal, {[$style.filter]: filter}]" @click="bgClose && close()">
          <transition :enter-active-class="inClass" :leave-active-class="outClass" @after-enter="$emit('after-enter', $event)" @after-leave="handleAfterLeave">
            <div v-show="showContent" ref="dom_content" :class="$style.content" :style="contentStyle" @click.stop>
              <header v-if="!hideHeader" :class="[$style.header, {[$style.hasTitle]: title}]" @mousedown="draggable ? startDrag($event) : null">
                <span v-if="title" :class="$style.headerTitle">{{ title }}</span>
                <button v-if="closeBtn" type="button" @mousedown.stop @click="close">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" height="100%" viewBox="0 0 212.982 212.982" space="preserve">
                    <use xlink:href="#icon-delete" />
                  </svg>
                </button>
              </header>
              <slot />
            </div>
          </transition>
        </div>
      </transition>
    </div>
  </teleport>
</template>

<script>
import { getRandom } from '@common/utils/common'
import { nextTick } from '@common/utils/vueTools'
import { appSetting } from '@renderer/store/setting'

let modalCount = 0
export default {
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    closeBtn: {
      type: Boolean,
      default: true,
    },
    hideHeader: {
      type: Boolean,
      default: false,
    },
    bgClose: {
      type: Boolean,
      default: false,
    },
    teleport: {
      type: String,
      default: '#root',
    },
    maxWidth: {
      type: String,
      default: '76%',
    },
    minWidth: {
      type: String,
      default: '280px',
    },
    maxHeight: {
      type: String,
      default: '76%',
    },
    width: {
      type: String,
      default: 'auto',
    },
    height: {
      type: String,
      default: 'auto',
    },
    draggable: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
  },
  emits: ['after-enter', 'after-leave', 'close'],
  data() {
    return {
      animates: [
        [['jackInTheBox', 'flipInX', 'flipInY', 'lightSpeedIn'], ['flipOutX', 'flipOutY', 'lightSpeedOut']],
        // [['jackInTheBox', 'lightSpeedIn'], ['lightSpeedOut']],
        [['rotateInDownLeft', 'rotateInDownRight', 'rotateInUpLeft', 'rotateInUpRight'], ['rotateOutDownLeft', 'rotateOutDownRight', 'rotateOutUpLeft', 'rotateOutUpRight']],
        [['jackInTheBox', 'zoomInDown', 'zoomInUp'], ['zoomOutDown', 'zoomOutUp']],
        [['slideInDown', 'slideInLeft', 'slideInRight', 'slideInUp'], ['slideOutDown', 'slideOutLeft', 'slideOutRight', 'slideOutUp']],

        // ['flipInX', 'flipOutX'],
        // ['flipInY', 'flipOutY'],
        // ['lightSpeedIn', 'lightSpeedOut'],
        // ['rotateInDownLeft', 'rotateOutDownLeft'],
        // ['rotateInDownRight', 'rotateOutDownRight'],
        // ['rotateInUpLeft', 'rotateOutUpLeft'],
        // ['rotateInUpRight', 'rotateOutUpRight'],
        // // ['rollIn', 'rollOut'],
        // // ['zoomIn', 'zoomOut'],
        // ['zoomInDown', 'zoomOutDown'],
        // // ['zoomInLeft', 'zoomOutLeft'],
        // // ['zoomInRight', 'zoomOutRight'],
        // ['zoomInUp', 'zoomOutUp'],
        // ['slideInDown', 'slideOutDown'],
        // ['slideInLeft', 'slideOutLeft'],
        // ['slideInRight', 'slideOutRight'],
        // ['slideInUp', 'slideOutUp'],
        // // ['jackInTheBox', 'hinge'],
      ],
      // animateIn: [
      //   'flipInX',
      //   'flipInY',
      //   // 'fadeIn',
      //   // 'bounceIn',
      //   'lightSpeedIn',
      //   'rotateInDownLeft',
      //   'rotateInDownRight',
      //   'rotateInUpLeft',
      //   'rotateInUpRight',
      //   'rollIn',
      //   'zoomIn',
      //   'zoomInDown',
      //   'zoomInLeft',
      //   'zoomInRight',
      //   'zoomInUp',
      //   'slideInDown',
      //   'slideInLeft',
      //   'slideInRight',
      //   'slideInUp',
      //   'jackInTheBox',
      // ],
      // animateOut: [
      //   'flipOutX',
      //   'flipOutY',
      //   // 'fadeOut',
      //   // 'bounceOut',
      //   'lightSpeedOut',
      //   'rotateOutDownLeft',
      //   'rotateOutDownRight',
      //   'rotateOutUpLeft',
      //   'rotateOutUpRight',
      //   'rollOut',
      //   'zoomOut',
      //   'zoomOutDown',
      //   'zoomOutLeft',
      //   'zoomOutRight',
      //   'zoomOutUp',
      //   'slideOutDown',
      //   'slideOutLeft',
      //   'slideOutRight',
      //   'slideOutUp',
      //   'hinge',
      // ],
      inClass: 'animated jackInTheBox',
      outClass: 'animated slideOutRight',
      showModal: false,
      showContent: false,
      modalCount: false,
      isAddedClass: false,
      dragX: 0,
      dragY: 0,
      dragStartX: 0,
      dragStartY: 0,
      dragContentWidth: 0,
      dragContentHeight: 0,
      dragTopOffset: 54,
      isDragging: false,
      dragMoveHandler: null,
      dragUpHandler: null,
      // ai: 0,
    }
  },
  computed: {
    contentStyle() {
      return {
        maxWidth: this.maxWidth,
        minWidth: this.minWidth,
        width: this.width,
        height: this.height,
        maxHeight: this.maxHeight,
        transform: this.draggable ? `translate(${this.dragX}px, ${this.dragY}px)` : undefined,
      }
    },
    filter() {
      return this.teleport == '#root' || this.modalCount > 1
    },
  },
  watch: {
    show(val) {
      this.handleShowChange(val)
    },
  },
  mounted() {
    if (this.show) this.handleShowChange(true)
    this.setRandomAnimation()
  },
  beforeUnmount() {
    this.removeClass()
    if (this.isDragging) this.stopDrag()
  },
  methods: {
    handleShowChange(val) {
      if (val) {
        this.dragX = 0
        this.dragY = 0
        // const dom = document.getElementById(this.teleport)
        // if (dom) {
        //   // dom.t
        // }
        this.setRandomAnimation()
        this.modalCount = ++modalCount
        this.showModal = true
        void nextTick(() => {
          this.showContent = true
          const container = this.$refs.dom_container
          if (container) {
            const node = container.parentNode
            if (node && !node.classList.contains('show-modal')) {
              node.classList.add('show-modal')
              this.isAddedClass = true
            }
          }
        })
      } else {
        if (modalCount > 0) this.modalCount = --modalCount
        this.removeClass()
        this.showContent = false
      }
    },
    removeClass() {
      if (!this.isAddedClass) return
      this.$refs.dom_container?.parentNode.classList.remove('show-modal')
    },
    setRandomAnimation() {
      if (appSetting['common.randomAnimate']) {
        const [animIn, animOut] = this.animates[getRandom(0, this.animates.length)]
        // const [animIn, animOut] = this.animates[this.ai]
        // if (++this.ai >= this.animates.length) this.ai = 0
        // console.log(animIn, animOut)
        // this.inClass = 'animated ' + animIn
        // this.outClass = 'animated ' + animOut
        this.inClass = 'animated ' + animIn[getRandom(0, animIn.length)]
        this.outClass = 'animated ' + animOut[getRandom(0, animOut.length)]
      }
    },
    close() {
      this.$emit('close')
    },
    handleAfterLeave(event) {
      this.$emit('after-leave', event)
      this.showModal = false
    },
    startDrag(event) {
      if (!this.draggable) return
      const contentEl = this.$refs.dom_content
      if (contentEl) {
        const rect = contentEl.getBoundingClientRect()
        this.dragContentWidth = rect.width
        this.dragContentHeight = rect.height
      }
      // 顶部工具栏（layout-toolbar，窗口拖拽区）高度，面板禁止拖入该区域，否则点到的是主窗口标题栏
      const toolbarEl = document.getElementById('toolbar')
      this.dragTopOffset = toolbarEl ? toolbarEl.getBoundingClientRect().height : 54
      this.isDragging = true
      this.dragStartX = event.clientX - this.dragX
      this.dragStartY = event.clientY - this.dragY
      this.dragMoveHandler = (e) => { this.onDrag(e) }
      this.dragUpHandler = () => { this.stopDrag() }
      document.addEventListener('mousemove', this.dragMoveHandler)
      document.addEventListener('mouseup', this.dragUpHandler)
    },
    onDrag(event) {
      if (!this.isDragging) return
      const viewportW = window.innerWidth
      const viewportH = window.innerHeight
      const w = this.dragContentWidth || 0
      const h = this.dragContentHeight || 0
      // 优先让整个面板完整留在窗口内；若面板比窗口还大，则至少保留 60px 可抓取
      let minX, maxX
      const maxFitX = (viewportW - w) / 2
      if (maxFitX >= 0) {
        minX = -maxFitX
        maxX = maxFitX
      } else {
        minX = -w + 60
        maxX = viewportW - 60
      }
      let minY, maxY
      const topOffset = this.dragTopOffset || 54
      // 顶部留出工具栏禁区：面板顶边最低只能到 topOffset，且整体仍留在视口内
      const topMin = topOffset
      if (h <= viewportH - topOffset) {
        // 可在工具栏下方完整容纳
        minY = topMin - (viewportH - h) / 2
        maxY = viewportH - h - (viewportH - h) / 2
      } else {
        // 面板比可用区域还高，至少保证标题栏（约 38px）可抓取
        const topMax = Math.max(topMin, viewportH - 38)
        minY = topMin - (viewportH - h) / 2
        maxY = topMax - (viewportH - h) / 2
      }
      this.dragX = Math.max(minX, Math.min(maxX, event.clientX - this.dragStartX))
      this.dragY = Math.max(minY, Math.min(maxY, event.clientY - this.dragStartY))
    },
    stopDrag() {
      if (!this.isDragging) return
      this.isDragging = false
      document.removeEventListener('mousemove', this.dragMoveHandler)
      document.removeEventListener('mouseup', this.dragUpHandler)
      this.dragMoveHandler = null
      this.dragUpHandler = null
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 99;
}

.modal {
  width: 100%;
  height: 100%;
  // background-color: rgba(0, 0, 0, .2);
  // background-color: rgba(255, 255, 255, .6);
  // background-color: var(--color-primary-light-600-alpha-900);
  // backdrop-filter: blur(4px);
  // backdrop-filter: grayscale(70%);
  display: grid;
  align-items: center;
  justify-items: center;
  // will-change: transform;

  &.filter {
    backdrop-filter: grayscale(70%);
  }

  // &:before {
  //   .mixin-after();
  //   position: absolute;
  //   left: 0;
  //   top: 0;
  //   width: 100%;
  //   height: 100%;
  //   background-color: var(--color-000);
  //   opacity: .6;
  // }
}

.content {
  position: relative;
  border-radius: 4px;
  box-shadow: 0 0 4px rgba(0, 0, 0, .25);
  overflow: hidden;
  // max-height: 80%;
  // max-width: 76%;
  min-width: 220px;
  position: relative;
  display: flex;
  flex-flow: column nowrap;
  z-index: 100;
  background-color: var(--color-content-background);
}

.header {
  flex: none;
  background-color: var(--color-primary-light-100-alpha-100);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 18px;
  user-select: none;

  &.hasTitle {
    height: 38px;
    padding: 0 12px;
    cursor: move;
    justify-content: space-between;
  }

  .headerTitle {
    font-size: 15px;
    color: var(--color-font);
    font-weight: 500;
    pointer-events: none;
  }

  button {
    border: none;
    cursor: pointer;
    padding: 4px 7px;
    background-color: transparent;
    color: var(--color-primary-dark-500-alpha-500);
    outline: none;
    transition: background-color 0.2s ease;
    line-height: 0;

    svg {
      height: .7em;
    }

    &:hover {
      background-color: var(--color-primary-dark-100-alpha-600);
    }
    &:active {
      background-color: var(--color-primary-dark-200-alpha-600);
    }
  }
}

</style>
