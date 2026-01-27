import { create } from 'zustand'

interface SearchFocusState {
  /** 搜索框是否聚焦 */
  isFocused: boolean
  setFocused: (focused: boolean) => void
  /** 是否处于预览模式（用于设置页预览搜索建议框样式） */
  isPreviewMode: boolean
  setPreviewMode: (preview: boolean) => void
}

export const useSearchFocusStore = create<SearchFocusState>((set) => ({
  isFocused: false,
  setFocused: (focused: boolean) => set({ isFocused: focused }),
  isPreviewMode: false,
  setPreviewMode: (preview: boolean) => set({ isPreviewMode: preview }),
}))
