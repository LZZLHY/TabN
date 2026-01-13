import { useCallback, useEffect, useState } from 'react'
import { useAppearanceStore } from '../stores/appearance'

const STORAGE_KEY_PREFIX = 'start:search-history:'
const MAX_HISTORY_ITEMS = 100 // 内部存储的最大条数

interface SearchHistoryStorage {
  items: string[]
  updatedAt: number
}

/**
 * 获取存储 key
 */
function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`
}

/**
 * 从 localStorage 读取历史记录
 */
function loadHistory(userId: string): string[] {
  try {
    const key = getStorageKey(userId)
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const data = JSON.parse(raw) as SearchHistoryStorage
    return Array.isArray(data.items) ? data.items : []
  } catch {
    return []
  }
}

/**
 * 保存历史记录到 localStorage
 */
function saveHistory(userId: string, items: string[]): void {
  try {
    const key = getStorageKey(userId)
    const data: SearchHistoryStorage = {
      items: items.slice(0, MAX_HISTORY_ITEMS),
      updatedAt: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // localStorage 不可用或配额超限，静默失败
  }
}

export interface UseSearchHistoryReturn {
  /** 显示的历史记录（受 searchHistoryCount 限制） */
  history: string[]
  /** 完整的历史记录 */
  fullHistory: string[]
  /** 添加到历史记录 */
  addToHistory: (keyword: string) => void
  /** 从历史记录中删除 */
  removeFromHistory: (keyword: string) => void
  /** 清空历史记录 */
  clearHistory: () => void
}

/**
 * 搜索历史管理 Hook
 * @param userId 用户 ID，未登录时为 undefined
 */
export function useSearchHistory(userId: string | undefined): UseSearchHistoryReturn {
  const searchHistoryCount = useAppearanceStore((s) => s.searchHistoryCount)
  const [fullHistory, setFullHistory] = useState<string[]>([])

  // 初始化：从 localStorage 加载历史记录
  useEffect(() => {
    if (!userId) {
      setFullHistory([])
      return
    }
    const loaded = loadHistory(userId)
    setFullHistory(loaded)
  }, [userId])

  // 添加到历史记录
  const addToHistory = useCallback(
    (keyword: string) => {
      if (!userId) return
      const trimmed = keyword.trim()
      if (!trimmed) return

      setFullHistory((prev) => {
        // 去重：如果已存在，先移除旧的
        const filtered = prev.filter((item) => item !== trimmed)
        // 新记录插入头部
        const next = [trimmed, ...filtered].slice(0, MAX_HISTORY_ITEMS)
        saveHistory(userId, next)
        return next
      })
    },
    [userId]
  )

  // 从历史记录中删除
  const removeFromHistory = useCallback(
    (keyword: string) => {
      if (!userId) return

      setFullHistory((prev) => {
        const next = prev.filter((item) => item !== keyword)
        saveHistory(userId, next)
        return next
      })
    },
    [userId]
  )

  // 清空历史记录
  const clearHistory = useCallback(() => {
    if (!userId) return
    setFullHistory([])
    saveHistory(userId, [])
  }, [userId])

  // 根据设置限制显示的历史条数
  const history = searchHistoryCount > 0 ? fullHistory.slice(0, searchHistoryCount) : []

  return {
    history,
    fullHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
  }
}

// 导出纯函数用于测试
export const searchHistoryUtils = {
  loadHistory,
  saveHistory,
  getStorageKey,
}
