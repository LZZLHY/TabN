import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateProportionalRadius, DEFAULT_RADIUS_RATIO } from './iconRadius'

describe('IconRadius', () => {
  /**
   * Property 1: 圆角计算正确性
   * 
   * 对于任意有效的图标大小（正数）和圆角比例（0-0.5），
   * 计算结果应该等于 `size × ratio` 四舍五入到最近的 0.5px。
   * 
   * Feature: proportional-icon-radius, Property 1: 圆角计算正确性
   * **Validates: Requirements 1.1, 1.4**
   */
  describe('Property 1: 圆角计算正确性', () => {
    it('should calculate radius as size × ratio rounded to nearest 0.5px', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 200 }),
          fc.double({ min: 0, max: 0.5, noNaN: true }),
          (size, ratio) => {
            const result = calculateProportionalRadius(size, ratio)
            const rawRadius = size * ratio
            const expected = Math.round(rawRadius * 2) / 2

            // 验证：计算结果应该等于 size × ratio 四舍五入到最近的 0.5px
            expect(result).toBe(expected)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should always return a value that is a multiple of 0.5', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 200 }),
          fc.double({ min: 0, max: 0.5, noNaN: true }),
          (size, ratio) => {
            const result = calculateProportionalRadius(size, ratio)

            // 验证：结果应该是 0.5 的倍数
            expect(result * 2).toBe(Math.floor(result * 2))
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should return non-negative values for valid inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 200 }),
          fc.double({ min: 0, max: 0.5, noNaN: true }),
          (size, ratio) => {
            const result = calculateProportionalRadius(size, ratio)

            // 验证：结果应该是非负数
            expect(result).toBeGreaterThanOrEqual(0)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should return 0 when ratio is 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 200 }),
          (size) => {
            const result = calculateProportionalRadius(size, 0)

            // 验证：当比例为 0 时，圆角应该为 0
            expect(result).toBe(0)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should scale proportionally with size', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.double({ min: 0.01, max: 0.5, noNaN: true }),
          fc.integer({ min: 2, max: 10 }),
          (size, ratio, multiplier) => {
            const result1 = calculateProportionalRadius(size, ratio)
            const result2 = calculateProportionalRadius(size * multiplier, ratio)

            // 验证：当大小按倍数增加时，圆角也应该按相同倍数增加（考虑四舍五入误差）
            // 由于四舍五入，我们验证比例关系在合理范围内
            const expectedRatio = multiplier
            const actualRatio = result2 / result1

            // 允许因四舍五入产生的误差（最多 0.5px 的误差）
            if (result1 > 0) {
              const tolerance = (0.5 * multiplier) / result1
              expect(Math.abs(actualRatio - expectedRatio)).toBeLessThanOrEqual(tolerance + 0.01)
            }
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  /**
   * 验证需求 1.2 和 1.3 中的具体示例
   */
  describe('Specific examples from requirements', () => {
    it('should return 8px for 64px icon with 12.5% ratio (Requirement 1.2)', () => {
      const result = calculateProportionalRadius(64, 0.125)
      expect(result).toBe(8)
    })

    it('should return 4px for 32px icon with 12.5% ratio (Requirement 1.3)', () => {
      const result = calculateProportionalRadius(32, 0.125)
      expect(result).toBe(4)
    })

    it('should return 16px for 64px icon with 25% ratio (default)', () => {
      const result = calculateProportionalRadius(64, DEFAULT_RADIUS_RATIO)
      expect(result).toBe(16)
    })

    it('should return 1.5px for 6px icon with 25% ratio (rounding to 0.5px)', () => {
      const result = calculateProportionalRadius(6, 0.25)
      expect(result).toBe(1.5)
    })
  })

  /**
   * 边界值测试
   */
  describe('Edge cases', () => {
    it('should handle minimum size (1px)', () => {
      const result = calculateProportionalRadius(1, 0.5)
      expect(result).toBe(0.5)
    })

    it('should handle maximum ratio (0.5)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 200 }),
          (size) => {
            const result = calculateProportionalRadius(size, 0.5)
            const expected = Math.round((size * 0.5) * 2) / 2

            expect(result).toBe(expected)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle very small ratios', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 200 }),
          fc.double({ min: 0, max: 0.01, noNaN: true }),
          (size, ratio) => {
            const result = calculateProportionalRadius(size, ratio)
            const expected = Math.round((size * ratio) * 2) / 2

            expect(result).toBe(expected)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})

