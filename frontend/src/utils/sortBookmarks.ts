import { pinyin } from 'pinyin-pro'
import type { BookmarkItem, SortMode } from '../types/bookmark'

/**
 * 书签项（带 URL，用于点击排序）
 */
export interface BookmarkItemWithUrl extends BookmarkItem {
  url?: string | null
}

/**
 * @deprecated 使用 BookmarkItemWithUrl 代替
 * 保留此别名以兼容旧代码
 */
export interface BookmarkItemWithClick extends BookmarkItem {
  url?: string | null
}

/**
 * 获取字符串的拼音排序键
 * 中文转换为拼音，英文转小写
 * 例如: "百度" -> "baidu", "Google" -> "google", "淘宝网" -> "taobaowang"
 */
export function getSortKey(name: string): string {
  if (!name) return ''
  
  // 使用 pinyin-pro 将中文转换为拼音（无声调）
  // 对于非中文字符，pinyin-pro 会保持原样
  return pinyin(name, { 
    toneType: 'none', 
    type: 'string',
    nonZh: 'consecutive'  // 非中文字符连续输出
  }).toLowerCase()
}

/**
 * 比较两个字符串（支持中文拼音排序）
 * 将中文转换为拼音后按字母顺序比较
 */
export function compareNames(a: string, b: string): number {
  const keyA = getSortKey(a)
  const keyB = getSortKey(b)
  return keyA.localeCompare(keyB, 'en', { sensitivity: 'base' })
}

/**
 * 按类型分组排序
 * @param items 书签列表
 * @param customOrder 自定义顺序
 * @param foldersFirst 是否文件夹在前
 * @returns 排序后的 ID 列表
 */
export function sortByType(
  items: BookmarkItem[],
  customOrder: string[],
  foldersFirst: boolean
): string[] {
  // 创建 ID 到 item 的映射
  const itemMap = new Map<string, BookmarkItem>()
  for (const item of items) {
    itemMap.set(item.id, item)
  }
  
  // 按自定义顺序排列，不在 customOrder 中的放最后
  const orderMap = new Map<string, number>()
  customOrder.forEach((id, index) => orderMap.set(id, index))
  
  const sortedItems = [...items].sort((a, b) => {
    const orderA = orderMap.get(a.id) ?? Infinity
    const orderB = orderMap.get(b.id) ?? Infinity
    return orderA - orderB
  })
  
  // 分组
  const folders: BookmarkItem[] = []
  const links: BookmarkItem[] = []
  
  for (const item of sortedItems) {
    if (item.type === 'FOLDER') {
      folders.push(item)
    } else {
      links.push(item)
    }
  }
  
  // 按指定顺序合并
  const result = foldersFirst
    ? [...folders, ...links]
    : [...links, ...folders]
  
  return result.map(item => item.id)
}

/**
 * 按字母排序（支持中文拼音）
 * @param items 书签列表
 * @returns 排序后的 ID 列表
 */
export function sortAlphabetically(items: BookmarkItem[]): string[] {
  const sorted = [...items].sort((a, b) => compareNames(a.name, b.name))
  return sorted.map(item => item.id)
}

/**
 * 按点击次数排序（降序）
 * 相同点击数按拼音字母排序，零点击的排在最后
 * 
 * @param items 书签列表（需要包含 url）
 * @param clickCounts siteId -> clickCount 映射
 * @param urlToSiteId URL 转 siteId 的函数
 * @returns 排序后的 ID 列表
 */
export function sortByClickCount(
  items: BookmarkItemWithUrl[],
  clickCounts: Record<string, number>,
  urlToSiteId: (url: string) => string | null
): string[] {
  const sorted = [...items].sort((a, b) => {
    // 获取点击次数
    const siteIdA = a.url ? urlToSiteId(a.url) : null
    const siteIdB = b.url ? urlToSiteId(b.url) : null
    const countA = siteIdA ? (clickCounts[siteIdA] ?? 0) : 0
    const countB = siteIdB ? (clickCounts[siteIdB] ?? 0) : 0
    
    // 零点击的排在最后
    if (countA === 0 && countB > 0) return 1
    if (countB === 0 && countA > 0) return -1
    
    // 点击数降序
    if (countA !== countB) return countB - countA
    
    // 相同点击数按拼音排序
    return compareNames(a.name, b.name)
  })
  
  return sorted.map(item => item.id)
}

