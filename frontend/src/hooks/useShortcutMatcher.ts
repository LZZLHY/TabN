import { useMemo } from 'react'
import { matchWithPinyin } from '../utils/pinyin'

export interface Bookmark {
  id: string
  name: string
  url: string | null
  type: 'LINK' | 'FOLDER'
}

export interface ShortcutMatch {
  id: string
  name: string
  url: string
  favicon: string
}

const DEFAULT_MAX_RESULTS = 5

/**
 * 生成 favicon URL
 */
function getFaviconUrl(url: string): string {
  try {
    const host = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`
  } catch {
    return ''
  }
}

/**
 * 匹配书签（支持拼音搜索）
 * 匹配规则：
 * 1. 书签名称包含查询（大小写不敏感）
 * 2. 书签名称的拼音全拼包含查询
 * 3. 书签名称的拼音首字母包含查询
 */
export function matchBookmarks(
  query: string,
  bookmarks: Bookmark[],
  maxResults: number = DEFAULT_MAX_RESULTS
): ShortcutMatch[] {
  const trimmedQuery = query.trim()
  
  // 空查询不匹配任何书签
  if (!trimmedQuery) {
    return []
  }

  const matches: ShortcutMatch[] = []

  for (const bookmark of bookmarks) {
    // 只匹配 LINK 类型的书签
    if (bookmark.type !== 'LINK' || !bookmark.url) {
      continue
    }

    // 使用拼音匹配（支持原文、全拼、首字母）
    if (matchWithPinyin(bookmark.name, trimmedQuery)) {
      matches.push({
        id: bookmark.id,
        name: bookmark.name,
        url: bookmark.url,
        favicon: getFaviconUrl(bookmark.url),
      })

      // 达到最大结果数时停止
      if (matches.length >= maxResults) {
        break
      }
    }
  }

  return matches
}

export interface UseShortcutMatcherReturn {
  matches: ShortcutMatch[]
}

/**
 * 快捷方式匹配 Hook
 * @param query 搜索查询
 * @param bookmarks 书签列表
 * @param maxResults 最大结果数，默认 5
 */
export function useShortcutMatcher(
  query: string,
  bookmarks: Bookmark[],
  maxResults: number = DEFAULT_MAX_RESULTS
): UseShortcutMatcherReturn {
  const matches = useMemo(() => {
    return matchBookmarks(query, bookmarks, maxResults)
  }, [query, bookmarks, maxResults])

  return { matches }
}

// 导出纯函数用于测试
export const shortcutMatcherUtils = {
  matchBookmarks,
  getFaviconUrl,
}
