import { create } from 'zustand'

interface SearchFocusState {
  /** 搜索框是否聚焦 */
  isFocused: boolean
  setFocused: (focused: boolean) => void
}

export const useSearchFocusStore = create<SearchFocusState>((set) => ({
  isFocused: false,
  setFocused: (isFocused) => set({ isFocused }),
}))
