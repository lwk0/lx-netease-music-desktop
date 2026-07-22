<template lang="pug">
material-modal(:show="show" :title="t('list__column_setting')" draggable max-width="420px" max-height="70%" :close-btn="false" @close="handleClose")
  div(:class="$style.modalContainer")
    div(:class="$style.modalBody")
      div(v-for="col in editableColumns" :key="col.key" :class="$style.columnRow")
        span(:class="$style.columnLabel") {{ col.label }}
        div(:class="$style.columnInputs")
          base-input(:model-value="col.width" :placeholder="$t('list__column_width')" style="width: 100%;" @update:model-value="updateWidth(col.key, $event)")
          div(:class="$style.alignGroup")
            base-btn.btn(min :class="{[$style.activeAlign]: col.align === 'left'}" @click="updateAlign(col.key, 'left')") {{ $t('list__column_align_left') }}
            base-btn.btn(min :class="{[$style.activeAlign]: col.align === 'center'}" @click="updateAlign(col.key, 'center')") {{ $t('list__column_align_center') }}
            base-btn.btn.btn-right(min :class="{[$style.activeAlign]: col.align === 'right'}" @click="updateAlign(col.key, 'right')") {{ $t('list__column_align_right') }}
    div(:class="$style.modalFooter")
      base-btn.btn(min @click="handleReset") {{ $t('btn_reset') }}
      base-btn.btn(min @click="handleClose") {{ $t('btn_close') }}
</template>

<script>
import { computed } from '@common/utils/vueTools'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { useI18n } from '@renderer/plugins/i18n'

const parseConfig = () => {
  try {
    const parsed = JSON.parse(appSetting['list.columnConfig'] || '{}')
    return {
      widths: typeof parsed.widths === 'object' && parsed.widths != null ? parsed.widths : {},
      aligns: typeof parsed.aligns === 'object' && parsed.aligns != null ? parsed.aligns : {},
    }
  } catch {
    return { widths: {}, aligns: {} }
  }
}

const saveConfig = (widths, aligns) => {
  updateSetting({ 'list.columnConfig': JSON.stringify({ widths, aligns }) })
}

export default {
  name: 'ColumnSettingModal',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    columns: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const t = useI18n()

    const editableColumns = computed(() => props.columns.filter(col => col.key !== 'num'))

    const updateWidth = (key, value) => {
      const trimmed = value.trim()
      const { widths, aligns } = parseConfig()
      if (!trimmed) {
        const { [key]: _removed, ...rest } = widths
        void _removed
        saveConfig(rest, aligns)
      } else {
        widths[key] = trimmed
        saveConfig(widths, aligns)
      }
    }

    const updateAlign = (key, align) => {
      const { widths, aligns } = parseConfig()
      aligns[key] = align
      saveConfig(widths, aligns)
    }

    const handleReset = () => {
      const keys = new Set(props.columns.map(col => col.key))
      const { widths, aligns } = parseConfig()
      const newWidths = Object.fromEntries(Object.entries(widths).filter(([k]) => !keys.has(k)))
      const newAligns = Object.fromEntries(Object.entries(aligns).filter(([k]) => !keys.has(k)))
      saveConfig(newWidths, newAligns)
    }

    const handleClose = () => {
      emit('close')
    }

    return {
      t,
      editableColumns,
      updateWidth,
      updateAlign,
      handleReset,
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
  width: 420px;
  max-height: 70vh;
  background-color: var(--color-content-background);
}

.modalBody {
  flex: auto;
  overflow-y: auto;
  padding: 15px;
}

.columnRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

.columnLabel {
  flex: none;
  width: 70px;
  font-size: 13px;
  color: var(--color-font);
}

.columnInputs {
  flex: auto;
  display: flex;
  flex-flow: column nowrap;
  gap: 8px;
}

.alignGroup {
  display: flex;
  flex-flow: row nowrap;
  gap: 0;

  .btn {
    border-radius: 0;
    border-right-width: 0;

    &:first-child {
      border-top-left-radius: 3px;
      border-bottom-left-radius: 3px;
    }

    &:last-child {
      border-top-right-radius: 3px;
      border-bottom-right-radius: 3px;
      border-right-width: 1px;
    }
  }
}

.activeAlign {
  background-color: var(--color-primary-light-100-alpha-200);
  color: var(--color-primary-font);
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
