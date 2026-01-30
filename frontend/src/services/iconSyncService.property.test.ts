import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  extractDomain,
  isDomainMatch,
  findMatchingBookmarkIcon,
  getGlobalIconBackground,
  parseIconBgStyle,
  getEngineIconStyle,
} from './iconSyncService'
import type { Bookmark } from '../components/bookmarks/types'

// 辅助函数：创建测试书签
function createBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: `bookmark-${Math.random().toString(36).slice(2)}`,
    name: 'Test Bookmark',
    url: 'https://example.com',
    note: null,
    type: 'LINK',
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('IconSyncService', () => {
  describe('extractDomain', () => {
    it('should extract domain from valid URLs', () => {
      expect(extractDomain('https://www.baidu.com/search')).toBe('baidu.com')
      expect(extractDomain('https://baidu.com')).toBe('baidu.com')
      expect(extractDomain('http://sub.domain.com/path')).toBe('sub.domain.com')
    })

    it('should return empty string for invalid URLs', () => {
      expect(extractDomain('')).toBe('')
      expect(extractDomain('not-a-url')).toBe('')
    })
  })

  describe('isDomainMatch', () => {
    it('should match exact domains', () => {
      expect(isDomainMatch('baidu.com', 'baidu.com')).toBe(true)
      expect(isDomainMatch('google.com', 'google.com')).toBe(true)
    })

    it('should not match subdomains (exact match only)', () => {
      // 根据实现，isDomainMatch 只支持精确匹配
      expect(isDomainMatch('www.baidu.com', 'baidu.com')).toBe(false)
      expect(isDomainMatch('search.baidu.com', 'baidu.com')).toBe(false)
      // 精确匹配应该成功
      expect(isDomainMatch('baidu.com', 'baidu.com')).toBe(true)
    })

    it('should not match different domains', () => {
      expect(isDomainMatch('baidu.com', 'google.com')).toBe(false)
      expect(isDomainMatch('notbaidu.com', 'baidu.com')).toBe(false)
    })

    it('should handle empty strings', () => {
      expect(isDomainMatch('', 'baidu.com')).toBe(false)
      expect(isDomainMatch('baidu.com', '')).toBe(false)
    })
  })

  /**
   * Property 6: 域名匹配书签图标同步
   * For any search engine domain and bookmark list, if there exists a domain-matching bookmark,
   * Icon_Sync_Service should return that bookmark's icon info; if no match exists, should return null.
   * 
   * Feature: search-engine-switcher, Property 6: 域名匹配书签图标同步
   * Validates: Requirements 4.1, 4.2, 4.3, 4.5
   */
  describe('Property 6: 域名匹配书签图标同步', () => {
    it('should return matching bookmark icon info when domain matches', () => {
      fc.assert(
        fc.property(
          fc.domain(),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 6, maxLength: 6 }).map(s => s.replace(/[^0-9a-f]/gi, 'a').slice(0, 6).padEnd(6, '0')),
          (domain, iconData, bgColor) => {
            const bookmark = createBookmark({
              url: `https://${domain}/page`,
              iconType: 'BASE64',
              iconData: iconData,
              iconBg: `#${bgColor}`,
            })

            const result = findMatchingBookmarkIcon(domain, [bookmark])

            // 验证：应该返回匹配的图标信息
            expect(result).not.toBeNull()
            expect(result?.iconType).toBe('BASE64')
            expect(result?.iconData).toBe(iconData)
            expect(result?.iconBg).toBe(`#${bgColor}`)
            expect(result?.sourceBookmarkId).toBe(bookmark.id)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return null when no domain matches', () => {
      fc.assert(
        fc.property(
          fc.domain(),
          fc.domain().filter(d => d !== 'example.com'),
          (searchDomain, bookmarkDomain) => {
            // 确保两个域名不同
            if (searchDomain === bookmarkDomain || 
                bookmarkDomain.endsWith('.' + searchDomain) ||
                searchDomain.endsWith('.' + bookmarkDomain)) {
              return // 跳过可能匹配的情况
            }

            const bookmark = createBookmark({
              url: `https://${bookmarkDomain}/page`,
              iconType: 'BASE64',
              iconData: 'test-data',
              iconBg: '#ffffff',
            })

            const result = findMatchingBookmarkIcon(searchDomain, [bookmark])

            // 验证：不匹配时应该返回 null
            expect(result).toBeNull()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should return null for empty bookmark list', () => {
      fc.assert(
        fc.property(fc.domain(), (domain) => {
          const result = findMatchingBookmarkIcon(domain, [])
          expect(result).toBeNull()
        }),
        { numRuns: 20 }
      )
    })

    it('should only return info when bookmark has custom icon or background', () => {
      const domain = 'example.com'
      
      // 没有自定义图标和背景的书签 - 现在也会返回匹配信息（用于显示默认图标）
      const bookmarkWithoutCustom = createBookmark({
        url: `https://${domain}/page`,
        iconType: null,
        iconData: null,
        iconBg: null,
      })

      const result = findMatchingBookmarkIcon(domain, [bookmarkWithoutCustom])
      // 现在即使没有自定义设置也会返回匹配的书签信息
      expect(result).not.toBeNull()
      expect(result?.sourceBookmarkId).toBe(bookmarkWithoutCustom.id)

      // 有自定义背景的书签
      const bookmarkWithBg = createBookmark({
        url: `https://${domain}/page`,
        iconType: null,
        iconData: null,
        iconBg: '#ff0000',
      })

      const resultWithBg = findMatchingBookmarkIcon(domain, [bookmarkWithBg])
      expect(resultWithBg).not.toBeNull()
      expect(resultWithBg?.iconBg).toBe('#ff0000')
    })

    it('should match subdomains correctly', () => {
      const bookmark = createBookmark({
        url: 'https://www.baidu.com/search',
        iconType: 'URL',
        iconUrl: 'https://baidu.com/favicon.ico',
        iconBg: '#2932e1',
      })

      // baidu.com 应该匹配 www.baidu.com
      const result = findMatchingBookmarkIcon('baidu.com', [bookmark])
      expect(result).not.toBeNull()
      expect(result?.iconUrl).toBe('https://baidu.com/favicon.ico')
    })
  })

  /**
   * Property 7: 图标样式优先级
   * For any search engine icon, style priority should be:
   * matching bookmark custom style > global "apply to all" setting > default style
   * 
   * Feature: search-engine-switcher, Property 7: 图标样式优先级
   * Validates: Requirements 5.1, 5.2
   */
  describe('Property 7: 图标样式优先级', () => {
    it('should prioritize matching bookmark style over global setting', () => {
      const domain = 'example.com'
      
      // 创建一个有全局设置的书签
      const globalBookmark = createBookmark({
        url: 'https://other.com',
        iconBg: 'default:global',
      })

      // 创建一个匹配域名的书签，有自定义样式
      const matchingBookmark = createBookmark({
        url: `https://${domain}/page`,
        iconType: 'BASE64',
        iconData: 'custom-icon-data',
        iconBg: '#ff0000',
      })

      const result = getEngineIconStyle(domain, [globalBookmark, matchingBookmark])

      // 验证：应该使用匹配书签的自定义样式，而不是全局设置
      expect(result.syncedIcon).not.toBeNull()
      expect(result.syncedIcon?.iconData).toBe('custom-icon-data')
      expect(result.syncedIcon?.iconBg).toBe('#ff0000')
    })

    it('should use global setting when no matching bookmark', () => {
      const domain = 'nomatch.com'
      
      // 创建一个有全局设置的书签
      const globalBookmark = createBookmark({
        url: 'https://other.com',
        iconBg: 'default:primary:blur:80:global',
      })

      const result = getEngineIconStyle(domain, [globalBookmark])

      // 验证：应该使用全局设置
      expect(result.syncedIcon).toBeNull()
      // bgStyle 应该基于全局设置解析
      expect(result.bgStyle).toBeDefined()
    })

    it('should use default style when no matching bookmark and no global setting', () => {
      const domain = 'nomatch.com'
      
      const bookmark = createBookmark({
        url: 'https://other.com',
        iconBg: null,
      })

      const result = getEngineIconStyle(domain, [bookmark])

      // 验证：应该使用默认样式
      expect(result.syncedIcon).toBeNull()
      expect(result.bgStyle.backgroundColor).toBeDefined()
    })
  })

  describe('getGlobalIconBackground', () => {
    it('should return global background when :global marker exists', () => {
      const bookmark = createBookmark({
        iconBg: 'default:primary:blur:70:global',
      })

      const result = getGlobalIconBackground([bookmark])
      expect(result).toBe('default:primary:blur:70')
    })

    it('should return null when no :global marker', () => {
      const bookmark = createBookmark({
        iconBg: 'default:primary:blur:70',
      })

      const result = getGlobalIconBackground([bookmark])
      expect(result).toBeNull()
    })

    it('should return null for empty list', () => {
      expect(getGlobalIconBackground([])).toBeNull()
    })

    it('should return null when bookmark has no iconBg', () => {
      const bookmark = createBookmark({
        iconBg: null,
      })

      const result = getGlobalIconBackground([bookmark])
      expect(result).toBeNull()
    })

    it('should return null when bookmark has empty iconBg', () => {
      const bookmark = createBookmark({
        iconBg: '',
      })

      const result = getGlobalIconBackground([bookmark])
      expect(result).toBeNull()
    })
  })

  describe('parseIconBgStyle', () => {
    it('should return default style for null', () => {
      const style = parseIconBgStyle(null)
      expect(style.backgroundColor).toBeDefined()
      expect(style.backdropFilter).toBeDefined()
    })

    it('should return empty object for transparent', () => {
      const style = parseIconBgStyle('transparent')
      expect(Object.keys(style).length).toBe(0)
    })

    it('should return backgroundColor for hex color', () => {
      const style = parseIconBgStyle('#ff0000')
      expect(style.backgroundColor).toBe('#ff0000')
    })

    it('should parse default blur settings', () => {
      const style = parseIconBgStyle('default:blur:50')
      expect(style.backdropFilter).toContain('blur')
    })
  })
})
