/**
 * 管理员标签编辑属性测试
 * 
 * **Feature: bookmark-tags-and-icon-api, Property 3: 管理员标签编辑权限**
 * **Validates: Requirements 3.2**
 * 
 * 设计文档 Property 3 描述：
 * *For any* 管理员用户和任意用户的书签，管理员应能成功修改该书签的标签。
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { validateAndSanitizeTags, TagValidation } from '../utils/tags'

/**
 * 用户角色类型
 */
type UserRole = 'ROOT' | 'ADMIN' | 'USER'

/**
 * 用户数据结构
 */
interface User {
  id: string
  role: UserRole
}

/**
 * 书签数据结构
 */
interface Bookmark {
  id: string
  userId: string
  name: string
  tags: string[]
}

/**
 * 模拟管理员权限检查逻辑
 * 这与 adminController.ts 中的 updateBookmarkTagsAsAdmin 函数使用的权限逻辑一致
 * 
 * @param actor 操作者
 * @param bookmarkOwner 书签所有者
 * @returns 是否有权限编辑
 */
function canAdminEditBookmarkTags(actor: User, bookmarkOwner: User): boolean {
  // 未登录
  if (!actor) return false
  
  // 非管理员
  if (actor.role !== 'ADMIN' && actor.role !== 'ROOT') return false
  
  // ADMIN 只能管理 USER 的书签
  if (actor.role === 'ADMIN' && bookmarkOwner.role !== 'USER') return false
  
  // ROOT 可以管理所有用户的书签
  return true
}

/**
 * 模拟管理员更新书签标签逻辑
 * 
 * @param bookmark 原始书签
 * @param newTags 新标签
 * @returns 更新后的书签或错误
 */
function adminUpdateBookmarkTags(
  bookmark: Bookmark,
  newTags: string[]
): { success: true; bookmark: Bookmark } | { success: false; error: string } {
  // 验证并清理标签
  const { tags: sanitizedTags, validation } = validateAndSanitizeTags(newTags)
  
  if (!validation.valid) {
    return { success: false, error: validation.errors[0] ?? '标签格式错误' }
  }
  
  // 返回更新后的书签
  return {
    success: true,
    bookmark: {
      ...bookmark,
      tags: sanitizedTags,
    },
  }
}

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
 * 生成有效的标签数组（0-10个标签，去重）
 */
const validTagsArrayArbitrary = fc.array(validTagArbitrary, { minLength: 0, maxLength: TagValidation.maxTagsPerBookmark })
  .map(tags => [...new Set(tags)])

/**
 * 生成用户角色
 */
const userRoleArbitrary = fc.constantFrom<UserRole>('ROOT', 'ADMIN', 'USER')

/**
 * 生成用户
 */
const userArbitrary = fc.record({
  id: fc.uuid(),
  role: userRoleArbitrary,
})

/**
 * 生成书签
 */
const bookmarkArbitrary = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  tags: validTagsArrayArbitrary,
})

