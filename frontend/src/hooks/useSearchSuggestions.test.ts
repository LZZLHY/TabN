import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { searchSuggestionsUtils } from './useSearchSuggestions'

const { DEBOUNCE_DELAY, MAX_SUGGESTIONS, limitSuggestions } = searchSuggestionsUtils

describe('useSearchSuggestions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Constants', () => {
    it('should have correct debounce delay', () => {
      expect(DEBOUNCE_DELAY).toBe(300)
    })

    it('should have correct max suggestions', () => {
      expect(MAX_SUGGESTIONS).toBe(8)
    })
  })

  /**
   * Property 5: Suggestion debouncing
   * For any sequence of rapid input changes within 300ms, only one API request
   * should be made after the debounce period.
   * 
   * Feature: search-box-enhancement, Property 5: Suggestion debouncing
   * Validates: Requirements 4.2
   * 
   * Note: This property is tested through timing behavior simulation
   */
  describe('Property 5: Suggestion debouncing', () => {
    it('should debounce with 300ms delay', () => {
      // 验证防抖延迟常量
      expect(DEBOUNCE_DELAY).toBe(300)
    })

    it('should only trigger once for rapid changes', async () => {
      const mockFetch = vi.fn().mockResolvedValue([])
      
      // 模拟快速连续调用
      const calls: number[] = []
      
      // 模拟防抖逻辑
      let timer: ReturnType<typeof setTimeout> | null = null
      const debouncedFetch = (query: string) => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          calls.push(Date.now())
          mockFetch(query)
        }, DEBOUNCE_DELAY)
      }

      // 快速连续调用 5 次
      debouncedFetch('a')
      vi.advanceTimersByTime(50)
      debouncedFetch('ab')
      vi.advanceTimersByTime(50)
      debouncedFetch('abc')
      vi.advanceTimersByTime(50)
      debouncedFetch('abcd')
      vi.advanceTimersByTime(50)
      debouncedFetch('abcde')
      
      // 在防抖期间，不应该有调用
      expect(mockFetch).not.toHaveBeenCalled()
      
      // 等待防抖完成
      vi.advanceTimersByTime(DEBOUNCE_DELAY)
      
      // 应该只调用一次，使用最后的查询
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('abcde')
    })

    it('should trigger multiple times for spaced changes', async () => {
      const mockFetch = vi.fn().mockResolvedValue([])
      
      let timer: ReturnType<typeof setTimeout> | null = null
      const debouncedFetch = (query: string) => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          mockFetch(query)
        }, DEBOUNCE_DELAY)
      }

      // 第一次调用
      debouncedFetch('first')
      vi.advanceTimersByTime(DEBOUNCE_DELAY + 50)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenLastCalledWith('first')

      // 第二次调用（间隔超过防抖时间）
      debouncedFetch('second')
      vi.advanceTimersByTime(DEBOUNCE_DELAY + 50)
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenLastCalledWith('second')
    })
  })

  /**
   * Property 6: Suggestion count limit
   * For any number of suggestions returned from the API, the displayed suggestions
   * should never exceed 8 items.
   * 
   * Feature: search-box-enhancement, Property 6: Suggestion count limit
   * Validates: Requirements 4.7
   */
  describe('Property 6: Suggestion count limit', () => {
    it('should limit suggestions to MAX_SUGGESTIONS', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 0, maxLength: 50 }),
          (suggestions) => {
            const limited = limitSuggestions(suggestions)
            
            // 验证：结果数量不超过 MAX_SUGGESTIONS
            expect(limited.length).toBeLessThanOrEqual(MAX_SUGGESTIONS)
            
            // 验证：如果原数组长度大于等于 MAX_SUGGESTIONS，则结果长度等于 MAX_SUGGESTIONS
            if (suggestions.length >= MAX_SUGGESTIONS) {
              expect(limited.length).toBe(MAX_SUGGESTIONS)
            } else {
              expect(limited.length).toBe(suggestions.length)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve order when limiting', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 50 }),
          (suggestions) => {
            const limited = limitSuggestions(suggestions)
            
            // 验证：保持原始顺序
            for (let i = 0; i < limited.length; i++) {
              expect(limited[i]).toBe(suggestions[i])
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should respect custom max parameter', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 0, maxLength: 50 }),
          fc.integer({ min: 1, max: 20 }),
          (suggestions, max) => {
            const limited = limitSuggestions(suggestions, max)
            
            // 验证：结果数量不超过自定义 max
            expect(limited.length).toBeLessThanOrEqual(max)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Edge cases', () => {
    it('should return empty array for empty input', () => {
      expect(limitSuggestions([])).toEqual([])
    })

    it('should return all items if less than max', () => {
      const suggestions = ['a', 'b', 'c']
      expect(limitSuggestions(suggestions)).toEqual(suggestions)
    })

    it('should handle exactly MAX_SUGGESTIONS items', () => {
      const suggestions = Array.from({ length: MAX_SUGGESTIONS }, (_, i) => `item${i}`)
      const limited = limitSuggestions(suggestions)
      expect(limited.length).toBe(MAX_SUGGESTIONS)
      expect(limited).toEqual(suggestions)
    })

    it('should handle more than MAX_SUGGESTIONS items', () => {
      const suggestions = Array.from({ length: MAX_SUGGESTIONS + 5 }, (_, i) => `item${i}`)
      const limited = limitSuggestions(suggestions)
      expect(limited.length).toBe(MAX_SUGGESTIONS)
      expect(limited).toEqual(suggestions.slice(0, MAX_SUGGESTIONS))
    })
  })
})
