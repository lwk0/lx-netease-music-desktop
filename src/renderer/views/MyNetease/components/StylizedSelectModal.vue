<template lang="pug">
material-modal(:show="show" max-width="560px" max-height="70%" :close-btn="false" hide-header @close="handleClose")
  div(:class="$style.modalContainer")
    div(:class="$style.modalHeader")
      span {{ $t('netease__select_stylized_tags') }}
      button(:class="$style.closeBtn" @click="handleClose") ✕
    div(:class="$style.modalBody")
      div(:class="$style.categoryList")
        base-btn.btn(v-for="name in categoryNames" :key="name" :class="{[$style.activeCategory]: selectedCategoryName === name}" @click="selectCategory(name)") {{ name }}
      div(:class="$style.tagList")
        span(:class="$style.tagHint") {{ selectedCategoryName === '情感' ? $t('netease__stylized_select_at_least_one') : $t('netease__stylized_max_tags', { count: 5 }) }}
        div(:class="$style.tagsWrap")
          base-btn.btn(v-for="[tagName, tagId] in currentTags" :key="tagId" :class="{[$style.activeTag]: selectedTags.includes(tagId)}" @click="selectTag(tagId)") {{ tagName }}
    div(:class="$style.modalFooter")
      base-btn.btn(min @click="handleClose") {{ $t('btn_cancel') }}
      base-btn.btn(min @click="confirmStylized") {{ $t('btn_confirm') }}
</template>

<script lang="ts">
import { ref, computed, watch } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import { toast } from '@renderer/utils/toast'
import { stylizedSelection } from './stylizedState'
import type { SetupContext } from 'vue'

type CategoryName = keyof typeof CATEGORIES

const CATEGORIES: Record<string, { categoryId: number, tags: Record<string, number> }> = {
  曲风: {
    categoryId: 1000,
    tags: {
      '嘻哈/说唱': 10005,
      电音: 10004,
      民谣: 10010,
      华语流行: 10001,
      轻音乐: 10017,
      国风: 10016,
      欧美流行: 10002,
      'R&B': 10013,
      二次元: 10015,
      DJ慢摇: 10018,
      韩系流行: 10019,
      日系流行: 10020,
      摇滚: 10021,
      金属: 10022,
      爵士: 10008,
      古典: 10009,
      雷鬼: 10023,
      蓝调: 10024,
      乡村: 10011,
      新世纪: 10007,
      独立: 10012,
    },
  },
  语种: {
    categoryId: 2000,
    tags: {
      华语: 20001,
      英语: 20002,
      日语: 20003,
      韩语: 20004,
      粤语: 20005,
      纯音乐: 20006,
      西班牙语: 20007,
      俄语: 20008,
      法语: 20009,
      泰语: 20010,
      闽南语: 20011,
    },
  },
  情感: {
    categoryId: 3000,
    tags: {
      伤感: 30001,
      放松: 30002,
      抒情: 30008,
      欢快: 30004,
      浪漫: 30005,
      兴奋: 30009,
      思念: 30010,
      治愈: 30011,
    },
  },
  主题: {
    categoryId: 4000,
    tags: {
      偶像: 40001, 草原: 40002, 成熟: 40003, 慢摇: 40004,
    },
  },
  场景: {
    categoryId: 5000,
    tags: {
      学习: 50001,
      助眠: 50002,
      运动: 50003,
      KTV: 50004,
      咖啡厅: 50005,
      夜店: 50006,
      微醺: 50007,
    },
  },
}

export default {
  name: 'StylizedSelectModal',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['confirm', 'close'],
  setup(props: { show: boolean }, { emit }: SetupContext) {
    const t = useI18n()
    const selectedCategoryName = ref<CategoryName>('曲风')
    const selectedTags = ref<number[]>([])

    const categoryNames = computed(() => Object.keys(CATEGORIES))
    const currentTags = computed(() => Object.entries(CATEGORIES[selectedCategoryName.value].tags))

    watch(() => props.show, visible => {
      if (visible) {
        selectedCategoryName.value = '曲风'
        selectedTags.value = stylizedSelection.value?.tagIds ?? []
        if (stylizedSelection.value) {
          const cat = Object.entries(CATEGORIES).find(([, v]) => v.categoryId === stylizedSelection.value!.categoryId)?.[0]
          if (cat) selectedCategoryName.value = cat
        }
      }
    })

    const selectCategory = (name: CategoryName) => {
      selectedCategoryName.value = name
      selectedTags.value = []
    }

    const selectTag = (tagId: number) => {
      const isEmotion = selectedCategoryName.value === '情感'
      if (selectedTags.value.includes(tagId)) {
        selectedTags.value = selectedTags.value.filter(id => id !== tagId)
      } else if (isEmotion) {
        selectedTags.value = [tagId]
      } else if (selectedTags.value.length >= 5) {
        toast(t('netease__stylized_max_tags', { count: 5 }))
      } else {
        selectedTags.value = [...selectedTags.value, tagId]
      }
    }

    const confirmStylized = () => {
      if (selectedTags.value.length === 0) {
        toast(t('netease__stylized_select_at_least_one'))
        return
      }
      const cat = CATEGORIES[selectedCategoryName.value]
      const tagNames = selectedTags.value.map(id => {
        const entry = Object.entries(cat.tags).find(([, tagId]) => tagId === id)
        return entry ? entry[0] : String(id)
      })
      const selection = {
        categoryId: cat.categoryId,
        categoryName: selectedCategoryName.value,
        tagIds: selectedTags.value,
        tagNames,
      }
      stylizedSelection.value = selection
      emit('confirm', selection)
    }

    const handleClose = () => {
      emit('close')
    }

    return {
      categoryNames,
      selectedCategoryName,
      currentTags,
      selectedTags,
      selectCategory,
      selectTag,
      confirmStylized,
      handleClose,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.modalContainer {
  display: flex;
  flex-flow: column nowrap;
  width: 560px;
  height: 400px;
  background-color: var(--color-content-background);
}

.modalHeader {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  border-bottom: 1px solid var(--color-primary-light-100-alpha-300);
  font-size: 15px;
  color: var(--color-font);
}

.closeBtn {
  border: none;
  background: transparent;
  color: var(--color-font-label);
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;

  &:hover {
    color: var(--color-font);
  }
}

.modalBody {
  flex: auto;
  min-height: 0;
  display: flex;
  flex-flow: row nowrap;
}

.categoryList {
  flex: 0 0 100px;
  border-right: 1px solid var(--color-primary-light-100-alpha-300);
  display: flex;
  flex-flow: column nowrap;
  padding: 8px;
  gap: 4px;
  overflow-y: auto;
}

.tagList {
  flex: auto;
  padding: 15px;
  overflow-y: auto;
}

.tagHint {
  display: block;
  font-size: 12px;
  color: var(--color-font-label);
  margin-bottom: 12px;
}

.tagsWrap {
  display: flex;
  flex-flow: row wrap;
  gap: 10px;
}

.activeCategory {
  color: var(--color-primary-font);
  background-color: var(--color-primary-light-100-alpha-200) !important;
}

.activeTag {
  color: var(--color-primary-font);
  background-color: var(--color-primary-light-100-alpha-200) !important;
  border-color: var(--color-primary) !important;
}

.modalFooter {
  flex: none;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 15px;
  border-top: 1px solid var(--color-primary-light-100-alpha-300);
}
</style>
