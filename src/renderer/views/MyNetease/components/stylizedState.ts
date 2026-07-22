import { ref } from '@common/utils/vueTools'

export type StylizedSelection = {
  categoryId: number
  categoryName: string
  tagIds: number[]
  tagNames: string[]
} | null

export const stylizedSelection = ref<StylizedSelection>(null)