/**
 * 书签项（带标签，用于标签排序）
 */
export interface BookmarkItemWithTags extends BookmarkItem {
  tags?: string[]
}

/**
 * 按标签分类排序
 * - 标签间按标签名 A-Z 排序
 * - 标签内按书签名 A-Z 排序
 * - 无标签的书签排在最后
 * - 多标签书签只按第一个标签分组
 * 
 * @param items 书签列表（需要包含 tags）
 * @returns 排序后的 ID 列表
 */
export function sortByTag(items: BookmarkItemWithTags[]): string[] {
  // 分组：按第一个标签分组
  const tagGroups = new Map<string, BookmarkItemWithTags[]>()
  const noTagItems: BookmarkItemWithTags[] = []
  
  for (const item of items) {
    const tags = item.tags ?? []
    if (tags.length === 0) {
      noTagItems.push(item)
    } else {
      // 使用第一个标签作为分组依据
      const firstTag = tags[0]
      if (!tagGroups.has(firstTag)) {
        tagGroups.set(firstTag, [])
      }
      tagGroups.get(firstTag)!.push(item)
    }
  }
  
  // 标签名按 A-Z 排序
  const sortedTags = Array.from(tagGroups.keys()).sort((a, b) => compareNames(a, b))
  
  // 构建结果：每个标签组内按书签名 A-Z 排序
  const result: string[] = []
  
  for (const tag of sortedTags) {
    const groupItems = tagGroups.get(tag)!
    // 组内按名称 A-Z 排序
    groupItems.sort((a, b) => compareNames(a.name, b.name))
    result.push(...groupItems.map(item => item.id))
  }
  
  // 无标签的排在最后，按名称 A-Z 排序
  noTagItems.sort((a, b) => compareNames(a.name, b.name))
  result.push(...noTagItems.map(item => item.id))
  
  return result
}

/**
 * 应用排序模式
 * @param items 书签列表
 * @param customOrder 自定义顺序
 * @param mode 排序模式
 * @param options 可选参数（用于 click-count 模式）
 * @returns 排序后的 ID 列表
 */
export function applySortMode(
  items: BookmarkItem[],
  customOrder: string[],
  mode: SortMode,
  options?: {
    clickCounts?: Record<string, number>
    urlToSiteId?: (url: string) => string | null
    itemsWithUrl?: BookmarkItemWithUrl[]
    itemsWithTags?: BookmarkItemWithTags[]
  }
): string[] {
  if (items.length === 0) return []
  
  switch (mode) {
    case 'custom': {
      // 按自定义顺序，不在 customOrder 中的放最后
      const orderMap = new Map<string, number>()
      customOrder.forEach((id, index) => orderMap.set(id, index))
      
      const itemIds = items.map(item => item.id)
      const sorted = [...itemIds].sort((a, b) => {
        const orderA = orderMap.get(a) ?? Infinity
        const orderB = orderMap.get(b) ?? Infinity
        return orderA - orderB
      })
      return sorted
    }
    
    case 'folders-first':
      return sortByType(items, customOrder, true)
    
    case 'links-first':
      return sortByType(items, customOrder, false)
    
    case 'alphabetical':
      return sortAlphabetically(items)
    
    case 'click-count': {
      // 需要 clickCounts 和 urlToSiteId
      if (!options?.clickCounts || !options?.urlToSiteId || !options?.itemsWithUrl) {
        // 如果没有提供必要参数，回退到字母排序
        return sortAlphabetically(items)
      }
      return sortByClickCount(options.itemsWithUrl, options.clickCounts, options.urlToSiteId)
    }
    
    case 'by-tag': {
      // 需要 itemsWithTags
      if (!options?.itemsWithTags) {
        // 如果没有提供必要参数，回退到字母排序
        return sortAlphabetically(items)
      }
      return sortByTag(options.itemsWithTags)
    }
    
    default:
      return items.map(item => item.id)
  }
}
