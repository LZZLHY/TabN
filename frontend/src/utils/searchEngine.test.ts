import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  buildSearchUrl,
  isValidCustomSearchUrl,
  SEARCH_ENGINE_URLS,
  SEARCH_ENGINE_NAMES,
} from './searchEngine'
import type { SearchEngine } from '../stores/appearance'

describe('searchEngine', () => {
  describe('SEARCH_ENGINE_URLS', () => {
    it('should have URLs for all engines', () => {
      expect(SEARCH_ENGINE_URLS.baidu).toContain('baidu.com')
      expect(SEARCH_ENGINE_URLS.bing).toContain('bing.com')
      expect(SEARCH_ENGINE_URLS.google).toContain('google.com')
      expect(SEARCH_ENGINE_URLS.custom).toBe('')
    })

    it('should have {query} placeholder in all non-custom URLs', () => {
      expect(SEARCH_ENGINE_URLS.baidu).toContain('{query}')
      expect(SEARCH_ENGINE_URLS.bing).toContain('{query}')
      expect(SEARCH_ENGINE_URLS.google).toContain('{query}')
    })
  })

  describe('SEARCH_ENGINE_NAMES', () => {
    it('should have names for all engines', () => {
      expect(SEARCH_ENGINE_NAMES.baidu).toBe('百度')
      expect(SEARCH_ENGINE_NAMES.bing).toBe('必应')
      expect(SEARCH_ENGINE_NAMES.google).toBe('谷歌')
      expect(SEARCH_ENGINE_NAMES.custom).toBe('自定义')
    })
  })

  /**
   * Property 4: Search engine URL generation
   * For any selected search engine and any search query, the generated search URL
   * should correctly incorporate the query using the engine's URL template.
   * 
   * Feature: search-box-enhancement, Property 4: Search engine URL generation
   * Validates: Requirements 3.2, 3.4
   */
  describe('Property 4: Search engine URL generation', () => {
    const engines: SearchEngine[] = ['baidu', 'bing', 'google']

    it('should generate correct URL for each engine', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...engines),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (engine, query) => {
            const trimmed = query.trim()
            const url = buildSearchUrl(engine, trimmed)
            const encodedQuery = encodeURIComponent(trimmed)

            // 验证：URL 应该包含编码后的查询
            expect(url).toContain(encodedQuery)

            // 验证：URL 应该是有效的
            expect(() => new URL(url)).not.toThrow()

            // 验证：URL 应该使用正确的搜索引擎域名
            const urlObj = new URL(url)
            if (engine === 'baidu') {
              expect(urlObj.hostname).toContain('baidu.com')
            } else if (engine === 'bing') {
              expect(urlObj.hostname).toContain('bing.com')
            } else if (engine === 'google') {
              expect(urlObj.hostname).toContain('google.com')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly encode special characters', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...engines),
          fc.string({ minLength: 1, maxLength: 50 }),
          (engine, query) => {
            const trimmed = query.trim()
            if (!trimmed) return

            const url = buildSearchUrl(engine, trimmed)
            const encodedQuery = encodeURIComponent(trimmed)

            // 验证：URL 应该包含正确编码的查询
            expect(url).toContain(encodedQuery)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle custom search URL with {query} placeholder', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (query) => {
            const customUrl = 'https://custom.search.com/search?q={query}'
            const trimmed = query.trim()
            const url = buildSearchUrl('custom', trimmed, customUrl)
            const encodedQuery = encodeURIComponent(trimmed)

            // 验证：URL 应该包含编码后的查询
            expect(url).toContain(encodedQuery)

            // 验证：URL 应该使用自定义域名
            expect(url).toContain('custom.search.com')

            // 验证：{query} 占位符应该被替换
            expect(url).not.toContain('{query}')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should fallback to bing when custom URL is empty', () => {
      const url = buildSearchUrl('custom', 'test', '')
      expect(url).toContain('bing.com')
    })

    it('should fallback to bing when custom URL is undefined', () => {
      const url = buildSearchUrl('custom', 'test')
      expect(url).toContain('bing.com')
    })
  })

  describe('buildSearchUrl', () => {
    it('should return empty string for empty query', () => {
      expect(buildSearchUrl('bing', '')).toBe('')
      expect(buildSearchUrl('bing', '   ')).toBe('')
    })

    it('should trim query before encoding', () => {
      const url = buildSearchUrl('bing', '  test  ')
      expect(url).toContain('q=test')
      expect(url).not.toContain('q=%20')
    })

    it('should encode Chinese characters', () => {
      const url = buildSearchUrl('baidu', '测试')
      expect(url).toContain(encodeURIComponent('测试'))
    })

    it('should encode special URL characters', () => {
      const url = buildSearchUrl('bing', 'a&b=c')
      expect(url).toContain(encodeURIComponent('a&b=c'))
    })
  })

  describe('isValidCustomSearchUrl', () => {
    it('should return true for valid URL with {query}', () => {
      expect(isValidCustomSearchUrl('https://example.com/search?q={query}')).toBe(true)
      expect(isValidCustomSearchUrl('https://search.example.com/?query={query}')).toBe(true)
    })

    it('should return false for URL without {query}', () => {
      expect(isValidCustomSearchUrl('https://example.com/search')).toBe(false)
      expect(isValidCustomSearchUrl('https://example.com/search?q=')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isValidCustomSearchUrl('')).toBe(false)
      expect(isValidCustomSearchUrl('   ')).toBe(false)
    })

    it('should return false for invalid URL', () => {
      expect(isValidCustomSearchUrl('not-a-url{query}')).toBe(false)
      expect(isValidCustomSearchUrl('ftp://example.com/{query}')).toBe(true) // ftp is valid URL
    })

    it('should handle various valid URL formats', () => {
      expect(isValidCustomSearchUrl('http://localhost:3000/search?q={query}')).toBe(true)
      expect(isValidCustomSearchUrl('https://sub.domain.com/path/{query}/end')).toBe(true)
    })
  })
})
