import { pinyin } from 'pinyin-pro'
import type { BookmarkItem, SortMode } from '../types/bookmark'

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
 * 应用排序模式
 * @param items 书签列表
 * @param customOrder 自定义顺序
 * @param mode 排序模式
 * @returns 排序后的 ID 列表
 */
export function applySortMode(
  items: BookmarkItem[],
  customOrder: string[],
  mode: SortMode
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
    
    default:
      return items.map(item => item.id)
  }
}
