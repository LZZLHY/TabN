import type { Bookmark } from '../components/bookmarks/types'

/**
 * 从书签同步的图标信息
 */
export interface SyncedIconInfo {
  /** 图标类型 */
  iconType: 'BASE64' | 'URL' | 'TEXT' | null
  /** Base64 图标数据 */
  iconData: string | null
  /** 图标 URL */
  iconUrl: string | null
  /** 图标背景设置 */
  iconBg: string | null
  /** 来源书签 ID */
  sourceBookmarkId: string
}

/**
 * 从 URL 中提取域名
 * @param url 完整 URL
 * @returns 域名（不含 www 前缀）
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    let hostname = urlObj.hostname.toLowerCase()
    // 移除 www. 前缀
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4)
    }
    return hostname
  } catch {
    return ''
  }
}

/**
 * 检查两个域名是否匹配
 * 只支持精确匹配，不支持子域名匹配
 * pan.baidu.com 和 baidu.com 是不同的域名，不共用图标
 * @param bookmarkDomain 书签的域名（已去除 www 前缀）
 * @param engineDomain 搜索引擎的域名
 * @returns 是否匹配
 */
export function isDomainMatch(bookmarkDomain: string, engineDomain: string): boolean {
  if (!bookmarkDomain || !engineDomain) return false
  
  const normalizedBookmark = bookmarkDomain.toLowerCase()
  const normalizedEngine = engineDomain.toLowerCase()
  
  // 只支持精确匹配
  return normalizedBookmark === normalizedEngine
}

/**
 * 根据搜索引擎域名查找匹配的书签图标信息
 * @param engineDomain 搜索引擎域名（如 baidu.com）
 * @param bookmarks 用户书签列表
 * @returns 匹配的图标信息，未找到返回 null
 */
export function findMatchingBookmarkIcon(
  engineDomain: string,
  bookmarks: Bookmark[]
): SyncedIconInfo | null {
  if (!engineDomain || !bookmarks || bookmarks.length === 0) {
    return null
  }

  // 只查找 LINK 类型的书签
  const linkBookmarks = bookmarks.filter(b => b.type === 'LINK' && b.url)

  for (const bookmark of linkBookmarks) {
    const bookmarkDomain = extractDomain(bookmark.url!)
    
    if (isDomainMatch(bookmarkDomain, engineDomain)) {
      // 检查书签是否有任何自定义设置（图标或背景）
      const hasCustomIcon = (bookmark.iconType === 'BASE64' && bookmark.iconData) || 
                           (bookmark.iconType === 'URL' && bookmark.iconUrl) ||
                           bookmark.iconUrl  // 有些书签可能只有 iconUrl 没有 iconType
      const hasCustomBg = bookmark.iconBg !== null && bookmark.iconBg !== undefined && bookmark.iconBg !== ''
      
      // 只要有任何自定义设置就返回
      if (hasCustomIcon || hasCustomBg) {
        return {
          iconType: bookmark.iconType || null,
          iconData: bookmark.iconData || null,
          iconUrl: bookmark.iconUrl || null,
          iconBg: bookmark.iconBg || null,
          sourceBookmarkId: bookmark.id,
        }
      }
      
      // 即使没有自定义设置，也返回匹配的书签信息（用于显示默认图标）
      // 这样可以确保搜索引擎图标与书签页保持一致
      return {
        iconType: bookmark.iconType || null,
        iconData: bookmark.iconData || null,
        iconUrl: bookmark.iconUrl || null,
        iconBg: bookmark.iconBg || null,
        sourceBookmarkId: bookmark.id,
      }
    }
  }

  return null
}

/**
 * 获取全局图标背景设置
 * 只查找书签列表中是否有设置了"应用到全部"（:global 标记）的背景
 * @param bookmarks 用户书签列表
 * @returns 全局背景设置，未设置返回 null
 */
export function getGlobalIconBackground(bookmarks: Bookmark[]): string | null {
  if (!bookmarks || bookmarks.length === 0) {
    return null
  }

  // 只查找带有 :global 标记的 iconBg
  for (const bookmark of bookmarks) {
    if (bookmark.iconBg && bookmark.iconBg.includes(':global')) {
      // 返回去除 :global 标记后的背景设置
      return bookmark.iconBg.replace(':global', '')
    }
  }

  return null
}

/**
 * 解析图标背景样式
 * @param iconBg 图标背景设置字符串
 * @returns CSS 样式对象
 */
export function parseIconBgStyle(iconBg: string | null): React.CSSProperties {
  if (!iconBg) {
    // 默认毛玻璃背景
    return {
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      backdropFilter: 'blur(7px)',
      WebkitBackdropFilter: 'blur(7px)',
    }
  }

  // 透明背景
  if (iconBg === 'transparent') {
    return {}
  }

  // 自定义颜色背景
  if (iconBg.startsWith('#')) {
    return {
      backgroundColor: iconBg,
    }
  }

  // 毛玻璃背景（default 或 default:primary:blur:N 格式）
  if (iconBg.startsWith('default')) {
    const usePrimary = iconBg.includes('primary')
    const blurMatch = iconBg.match(/blur:(\d+)/)
    const blurIntensity = blurMatch ? parseInt(blurMatch[1]) : 70
    
    const blurPx = Math.round(blurIntensity / 10)
    const bgOpacity = blurIntensity / 100 * 0.7

    if (usePrimary) {
      // 主题色背景：使用 CSS 变量 --color-primary 并添加半透明白色叠加
      return {
        backgroundColor: `color-mix(in srgb, var(--color-primary) 20%, rgba(255, 255, 255, ${bgOpacity * 0.5}))`,
        backdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
        WebkitBackdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
      }
    } else {
      return {
        backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`,
        backdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
        WebkitBackdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
      }
    }
  }

  // 默认返回
  return {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(7px)',
    WebkitBackdropFilter: 'blur(7px)',
  }
}

/**
 * 获取搜索引擎图标的最终样式
 * 优先级：匹配书签的自定义样式 > 全局"应用到全部"设置 > 默认样式
 * @param engineDomain 搜索引擎域名
 * @param bookmarks 用户书签列表
 * @returns 图标样式信息
 */
export function getEngineIconStyle(
  engineDomain: string,
  bookmarks: Bookmark[]
): { syncedIcon: SyncedIconInfo | null; bgStyle: React.CSSProperties } {
  // 1. 首先尝试匹配书签的自定义样式
  const syncedIcon = findMatchingBookmarkIcon(engineDomain, bookmarks)
  
  if (syncedIcon) {
    return {
      syncedIcon,
      bgStyle: parseIconBgStyle(syncedIcon.iconBg),
    }
  }

  // 2. 尝试获取全局背景设置
  const globalBg = getGlobalIconBackground(bookmarks)
  
  if (globalBg) {
    return {
      syncedIcon: null,
      bgStyle: parseIconBgStyle(globalBg),
    }
  }

  // 3. 使用默认样式
  return {
    syncedIcon: null,
    bgStyle: parseIconBgStyle(null),
  }
}
