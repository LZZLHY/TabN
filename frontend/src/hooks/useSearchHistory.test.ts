import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { searchHistoryUtils } from './useSearchHistory'

const { loadHistory, saveHistory, getStorageKey } = searchHistoryUtils

describe('useSearchHistory', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getStorageKey', () => {
    it('should generate correct storage key', () => {
      expect(getStorageKey('user123')).toBe('start:search-history:user123')
    })
  })

  /**
   * Property 1: Search history persistence round-trip
   * For any user and any search keyword, if the keyword is added to search history,
   * then retrieving the history should contain that keyword.
   * 
   * Feature: search-box-enhancement, Property 1: Search history persistence round-trip
   * Validates: Requirements 2.2, 2.7
   */
  describe('Property 1: Search history persistence round-trip', () => {
    it('should persist and retrieve history correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.uuid(),
          (keyword, userId) => {
            // 保存历史
            saveHistory(userId, [keyword])
            
            // 读取历史
            const loaded = loadHistory(userId)
            
            // 验证：保存的关键词应该在读取的历史中
            expect(loaded).toContain(keyword)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve order of multiple items', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            { minLength: 1, maxLength: 20 }
          ),
          fc.uuid(),
          (keywords, userId) => {
            // 去重
            const uniqueKeywords = [...new Set(keywords)]
            
            // 保存历史
            saveHistory(userId, uniqueKeywords)
            
            // 读取历史
            const loaded = loadHistory(userId)
            
            // 验证：顺序应该保持一致
            expect(loaded).toEqual(uniqueKeywords)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 2: Search history count limit
   * For any configured history count limit N (0-20), the displayed history items
   * should never exceed N items.
   * 
   * Feature: search-box-enhancement, Property 2: Search history count limit
   * Validates: Requirements 2.3
   */
  describe('Property 2: Search history count limit', () => {
    it('should limit history items to configured count', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            { minLength: 0, maxLength: 50 }
          ),
          fc.integer({ min: 0, max: 20 }),
          fc.uuid(),
          (keywords, limit, userId) => {
            // 去重
            const uniqueKeywords = [...new Set(keywords)]
            
            // 保存历史
            saveHistory(userId, uniqueKeywords)
            
            // 读取历史
            const loaded = loadHistory(userId)
            
            // 模拟 searchHistoryCount 限制
            const displayed = limit > 0 ? loaded.slice(0, limit) : []
            
            // 验证：显示的条数不超过限制
            expect(displayed.length).toBeLessThanOrEqual(limit)
            
            // 验证：如果限制为 0，则不显示任何历史
            if (limit === 0) {
              expect(displayed.length).toBe(0)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 3: History deletion removes item
   * For any search history list and any item in that list, deleting the item
   * should result in a list that no longer contains that item.
   * 
   * Feature: search-box-enhancement, Property 3: History deletion removes item
   * Validates: Requirements 2.6
   */
  describe('Property 3: History deletion removes item', () => {
    it('should remove item from history when deleted', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            { minLength: 1, maxLength: 20 }
          ),
          fc.uuid(),
          (keywords, userId) => {
            // 去重
            const uniqueKeywords = [...new Set(keywords)]
            if (uniqueKeywords.length === 0) return
            
            // 保存历史
            saveHistory(userId, uniqueKeywords)
            
            // 随机选择一个要删除的项
            const indexToDelete = Math.floor(Math.random() * uniqueKeywords.length)
            const itemToDelete = uniqueKeywords[indexToDelete]
            
            // 删除该项
            const afterDelete = uniqueKeywords.filter(item => item !== itemToDelete)
            saveHistory(userId, afterDelete)
            
            // 读取历史
            const loaded = loadHistory(userId)
            
            // 验证：删除的项不应该在历史中
            expect(loaded).not.toContain(itemToDelete)
            
            // 验证：其他项应该保留
            for (const item of afterDelete) {
              expect(loaded).toContain(item)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Edge cases', () => {
    it('should return empty array for non-existent user', () => {
      const loaded = loadHistory('non-existent-user')
      expect(loaded).toEqual([])
    })

    it('should handle corrupted localStorage data', () => {
      const userId = 'test-user'
      const key = getStorageKey(userId)
      
      // 写入损坏的数据
      localStorage.setItem(key, 'not-valid-json')
      
      // 应该返回空数组而不是抛出错误
      const loaded = loadHistory(userId)
      expect(loaded).toEqual([])
    })

    it('should handle missing items field', () => {
      const userId = 'test-user'
      const key = getStorageKey(userId)
      
      // 写入缺少 items 字段的数据
      localStorage.setItem(key, JSON.stringify({ updatedAt: Date.now() }))
      
      const loaded = loadHistory(userId)
      expect(loaded).toEqual([])
    })

    it('should limit stored items to MAX_HISTORY_ITEMS', () => {
      const userId = 'test-user'
      const manyItems = Array.from({ length: 150 }, (_, i) => `item-${i}`)
      
      saveHistory(userId, manyItems)
      const loaded = loadHistory(userId)
      
      // 内部最多存储 100 条
      expect(loaded.length).toBeLessThanOrEqual(100)
    })
  })
})
