import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { keyboardNavigationUtils } from './useKeyboardNavigation'

const { getNextIndex, getPrevIndex } = keyboardNavigationUtils

describe('useKeyboardNavigation', () => {
  describe('getNextIndex', () => {
    it('should return 0 when current is -1', () => {
      expect(getNextIndex(-1, 5)).toBe(0)
    })

    it('should increment index', () => {
      expect(getNextIndex(0, 5)).toBe(1)
      expect(getNextIndex(1, 5)).toBe(2)
      expect(getNextIndex(3, 5)).toBe(4)
    })

    it('should wrap to 0 at end', () => {
      expect(getNextIndex(4, 5)).toBe(0)
    })

    it('should return -1 for empty list', () => {
      expect(getNextIndex(0, 0)).toBe(-1)
      expect(getNextIndex(-1, 0)).toBe(-1)
    })
  })

  describe('getPrevIndex', () => {
    it('should return last index when current is -1', () => {
      expect(getPrevIndex(-1, 5)).toBe(4)
    })

    it('should decrement index', () => {
      expect(getPrevIndex(4, 5)).toBe(3)
      expect(getPrevIndex(3, 5)).toBe(2)
      expect(getPrevIndex(1, 5)).toBe(0)
    })

    it('should wrap to last at beginning', () => {
      expect(getPrevIndex(0, 5)).toBe(4)
    })

    it('should return -1 for empty list', () => {
      expect(getPrevIndex(0, 0)).toBe(-1)
      expect(getPrevIndex(-1, 0)).toBe(-1)
    })
  })

  /**
   * Property 9: Keyboard navigation wraps at boundaries
   * For any list of N items, navigating down from index N-1 should result in index 0,
   * and navigating up from index 0 should result in index N-1.
   * 
   * Feature: search-box-enhancement, Property 9: Keyboard navigation wraps at boundaries
   * Validates: Requirements 6.5, 6.6
   */
  describe('Property 9: Keyboard navigation wraps at boundaries', () => {
    it('should wrap from last to first when navigating down', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (total) => {
            const lastIndex = total - 1
            const nextIndex = getNextIndex(lastIndex, total)
            
            // 验证：从最后一个向下导航应该回到第一个
            expect(nextIndex).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should wrap from first to last when navigating up', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (total) => {
            const prevIndex = getPrevIndex(0, total)
            
            // 验证：从第一个向上导航应该回到最后一个
            expect(prevIndex).toBe(total - 1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain valid index range', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 99 }),
          fc.integer({ min: 1, max: 100 }),
          (current, total) => {
            // 确保 current 在有效范围内
            const validCurrent = current % total
            
            const nextIndex = getNextIndex(validCurrent, total)
            const prevIndex = getPrevIndex(validCurrent, total)
            
            // 验证：结果索引应该在有效范围内
            expect(nextIndex).toBeGreaterThanOrEqual(0)
            expect(nextIndex).toBeLessThan(total)
            expect(prevIndex).toBeGreaterThanOrEqual(0)
            expect(prevIndex).toBeLessThan(total)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be inverse operations (next then prev returns to original)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 99 }),
          fc.integer({ min: 1, max: 100 }),
          (current, total) => {
            // 确保 current 在有效范围内
            const validCurrent = current % total
            
            // next 然后 prev 应该回到原位
            const afterNext = getNextIndex(validCurrent, total)
            const backToCurrent = getPrevIndex(afterNext, total)
            
            expect(backToCurrent).toBe(validCurrent)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should be inverse operations (prev then next returns to original)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 99 }),
          fc.integer({ min: 1, max: 100 }),
          (current, total) => {
            // 确保 current 在有效范围内
            const validCurrent = current % total
            
            // prev 然后 next 应该回到原位
            const afterPrev = getPrevIndex(validCurrent, total)
            const backToCurrent = getNextIndex(afterPrev, total)
            
            expect(backToCurrent).toBe(validCurrent)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Edge cases', () => {
    it('should handle single item list', () => {
      // 单项列表，无论怎么导航都是 0
      expect(getNextIndex(0, 1)).toBe(0)
      expect(getPrevIndex(0, 1)).toBe(0)
      expect(getNextIndex(-1, 1)).toBe(0)
      expect(getPrevIndex(-1, 1)).toBe(0)
    })

    it('should handle two item list', () => {
      // 两项列表，来回切换
      expect(getNextIndex(0, 2)).toBe(1)
      expect(getNextIndex(1, 2)).toBe(0)
      expect(getPrevIndex(0, 2)).toBe(1)
      expect(getPrevIndex(1, 2)).toBe(0)
    })

    it('should start from 0 when current is -1 and navigating down', () => {
      expect(getNextIndex(-1, 5)).toBe(0)
      expect(getNextIndex(-1, 10)).toBe(0)
    })

    it('should start from last when current is -1 and navigating up', () => {
      expect(getPrevIndex(-1, 5)).toBe(4)
      expect(getPrevIndex(-1, 10)).toBe(9)
    })
  })
})
