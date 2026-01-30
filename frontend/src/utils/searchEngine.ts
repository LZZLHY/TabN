import type { SearchEngine } from '../stores/appearance'

/**
 * 搜索引擎配置接口
 */
export interface SearchEngineConfig {
  /** 唯一标识符 */
  id: string
  /** 显示名称 */
  name: string
  /** 搜索 URL 模板，使用 {query} 作为占位符 */
  urlTemplate: string
  /** 引擎域名（用于图标匹配） */
  domain: string
  /** 自定义图标 URL（可选） */
  iconUrl?: string
  /** 是否为预设引擎（预设引擎不可删除） */
  isPreset: boolean
}

/**
 * 预设搜索引擎列表
 */
export const PRESET_SEARCH_ENGINES: SearchEngineConfig[] = [
  {
    id: 'baidu',
    name: '百度',
    urlTemplate: 'https://www.baidu.com/s?wd={query}',
    domain: 'baidu.com',
    isPreset: true,
  },
  {
    id: 'bing',
    name: '必应',
    urlTemplate: 'https://www.bing.com/search?q={query}',
    domain: 'bing.com',
    isPreset: true,
  },
  {
    id: 'google',
    name: 'Google',
    urlTemplate: 'https://www.google.com/search?q={query}',
    domain: 'google.com',
    isPreset: true,
  },
  {
    id: 'so',
    name: '360搜索',
    urlTemplate: 'https://www.so.com/s?q={query}',
    domain: 'so.com',
    isPreset: true,
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    urlTemplate: 'https://duckduckgo.com/?q={query}',
    domain: 'duckduckgo.com',
    isPreset: true,
  },
  {
    id: 'sogou',
    name: '搜狗',
    urlTemplate: 'https://www.sogou.com/web?query={query}',
    domain: 'sogou.com',
    isPreset: true,
  },
  {
    id: 'zhihu',
    name: '知乎',
    urlTemplate: 'https://www.zhihu.com/search?type=content&q={query}',
    domain: 'zhihu.com',
    isPreset: true,
  },
  {
    id: 'bilibili',
    name: '哔哩哔哩',
    urlTemplate: 'https://search.bilibili.com/all?keyword={query}',
    domain: 'bilibili.com',
    isPreset: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    urlTemplate: 'https://github.com/search?q={query}',
    domain: 'github.com',
    isPreset: true,
  },
  {
    id: 'taobao',
    name: '淘宝',
    urlTemplate: 'https://s.taobao.com/search?q={query}',
    domain: 'taobao.com',
    isPreset: true,
  },
  {
    id: 'jd',
    name: '京东',
    urlTemplate: 'https://search.jd.com/Search?keyword={query}',
    domain: 'jd.com',
    isPreset: true,
  },
  {
    id: 'douban',
    name: '豆瓣',
    urlTemplate: 'https://www.douban.com/search?q={query}',
    domain: 'douban.com',
    isPreset: true,
  },
  {
    id: 'weibo',
    name: '微博',
    urlTemplate: 'https://s.weibo.com/weibo?q={query}',
    domain: 'weibo.com',
    isPreset: true,
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    urlTemplate: 'https://www.xiaohongshu.com/search_result?keyword={query}',
    domain: 'xiaohongshu.com',
    isPreset: true,
  },
  {
    id: 'douyin',
    name: '抖音',
    urlTemplate: 'https://www.douyin.com/search/{query}',
    domain: 'douyin.com',
    isPreset: true,
  },
  {
    id: 'toutiao',
    name: '头条搜索',
    urlTemplate: 'https://so.toutiao.com/search?keyword={query}',
    domain: 'toutiao.com',
    isPreset: true,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    urlTemplate: 'https://www.youtube.com/results?search_query={query}',
    domain: 'youtube.com',
    isPreset: true,
  },
]

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
 * 验证搜索 URL 模板是否包含 {query} 占位符
 * @param url URL 模板
 * @returns 是否包含 {query}
 */
export function isValidSearchUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  return url.includes('{query}')
}

/**
 * 根据搜索引擎配置构建搜索 URL
 * @param engine 搜索引擎配置
 * @param query 搜索查询
 * @returns 完整的搜索 URL
 */
export function buildSearchUrlFromConfig(
  engine: SearchEngineConfig,
  query: string
): string {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return ''

  const encodedQuery = encodeURIComponent(trimmedQuery)
  return engine.urlTemplate.replace('{query}', encodedQuery)
}

/**
 * 根据 ID 获取搜索引擎配置
 * @param engineId 搜索引擎 ID
 * @param customEngines 自定义搜索引擎列表
 * @returns 搜索引擎配置，未找到返回默认引擎（必应）
 */
export function getSearchEngineById(
  engineId: string,
  customEngines: SearchEngineConfig[] = []
): SearchEngineConfig {
  // 先从预设引擎中查找
  const preset = PRESET_SEARCH_ENGINES.find(e => e.id === engineId)
  if (preset) return preset

  // 再从自定义引擎中查找
  const custom = customEngines.find(e => e.id === engineId)
  if (custom) return custom

  // 默认返回必应
  return PRESET_SEARCH_ENGINES.find(e => e.id === 'bing')!
}

/**
 * 获取所有搜索引擎（预设 + 自定义）
 * @param customEngines 自定义搜索引擎列表
 * @returns 所有搜索引擎配置
 */
export function getAllSearchEngines(
  customEngines: SearchEngineConfig[] = []
): SearchEngineConfig[] {
  return [...PRESET_SEARCH_ENGINES, ...customEngines]
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
