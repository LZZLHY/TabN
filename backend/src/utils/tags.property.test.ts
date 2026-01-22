/**
 * 标签验证属性测试
 * Feature: bookmark-tags-and-icon-api, Property 1: 标签 CRUD 一致性
 * 
 * **Validates: Requirements 1.1, 1.2, 1.4, 1.5**
 * 
 * 设计文档 Property 1 描述：
 * *For any* 书签和任意有效的标签数组，创建或更新书签后，
 * 返回的书签数据中的标签应与请求中的标签一致（去除空格后）。
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { sanitizeTags, validateTags, TagValidation } from './tags'

/**
 * 生成有效的标签字符（中文、英文、数字、下划线、连字符）
 */
const validTagCharArbitrary = fc.oneof(
  // 英文字母 (a-z, A-Z)
  fc.integer({ min: 97, max: 122 }).map(code => String.fromCharCode(code)),
  fc.integer({ min: 65, max: 90 }).map(code => String.fromCharCode(code)),
  // 数字 (0-9)
  fc.integer({ min: 48, max: 57 }).map(code => String.fromCharCode(code)),
  // 下划线和连字符
  fc.constantFrom('_', '-'),
  // 中文字符
  fc.integer({ min: 0x4e00, max: 0x9fa5 }).map(code => String.fromCharCode(code))
)

/**
 * 生成有效的标签（1-20个有效字符）
 */
const validTagArbitrary = fc.array(validTagCharArbitrary, { minLength: 1, maxLength: TagValidation.maxTagLength })
  .map(chars => chars.join(''))

/**
 * 生成有效的标签数组（0-10个标签）
 */
const validTagsArrayArbitrary = fc.array(validTagArbitrary, { minLength: 0, maxLength: TagValidation.maxTagsPerBookmark })

/**
 * 生成带有空格的标签（用于测试空格去除）
 */
const whitespaceArbitrary = fc.array(fc.constant(' '), { minLength: 0, maxLength: 3 }).map(arr => arr.join(''))

const tagWithWhitespaceArbitrary = fc.tuple(
  whitespaceArbitrary, // 前导空格
  validTagArbitrary,
  whitespaceArbitrary  // 尾随空格
).map(([leading, tag, trailing]) => `${leading}${tag}${trailing}`)

/**
 * 生成带有空格的标签数组
 */
const tagsWithWhitespaceArbitrary = fc.array(tagWithWhitespaceArbitrary, { minLength: 0, maxLength: TagValidation.maxTagsPerBookmark })

