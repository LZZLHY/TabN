import { create } from 'zustand'

/**
 * 书签刷新状态管理
 * 用于跨组件通知书签数据更新
 */
type BookmarkRefreshStore = {
  /** 刷新计数器，每次增加表示需要刷新 */
  refreshCount: number
  /** 触发刷新 */
  triggerRefresh: () => void
}

export const useBookmarkRefreshStore = create<BookmarkRefreshStore>((set) => ({
  refreshCount: 0,
  triggerRefresh: () => set((state) => ({ refreshCount: state.refreshCount + 1 })),
}))
