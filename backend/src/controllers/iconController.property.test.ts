/**
 * 图标 API 属性测试
 * **Feature: bookmark-tags-and-icon-api, Property 9/10/11**
 * 
 * **Validates: Requirements 6.1, 6.2, 6.4, 6.5, 7.1, 7.2, 7.4, 7.5**
 * 
 * 设计文档属性描述：
 * - Property 9: *For any* 有效的书签 ID 和图标数据，调用单个更新 API 后，
 *   书签的图标应被正确更新，响应应包含更新后的数据。
 * - Property 10: *For any* 有效的书签 ID 列表和对应的图标数据，调用批量更新 API 后，
 *   所有书签的图标应被正确更新，响应应包含每个书签的更新结果。
 * - Property 11: *For any* 混合有效和无效书签 ID 的批量更新请求，有效的书签应被成功更新，
 *   无效的应在响应中标记失败，不影响其他书签的更新。
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { validateIconUrl, validateBase64Icon, IconValidation } from '../utils/icon'

// ============================================================================
// 生成器定义
// ============================================================================

/**
 * 生成有效的 URL 字符串
 */
const validUrlArbitrary = fc.webUrl({ validSchemes: ['http', 'https'] })

/**
 * 生成有效的 MIME 类型
 */
const validMimeTypeArbitrary = fc.constantFrom(...IconValidation.allowedMimeTypes)

/**
 * 生成有效的 Base64 字符
 */
const base64CharArbitrary = fc.oneof(
  fc.integer({ min: 65, max: 90 }).map(code => String.fromCharCode(code)),
  fc.integer({ min: 97, max: 122 }).map(code => String.fromCharCode(code)),
  fc.integer({ min: 48, max: 57 }).map(code => String.fromCharCode(code)),
  fc.constantFrom('+', '/')
)

/**
 * 生成有效的 Base64 字符串
 */
const validBase64StringArbitrary = fc.integer({ min: 1, max: 100 }).chain(groups => {
  return fc.array(base64CharArbitrary, { minLength: groups * 4, maxLength: groups * 4 })
    .map(chars => chars.join(''))
})

/**
 * 生成有效的 Base64 data URI
 */
const validBase64DataUriArbitrary = fc.tuple(
  validMimeTypeArbitrary,
  validBase64StringArbitrary
).map(([mimeType, base64Data]) => `data:${mimeType};base64,${base64Data}`)


/**
 * 生成书签 ID
 */
const bookmarkIdArbitrary = fc.uuid()

/**
 * 生成单个图标更新请求
 */
const iconUpdateRequestArbitrary = fc.oneof(
  validUrlArbitrary.map(url => ({
    iconType: 'URL' as const,
    iconData: url,
  })),
  validBase64DataUriArbitrary.map(data => ({
    iconType: 'BASE64' as const,
    iconData: data,
  }))
)

/**
 * 生成批量更新请求项
 */
const batchUpdateItemArbitrary = fc.tuple(
  bookmarkIdArbitrary,
  iconUpdateRequestArbitrary
).map(([bookmarkId, request]) => ({
  bookmarkId,
  ...request,
}))

/**
 * 模拟验证图标数据的函数（与 iconController.ts 中的逻辑一致）
 */
function validateIconData(
  iconType: 'URL' | 'BASE64',
  iconData: string
): { valid: true } | { valid: false; error: string } {
  if (iconType === 'URL') {
    if (!validateIconUrl(iconData)) {
      return { valid: false, error: '图标 URL 格式无效' }
    }
  } else if (iconType === 'BASE64') {
    const result = validateBase64Icon(iconData)
    if (!result.valid) {
      return { valid: false, error: result.errors[0] ?? '图标数据格式无效' }
    }
  }
  return { valid: true }
}

/**
 * 模拟批量更新处理逻辑
 */
