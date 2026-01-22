/**
 * 时长格式化属性测试
 * Property 6: 时长格式化正确性
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3**
 * 
 * 对于任意毫秒数 ms：
 * - 当 ms < 3600000（1小时）时，格式应为 "X分钟 Y秒"
 * - 当 3600000 <= ms < 86400000（1天）时，格式应为 "X小时 Y分钟 Z秒"
 * - 当 ms >= 86400000 时，格式应为 "X天 Y小时 Z分钟"
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { formatUptime } from './formatUptime'

const MS_PER_SECOND = 1000
const MS_PER_MINUTE = 60 * MS_PER_SECOND
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR

describe('formatUptime Property Tests', () => {
  /**
   * Property 6: 时长格式化正确性
   * **Validates: Requirements 4.1, 4.2, 4.3**
   */
  describe('Property 6: 时长格式化正确性', () => {
    /**
     * Test: Format for < 1 hour should be "X分钟 Y秒"
     * **Validates: Requirement 4.1**
     */
    it('should format as "X分钟 Y秒" when ms < 1 hour', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: MS_PER_HOUR - 1 }),
          (ms) => {
            const result = formatUptime(ms)
            
            // Should match pattern "X分钟 Y秒"
            const pattern = /^(\d+)分钟 (\d+)秒$/
            expect(result).toMatch(pattern)
            
            // Verify values are correct
            const match = result.match(pattern)
            if (match) {
              const minutes = parseInt(match[1], 10)
              const seconds = parseInt(match[2], 10)
              
              const expectedMinutes = Math.floor(ms / MS_PER_MINUTE)
              const expectedSeconds = Math.floor(ms / MS_PER_SECOND) % 60
              
              expect(minutes).toBe(expectedMinutes)
              expect(seconds).toBe(expectedSeconds)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Test: Format for >= 1 hour and < 1 day should be "X小时 Y分钟 Z秒"
     * **Validates: Requirement 4.2**
     */
    it('should format as "X小时 Y分钟 Z秒" when 1 hour <= ms < 1 day', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: MS_PER_HOUR, max: MS_PER_DAY - 1 }),
          (ms) => {
            const result = formatUptime(ms)
            
            // Should match pattern "X小时 Y分钟 Z秒"
            const pattern = /^(\d+)小时 (\d+)分钟 (\d+)秒$/
            expect(result).toMatch(pattern)
            
            // Verify values are correct
            const match = result.match(pattern)
            if (match) {
              const hours = parseInt(match[1], 10)
              const minutes = parseInt(match[2], 10)
              const seconds = parseInt(match[3], 10)
              
              const expectedHours = Math.floor(ms / MS_PER_HOUR)
              const expectedMinutes = Math.floor(ms / MS_PER_MINUTE) % 60
              const expectedSeconds = Math.floor(ms / MS_PER_SECOND) % 60
              
              expect(hours).toBe(expectedHours)
              expect(minutes).toBe(expectedMinutes)
              expect(seconds).toBe(expectedSeconds)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Test: Format for >= 1 day should be "X天 Y小时 Z分钟"
     * **Validates: Requirement 4.3**
     */
    it('should format as "X天 Y小时 Z分钟" when ms >= 1 day', () => {
      fc.assert(
        fc.property(
          // Generate values from 1 day to 365 days
          fc.integer({ min: MS_PER_DAY, max: 365 * MS_PER_DAY }),
          (ms) => {
            const result = formatUptime(ms)
            
            // Should match pattern "X天 Y小时 Z分钟"
            const pattern = /^(\d+)天 (\d+)小时 (\d+)分钟$/
            expect(result).toMatch(pattern)
            
            // Verify values are correct
            const match = result.match(pattern)
            if (match) {
              const days = parseInt(match[1], 10)
              const hours = parseInt(match[2], 10)
              const minutes = parseInt(match[3], 10)
              
              const expectedDays = Math.floor(ms / MS_PER_DAY)
              const expectedHours = Math.floor(ms / MS_PER_HOUR) % 24
              const expectedMinutes = Math.floor(ms / MS_PER_MINUTE) % 60
              
              expect(days).toBe(expectedDays)
              expect(hours).toBe(expectedHours)
              expect(minutes).toBe(expectedMinutes)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Test: Boundary values
     */
    it('should handle boundary values correctly', () => {
      // 0 ms
      expect(formatUptime(0)).toBe('0分钟 0秒')
      
      // Exactly 1 minute
      expect(formatUptime(MS_PER_MINUTE)).toBe('1分钟 0秒')
      
      // Just under 1 hour
      expect(formatUptime(MS_PER_HOUR - 1)).toBe('59分钟 59秒')
      
      // Exactly 1 hour
      expect(formatUptime(MS_PER_HOUR)).toBe('1小时 0分钟 0秒')
      
      // Just under 1 day
      expect(formatUptime(MS_PER_DAY - 1)).toBe('23小时 59分钟 59秒')
      
      // Exactly 1 day
      expect(formatUptime(MS_PER_DAY)).toBe('1天 0小时 0分钟')
    })

    /**
     * Test: Edge cases
     */
    it('should handle edge cases', () => {
      // Negative values should be treated as 0
      expect(formatUptime(-1000)).toBe('0分钟 0秒')
      
      // NaN should be treated as 0
      expect(formatUptime(NaN)).toBe('0分钟 0秒')
      
      // Infinity should be treated as 0
      expect(formatUptime(Infinity)).toBe('0分钟 0秒')
    })
  })
})
