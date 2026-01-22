/**
 * 标签验证工具单元测试
 * Requirements: 1.5, 1.6, 1.7
 */

import { describe, it, expect } from 'vitest'
import {
  validateTags,
  sanitizeTags,
  validateAndSanitizeTags,
  TagValidation,
} from './tags'

describe('Tags Utils', () => {
  describe('validateTags', () => {
    describe('标签数量验证 (Requirement 1.6)', () => {
      it('应该允许 0 个标签', () => {
        const result = validateTags([])
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('应该允许 10 个标签', () => {
        const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`)
        const result = validateTags(tags)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('应该拒绝超过 10 个标签', () => {
        const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`)
        const result = validateTags(tags)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain(`单个书签最多 ${TagValidation.maxTagsPerBookmark} 个标签`)
      })
    })

    describe('标签长度验证 (Requirement 1.7)', () => {
      it('应该允许 20 个字符的标签', () => {
        const tag = 'a'.repeat(20)
        const result = validateTags([tag])
        expect(result.valid).toBe(true)
      })

      it('应该拒绝超过 20 个字符的标签', () => {
        const tag = 'a'.repeat(21)
        const result = validateTags([tag])
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('长度不能超过'))).toBe(true)
      })

      it('应该拒绝空标签', () => {
        const result = validateTags([''])
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('标签不能为空')
      })
    })

    describe('标签格式验证', () => {
      it('应该允许中文标签', () => {
        const result = validateTags(['视频', '音乐', '学习资料'])
        expect(result.valid).toBe(true)
      })

      it('应该允许英文标签', () => {
        const result = validateTags(['video', 'music', 'learning'])
        expect(result.valid).toBe(true)
      })

      it('应该允许数字标签', () => {
        const result = validateTags(['123', '2024'])
        expect(result.valid).toBe(true)
      })

      it('应该允许下划线', () => {
        const result = validateTags(['my_tag', 'test_123'])
        expect(result.valid).toBe(true)
      })

      it('应该允许连字符', () => {
        const result = validateTags(['my-tag', 'test-123'])
        expect(result.valid).toBe(true)
      })

      it('应该允许混合字符', () => {
        const result = validateTags(['视频_video-123'])
        expect(result.valid).toBe(true)
      })

      it('应该拒绝包含空格的标签', () => {
        const result = validateTags(['my tag'])
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.includes('只能包含'))).toBe(true)
      })

      it('应该拒绝包含特殊字符的标签', () => {
        const result = validateTags(['tag@123', 'tag#test', 'tag!'])
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })

    describe('多个错误', () => {
      it('应该报告所有错误', () => {
        const tags = [
          'a'.repeat(25), // 太长
          'tag with space', // 包含空格
          '', // 空标签
        ]
        const result = validateTags(tags)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThanOrEqual(3)
      })
    })
  })

  describe('sanitizeTags', () => {
    describe('去除空格 (Requirement 1.5)', () => {
      it('应该去除前导空格', () => {
        const result = sanitizeTags(['  tag1', '   tag2'])
        expect(result).toEqual(['tag1', 'tag2'])
      })

      it('应该去除尾随空格', () => {
        const result = sanitizeTags(['tag1  ', 'tag2   '])
        expect(result).toEqual(['tag1', 'tag2'])
      })

      it('应该去除前后空格', () => {
        const result = sanitizeTags(['  tag1  ', '   tag2   '])
        expect(result).toEqual(['tag1', 'tag2'])
      })
    })

    describe('去重', () => {
      it('应该去除重复标签', () => {
        const result = sanitizeTags(['tag1', 'tag2', 'tag1', 'tag3', 'tag2'])
        expect(result).toEqual(['tag1', 'tag2', 'tag3'])
      })

      it('应该在去除空格后去重', () => {
        const result = sanitizeTags(['tag1', '  tag1  ', 'tag1'])
        expect(result).toEqual(['tag1'])
      })

      it('应该保持原始顺序', () => {
        const result = sanitizeTags(['c', 'a', 'b', 'a', 'c'])
        expect(result).toEqual(['c', 'a', 'b'])
      })
    })

    describe('过滤空标签', () => {
      it('应该过滤空字符串', () => {
        const result = sanitizeTags(['tag1', '', 'tag2', ''])
        expect(result).toEqual(['tag1', 'tag2'])
      })

      it('应该过滤只有空格的标签', () => {
        const result = sanitizeTags(['tag1', '   ', 'tag2', '  '])
        expect(result).toEqual(['tag1', 'tag2'])
      })
    })

    describe('综合场景', () => {
      it('应该正确处理复杂输入', () => {
        const result = sanitizeTags([
          '  tag1  ',
          'tag2',
          '',
          '   ',
          'tag1', // 重复
          '  tag3',
          'tag2  ', // 重复
        ])
        expect(result).toEqual(['tag1', 'tag2', 'tag3'])
      })

      it('应该处理空数组', () => {
        const result = sanitizeTags([])
        expect(result).toEqual([])
      })
    })
  })

  describe('validateAndSanitizeTags', () => {
    it('应该先清理再验证', () => {
      const result = validateAndSanitizeTags([
        '  tag1  ',
        'tag2',
        '  tag1', // 清理后重复
      ])
      expect(result.tags).toEqual(['tag1', 'tag2'])
      expect(result.validation.valid).toBe(true)
    })

    it('应该在清理后验证长度', () => {
      const longTag = 'a'.repeat(21)
      const result = validateAndSanitizeTags([`  ${longTag}  `])
      expect(result.tags).toEqual([longTag])
      expect(result.validation.valid).toBe(false)
    })

    it('应该在清理后验证数量', () => {
      // 创建 12 个标签，其中 2 个是重复的
      const tags = [
        'tag1', 'tag2', 'tag3', 'tag4', 'tag5',
        'tag6', 'tag7', 'tag8', 'tag9', 'tag10',
        'tag1', 'tag2', // 重复
      ]
      const result = validateAndSanitizeTags(tags)
      expect(result.tags).toHaveLength(10)
      expect(result.validation.valid).toBe(true)
    })
  })
})