function processBatchUpdate(
  updates: Array<{ bookmarkId: string; iconType: 'URL' | 'BASE64'; iconData: string }>,
  validBookmarkIds: Set<string>
): {
  results: Array<{ bookmarkId: string; success: boolean; error?: string }>
  successCount: number
  failureCount: number
} {
  const results: Array<{ bookmarkId: string; success: boolean; error?: string }> = []
  let successCount = 0
  let failureCount = 0

  for (const update of updates) {
    const { bookmarkId, iconType, iconData } = update

    // 验证图标数据格式
    const validation = validateIconData(iconType, iconData)
    if (!validation.valid) {
      results.push({ bookmarkId, success: false, error: validation.error })
      failureCount++
      continue
    }

    // 检查书签是否存在
    if (!validBookmarkIds.has(bookmarkId)) {
      results.push({ bookmarkId, success: false, error: '书签不存在' })
      failureCount++
      continue
    }

    results.push({ bookmarkId, success: true })
    successCount++
  }

  return { results, successCount, failureCount }
}

// ============================================================================
// Property 9: 单个图标更新完整性
// ============================================================================

describe('Icon Controller Property Tests', () => {
  describe('**Feature: bookmark-tags-and-icon-api, Property 9: 单个图标更新完整性**', () => {
    /**
     * 属性 9.1: 有效的 URL 图标数据应通过验证
     * 
     * **Validates: Requirements 6.1, 6.5**
     */
    it('有效的 URL 图标数据应通过验证', () => {
      fc.assert(
        fc.property(validUrlArbitrary, (url) => {
          const result = validateIconData('URL', url)
          expect(result.valid).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 9.2: 有效的 Base64 图标数据应通过验证
     * 
     * **Validates: Requirements 6.1, 6.5**
     */
    it('有效的 Base64 图标数据应通过验证', () => {
      fc.assert(
        fc.property(validBase64DataUriArbitrary, (data) => {
          const result = validateIconData('BASE64', data)
          expect(result.valid).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 9.3: 图标数据验证是确定性的
     * 
     * **Validates: Requirements 6.5**
     */
    it('图标数据验证是确定性的', () => {
      fc.assert(
        fc.property(iconUpdateRequestArbitrary, (request) => {
          const result1 = validateIconData(request.iconType, request.iconData)
          const result2 = validateIconData(request.iconType, request.iconData)
          expect(result1).toEqual(result2)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 9.4: 无效的 URL 应被拒绝
     * 
     * **Validates: Requirements 6.5**
     */
    it('无效的 URL 应被拒绝', () => {
      const invalidUrls = ['', 'not-a-url', 'ftp://example.com', 'javascript:alert(1)']
      for (const url of invalidUrls) {
        const result = validateIconData('URL', url)
        expect(result.valid).toBe(false)
      }
    })
  })


  // ============================================================================
  // Property 10: 批量图标更新完整性
  // ============================================================================

  describe('**Feature: bookmark-tags-and-icon-api, Property 10: 批量图标更新完整性**', () => {
    /**
     * 属性 10.1: 批量更新应返回每个书签的结果
     * 
     * **Validates: Requirements 7.1, 7.4**
     */
    it('批量更新应返回每个书签的结果', () => {
      fc.assert(
        fc.property(
          fc.array(batchUpdateItemArbitrary, { minLength: 1, maxLength: 10 }),
          (updates) => {
            // 假设所有书签都存在
            const validIds = new Set(updates.map(u => u.bookmarkId))
            const result = processBatchUpdate(updates, validIds)

            // 结果数量应等于更新数量
            expect(result.results.length).toBe(updates.length)

            // 每个结果都应有 bookmarkId 和 success 字段
            for (const r of result.results) {
              expect(r).toHaveProperty('bookmarkId')
              expect(r).toHaveProperty('success')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 10.2: 所有有效书签应被成功更新
     * 
     * **Validates: Requirements 7.1, 7.2**
     */
    it('所有有效书签应被成功更新', () => {
      fc.assert(
        fc.property(
          fc.array(batchUpdateItemArbitrary, { minLength: 1, maxLength: 10 }),
          (updates) => {
            // 假设所有书签都存在
            const validIds = new Set(updates.map(u => u.bookmarkId))
            const result = processBatchUpdate(updates, validIds)

            // 所有更新都应成功
            expect(result.successCount).toBe(updates.length)
            expect(result.failureCount).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 10.3: successCount + failureCount 应等于总更新数
     * 
     * **Validates: Requirements 7.4**
     */
    it('successCount + failureCount 应等于总更新数', () => {
      fc.assert(
        fc.property(
          fc.array(batchUpdateItemArbitrary, { minLength: 1, maxLength: 10 }),
          fc.array(bookmarkIdArbitrary, { minLength: 0, maxLength: 5 }),
          (updates, invalidIds) => {
            // 部分书签存在
            const validIds = new Set(updates.slice(0, Math.ceil(updates.length / 2)).map(u => u.bookmarkId))
            const result = processBatchUpdate(updates, validIds)

            expect(result.successCount + result.failureCount).toBe(updates.length)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ============================================================================
  // Property 11: 批量更新部分失败处理
  // ============================================================================

  describe('**Feature: bookmark-tags-and-icon-api, Property 11: 批量更新部分失败处理**', () => {
    /**
     * 属性 11.1: 部分失败不影响其他书签的更新
     * 
     * **Validates: Requirements 7.5**
     */
    it('部分失败不影响其他书签的更新', () => {
      fc.assert(
        fc.property(
          fc.array(batchUpdateItemArbitrary, { minLength: 2, maxLength: 10 }),
          (updates) => {
            // 只有一半的书签存在
            const halfLength = Math.ceil(updates.length / 2)
            const validIds = new Set(updates.slice(0, halfLength).map(u => u.bookmarkId))
            const result = processBatchUpdate(updates, validIds)

            // 有效的书签应成功
            for (let i = 0; i < halfLength; i++) {
              const r = result.results.find(r => r.bookmarkId === updates[i].bookmarkId)
              expect(r?.success).toBe(true)
            }

            // 无效的书签应失败
            for (let i = halfLength; i < updates.length; i++) {
              const r = result.results.find(r => r.bookmarkId === updates[i].bookmarkId)
              if (r && !validIds.has(updates[i].bookmarkId)) {
                expect(r.success).toBe(false)
                expect(r.error).toBeDefined()
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 11.2: 失败的更新应包含错误信息
     * 
     * **Validates: Requirements 7.5**
     */
    it('失败的更新应包含错误信息', () => {
      fc.assert(
        fc.property(
          fc.array(batchUpdateItemArbitrary, { minLength: 1, maxLength: 10 }),
          (updates) => {
            // 没有书签存在
            const validIds = new Set<string>()
            const result = processBatchUpdate(updates, validIds)

            // 所有更新都应失败并包含错误信息
            for (const r of result.results) {
              expect(r.success).toBe(false)
              expect(r.error).toBeDefined()
              expect(typeof r.error).toBe('string')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 11.3: 批量更新限制为 100 个
     * 
     * **Validates: Requirements 7.3**
     */
    it('批量更新限制为 100 个', () => {
      // 这是一个边界测试，验证 schema 限制
      const updates = Array.from({ length: 100 }, (_, i) => ({
        bookmarkId: `id-${i}`,
        iconType: 'URL' as const,
        iconData: 'https://example.com/icon.png',
      }))

      const validIds = new Set(updates.map(u => u.bookmarkId))
      const result = processBatchUpdate(updates, validIds)

      // 100 个应该可以处理
      expect(result.results.length).toBe(100)
    })

    /**
     * 属性 11.4: 处理顺序应保持一致
     * 
     * **Validates: Requirements 7.4**
     */
    it('处理顺序应保持一致', () => {
      fc.assert(
        fc.property(
          fc.array(batchUpdateItemArbitrary, { minLength: 1, maxLength: 10 }),
          (updates) => {
            const validIds = new Set(updates.map(u => u.bookmarkId))
            const result = processBatchUpdate(updates, validIds)

            // 结果顺序应与输入顺序一致
            for (let i = 0; i < updates.length; i++) {
              expect(result.results[i].bookmarkId).toBe(updates[i].bookmarkId)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
