<template lang="pug">
material-modal(:show="show" max-width="420px" @close="handleClose")
  div(:class="$style.container")
    div(:class="$style.header") {{ $t('netease__edit_playlist') }}
    div(:class="$style.body")
      div(:class="$style.field")
        label {{ $t('netease__playlist_name') }}
        base-input(v-model="formName" :placeholder="$t('netease__playlist_name_placeholder')" :class="$style.input")
      div(:class="$style.field")
        label {{ $t('netease__playlist_desc') }}
        textarea(v-model="formDesc" :placeholder="$t('netease__playlist_desc_placeholder')" :class="$style.textarea")
    div(:class="$style.footer")
      base-btn(min @click="handleClose") {{ $t('btn_cancel') }}
      base-btn(min :disabled="isSaving || !formName.trim()" @click="handleConfirm") {{ $t('btn_confirm') }}
</template>

<script lang="ts">
import { ref, watch } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import { toast, toastError } from '@renderer/utils/toast'
import musicSdk from '@renderer/utils/musicSdk'

export default {
  name: 'PlaylistEditModal',
  props: {
    show: { type: Boolean, required: true },
    playlist: { type: Object, default: null },
  },
  emits: ['update:show', 'success'],
  setup(props: any, { emit }: any) {
    const t = useI18n()
    const formName = ref('')
    const formDesc = ref('')
    const isSaving = ref(false)

    watch(() => props.playlist, (playlist) => {
      formName.value = playlist?.name ?? ''
      formDesc.value = playlist?.description ?? ''
    }, { immediate: true })

    const handleClose = () => {
      emit('update:show', false)
    }

    const handleConfirm = async() => {
      const playlist = props.playlist
      if (!playlist || !formName.value.trim()) return
      isSaving.value = true
      try {
        const result = await musicSdk.wy.user.updatePlaylist(String(playlist.id), formName.value.trim(), formDesc.value.trim())
        const nameResult = result['/api/playlist/update/name']
        const descResult = result['/api/playlist/desc/update']
        const isNameSuccess = nameResult?.code === 200
        const isDescSuccess = descResult?.code === 200
        if (isNameSuccess || isDescSuccess) {
          toast(t('netease__edit_playlist_success'))
          emit('success', { name: formName.value.trim(), desc: formDesc.value.trim() })
          handleClose()
        } else {
          const msg = nameResult?.message || descResult?.message || t('netease__edit_playlist_failed')
          toastError(msg)
        }
      } catch (err: any) {
        console.error('Edit playlist failed:', err)
        toastError(err?.message || t('netease__edit_playlist_failed'))
      } finally {
        isSaving.value = false
      }
    }

    return {
      formName,
      formDesc,
      isSaving,
      handleClose,
      handleConfirm,
      t,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  padding: 15px;
  display: flex;
  flex-flow: column nowrap;
  gap: 15px;
}

.header {
  font-size: 16px;
  color: var(--color-font);
  font-weight: bold;
  text-align: center;
}

.body {
  display: flex;
  flex-flow: column nowrap;
  gap: 12px;
}

.field {
  display: flex;
  flex-flow: column nowrap;
  gap: 6px;

  label {
    font-size: 13px;
    color: var(--color-font-label);
  }
}

.input, .textarea {
  width: 100%;
  padding: 8px 12px;
  border-radius: @radius-border;
  border: 1px solid var(--color-primary-light-400-alpha-700);
  background-color: var(--color-primary-light-400-alpha-700);
  color: var(--color-font);
  font-size: 14px;
  outline: none;
  transition: border-color @transition-fast;

  &:focus {
    border-color: var(--color-primary);
  }
}

.textarea {
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
