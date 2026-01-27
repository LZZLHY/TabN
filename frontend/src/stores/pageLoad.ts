import { create } from 'zustand'

type PageLoadStore = {
  isLoaded: boolean
  skipAnimation: boolean // 有缓存时跳过动画
  setLoaded: (loaded: boolean) => void
  setSkipAnimation: (skip: boolean) => void
}

export const usePageLoadStore = create<PageLoadStore>((set) => ({
  isLoaded: false,
  skipAnimation: false,
  setLoaded: (loaded) => set({ isLoaded: loaded }),
  setSkipAnimation: (skip) => set({ skipAnimation: skip }),
}))
