import { useMemo } from 'react'
import { getMatchScore } from '../utils/pinyin'
import { getIconUrl } from '../utils/iconSource'
import type { Bookmark } from '../components/bookmarks/types'

export interface ShortcutMatch {
  id: string
  name: string
  url: string
  favicon: string
  // 添加完整的书签图标信息
  iconBg?: string | null
  iconType?: 'BASE64' | 'URL' | 'TEXT' | null
  iconData?: string | null
  iconUrl?: string | null
}

const DEFAULT_MAX_RESULTS = 5

/**
 * 从书签获取 favicon URL（支持自定义图标来源）
 */
function getBookmarkFavicon(bookmark: Bookmark): string {
  // 优先使用 Base64 图标
  if (bookmark.iconType === 'BASE64' && bookmark.iconData) {
    return bookmark.iconData
  }
  // 使用 iconUrl（可能是来源标记或自定义 URL）
  if (bookmark.iconUrl && bookmark.url) {
    const iconUrl = getIconUrl(bookmark.url, bookmark.iconUrl)
    if (iconUrl) return iconUrl
  }
  // 回退到 Google favicon
  if (bookmark.url) {
    try {
      const host = new URL(bookmark.url).hostname
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`
    } catch {
      return ''
    }
  }
  return ''
}

/**
 * 匹配书签（支持拼音搜索）
 * 匹配规则：
 * 1. 书签名称包含查询（大小写不敏感）
 * 2. 书签名称的拼音全拼包含查询
 * 3. 书签名称的拼音首字母包含查询
 * 
 * 排序规则（优先级从高到低）：
 * 1. 首字母完全匹配（youtube 输入 y）
 * 2. 名称开头匹配（youtube 输入 you）
 * 3. 名称中间匹配（douyin 输入 y）
 * 4. 按名称字母顺序
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

  // 收集所有匹配的书签及其匹配分数
  const matchesWithScore: Array<{ bookmark: Bookmark; score: number }> = []

  for (const bookmark of bookmarks) {
    // 只匹配 LINK 类型的书签
    if (bookmark.type !== 'LINK' || !bookmark.url) {
      continue
    }

    // 获取匹配分数（0 表示不匹配，分数越高越优先）
    const score = getMatchScore(bookmark.name, trimmedQuery)
    if (score > 0) {
      matchesWithScore.push({ bookmark, score })
    }
  }

  // 按分数降序排序，分数相同时按名称字母顺序
  matchesWithScore.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    return a.bookmark.name.localeCompare(b.bookmark.name)
  })

  // 取前 maxResults 个结果
  return matchesWithScore.slice(0, maxResults).map(({ bookmark }) => ({
    id: bookmark.id,
    name: bookmark.name,
    url: bookmark.url!, // 已在上面过滤掉 url 为 null 的情况
    favicon: '',
    iconBg: bookmark.iconBg,
    iconType: bookmark.iconType,
    iconData: bookmark.iconData,
    iconUrl: bookmark.iconUrl,
  }))
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
  getBookmarkFavicon,
}
