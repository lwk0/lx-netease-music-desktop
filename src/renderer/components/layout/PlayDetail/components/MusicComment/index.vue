<template lang="pug">
div.comment(ref="dom_container" :class="$style.comment")
  div(:class="$style.commentHeader")
    h3 {{ $t('comment__title', { name: currentMusicInfo.name }) }}
    div(:class="$style.commentHeaderBtns")
      div(:class="$style.commentHeaderBtn" :aria-label="$t('comment__refresh')" @click="handleShowComment")
        svg(version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" style="transform: rotate(45deg);" viewBox="0 0 24 24" space="preserve")
          use(xlink:href="#icon-refresh")
      div(:class="$style.commentHeaderBtn" @click="$emit('close')")
        svg(version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" space="preserve")
          use(xlink:href="#icon-close")

  div(:class="$style.commentMain")
    template(v-if="available")
      header(:class="$style.tab_header")
        button(type="button" :class="[$style.commentType, { [$style.active]: tabActiveId == 'hot' }]" @click="handleToggleTab('hot')") {{ $t('comment__hot_title') }} ({{ hotComment.total }})
        button(type="button" :class="[$style.commentType, { [$style.active]: tabActiveId == 'new' }]" @click="handleToggleTab('new')") {{ $t('comment__new_title') }} ({{ newComment.total }})
      main(ref="dom_tabMain" :class="$style.tab_main")
        div(:class="$style.tab_content")
          div.scroll(ref="dom_commentHot" :class="$style.tab_content_scroll")
            p(v-if="hotComment.isLoadError" :class="$style.commentLabel" style="cursor: pointer;" @click="handleGetHotComment(currentMusicInfo, hotComment.nextPage, hotComment.limit)") {{ $t('comment__hot_load_error') }}
            p(v-else-if="hotComment.isLoading && !hotComment.list.length" :class="$style.commentLabel") {{ $t('comment__hot_loading') }}
            comment-floor(v-if="!hotComment.isLoadError && hotComment.list.length" :class="[$style.commentFloor, hotComment.isLoading ? $style.loading : null]" :comments="hotComment.list" :show-actions="canSendComment" @reply="handleSetReplyTarget" @like="handleLike" @delete="handleDelete")
            p(v-else-if="!hotComment.isLoadError && !hotComment.isLoading" :class="$style.commentLabel") {{ $t('comment__no_content') }}
            div(:class="$style.pagination")
              material-pagination(:count="hotComment.total" :btn-length="5" :limit="hotComment.limit" :page="hotComment.page" @btn-click="handleToggleHotCommentPage")
        div(:class="$style.tab_content")
          div.scroll(ref="dom_commentNew" :class="$style.tab_content_scroll")
            p(v-if="newComment.isLoadError" :class="$style.commentLabel" style="cursor: pointer;" @click="handleGetNewComment(currentMusicInfo, newComment.nextPage, newComment.limit)") {{ $t('comment__new_load_error') }}
            p(v-else-if="newComment.isLoading && !newComment.list.length" :class="$style.commentLabel") {{ $t('comment__new_loading') }}
            comment-floor(v-if="!newComment.isLoadError && newComment.list.length" :class="[$style.commentFloor, newComment.isLoading ? $style.loading : null]" :comments="newComment.list" :show-actions="canSendComment" @reply="handleSetReplyTarget" @like="handleLike" @delete="handleDelete")
            p(v-else-if="!newComment.isLoadError && !newComment.isLoading" :class="$style.commentLabel") {{ $t('comment__no_content') }}
            div(:class="$style.pagination")
              material-pagination(:count="newComment.total" :btn-length="5" :limit="newComment.limit" :page="newComment.page" @btn-click="handleToggleCommentPage")
    div(v-else :class="$style.unavailable")
      p {{ $t('comment__unavailable') }}
  div(v-if="available" :class="$style.commentInput")
    div(v-if="replyTarget" :class="$style.replyTarget")
      span {{ $t('comment__reply_to', { name: replyTarget.userName }) }}
      span(:class="$style.replyCancel" :aria-label="$t('comment__cancel_reply')" @click="handleCancelReply")
        svg(version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" space="preserve")
          use(xlink:href="#icon-close")
    div(:class="$style.inputRow")
      input(
        ref="dom_input"
        v-model="inputText"
        :class="$style.input"
        :placeholder="sendInputPlaceholder"
        :disabled="!canSendComment || isSending"
        @keydown.enter.exact.prevent="handleSend"
      )
      button(:class="$style.sendBtn" :disabled="!canSendComment || isSending || !inputText.trim()" :aria-label="$t('comment__send')" @click="handleSend")
        svg(version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" space="preserve")
          path(d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 14.01a1 1 0 00-.87 1L2 20.49a.993.993 0 001.4.91z" fill="currentColor")
</template>

<script>
import { toOldMusicInfo } from '@renderer/utils'
import music from '@renderer/utils/musicSdk'
import CommentFloor from './CommentFloor.vue'
import { userState } from '@renderer/store/user'
import { toast, toastError } from '@renderer/utils/toast'

export default {
  name: 'MusicComment',
  components: {
    CommentFloor,
  },
  props: {
    show: Boolean,
    musicInfo: {
      type: Object,
      required: true,
    },
  },
  emits: ['close'],
  data() {
    return {
      available: false,
      currentMusicInfo: {
        name: '',
        singer: '',
      },
      tabActiveId: 'hot',
      replyTarget: null,
      inputText: '',
      isSending: false,
      newComment: {
        isLoading: false,
        isLoadError: false,
        page: 1,
        total: 0,
        maxPage: 1,
        nextPage: 1,
        limit: 20,
        list: [
        // {
        //   text: ['123123hhh'],
        //   userName: 'dsads',
        //   avatar: 'http://img4.kuwo.cn/star/userhead/39/52/1602393411654_512039239s.jpg',
        //   time: '2020-10-22 22:14:17',
        //   timeStr: '2020-10-22 22:14:17',
        //   likedCount: 100,
        //   reply: [],
        // },
        ],
      },
      hotComment: {
        isLoading: true,
        isLoadError: true,
        page: 1,
        total: 0,
        maxPage: 1,
        nextPage: 1,
        limit: 20,
        list: [
        // {
        //   text: ['123123hhh'],
        //   userName: 'dsads',
        //   avatar: 'http://img4.kuwo.cn/star/userhead/39/52/1602393411654_512039239s.jpg',
        //   time: '2020-10-22 22:14:17',
        //   timeStr: '2020-10-22 22:14:17',
        //   likedCount: 100,
        //   reply: [
        //     {
        //       text: ['123123hhh'],
        //       userName: 'dsads',
        //       avatar: 'http://img4.kuwo.cn/star/userhead/39/52/1602393411654_512039239s.jpg',
        //       time: '2020-10-22 22:14:17',
        //       timeStr: '2020-10-22 22:14:17',
        //       likedCount: 100,
        //     },
        //   ],
        // },
        ],
      },
    }
  },
  computed: {
    isLoggedIn() {
      return !!userState.wy_uid
    },
    isWySource() {
      return this.currentMusicInfo?.source === 'wy'
    },
    canSendComment() {
      return this.available && this.currentMusicInfo?.source === 'wy' && !!userState.wy_uid
    },
    sendInputPlaceholder() {
      if (!this.isWySource) return this.$t('comment__only_wy')
      if (!this.isLoggedIn) return this.$t('comment__login_required')
      if (this.replyTarget) return this.$t('comment__reply_placeholder', { name: this.replyTarget.userName })
      return this.$t('comment__send_placeholder')
    },
  },
  watch: {
    show(n) {
      if (n) this.handleShowComment()
    },
  },
  mounted() {
    this.setWidth()
    window.addEventListener('resize', this.setWidth)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.setWidth)
  },
  methods: {
    setWidth() {
      setTimeout(() => {
        this.$refs.dom_container.style.width = Math.floor(this.$refs.dom_container.parentNode.clientWidth * 0.65) + 'px'

        setTimeout(() => {
          this.handleToggleTab(this.tabActiveId, true)
        })
      })
    },
    async getComment(musicInfo, page, limit, retryNum = 0) {
      let resp
      try {
        resp = await music[musicInfo.source].comment.getComment(musicInfo, page, limit)
      } catch (error) {
        if (error.message == '取消请求' || ++retryNum > 2) throw error
        resp = await this.getComment(musicInfo, page, limit, retryNum)
      }
      return resp
    },
    async getHotComment(musicInfo, page, limit, retryNum = 0) {
      let resp
      try {
        resp = await music[musicInfo.source].comment.getHotComment(musicInfo, page, limit)
      } catch (error) {
        if (error.message == '取消请求' || ++retryNum > 2) throw error
        resp = await this.getHotComment(musicInfo, page, limit, retryNum)
      }
      return resp
    },
    handleGetNewComment(musicInfo, page, limit) {
      this.newComment.isLoadError = false
      this.newComment.isLoading = true
      this.getComment(toOldMusicInfo(musicInfo), page, limit).then(comment => {
        this.newComment.isLoading = false
        this.newComment.total = comment.total
        this.newComment.maxPage = comment.maxPage
        this.newComment.page = page
        this.newComment.list = comment.comments
        this.$nextTick(() => {
          this.$refs.dom_commentNew.scrollTo(0, 0)
        })
      }).catch(err => {
        console.log(err)
        if (err.message == '取消请求') return
        this.newComment.isLoadError = true
        this.newComment.isLoading = false
      })
    },
    handleGetHotComment(musicInfo, page, limit) {
      this.hotComment.isLoadError = false
      this.hotComment.isLoading = true
      this.getHotComment(toOldMusicInfo(musicInfo), page, limit).then(hotComment => {
        this.hotComment.isLoading = false
        this.hotComment.total = hotComment.total
        this.hotComment.maxPage = hotComment.maxPage
        this.hotComment.page = page
        this.hotComment.list = hotComment.comments
        this.$nextTick(() => {
          this.$refs.dom_commentHot.scrollTo(0, 0)
        })
      }).catch(err => {
        console.log(err)
        if (err.message == '取消请求') return
        this.hotComment.isLoadError = true
        this.hotComment.isLoading = false
      })
    },
    handleShowComment() {
      this.currentMusicInfo = 'progress' in this.musicInfo ? this.musicInfo.metadata.musicInfo : this.musicInfo

      if (this.currentMusicInfo.source == 'local' || !music[this.currentMusicInfo.source].comment) {
        this.available = false
        return
      }
      this.available = true
      // if (this.musicInfo.songmid != this.currentMusicInfo.songmid) {
      this.hotComment.page = 1
      this.hotComment.total = 0
      this.hotComment.maxPage = 1
      this.hotComment.nextPage = 1

      this.newComment.page = 1
      this.newComment.total = 0
      this.newComment.maxPage = 1
      this.newComment.nextPage = 1
      // }
      this.isShowComment = true

      this.handleGetHotComment(this.currentMusicInfo, this.hotComment.page, this.hotComment.limit)
      this.handleGetNewComment(this.currentMusicInfo, this.newComment.page, this.newComment.limit)
    },
    handleToggleHotCommentPage(page) {
      this.hotComment.nextPage = page
      this.handleGetHotComment(this.currentMusicInfo, page, this.hotComment.limit)
    },
    handleToggleCommentPage(page) {
      this.newComment.nextPage = page
      this.handleGetNewComment(this.currentMusicInfo, page, this.newComment.limit)
    },
    handleToggleTab(id, force) {
      if (!this.available || (!force && this.tabActiveId == id)) return
      switch (id) {
        case 'hot':
          this.$refs.dom_tabMain.scrollLeft = 0
          break
        case 'new':
          this.$refs.dom_tabMain.scrollLeft = this.$refs.dom_tabMain.clientWidth
          break
      }
      this.tabActiveId = id
    },
    handleSetReplyTarget(item) {
      if (!this.canSendComment) return
      this.replyTarget = item
      this.$refs.dom_input?.focus()
    },
    handleCancelReply() {
      this.replyTarget = null
    },
    async handleSend() {
      if (!this.canSendComment) return
      const text = this.inputText.trim()
      if (!text) return
      this.isSending = true
      try {
        const wyComment = music.wy.comment
        if (this.replyTarget) {
          await wyComment.replyComment(toOldMusicInfo(this.currentMusicInfo), this.replyTarget.id, text)
        } else {
          await wyComment.sendComment(toOldMusicInfo(this.currentMusicInfo), text)
        }
        toast(this.replyTarget ? this.$t('comment__reply_success') : this.$t('comment__send_success'))
        this.inputText = ''
        this.replyTarget = null
        // 刷新当前评论列表
        if (this.tabActiveId === 'hot') {
          this.handleGetHotComment(this.currentMusicInfo, 1, this.hotComment.limit)
        } else {
          this.handleGetNewComment(this.currentMusicInfo, 1, this.newComment.limit)
        }
      } catch (err) {
        console.error('发送评论失败:', err)
        toastError(err?.message || this.$t('comment__send_failed'))
      } finally {
        this.isSending = false
      }
    },
    async handleLike(item) {
      if (!this.canSendComment) return
      const isLiked = item.liked
      // 乐观更新：先改本地状态，保证高亮/取消即时生效
      item.liked = !isLiked
      item.likedCount = Math.max(0, (item.likedCount || 0) + (isLiked ? -1 : 1))
      try {
        await music.wy.comment.likeComment(toOldMusicInfo(this.currentMusicInfo), item.id, !isLiked)
        toast(this.$t(isLiked ? 'comment__unlike_success' : 'comment__like_success'))
      } catch (err) {
        // 失败回滚本地状态
        item.liked = isLiked
        item.likedCount = Math.max(0, (item.likedCount || 0) + (isLiked ? 1 : -1))
        console.error('点赞评论失败:', err)
        toastError(err?.message || this.$t('comment__like_failed'))
      }
    },
    async handleDelete(item) {
      if (!this.canSendComment) return
      try {
        await music.wy.comment.deleteComment(toOldMusicInfo(this.currentMusicInfo), item.id)
        toast(this.$t('comment__delete_success'))
        // 从当前列表移除并刷新
        this.hotComment.list = this.hotComment.list.filter(c => c.id !== item.id)
        this.newComment.list = this.newComment.list.filter(c => c.id !== item.id)
        this.refreshCurrentTab()
      } catch (err) {
        console.error('删除评论失败:', err)
        toastError(err?.message || this.$t('comment__delete_failed'))
      }
    },
    refreshCurrentTab() {
      if (this.tabActiveId === 'hot') {
        this.handleGetHotComment(this.currentMusicInfo, this.hotComment.page, this.hotComment.limit)
      } else {
        this.handleGetNewComment(this.currentMusicInfo, this.newComment.page, this.newComment.limit)
      }
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.comment {
  display: flex;
  flex-flow: column nowrap;
  transition: @transition-normal;
  transition-property: transform,opacity;
  transform-origin: 100%;
  overflow: hidden;
}
.commentHeader {
  flex: none;
  padding-bottom: 5px;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  // border-bottom: 1px solid #eee;
  h3 {
    font-size: 14px;
    .mixin-ellipsis-1();
    line-height: 1.2;
  }
}
.commentHeaderBtns {
  flex: 1 0 auto;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-end;
  color: var(--color-primary);
}
.commentHeaderBtn {
  height: 22px;
  width: 22px;
  cursor: pointer;
  transition: opacity @transition-normal;

  +.commentHeaderBtn {
    margin-left: 5px;
  }

  &:hover {
    opacity: .7;
  }
}
.commentMain {
  flex: auto;
  background-color: var(--color-primary-light-400-alpha-700);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
}
.tab_header {
  display: flex;
  flex-flow: row nowrap;
  gap: 15px;
  padding-left: 15px;
  padding-right: 10px;
}
.tab_main {
  flex: auto;
  display: flex;
  flex-flow: row nowrap;
  overflow: hidden;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
}
.tab_content {
  flex-shrink: 0;
  width: 100%;
  position: relative;
}
.tab_content_scroll {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  padding-left: 15px;
  padding-right: 10px;
  scroll-behavior: smooth;
}
.commentLabel {
  padding: 15px;
  color: var(--color-font-label);
  font-size: 14px;
}
.commentType {
  padding: 5px;
  margin: 5px 0;
  font-size: 13px;
  background: none;
  border: none;
  cursor: pointer;
  transition: @transition-normal;
  transition-property: opacity, color;
  &:hover {
    opacity: .7;
  }
  &.active {
    color: var(--color-primary);
  }
}
.commentFloor {
  opacity: 1;
  transition: opacity @transition-normal;

  &.loading {
    opacity: .4;
  }
}
.pagination {
  padding: 10px 0;
}

.unavailable {
  flex: auto;
  padding-top: 10%;
  text-align: center;
  font-size: 14px;
  color: var(--color-font-label);
}

.commentInput {
  flex: none;
  margin-top: 8px;
  display: flex;
  flex-flow: column nowrap;
  gap: 6px;
}
.replyTarget {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-primary);
}
.replyCancel {
  width: 14px;
  height: 14px;
  cursor: pointer;
  opacity: .8;
  &:hover {
    opacity: 1;
  }
}
.inputRow {
  display: flex;
  align-items: center;
  gap: 8px;
}
.input {
  flex: auto;
  min-width: 0;
  height: 36px;
  padding: 0 16px;
  font-size: 13px;
  color: var(--color-font);
  background-color: var(--color-primary-light-400-alpha-700);
  border: 1px solid var(--color-primary-alpha-700);
  border-radius: 18px;
  outline: none;
  transition: border-color @transition-normal;
  &:focus {
    border-color: var(--color-primary);
  }
  &:disabled {
    opacity: .6;
    cursor: not-allowed;
  }
}
.sendBtn {
  flex: none;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background-color: var(--color-primary);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: opacity @transition-normal;
  svg {
    width: 18px;
    height: 18px;
  }
  &:hover:not(:disabled) {
    opacity: .85;
  }
  &:disabled {
    opacity: .5;
    cursor: not-allowed;
  }
}

</style>
