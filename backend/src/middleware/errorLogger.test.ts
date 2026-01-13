/**
 * 错误日志中间件属性测试
 * Property 6: Error Deduplication
 * Validates: Requirements 3.5
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import {
  computeErrorHash,
  categorizeError,
  isDuplicateError,
  getErrorCount,
  clearErrorCache,
} from './errorLogger'
import { ErrorCategory } from '../types/logger'

describe('Error Logger Middleware', () => {
  beforeEach(() => {
    clearErrorCache()
  })

  /**
   * Property 6: Error Deduplication
   * For any sequence of identical errors within the deduplication window,
   * only the first error SHALL be logged, subsequent duplicates SHALL be
   * counted but not logged separately.
   * Validates: Requirements 3.5
   */
  describe('Property 6: Error Deduplication', () => {
    it('should identify duplicate errors correctly', () => {
      fc.assert(
        fc.property(
          // 生成随机错误消息
          fc.string({ minLength: 1, maxLength: 100 }),
          // 生成重复次数
          fc.integer({ min: 2, max: 20 }),
          (message, repeatCount) => {
            clearErrorCache()
            
            const error = new Error(message)
            const errorHash = computeErrorHash(error)

            // 第一次不应该是重复
            const firstIsDuplicate = isDuplicateError(errorHash)
            expect(firstIsDuplicate).toBe(false)

            // 后续调用应该是重复
            for (let i = 1; i < repeatCount; i++) {
              const isDuplicate = isDuplicateError(errorHash)
              expect(isDuplicate).toBe(true)
            }

            // 计数应该等于重复次数
            expect(getErrorCount(errorHash)).toBe(repeatCount)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should generate consistent hash for same error instance', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (message) => {
            const error = new Error(message)

            // 同一个错误实例应该有相同的哈希
            const hash1 = computeErrorHash(error)
            const hash2 = computeErrorHash(error)

            expect(hash1).toBe(hash2)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate different hash for different errors', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.length > 0),
          (message1, message2) => {
            // 确保消息不同
            fc.pre(message1 !== message2)

            const error1 = new Error(message1)
            const error2 = new Error(message2)

            const hash1 = computeErrorHash(error1)
            const hash2 = computeErrorHash(error2)

            // 不同消息的错误应该有不同的哈希
            expect(hash1).not.toBe(hash2)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Error Categorization', () => {
    it('should categorize validation errors', () => {
      const validationErrors = [
        new Error('Validation failed'),
        new Error('Invalid input'),
        new Error('参数错误'),
      ]

      for (const error of validationErrors) {
        expect(categorizeError(error)).toBe(ErrorCategory.VALIDATION)
      }
    })

    it('should categorize database errors', () => {
      const dbErrors = [
        new Error('Prisma error'),
        new Error('Database connection failed'),
        new Error('Unique constraint violation'),
      ]

      for (const error of dbErrors) {
        expect(categorizeError(error)).toBe(ErrorCategory.DATABASE)
      }
    })

    it('should categorize network errors', () => {
      const networkErrors = [
        new Error('Network timeout'),
        new Error('ECONNREFUSED'),
        new Error('ENOTFOUND'),
      ]

      for (const error of networkErrors) {
        expect(categorizeError(error)).toBe(ErrorCategory.NETWORK)
      }
    })

    it('should categorize auth errors', () => {
      const authErrors = [
        new Error('Unauthorized'),
        new Error('Forbidden'),
        new Error('登录失败'),
        new Error('无权限'),
      ]

      for (const error of authErrors) {
        expect(categorizeError(error)).toBe(ErrorCategory.AUTH)
      }
    })

    it('should categorize unknown errors', () => {
      const unknownErrors = [
        new Error('Something went wrong'),
        new Error('Unexpected error'),
      ]

      for (const error of unknownErrors) {
        expect(categorizeError(error)).toBe(ErrorCategory.UNKNOWN)
      }
    })
  })

  describe('Unit Tests', () => {
    it('should return 16 character hash', () => {
      const error = new Error('test error')
      const hash = computeErrorHash(error)
      
      expect(hash).toHaveLength(16)
      expect(hash).toMatch(/^[0-9a-f]+$/)
    })

    it('should track error count correctly', () => {
      clearErrorCache()
      
      const error = new Error('test')
      const hash = computeErrorHash(error)

      expect(getErrorCount(hash)).toBe(0)
      
      isDuplicateError(hash)
      expect(getErrorCount(hash)).toBe(1)
      
      isDuplicateError(hash)
      expect(getErrorCount(hash)).toBe(2)
      
      isDuplicateError(hash)
      expect(getErrorCount(hash)).toBe(3)
    })

    it('should clear cache correctly', () => {
      const error = new Error('test')
      const hash = computeErrorHash(error)
      
      isDuplicateError(hash)
      isDuplicateError(hash)
      expect(getErrorCount(hash)).toBe(2)
      
      clearErrorCache()
      expect(getErrorCount(hash)).toBe(0)
    })
  })
})
