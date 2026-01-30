/**
 * 最近点击书签 Hook
 * 获取用户最近点击打开的书签列表
 */

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useBookmarkRefreshStore } from '../stores/bookmarkRefresh'
import { useBookmarkCacheStore } from '../stores/bookmarkCache'

export interface RecentBookmark {
  id: string
  name: string
  url: string
  favicon: string | null
  iconUrl?: string | null
  iconType?: string | null
  iconData?: string | null
  iconBg?: string | null
  lastClickAt: string
}


/** 全局事件：书签被点击时触发 */
const BOOKMARK_CLICKED_EVENT = 'bookmark-clicked'

/** 触发书签点击事件（供其他组件调用） */
export function emitBookmarkClicked() {
  window.dispatchEvent(new CustomEvent(BOOKMARK_CLICKED_EVENT))
}

export function useRecentBookmarks(limit: number = 8) {
  const token = useAuthStore((s) => s.token)
  const [recentBookmarks, setRecentBookmarks] = useState<RecentBookmark[]>([])
  const [loading, setLoading] = useState(false)
  
  // 监听书签刷新事件，当书签数据更新时自动刷新最近打开列表
  const refreshCount = useBookmarkRefreshStore((s) => s.refreshCount)
  
  // 获取完整的书签缓存数据（包含iconBg等完整信息）
  const cachedItems = useBookmarkCacheStore((s) => s.items)

  const refresh = useCallback(async () => {
    if (!token) {
      setRecentBookmarks([])
      return
    }
    
    setLoading(true)
    try {
      const resp = await apiFetch<{ items: RecentBookmark[] }>(
        `/api/bookmarks/recent?limit=${limit}`,
        { method: 'GET', token }
      )
      if (resp.ok) {
        // 将API返回的最近书签数据与缓存中的完整书签数据合并
        const recentItems = resp.data.items.map(recentItem => {
          // 在缓存中查找对应的完整书签数据
          const fullBookmark = cachedItems.find(cached => cached.id === recentItem.id)
          if (fullBookmark) {
            // 使用缓存中的完整数据，保留API返回的lastClickAt，并确保类型匹配
            return {
              id: fullBookmark.id,
              name: fullBookmark.name,
              url: fullBookmark.url || '',
              favicon: recentItem.favicon,
              iconUrl: fullBookmark.iconUrl,
              iconType: fullBookmark.iconType,
              iconData: fullBookmark.iconData,
              iconBg: fullBookmark.iconBg,
              lastClickAt: recentItem.lastClickAt
            } as RecentBookmark
          }
          // 如果缓存中没找到，使用API返回的数据（可能缺少iconBg等字段）
          return recentItem
        })
        setRecentBookmarks(recentItems)
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false)
    }
  }, [token, limit, cachedItems])

  // 初始加载
  useEffect(() => {
    void refresh()
  }, [refresh])

  // 监听书签数据变化，当书签更新时自动刷新最近打开列表
  useEffect(() => {
    void refresh()
  }, [refresh, refreshCount])

  // 监听全局书签点击事件
  useEffect(() => {
    const handleBookmarkClicked = () => {
      // 延迟刷新，等待后端记录完成
      setTimeout(() => void refresh(), 300)
    }
    window.addEventListener(BOOKMARK_CLICKED_EVENT, handleBookmarkClicked)
    return () => window.removeEventListener(BOOKMARK_CLICKED_EVENT, handleBookmarkClicked)
  }, [refresh])

  return {
    recentBookmarks,
    loading,
    refresh,
  }
}
