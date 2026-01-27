/**
 * 图标来源工具函数
 * 用于解析和生成不同来源的 favicon URL
 */

export type IconSourceType = 'auto' | 'google' | 'duckduckgo' | 'iconhorse' | 'custom'

/**
 * 图标来源配置
 */
export const ICON_SOURCES: Record<IconSourceType, {
  label: string
  description: string
  getUrl: (domain: string) => string
}> = {
  auto: {
    label: '自动',
    description: '自动竞速获取（DuckDuckGo → Google → Icon Horse）',
    getUrl: () => '', // auto 模式使用竞速，不直接返回 URL
  },
  google: {
    label: 'Google',
    description: 'Google Favicon 服务',
    getUrl: (domain) => `https://www.google.com/s2/favicons?sz=64&domain=${domain}`,
  },
  duckduckgo: {
    label: 'DuckDuckGo',
    description: 'DuckDuckGo 图标服务',
    getUrl: (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  },
  iconhorse: {
    label: 'Icon Horse',
    description: 'Icon Horse 高清图标',
    getUrl: (domain) => `https://icon.horse/icon/${domain}`,
  },
  custom: {
    label: '自定义',
    description: '使用自定义图标 URL',
    getUrl: () => '', // 自定义时直接使用 iconUrl
  },
}

/**
 * 从 iconUrl 解析图标来源类型
 */
export function parseIconSource(iconUrl: string | null | undefined): {
  source: IconSourceType
  customUrl: string
} {
  if (!iconUrl || iconUrl.trim() === '') {
    return { source: 'auto', customUrl: '' }
  }

  const trimmed = iconUrl.trim()

  // 检查是否是来源标记
  if (trimmed.startsWith('source:')) {
    const sourceKey = trimmed.slice(7) as IconSourceType
    if (sourceKey in ICON_SOURCES && sourceKey !== 'custom') {
      return { source: sourceKey, customUrl: '' }
    }
  }

  // 否则视为自定义 URL
  return { source: 'custom', customUrl: trimmed }
}

/**
 * 将图标来源转换为存储格式
 */
export function serializeIconSource(source: IconSourceType, customUrl: string): string | null {
  if (source === 'auto') {
    return null // 自动模式不需要存储
  }
  if (source === 'custom') {
    return customUrl.trim() || null
  }
  return `source:${source}`
}

/**
 * 根据图标来源和网址获取实际的图标 URL
 */
export function getIconUrl(bookmarkUrl: string | null, iconUrl: string | null | undefined): string {
  if (!bookmarkUrl) return ''

  const { source, customUrl } = parseIconSource(iconUrl)

  if (source === 'custom' && customUrl) {
    return customUrl
  }

  // 从书签 URL 提取域名
  try {
    const url = new URL(bookmarkUrl)
    const domain = url.hostname
    return ICON_SOURCES[source].getUrl(domain)
  } catch {
    return ''
  }
}

/**
 * 获取所有可用的图标来源选项
 */
export function getIconSourceOptions(): Array<{
  value: IconSourceType
  label: string
  description: string
}> {
  return Object.entries(ICON_SOURCES).map(([key, config]) => ({
    value: key as IconSourceType,
    label: config.label,
    description: config.description,
  }))
}

/**
 * 根据书签 URL 获取所有来源的预览图标
 * 注意：auto 模式使用 DuckDuckGo 作为预览（因为它是竞速的第一个来源）
 */
export function getIconPreviews(bookmarkUrl: string | null): Array<{
  source: IconSourceType
  label: string
  url: string
}> {
  if (!bookmarkUrl) return []

  try {
    const url = new URL(bookmarkUrl)
    const domain = url.hostname

    return Object.entries(ICON_SOURCES)
      .filter(([key]) => key !== 'custom')
      .map(([key, config]) => {
        // auto 模式使用 DuckDuckGo 作为预览（竞速的第一个来源）
        const previewUrl = key === 'auto' 
          ? ICON_SOURCES.duckduckgo.getUrl(domain)
          : config.getUrl(domain)
        return {
          source: key as IconSourceType,
          label: config.label,
          url: previewUrl,
        }
      })
  } catch {
    return []
  }
}
