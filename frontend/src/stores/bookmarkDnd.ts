import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type BookmarkDndState = {
  /** 拖拽时是否预挤压（实时换位） */
  prePush: boolean
  /** 预挤压是否带平滑动画 */
  pushAnimation: boolean
  /** 松手归位/落位是否带平滑动画 */
  dropAnimation: boolean
  /** 当前是否正在拖拽（用于禁用其他手势） */
  isDragging: boolean

  setPrePush: (v: boolean) => void
  setPushAnimation: (v: boolean) => void
  setDropAnimation: (v: boolean) => void
  setIsDragging: (v: boolean) => void
  resetBookmarkDnd: () => void
}

const DEFAULTS: Pick<BookmarkDndState, 'prePush' | 'pushAnimation' | 'dropAnimation' | 'isDragging'> = {
  prePush: true,
  pushAnimation: true,
  dropAnimation: true,
  isDragging: false,
}

export const useBookmarkDndStore = create<BookmarkDndState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setPrePush: (prePush) => set({ prePush }),
      setPushAnimation: (pushAnimation) => set({ pushAnimation }),
      setDropAnimation: (dropAnimation) => set({ dropAnimation }),
      setIsDragging: (isDragging) => set({ isDragging }),
      resetBookmarkDnd: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'start:bookmarkDnd',
      version: 1,
      partialize: (s) => ({
        prePush: s.prePush,
        pushAnimation: s.pushAnimation,
        dropAnimation: s.dropAnimation,
      }),
    },
  ),
)

