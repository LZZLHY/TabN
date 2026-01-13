import type { SearchEngine } from '../stores/appearance'

/**
 * 搜索引擎 URL 模板
 * 使用 {query} 作为查询占位符
 */
export const SEARCH_ENGINE_URLS: Record<SearchEngine, string> = {
  baidu: 'https://www.baidu.com/s?wd={query}',
  bing: 'https://www.bing.com/search?q={query}',
  google: 'https://www.google.com/search?q={query}',
  custom: '', // 使用用户自定义 URL
}

/**
 * 搜索引擎显示名称
 */
export const SEARCH_ENGINE_NAMES: Record<SearchEngine, string> = {
  baidu: '百度',
  bing: '必应',
  google: '谷歌',
  custom: '自定义',
}

/**
 * 构建搜索 URL
 * @param engine 搜索引擎类型
 * @param query 搜索查询
 * @param customUrl 自定义搜索 URL 模板（仅当 engine 为 'custom' 时使用）
 * @returns 完整的搜索 URL
 */
export function buildSearchUrl(
  engine: SearchEngine,
  query: string,
  customUrl?: string
): string {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return ''

  // 对查询进行 URL 编码
  const encodedQuery = encodeURIComponent(trimmedQuery)

  let template: string

  if (engine === 'custom') {
    // 使用自定义 URL 模板
    template = customUrl?.trim() || ''
    if (!template) {
      // 如果没有自定义 URL，回退到必应
      template = SEARCH_ENGINE_URLS.bing
    }
  } else {
    template = SEARCH_ENGINE_URLS[engine]
  }

  // 替换占位符
  return template.replace('{query}', encodedQuery)
}

/**
 * 验证自定义搜索 URL 模板是否有效
 * @param url URL 模板
 * @returns 是否有效
 */
export function isValidCustomSearchUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false

  // 必须包含 {query} 占位符
  if (!trimmed.includes('{query}')) return false

  // 必须是有效的 URL 格式（替换占位符后）
  try {
    new URL(trimmed.replace('{query}', 'test'))
    return true
  } catch {
    return false
  }
}

/**
 * 执行搜索（在新标签页打开）
 * @param engine 搜索引擎类型
 * @param query 搜索查询
 * @param customUrl 自定义搜索 URL 模板
 */
export function executeSearch(
  engine: SearchEngine,
  query: string,
  customUrl?: string
): void {
  const url = buildSearchUrl(engine, query, customUrl)
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
