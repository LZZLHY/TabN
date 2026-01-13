/**
 * 敏感数据脱敏属性测试
 * Property 3: Sensitive Data Masking
 * Validates: Requirements 2.5
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  sanitizeObject,
  sanitizeHeaders,
  sanitizeBody,
  isSensitiveField,
  SENSITIVE_FIELDS,
  REDACTED,
  truncateString,
} from './sanitize'

describe('Sanitize Utils', () => {
  /**
   * Property 3: Sensitive Data Masking
   * For any log entry containing fields from SENSITIVE_FIELDS list,
   * those field values SHALL be replaced with "[REDACTED]" in the output.
   * Validates: Requirements 2.5
   */
  describe('Property 3: Sensitive Data Masking', () => {
    it('should mask all sensitive fields in any object', () => {
      fc.assert(
        fc.property(
          // 生成随机敏感字段名
          fc.constantFrom(...SENSITIVE_FIELDS),
          // 生成随机敏感值
          fc.string({ minLength: 1, maxLength: 100 }),
          // 生成随机非敏感字段名（排除特殊字段和敏感字段）
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => 
            !isSensitiveField(s) && 
            /^[a-zA-Z][a-zA-Z0-9]*$/.test(s) &&
            !['__proto__', 'constructor', 'prototype'].includes(s)
          ),
          // 生成随机非敏感值
          fc.oneof(fc.string(), fc.integer(), fc.boolean()),
          (sensitiveField, sensitiveValue, normalField, normalValue) => {
            const obj = {
              [sensitiveField]: sensitiveValue,
              [normalField]: normalValue,
            }

            const sanitized = sanitizeObject(obj)

            // 敏感字段应该被脱敏
            expect(sanitized[sensitiveField]).toBe(REDACTED)
            
            // 非敏感字段应该保持原值
            expect(sanitized[normalField]).toBe(normalValue)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should mask sensitive fields in nested objects', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SENSITIVE_FIELDS),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 5 }), // 嵌套深度
          (sensitiveField, sensitiveValue, depth) => {
            // 构建嵌套对象
            let obj: Record<string, unknown> = { [sensitiveField]: sensitiveValue }
            for (let i = 0; i < depth; i++) {
              obj = { nested: obj, level: i }
            }

            const sanitized = sanitizeObject(obj)

            // 递归查找敏感字段
            function findSensitiveValue(o: unknown): boolean {
              if (o === null || o === undefined) return false
              if (typeof o !== 'object') return false
              
              for (const [key, val] of Object.entries(o as Record<string, unknown>)) {
                if (isSensitiveField(key)) {
                  if (val !== REDACTED) return false
                }
                if (typeof val === 'object' && val !== null) {
                  if (!findSensitiveValue(val)) return false
                }
              }
              return true
            }

            expect(findSensitiveValue(sanitized)).toBe(true)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should mask sensitive fields in arrays', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SENSITIVE_FIELDS),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          (sensitiveField, values) => {
            const arr = values.map(v => ({ [sensitiveField]: v, id: Math.random() }))
            const sanitized = sanitizeObject(arr)

            // 所有数组元素中的敏感字段都应该被脱敏
            for (const item of sanitized as Array<Record<string, unknown>>) {
              expect(item[sensitiveField]).toBe(REDACTED)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should mask sensitive headers', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('authorization', 'Authorization', 'AUTHORIZATION', 'x-api-key', 'X-Api-Key'),
          fc.string({ minLength: 1, maxLength: 100 }),
          (headerName, headerValue) => {
            const headers = {
              [headerName]: headerValue,
              'content-type': 'application/json',
            }

            const sanitized = sanitizeHeaders(headers)

            expect(sanitized[headerName]).toBe(REDACTED)
            expect(sanitized['content-type']).toBe('application/json')
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('Unit Tests', () => {
    it('should identify sensitive fields case-insensitively', () => {
      expect(isSensitiveField('password')).toBe(true)
      expect(isSensitiveField('PASSWORD')).toBe(true)
      expect(isSensitiveField('Password')).toBe(true)
      expect(isSensitiveField('userPassword')).toBe(true)
      expect(isSensitiveField('password_hash')).toBe(true)
      expect(isSensitiveField('username')).toBe(false)
      expect(isSensitiveField('email')).toBe(false)
    })

    it('should handle null and undefined', () => {
      expect(sanitizeObject(null)).toBe(null)
      expect(sanitizeObject(undefined)).toBe(undefined)
    })

    it('should handle primitive types', () => {
      expect(sanitizeObject('string')).toBe('string')
      expect(sanitizeObject(123)).toBe(123)
      expect(sanitizeObject(true)).toBe(true)
    })

    it('should handle Date objects', () => {
      const date = new Date()
      expect(sanitizeObject(date)).toBe(date)
    })

    it('should sanitize complex nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          password: 'secret123',
          profile: {
            apiKey: 'key-123',
            bio: 'Hello',
          },
        },
        tokens: [
          { accessToken: 'token1', type: 'bearer' },
          { refreshToken: 'token2', type: 'refresh' },
        ],
      }

      const sanitized = sanitizeObject(obj)

      expect(sanitized.user.name).toBe('John')
      expect(sanitized.user.password).toBe(REDACTED)
      expect(sanitized.user.profile.apiKey).toBe(REDACTED)
      expect(sanitized.user.profile.bio).toBe('Hello')
      expect(sanitized.tokens[0].accessToken).toBe(REDACTED)
      expect(sanitized.tokens[0].type).toBe('bearer')
      expect(sanitized.tokens[1].refreshToken).toBe(REDACTED)
    })

    it('should sanitize JSON string body', () => {
      const body = JSON.stringify({ password: 'secret', name: 'John' })
      const sanitized = sanitizeBody(body)
      
      expect(typeof sanitized).toBe('string')
      const parsed = JSON.parse(sanitized as string)
      expect(parsed.password).toBe(REDACTED)
      expect(parsed.name).toBe('John')
    })

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(2000)
      const truncated = truncateString(longString, 100)
      
      expect(truncated.length).toBeLessThan(longString.length)
      expect(truncated).toContain('[truncated')
    })

    it('should not truncate short strings', () => {
      const shortString = 'hello'
      const result = truncateString(shortString, 100)
      
      expect(result).toBe(shortString)
    })

    it('should handle max depth to prevent infinite recursion', () => {
      // 创建循环引用的对象
      const obj: Record<string, unknown> = { a: 1 }
      let current = obj
      for (let i = 0; i < 15; i++) {
        current.nested = { level: i }
        current = current.nested as Record<string, unknown>
      }

      // 应该不会抛出错误
      const sanitized = sanitizeObject(obj, 10)
      expect(sanitized).toBeDefined()
    })
  })
})
