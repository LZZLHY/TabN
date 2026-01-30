import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  buildSearchUrl,
  isValidCustomSearchUrl,
  isValidSearchUrl,
  SEARCH_ENGINE_URLS,
  SEARCH_ENGINE_NAMES,
  PRESET_SEARCH_ENGINES,
  buildSearchUrlFromConfig,
  getSearchEngineById,
  getAllSearchEngines,
  type SearchEngineConfig,
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
        { numRuns: 20 }
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
        { numRuns: 20 }
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
        { numRuns: 20 }
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

  /**
   * Property 9: 自定义搜索引擎 URL 验证
   * For any URL template string, if it doesn't contain {query} placeholder,
   * the validation function should return false; if it contains {query}, validation should pass.
   * 
   * Feature: search-engine-switcher, Property 9: 自定义搜索引擎 URL 验证
   * Validates: Requirements 6.4
   */
  describe('Property 9: 自定义搜索引擎 URL 验证', () => {
    it('should return false for any URL without {query} placeholder', () => {
      fc.assert(
        fc.property(
          // 生成不包含 {query} 的 URL
          fc.webUrl().filter(url => !url.includes('{query}')),
          (url) => {
            expect(isValidSearchUrl(url)).toBe(false)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should return true for any URL containing {query} placeholder', () => {
      fc.assert(
        fc.property(
          // 生成包含 {query} 的 URL
          fc.tuple(
            fc.webUrl(),
            fc.constantFrom('?q={query}', '&search={query}', '/{query}', '={query}')
          ).map(([url, suffix]) => url + suffix),
          (url) => {
            expect(isValidSearchUrl(url)).toBe(true)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should handle edge cases correctly', () => {
      // 空字符串
      expect(isValidSearchUrl('')).toBe(false)
      // null/undefined 类型安全
      expect(isValidSearchUrl(null as unknown as string)).toBe(false)
      expect(isValidSearchUrl(undefined as unknown as string)).toBe(false)
      // 只有 {query}
      expect(isValidSearchUrl('{query}')).toBe(true)
      // 多个 {query}
      expect(isValidSearchUrl('https://example.com/{query}?q={query}')).toBe(true)
    })

    it('should validate preset engines have valid URL templates', () => {
      // 所有预设引擎的 URL 模板都应该包含 {query}
      for (const engine of PRESET_SEARCH_ENGINES) {
        expect(isValidSearchUrl(engine.urlTemplate)).toBe(true)
      }
    })
  })

  describe('PRESET_SEARCH_ENGINES', () => {
    it('should have all required preset engines', () => {
      const engineIds = PRESET_SEARCH_ENGINES.map(e => e.id)
      expect(engineIds).toContain('baidu')
      expect(engineIds).toContain('bing')
      expect(engineIds).toContain('google')
      expect(engineIds).toContain('so') // 360搜索
    })

    it('should have valid URL templates for all preset engines', () => {
      for (const engine of PRESET_SEARCH_ENGINES) {
        expect(engine.urlTemplate).toContain('{query}')
        expect(engine.isPreset).toBe(true)
        expect(engine.domain).toBeTruthy()
        expect(engine.name).toBeTruthy()
      }
    })
  })

  describe('buildSearchUrlFromConfig', () => {
    it('should build correct URL from engine config', () => {
      const engine = PRESET_SEARCH_ENGINES.find(e => e.id === 'bing')!
      const url = buildSearchUrlFromConfig(engine, 'test query')
      expect(url).toContain('bing.com')
      expect(url).toContain(encodeURIComponent('test query'))
    })

    it('should return empty string for empty query', () => {
      const engine = PRESET_SEARCH_ENGINES[0]
      expect(buildSearchUrlFromConfig(engine, '')).toBe('')
      expect(buildSearchUrlFromConfig(engine, '   ')).toBe('')
    })
  })

  describe('getSearchEngineById', () => {
    it('should return preset engine by id', () => {
      const engine = getSearchEngineById('baidu')
      expect(engine.id).toBe('baidu')
      expect(engine.name).toBe('百度')
    })

    it('should return custom engine if exists', () => {
      const customEngines: SearchEngineConfig[] = [
        { id: 'custom1', name: 'Custom', urlTemplate: 'https://custom.com/{query}', domain: 'custom.com', isPreset: false }
      ]
      const engine = getSearchEngineById('custom1', customEngines)
      expect(engine.id).toBe('custom1')
    })

    it('should return bing as default for unknown id', () => {
      const engine = getSearchEngineById('unknown')
      expect(engine.id).toBe('bing')
    })
  })

  describe('getAllSearchEngines', () => {
    it('should return all preset engines when no custom engines', () => {
      const engines = getAllSearchEngines()
      expect(engines.length).toBe(PRESET_SEARCH_ENGINES.length)
    })

    it('should include custom engines', () => {
      const customEngines: SearchEngineConfig[] = [
        { id: 'custom1', name: 'Custom', urlTemplate: 'https://custom.com/{query}', domain: 'custom.com', isPreset: false }
      ]
      const engines = getAllSearchEngines(customEngines)
      expect(engines.length).toBe(PRESET_SEARCH_ENGINES.length + 1)
      expect(engines.find(e => e.id === 'custom1')).toBeTruthy()
    })
  })
})

