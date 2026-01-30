import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Bookmark } from '../components/bookmarks/types'

type BookmarkCacheStore = {
  // 书签数据
  items: Bookmark[]
  tags: string[]
  
  // 加载状态（不持久化）
  loading: boolean
  lastLoadTime: number // 上次加载时间戳
  
  // 缓存有效期（毫秒），默认 5 分钟
  cacheValidDuration: number
  
  // Actions
  setItems: (items: Bookmark[]) => void
  setTags: (tags: string[]) => void
  setLoading: (loading: boolean) => void
  updateLastLoadTime: () => void
  
  // 检查缓存是否有效（用于决定是否需要从服务器刷新）
  isCacheValid: () => boolean
  
  // 检查是否有离线可用的缓存数据
  hasOfflineData: () => boolean
  
  // 清空缓存（用户登出时）
  clearCache: () => void
}

export const useBookmarkCacheStore = create<BookmarkCacheStore>()(
  persist(
    (set, get) => ({
      items: [],
      tags: [],
      loading: false,
      lastLoadTime: 0,
      cacheValidDuration: 5 * 60 * 1000, // 5 分钟
      
      setItems: (items) => set({ items }),
      setTags: (tags) => set({ tags }),
      setLoading: (loading) => set({ loading }),
      updateLastLoadTime: () => set({ lastLoadTime: Date.now() }),
      
      isCacheValid: () => {
        const { items, lastLoadTime, cacheValidDuration } = get()
        // 有数据且在有效期内
        return items.length > 0 && Date.now() - lastLoadTime < cacheValidDuration
      },
      
      hasOfflineData: () => {
        const { items } = get()
        return items.length > 0
      },
      
      clearCache: () => set({ items: [], tags: [], lastLoadTime: 0 }),
    }),
    {
      name: 'start:bookmarkCache',
      version: 1,
      // 只持久化书签数据，不持久化 loading 状态
      partialize: (s) => ({ items: s.items, tags: s.tags, lastLoadTime: s.lastLoadTime }),
    },
  ),
)
