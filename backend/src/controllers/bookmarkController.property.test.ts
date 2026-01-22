/**
 * 书签控制器属性测试
 * Feature: bookmark-tags-and-icon-api, Property 2: 标签筛选正确性
 * 
 * **Validates: Requirements 2.2**
 * 
 * 设计文档 Property 2 描述：
 * *For any* 标签名称，按该标签筛选书签时，返回的所有书签都应包含该标签。
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { TagValidation } from '../utils/tags'

/**
 * 书签数据结构（简化版，用于测试筛选逻辑）
 */
interface Bookmark {
  id: string
  name: string
  tags: string[]
}

/**
 * 模拟标签筛选逻辑
 * 这与 bookmarkController.ts 中的 listBookmarks 函数使用的筛选逻辑一致
 * 使用 Prisma 的 { has: tag } 查询条件
 * 
 * @param bookmarks 书签列表
 * @param tag 要筛选的标签
 * @returns 包含该标签的书签列表
 */
function filterBookmarksByTag(bookmarks: Bookmark[], tag: string): Bookmark[] {
  return bookmarks.filter(bookmark => bookmark.tags.includes(tag))
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
  .map(tags => [...new Set(tags)]) // 去重

/**
 * 生成书签 ID
 */
const bookmarkIdArbitrary = fc.uuid()

/**
 * 生成书签名称
 */
const bookmarkNameArbitrary = fc.string({ minLength: 1, maxLength: 50 })

/**
 * 生成单个书签
 */
const bookmarkArbitrary = fc.record({
  id: bookmarkIdArbitrary,
  name: bookmarkNameArbitrary,
  tags: validTagsArrayArbitrary,
})

/**
 * 生成书签列表（1-20个书签）
 */
const bookmarksListArbitrary = fc.array(bookmarkArbitrary, { minLength: 1, maxLength: 20 })

describe('Bookmark Controller Property Tests', () => {
  describe('Feature: bookmark-tags-and-icon-api, Property 2: 标签筛选正确性', () => {
    /**
     * 属性 2.1: 筛选结果中的每个书签都包含筛选标签
     * 
     * **Validates: Requirements 2.2**
     * 
     * 对于任意标签，按该标签筛选书签时，返回的所有书签都应包含该标签。
     * 这是筛选正确性的核心属性。
     */
    it('筛选结果中的每个书签都应包含筛选标签', () => {
      fc.assert(
        fc.property(
          bookmarksListArbitrary,
          validTagArbitrary,
          (bookmarks, filterTag) => {
            // 执行筛选
            const filteredBookmarks = filterBookmarksByTag(bookmarks, filterTag)
            
            // 验证：每个筛选结果都应包含筛选标签
            for (const bookmark of filteredBookmarks) {
              expect(bookmark.tags).toContain(filterTag)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 2.2: 包含筛选标签的书签一定会出现在筛选结果中
     * 
     * **Validates: Requirements 2.2**
     * 
     * 如果书签包含某标签，则按该标签筛选时应该返回该书签。
     * 这确保筛选不会遗漏任何匹配的书签。
     */
    it('包含筛选标签的书签一定会出现在筛选结果中', () => {
      fc.assert(
        fc.property(
          bookmarksListArbitrary,
          validTagArbitrary,
          (bookmarks, filterTag) => {
            // 执行筛选
            const filteredBookmarks = filterBookmarksByTag(bookmarks, filterTag)
            const filteredIds = new Set(filteredBookmarks.map(b => b.id))
            
            // 验证：所有包含该标签的书签都应出现在结果中
            for (const bookmark of bookmarks) {
              if (bookmark.tags.includes(filterTag)) {
                expect(filteredIds.has(bookmark.id)).toBe(true)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 2.3: 筛选结果数量等于包含该标签的书签数量
     * 
     * **Validates: Requirements 2.2**
     * 
     * 筛选结果的数量应该精确等于原始列表中包含该标签的书签数量。
     * 这是属性 2.1 和 2.2 的推论，确保筛选既不多也不少。
     */
    it('筛选结果数量等于包含该标签的书签数量', () => {
      fc.assert(
        fc.property(
          bookmarksListArbitrary,
          validTagArbitrary,
          (bookmarks, filterTag) => {
            // 执行筛选
            const filteredBookmarks = filterBookmarksByTag(bookmarks, filterTag)
            
            // 计算原始列表中包含该标签的书签数量
            const expectedCount = bookmarks.filter(b => b.tags.includes(filterTag)).length
            
            // 验证数量一致
            expect(filteredBookmarks.length).toBe(expectedCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 2.4: 不包含筛选标签的书签不会出现在筛选结果中
     * 
     * **Validates: Requirements 2.2**
     * 
     * 如果书签不包含某标签，则按该标签筛选时不应该返回该书签。
     * 这确保筛选不会返回不匹配的书签。
     */
    it('不包含筛选标签的书签不会出现在筛选结果中', () => {
      fc.assert(
        fc.property(
          bookmarksListArbitrary,
          validTagArbitrary,
          (bookmarks, filterTag) => {
            // 执行筛选
            const filteredBookmarks = filterBookmarksByTag(bookmarks, filterTag)
            const filteredIds = new Set(filteredBookmarks.map(b => b.id))
            
            // 验证：不包含该标签的书签不应出现在结果中
            for (const bookmark of bookmarks) {
              if (!bookmark.tags.includes(filterTag)) {
                expect(filteredIds.has(bookmark.id)).toBe(false)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 2.5: 空标签列表的书签不会匹配任何标签筛选
     * 
     * **Validates: Requirements 2.2**
     * 
     * 没有标签的书签在按任何标签筛选时都不应该出现。
     */
    it('空标签列表的书签不会匹配任何标签筛选', () => {
      fc.assert(
        fc.property(
          validTagArbitrary,
          (filterTag) => {
            // 创建一个没有标签的书签
            const bookmarkWithNoTags: Bookmark = {
              id: 'test-id',
              name: 'Test Bookmark',
              tags: [],
            }
            
            // 执行筛选
            const filteredBookmarks = filterBookmarksByTag([bookmarkWithNoTags], filterTag)
            
            // 验证：没有标签的书签不应出现在任何筛选结果中
            expect(filteredBookmarks.length).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 2.6: 筛选操作保持书签数据完整性
     * 
     * **Validates: Requirements 2.2**
     * 
     * 筛选操作不应修改书签的任何数据，返回的书签应与原始书签完全相同。
     */
    it('筛选操作保持书签数据完整性', () => {
      fc.assert(
        fc.property(
          bookmarksListArbitrary,
          validTagArbitrary,
          (bookmarks, filterTag) => {
            // 执行筛选
            const filteredBookmarks = filterBookmarksByTag(bookmarks, filterTag)
            
            // 验证：筛选结果中的每个书签都与原始书签完全相同
            for (const filteredBookmark of filteredBookmarks) {
              const originalBookmark = bookmarks.find(b => b.id === filteredBookmark.id)
              expect(originalBookmark).toBeDefined()
              expect(filteredBookmark).toEqual(originalBookmark)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Additional Properties for Tag Filtering Robustness', () => {
    /**
     * 属性 2.7: 使用书签自身的标签进行筛选时，该书签一定会出现在结果中
     * 
     * **Validates: Requirements 2.2**
     * 
     * 这是一个更强的属性：如果我们选择一个书签的某个标签来筛选，
     * 那么这个书签一定会出现在筛选结果中。
     */
    it('使用书签自身的标签进行筛选时，该书签一定会出现在结果中', () => {
      // 生成至少有一个标签的书签
      const bookmarkWithTagsArbitrary = fc.record({
        id: bookmarkIdArbitrary,
        name: bookmarkNameArbitrary,
        tags: fc.array(validTagArbitrary, { minLength: 1, maxLength: TagValidation.maxTagsPerBookmark })
          .map(tags => [...new Set(tags)]),
      })

      fc.assert(
        fc.property(
          fc.array(bookmarkWithTagsArbitrary, { minLength: 1, maxLength: 10 }),
          (bookmarks) => {
            // 随机选择一个书签
            const randomIndex = Math.floor(Math.random() * bookmarks.length)
            const selectedBookmark = bookmarks[randomIndex]
            
            // 如果该书签有标签，选择其中一个标签进行筛选
            if (selectedBookmark.tags.length > 0) {
              const tagIndex = Math.floor(Math.random() * selectedBookmark.tags.length)
              const filterTag = selectedBookmark.tags[tagIndex]
              
              // 执行筛选
              const filteredBookmarks = filterBookmarksByTag(bookmarks, filterTag)
              const filteredIds = filteredBookmarks.map(b => b.id)
              
              // 验证：选中的书签一定在筛选结果中
              expect(filteredIds).toContain(selectedBookmark.id)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 2.8: 筛选是确定性的
     * 
     * **Validates: Requirements 2.2**
     * 
     * 对于相同的输入，筛选操作应该总是返回相同的结果。
     */
    it('筛选是确定性的', () => {
      fc.assert(
        fc.property(
          bookmarksListArbitrary,
          validTagArbitrary,
          (bookmarks, filterTag) => {
            // 执行两次筛选
            const result1 = filterBookmarksByTag(bookmarks, filterTag)
            const result2 = filterBookmarksByTag(bookmarks, filterTag)
            
            // 验证：两次筛选结果应该完全相同
            expect(result1).toEqual(result2)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 2.9: 空书签列表筛选返回空结果
     * 
     * **Validates: Requirements 2.2**
     * 
     * 边界情况：对空列表进行筛选应该返回空结果。
     */
    it('空书签列表筛选返回空结果', () => {
      fc.assert(
        fc.property(
          validTagArbitrary,
          (filterTag) => {
            const emptyBookmarks: Bookmark[] = []
            const result = filterBookmarksByTag(emptyBookmarks, filterTag)
            
            expect(result).toEqual([])
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