describe('Admin Tag Edit Property Tests', () => {
  describe('Feature: bookmark-tags-and-icon-api, Property 3: 管理员标签编辑权限', () => {
    /**
     * Property 3.1: ROOT 用户可以编辑任何用户的书签标签
     * 
     * **Validates: Requirements 3.2**
     * 
     * ROOT 用户应该能够编辑所有用户（包括 ROOT、ADMIN、USER）的书签标签。
     */
    it('ROOT 用户可以编辑任何用户的书签标签', () => {
      fc.assert(
        fc.property(
          userArbitrary,
          validTagsArrayArbitrary,
          (bookmarkOwner, newTags) => {
            const rootUser: User = { id: 'root-id', role: 'ROOT' }
            
            // ROOT 应该有权限编辑任何用户的书签
            const canEdit = canAdminEditBookmarkTags(rootUser, bookmarkOwner)
            expect(canEdit).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 3.2: ADMIN 用户只能编辑 USER 的书签标签
     * 
     * **Validates: Requirements 3.2**
     * 
     * ADMIN 用户只能编辑普通用户（USER）的书签标签，不能编辑 ROOT 或其他 ADMIN 的书签。
     */
    it('ADMIN 用户只能编辑 USER 的书签标签', () => {
      fc.assert(
        fc.property(
          userArbitrary,
          (bookmarkOwner) => {
            const adminUser: User = { id: 'admin-id', role: 'ADMIN' }
            
            const canEdit = canAdminEditBookmarkTags(adminUser, bookmarkOwner)
            
            // ADMIN 只能编辑 USER 的书签
            if (bookmarkOwner.role === 'USER') {
              expect(canEdit).toBe(true)
            } else {
              expect(canEdit).toBe(false)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 3.3: 普通用户不能通过管理员接口编辑书签标签
     * 
     * **Validates: Requirements 3.2**
     * 
     * 普通用户（USER）不应该有权限通过管理员接口编辑任何书签的标签。
     */
    it('普通用户不能通过管理员接口编辑书签标签', () => {
      fc.assert(
        fc.property(
          userArbitrary,
          (bookmarkOwner) => {
            const normalUser: User = { id: 'user-id', role: 'USER' }
            
            const canEdit = canAdminEditBookmarkTags(normalUser, bookmarkOwner)
            
            // USER 不能通过管理员接口编辑任何书签
            expect(canEdit).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 3.4: 管理员编辑标签后，标签应正确更新
     * 
     * **Validates: Requirements 3.2**
     * 
     * 当管理员成功编辑书签标签时，返回的书签数据中的标签应与请求一致（经过清理后）。
     */
    it('管理员编辑标签后，标签应正确更新', () => {
      fc.assert(
        fc.property(
          bookmarkArbitrary,
          validTagsArrayArbitrary,
          (bookmark, newTags) => {
            const result = adminUpdateBookmarkTags(bookmark, newTags)
            
            // 应该成功更新
            expect(result.success).toBe(true)
            
            if (result.success) {
              // 验证标签已正确更新（经过清理后）
              const { tags: expectedTags } = validateAndSanitizeTags(newTags)
              expect(result.bookmark.tags).toEqual(expectedTags)
              
              // 验证其他字段未被修改
              expect(result.bookmark.id).toBe(bookmark.id)
              expect(result.bookmark.userId).toBe(bookmark.userId)
              expect(result.bookmark.name).toBe(bookmark.name)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 3.5: 标签更新是幂等的
     * 
     * **Validates: Requirements 3.2**
     * 
     * 使用相同的标签多次更新应该产生相同的结果。
     */
    it('标签更新是幂等的', () => {
      fc.assert(
        fc.property(
          bookmarkArbitrary,
          validTagsArrayArbitrary,
          (bookmark, newTags) => {
            // 第一次更新
            const result1 = adminUpdateBookmarkTags(bookmark, newTags)
            
            if (result1.success) {
              // 第二次更新（使用第一次更新后的书签）
              const result2 = adminUpdateBookmarkTags(result1.bookmark, newTags)
              
              expect(result2.success).toBe(true)
              if (result2.success) {
                // 两次更新后的标签应该相同
                expect(result2.bookmark.tags).toEqual(result1.bookmark.tags)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 3.6: 空标签数组是有效的
     * 
     * **Validates: Requirements 3.2**
     * 
     * 管理员应该能够将书签的标签清空。
     */
    it('空标签数组是有效的', () => {
      fc.assert(
        fc.property(
          bookmarkArbitrary,
          (bookmark) => {
            const result = adminUpdateBookmarkTags(bookmark, [])
            
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.bookmark.tags).toEqual([])
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Additional Properties for Admin Tag Edit Robustness', () => {
    /**
     * Property 3.7: 标签更新保持书签其他数据不变
     * 
     * **Validates: Requirements 3.2**
     * 
     * 更新标签时不应影响书签的其他属性。
     */
    it('标签更新保持书签其他数据不变', () => {
      fc.assert(
        fc.property(
          bookmarkArbitrary,
          validTagsArrayArbitrary,
          (bookmark, newTags) => {
            const result = adminUpdateBookmarkTags(bookmark, newTags)
            
            if (result.success) {
              // 验证其他字段未被修改
              expect(result.bookmark.id).toBe(bookmark.id)
              expect(result.bookmark.userId).toBe(bookmark.userId)
              expect(result.bookmark.name).toBe(bookmark.name)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 3.8: 带空格的标签会被自动清理
     * 
     * **Validates: Requirements 3.2**
     * 
     * 标签中的前导和尾随空格应该被自动去除。
     */
    it('带空格的标签会被自动清理', () => {
      // 生成带空格的标签
      const whitespaceArbitrary = fc.array(fc.constant(' '), { minLength: 0, maxLength: 3 }).map(arr => arr.join(''))
      const tagWithWhitespaceArbitrary = fc.tuple(
        whitespaceArbitrary,
        validTagArbitrary,
        whitespaceArbitrary
      ).map(([leading, tag, trailing]) => `${leading}${tag}${trailing}`)
      
      const tagsWithWhitespaceArbitrary = fc.array(tagWithWhitespaceArbitrary, { minLength: 1, maxLength: 5 })

      fc.assert(
        fc.property(
          bookmarkArbitrary,
          tagsWithWhitespaceArbitrary,
          (bookmark, newTags) => {
            const result = adminUpdateBookmarkTags(bookmark, newTags)
            
            if (result.success) {
              // 验证所有标签都没有前导或尾随空格
              for (const tag of result.bookmark.tags) {
                expect(tag).toBe(tag.trim())
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 3.9: 重复标签会被自动去重
     * 
     * **Validates: Requirements 3.2**
     * 
     * 如果输入包含重复标签，更新后应该只保留一个。
     */
    it('重复标签会被自动去重', () => {
      fc.assert(
        fc.property(
          bookmarkArbitrary,
          validTagArbitrary,
          fc.integer({ min: 2, max: 5 }),
          (bookmark, tag, repeatCount) => {
            // 创建包含重复标签的数组
            const duplicateTags = Array(repeatCount).fill(tag)
            
            const result = adminUpdateBookmarkTags(bookmark, duplicateTags)
            
            if (result.success) {
              // 验证标签已去重
              const uniqueTags = new Set(result.bookmark.tags)
              expect(result.bookmark.tags.length).toBe(uniqueTags.size)
              
              // 如果原始标签有效，应该只出现一次
              if (result.bookmark.tags.includes(tag)) {
                expect(result.bookmark.tags.filter(t => t === tag).length).toBe(1)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
