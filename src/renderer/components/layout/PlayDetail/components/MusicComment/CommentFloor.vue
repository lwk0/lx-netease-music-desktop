<template lang="pug">
div(:class="$style.container")
  ul
    li(v-for="item in comments" :key="item.id" :class="$style.listItem")
      div(:class="$style.content")
        div(:class="$style.left")
          img( :class="$style.avatar" :src="item.avatar || commentDefImg" @error="handleUserImg")
        div(:class="$style.right")
          div(:class="$style.info")
            div(:class="$style.baseInfo")
              div.select(:class="$style.name") {{ item.userName }}
              div(:class="$style.metaInfo")
                time(v-if="item.timeStr" :class="$style.label") {{ timeFormat(item.timeStr) }}
                div(v-if="item.location" :class="$style.label") {{ $t('comment__location', { location: item.location }) }}
            div(v-if="item.likedCount != null" :class="[$style.likes, item.liked ? $style.liked : '']" @click.stop="handleLike(item)")
              svg(:class="$style.likesIcon" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" space="preserve")
                use(xlink:href="#icon-thumbs-up")
              | {{ item.likedCount }}
          p.select(:class="$style.comment_text") {{ displayedText(item) }}
          div(v-if="showActions" :class="$style.actions")
            span(:class="$style.action" @click.stop="handleReply(item)") {{ $t('comment__reply') }}
            span(:class="$style.action" @click.stop="handleTranslate(item)") {{ transLabel(item) }}
            span(v-if="isOwnComment(item)" :class="$style.action" @click.stop="handleDelete(item)") {{ $t('comment__recall') }}
          div(v-if="item.images?.length" :class="$style.comment_images")
            img(v-for="(url, index) in item.images" :key="index" :src="url" loading="lazy" decoding="async")
      comment-floor(v-if="item.reply && item.reply.length" :class="$style.reply_floor" :comments="item.reply")
</template>

<script>
import commentDefImg from '@renderer/assets/images/defaultUser.jpg'
import { userState } from '@renderer/store/user'
import { translateText } from '@renderer/utils/translate'

export default {
  name: 'CommentFloor',
  props: {
    comments: {
      type: Array,
      default() {
        return []
      },
    },
    showActions: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['reply', 'delete', 'like'],
  data() {
    return {
      commentDefImg,
      // 每个评论的翻译状态：{ status: 'idle'|'loading'|'done'|'error', text, shown }
      transMap: {},
    }
  },
  methods: {
    timeFormat(time) {
      return time
      // return formatTime(new Date(time), true)
    },
    handleUserImg(event) {
      event.target.src = this.commentDefImg
    },
    // 是否为当前登录用户自己发布的评论（仅自己可撤回）
    isOwnComment(item) {
      return !!userState.wy_uid && String(item.userId) === String(userState.wy_uid)
    },
    handleReply(item) {
      this.$emit('reply', item)
    },
    handleDelete(item) {
      this.$emit('delete', item)
    },
    handleLike(item) {
      this.$emit('like', item)
    },
    transLabel(item) {
      const e = this.transMap[item.id]
      if (!e || e.status === 'idle') return this.$t('comment__translate')
      if (e.status === 'loading') return this.$t('comment__translating')
      if (e.status === 'error') return this.$t('comment__translate_failed')
      return e.shown ? this.$t('comment__show_original') : this.$t('comment__translate')
    },
    displayedText(item) {
      const e = this.transMap[item.id]
      if (e && e.status === 'done' && e.shown) return e.text
      return item.text
    },
    async handleTranslate(item) {
      const id = item.id
      const e = this.transMap[id] || { status: 'idle', text: '', shown: false }
      if (e.status === 'loading') return
      // 已翻译：切换“显示原文 / 显示译文”
      if (e.status === 'done') {
        e.shown = !e.shown
        this.transMap = { ...this.transMap }
        return
      }
      e.status = 'loading'
      this.transMap = { ...this.transMap, [id]: e }
      try {
        const text = await translateText(item.text)
        e.status = 'done'
        e.text = text
        e.shown = true
      } catch (err) {
        console.error('翻译评论失败', err)
        e.status = 'error'
      }
      this.transMap = { ...this.transMap, [id]: e }
    },
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

@padding: 15px;

// .container {

// }

.listItem {
  border-bottom: 1px dashed var(--color-primary-alpha-700);
}

.content {
  padding: 12px 0;
  font-size: 13px;
  color: var(--color-font);
  display: flex;
}
.left {
  flex: none;
}
.avatar {
  width: 40px;
  border-radius: 4px;
  box-shadow: 0 0 2px rgba(0, 0, 0, .15);
}
.right {
  flex: auto;
  min-width: 0;
  margin-left: 10px;
}

.info {
  display: flex;
  flex-flow: row nowrap;
  gap: 15px;
  width: 100%;
  height: 40px;
  line-height: 1.3;
  color: var(--color-450);
}
.baseInfo {
  height: 100%;
  flex: auto;
  display: flex;
  min-width: 0;
  flex-flow: column nowrap;
  justify-content: space-evenly;
}
.metaInfo {
  display: flex;
  flex-flow: row nowrap;
  min-width: 0;
  gap: 10px;
  overflow: hidden;
}
.name {
  flex: 0 1 auto;
  min-width: 0;
  .mixin-ellipsis-1();
  color: var(--color-650);
}
.label {
  flex: none;
  font-size: 12px;
  // margin-left: 5px;
}
.likes {
  flex: none;
  font-size: 11px;
  text-align: right;
  padding-top: 3px;
  align-self: flex-start;
}
.likesIcon {
  width: 12px;
  height: 12px;
  margin-right: 3px;
  color: var(--color-primary-alpha-500);
}
.likes {
  cursor: pointer;
  transition: color @transition-fast;
}
.liked {
  color: var(--color-primary);
  .likesIcon {
    color: var(--color-primary);
  }
}
.comment_text {
  text-align: justify;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-all;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}
.actions {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-font-label);
}
.action {
  cursor: pointer;
  transition: color @transition-fast;
  &:hover {
    color: var(--color-primary);
  }
}
.comment_images {
  display: flex;
  flex-flow: row wrap;
  gap: 5px;
  margin-top: 5px;

  img {
    max-width: 240px;
  }
}

.reply_floor {
  padding: 0 0 0 @padding;
  margin-left: @padding * 2;
  border-radius: .5rem;
  &:last-child {
    margin-bottom: 12px;
  }
  .listItem:last-child {
    border-bottom: none;
  }
  .right {
    margin-right: 10px;
  }

  background-color: var(--color-primary-light-500-alpha-700);
}


</style>