describe('Tags Property Tests', () => {
  describe('Feature: bookmark-tags-and-icon-api, Property 1: 标签 CRUD 一致性', () => {
    /**
     * 属性 1: 对于任意有效的标签数组，sanitizeTags 后再 validateTags 应该通过验证
     * 
     * **Validates: Requirements 1.1, 1.2, 1.4, 1.5**
     * 
     * 这验证了标签处理流程的一致性：
     * - 任何有效的标签经过清理后都应该能通过验证
     * - 确保 sanitizeTags 和 validateTags 的协同工作正确
     */
    it('sanitizeTags 后再 validateTags 应该通过验证', () => {
      fc.assert(
        fc.property(validTagsArrayArbitrary, (tags) => {
          const sanitized = sanitizeTags(tags)
          const validation = validateTags(sanitized)
          
          // 清理后的标签应该通过验证
          expect(validation.valid).toBe(true)
          expect(validation.errors).toHaveLength(0)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 2: sanitizeTags 是幂等的
     * sanitizeTags(sanitizeTags(tags)) === sanitizeTags(tags)
     * 
     * **Validates: Requirements 1.5**
     * 
     * 幂等性确保多次清理不会改变结果，这对于数据一致性很重要
     */
    it('sanitizeTags 是幂等的', () => {
      fc.assert(
        fc.property(tagsWithWhitespaceArbitrary, (tags) => {
          const firstSanitize = sanitizeTags(tags)
          const secondSanitize = sanitizeTags(firstSanitize)
          
          // 两次清理的结果应该相同
          expect(secondSanitize).toEqual(firstSanitize)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 3: sanitizeTags 后的标签数量 <= 原始标签数量
     * 
     * **Validates: Requirements 1.5**
     * 
     * 清理操作只会减少标签（去除空标签、去重），不会增加标签
     */
    it('sanitizeTags 后的标签数量 <= 原始标签数量', () => {
      fc.assert(
        fc.property(tagsWithWhitespaceArbitrary, (tags) => {
          const sanitized = sanitizeTags(tags)
          
          // 清理后的标签数量不应超过原始数量
          expect(sanitized.length).toBeLessThanOrEqual(tags.length)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 4: sanitizeTags 后的每个标签都不包含前导或尾随空格
     * 
     * **Validates: Requirements 1.5**
     * 
     * 这直接验证了需求 1.5：自动去除空格
     */
    it('sanitizeTags 后的每个标签都不包含前导或尾随空格', () => {
      fc.assert(
        fc.property(tagsWithWhitespaceArbitrary, (tags) => {
          const sanitized = sanitizeTags(tags)
          
          // 每个清理后的标签都不应有前导或尾随空格
          for (const tag of sanitized) {
            expect(tag).toBe(tag.trim())
            // 额外验证：标签不以空格开头或结尾
            expect(tag.startsWith(' ')).toBe(false)
            expect(tag.startsWith('\t')).toBe(false)
            expect(tag.endsWith(' ')).toBe(false)
            expect(tag.endsWith('\t')).toBe(false)
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Additional Properties for Robustness', () => {
    /**
     * 属性 5: sanitizeTags 保持有效标签的内容不变（除了空格）
     * 
     * **Validates: Requirements 1.5**
     * 
     * 确保清理操作只去除空格，不会修改标签的实际内容
     */
    it('sanitizeTags 保持有效标签的内容不变（除了空格）', () => {
      fc.assert(
        fc.property(validTagsArrayArbitrary, (tags) => {
          const sanitized = sanitizeTags(tags)
          
          // 每个清理后的标签都应该在原始标签中存在（去除空格后）
          for (const sanitizedTag of sanitized) {
            const existsInOriginal = tags.some(
              originalTag => originalTag.trim() === sanitizedTag
            )
            expect(existsInOriginal).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 6: sanitizeTags 去重后不包含重复标签
     * 
     * **Validates: Requirements 1.5**
     * 
     * 确保去重功能正确工作
     */
    it('sanitizeTags 去重后不包含重复标签', () => {
      fc.assert(
        fc.property(tagsWithWhitespaceArbitrary, (tags) => {
          const sanitized = sanitizeTags(tags)
          const uniqueSet = new Set(sanitized)
          
          // 清理后的标签数组不应包含重复项
          expect(sanitized.length).toBe(uniqueSet.size)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 7: 空数组经过 sanitizeTags 后仍为空数组
     * 
     * **Validates: Requirements 1.1**
     * 
     * 边界情况：确保空输入正确处理
     */
    it('空数组经过 sanitizeTags 后仍为空数组', () => {
      const result = sanitizeTags([])
      expect(result).toEqual([])
    })

    /**
     * 属性 8: 只包含空格的标签会被过滤掉
     * 
     * **Validates: Requirements 1.5**
     */
    it('只包含空格的标签会被过滤掉', () => {
      const whitespaceOnlyArbitrary = fc.array(fc.constant(' '), { minLength: 1, maxLength: 5 }).map(arr => arr.join(''))
      
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              validTagArbitrary,
              whitespaceOnlyArbitrary // 只有空格的字符串
            ),
            { minLength: 1, maxLength: 15 }
          ),
          (tags) => {
            const sanitized = sanitizeTags(tags)
            
            // 清理后的标签都不应该是空字符串
            for (const tag of sanitized) {
              expect(tag.length).toBeGreaterThan(0)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
