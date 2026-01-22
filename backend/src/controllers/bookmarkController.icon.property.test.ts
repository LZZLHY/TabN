/**
 * 书签图标设置属性测试
 * **Feature: bookmark-tags-and-icon-api, Property 4: 图标设置一致性**
 * **Feature: bookmark-tags-and-icon-api, Property 5: 图标 URL 格式验证**
 * 
 * **Validates: Requirements 4.1, 4.2, 4.4**
 * 
 * 设计文档属性描述：
 * - Property 4: *For any* 书签和有效的图标数据（URL 或 Base64），设置图标后，
 *   返回的书签数据中的图标应与请求一致。
 * - Property 5: *For any* 无效的 URL 字符串，设置为图标 URL 时应被系统拒绝。
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { IconType } from '@prisma/client'
import {
  validateIconUrl,
  validateBase64Icon,
  IconValidation,
} from '../utils/icon'

/**
 * 模拟 validateIconFields 函数的逻辑
 * 这与 bookmarkController.ts 中的 validateIconFields 函数逻辑一致
 */
function validateIconFields(data: {
  iconUrl?: string | null
  iconData?: string | null
  iconType?: IconType | null
}): { valid: true; iconUrl: string | null; iconData: string | null; iconType: IconType | null } | { valid: false; error: string } {
  const { iconUrl, iconData, iconType } = data

  // 如果没有提供任何图标字段，返回空值
  if (!iconUrl && !iconData && !iconType) {
    return { valid: true, iconUrl: null, iconData: null, iconType: null }
  }

  // 如果提供了 iconType，必须同时提供对应的数据
  if (iconType === IconType.URL) {
    if (!iconUrl) {
      return { valid: false, error: '图标类型为 URL 时必须提供 iconUrl' }
    }
    // 验证 URL 格式
    if (!validateIconUrl(iconUrl)) {
      return { valid: false, error: '图标 URL 格式无效' }
    }
    return { valid: true, iconUrl, iconData: null, iconType: IconType.URL }
  }

  if (iconType === IconType.BASE64) {
    if (!iconData) {
      return { valid: false, error: '图标类型为 BASE64 时必须提供 iconData' }
    }
    // 验证 Base64 格式
    const base64Result = validateBase64Icon(iconData)
    if (!base64Result.valid) {
      return { valid: false, error: base64Result.errors[0] ?? '图标数据格式无效' }
    }
    return { valid: true, iconUrl: null, iconData, iconType: IconType.BASE64 }
  }

  // 如果只提供了 iconUrl 但没有 iconType，自动设置为 URL 类型
  if (iconUrl && !iconType) {
    if (!validateIconUrl(iconUrl)) {
      return { valid: false, error: '图标 URL 格式无效' }
    }
    return { valid: true, iconUrl, iconData: null, iconType: IconType.URL }
  }

  // 如果只提供了 iconData 但没有 iconType，自动设置为 BASE64 类型
  if (iconData && !iconType) {
    const base64Result = validateBase64Icon(iconData)
    if (!base64Result.valid) {
      return { valid: false, error: base64Result.errors[0] ?? '图标数据格式无效' }
    }
    return { valid: true, iconUrl: null, iconData, iconType: IconType.BASE64 }
  }

  // 其他情况返回空值
  return { valid: true, iconUrl: null, iconData: null, iconType: null }
}

// ============================================================================
// 生成器定义
// ============================================================================

/**
 * 生成有效的 URL 字符串（http 或 https 协议）
 */
const validUrlArbitrary = fc.webUrl({ validSchemes: ['http', 'https'] })

/**
 * 生成有效的 MIME 类型
 */
const validMimeTypeArbitrary = fc.constantFrom(...IconValidation.allowedMimeTypes)

/**
 * 生成有效的 Base64 字符（A-Z, a-z, 0-9, +, /）
 */
const base64CharArbitrary = fc.oneof(
  fc.integer({ min: 65, max: 90 }).map(code => String.fromCharCode(code)),  // A-Z
  fc.integer({ min: 97, max: 122 }).map(code => String.fromCharCode(code)), // a-z
  fc.integer({ min: 48, max: 57 }).map(code => String.fromCharCode(code)),  // 0-9
  fc.constantFrom('+', '/')
)

/**
 * 生成有效的 Base64 字符串（长度为 4 的倍数，带正确的填充）
 * 限制大小以避免超过 100KB 限制
 */
const validBase64StringArbitrary = fc.integer({ min: 1, max: 100 }).chain(groups => {
  // 每组 4 个字符，生成 1-100 组（4-400 字符）
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
 * 生成无效的 URL 字符串
 * 包括：空字符串、非 URL 格式、非 http/https 协议等
 * 
 * 注意：JavaScript URL 构造函数会自动规范化某些格式（如 http:/example.com -> http://example.com/）
 * 因此我们需要确保生成的 URL 确实无法被解析或使用非 http/https 协议
 */
const invalidUrlArbitrary = fc.oneof(
  // 空字符串
  fc.constant(''),
  // 只有空格
  fc.array(fc.constant(' '), { minLength: 1, maxLength: 5 }).map(arr => arr.join('')),
  // 随机字符串（非 URL 格式）- 使用 filter 确保真正无效
  fc.string({ minLength: 1, maxLength: 50 }).filter(s => {
    try {
      const url = new URL(s)
      // 即使能解析，如果协议不是 http/https 也是无效的
      return url.protocol !== 'http:' && url.protocol !== 'https:'
    } catch {
      return true // 不能解析为 URL，保留
    }
  }),
  // 无效协议（ftp, file, javascript 等）- 这些能被 URL 解析但不被 validateIconUrl 接受
  fc.tuple(
    fc.constantFrom('ftp', 'file', 'javascript', 'mailto', 'tel'),
    fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes(' ') && s.length > 0)
  ).map(([protocol, path]) => `${protocol}://${path}`),
  // 缺少协议的字符串（不能被 URL 解析）
  fc.string({ minLength: 5, maxLength: 30 }).filter(s => {
    // 确保不以任何协议开头，且不能被 URL 解析
    if (s.includes('://') || s.includes(' ')) return false
    try {
      new URL(s)
      return false
    } catch {
      return true
    }
  }),
  // 只有协议（不完整的 URL）
  fc.constantFrom('http:', 'https:'),
  // 格式错误的 URL（确保不能被解析为有效 URL）
  fc.constantFrom(
    'https//example.com',  // 缺少冒号
    '://example.com',      // 缺少协议名
    'not-a-url',           // 普通字符串
    'example.com',         // 缺少协议
    '/path/to/file',       // 相对路径
    '//example.com'        // 协议相对 URL（无法单独解析）
  )
)

// ============================================================================
// Property 4: 图标设置一致性
// ============================================================================

describe('Bookmark Icon Property Tests', () => {
  describe('**Feature: bookmark-tags-and-icon-api, Property 4: 图标设置一致性**', () => {
    /**
     * 属性 4.1: 对于任意有效的 URL 图标数据，validateIconFields 后返回的数据应与输入一致
     * 
     * **Validates: Requirements 4.1, 4.4**
     * 
     * 测试 URL 类型图标的设置一致性
     */
    it('对于任意有效的 URL 图标数据，validateIconFields 后返回的数据应与输入一致', () => {
      fc.assert(
        fc.property(validUrlArbitrary, (url) => {
          // 使用 URL 类型设置图标
          const result = validateIconFields({
            iconUrl: url,
            iconType: IconType.URL,
          })

          // 验证结果有效
          expect(result.valid).toBe(true)
          if (result.valid) {
            // 验证返回的数据与输入一致
            expect(result.iconUrl).toBe(url)
            expect(result.iconType).toBe(IconType.URL)
            expect(result.iconData).toBeNull()
          }
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 4.2: 对于任意有效的 Base64 图标数据，validateIconFields 后返回的数据应与输入一致
     * 
     * **Validates: Requirements 4.1, 4.4**
     * 
     * 测试 BASE64 类型图标的设置一致性
     */
    it('对于任意有效的 Base64 图标数据，validateIconFields 后返回的数据应与输入一致', () => {
      fc.assert(
        fc.property(validBase64DataUriArbitrary, (base64Data) => {
          // 使用 BASE64 类型设置图标
          const result = validateIconFields({
            iconData: base64Data,
            iconType: IconType.BASE64,
          })

          // 验证结果有效
          expect(result.valid).toBe(true)
          if (result.valid) {
            // 验证返回的数据与输入一致
            expect(result.iconData).toBe(base64Data)
            expect(result.iconType).toBe(IconType.BASE64)
            expect(result.iconUrl).toBeNull()
          }
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 4.3: 只提供 iconUrl 时，自动推断类型为 URL
     * 
     * **Validates: Requirements 4.1, 4.4**
     * 
     * 测试自动类型推断功能
     */
    it('只提供 iconUrl 时，自动推断类型为 URL', () => {
      fc.assert(
        fc.property(validUrlArbitrary, (url) => {
          // 只提供 iconUrl，不提供 iconType
          const result = validateIconFields({
            iconUrl: url,
          })

          // 验证结果有效
          expect(result.valid).toBe(true)
          if (result.valid) {
            // 验证自动推断为 URL 类型
            expect(result.iconUrl).toBe(url)
            expect(result.iconType).toBe(IconType.URL)
            expect(result.iconData).toBeNull()
          }
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 4.4: 只提供 iconData 时，自动推断类型为 BASE64
     * 
     * **Validates: Requirements 4.1, 4.4**
     * 
     * 测试自动类型推断功能
     */
    it('只提供 iconData 时，自动推断类型为 BASE64', () => {
      fc.assert(
        fc.property(validBase64DataUriArbitrary, (base64Data) => {
          // 只提供 iconData，不提供 iconType
          const result = validateIconFields({
            iconData: base64Data,
          })

          // 验证结果有效
          expect(result.valid).toBe(true)
          if (result.valid) {
            // 验证自动推断为 BASE64 类型
            expect(result.iconData).toBe(base64Data)
            expect(result.iconType).toBe(IconType.BASE64)
            expect(result.iconUrl).toBeNull()
          }
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 4.5: 不提供任何图标字段时，返回空值
     * 
     * **Validates: Requirements 4.1**
     * 
     * 测试空输入的处理
     */
    it('不提供任何图标字段时，返回空值', () => {
      const result = validateIconFields({})

      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.iconUrl).toBeNull()
        expect(result.iconData).toBeNull()
        expect(result.iconType).toBeNull()
      }
    })

    /**
     * 属性 4.6: validateIconFields 是确定性的
     * 
     * **Validates: Requirements 4.1, 4.4**
     * 
     * 对于相同的输入，应该总是返回相同的结果
     */
    it('validateIconFields 是确定性的', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            validUrlArbitrary.map(url => ({ iconUrl: url, iconType: IconType.URL as IconType })),
            validBase64DataUriArbitrary.map(data => ({ iconData: data, iconType: IconType.BASE64 as IconType }))
          ),
          (input) => {
            // 执行两次验证
            const result1 = validateIconFields(input)
            const result2 = validateIconFields(input)

            // 验证两次结果相同
            expect(result1).toEqual(result2)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 4.7: URL 类型图标必须提供 iconUrl
     * 
     * **Validates: Requirements 4.1, 4.4**
     * 
     * 测试类型与数据的一致性要求
     */
    it('URL 类型图标必须提供 iconUrl', () => {
      const result = validateIconFields({
        iconType: IconType.URL,
        // 不提供 iconUrl
      })

      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('iconUrl')
      }
    })

    /**
     * 属性 4.8: BASE64 类型图标必须提供 iconData
     * 
     * **Validates: Requirements 4.1, 4.4**
     * 
     * 测试类型与数据的一致性要求
     */
    it('BASE64 类型图标必须提供 iconData', () => {
      const result = validateIconFields({
        iconType: IconType.BASE64,
        // 不提供 iconData
      })

      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('iconData')
      }
    })
  })

  // ============================================================================
  // Property 5: 图标 URL 格式验证
  // ============================================================================

  describe('**Feature: bookmark-tags-and-icon-api, Property 5: 图标 URL 格式验证**', () => {
    /**
     * 属性 5.1: 对于任意无效的 URL 字符串，validateIconUrl 应返回 false
     * 
     * **Validates: Requirements 4.2**
     * 
     * 这是核心属性：无效的 URL 应被系统拒绝
     */
    it('对于任意无效的 URL 字符串，validateIconUrl 应返回 false', () => {
      fc.assert(
        fc.property(invalidUrlArbitrary, (invalidUrl) => {
          const result = validateIconUrl(invalidUrl)
          expect(result).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 5.2: 对于任意有效的 URL 字符串，validateIconUrl 应返回 true
     * 
     * **Validates: Requirements 4.2**
     * 
     * 确保有效的 URL 能通过验证
     */
    it('对于任意有效的 URL 字符串，validateIconUrl 应返回 true', () => {
      fc.assert(
        fc.property(validUrlArbitrary, (validUrl) => {
          const result = validateIconUrl(validUrl)
          expect(result).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 5.3: 无效的 URL 设置为图标时，validateIconFields 应返回错误
     * 
     * **Validates: Requirements 4.2**
     * 
     * 测试完整的图标设置流程中的 URL 验证
     */
    it('无效的 URL 设置为图标时，validateIconFields 应返回错误', () => {
      fc.assert(
        fc.property(invalidUrlArbitrary, (invalidUrl) => {
          // 尝试使用无效 URL 设置图标
          const result = validateIconFields({
            iconUrl: invalidUrl,
            iconType: IconType.URL,
          })

          // 验证结果无效
          expect(result.valid).toBe(false)
          if (!result.valid) {
            expect(result.error).toBeDefined()
          }
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 5.4: 只有 http 和 https 协议的 URL 被接受
     * 
     * **Validates: Requirements 4.2**
     * 
     * 测试协议限制
     */
    it('只有 http 和 https 协议的 URL 被接受', () => {
      // 测试 http 协议
      expect(validateIconUrl('http://example.com/icon.png')).toBe(true)
      // 测试 https 协议
      expect(validateIconUrl('https://example.com/icon.png')).toBe(true)
      // 测试其他协议
      expect(validateIconUrl('ftp://example.com/icon.png')).toBe(false)
      expect(validateIconUrl('file:///path/to/icon.png')).toBe(false)
      expect(validateIconUrl('javascript:alert(1)')).toBe(false)
      expect(validateIconUrl('data:image/png;base64,xxx')).toBe(false)
    })

    /**
     * 属性 5.5: 空字符串和 null/undefined 被拒绝
     * 
     * **Validates: Requirements 4.2**
     * 
     * 测试边界情况
     */
    it('空字符串和 null/undefined 被拒绝', () => {
      expect(validateIconUrl('')).toBe(false)
      expect(validateIconUrl('   ')).toBe(false)
      expect(validateIconUrl(null as unknown as string)).toBe(false)
      expect(validateIconUrl(undefined as unknown as string)).toBe(false)
    })

    /**
     * 属性 5.6: validateIconUrl 是确定性的
     * 
     * **Validates: Requirements 4.2**
     * 
     * 对于相同的输入，应该总是返回相同的结果
     */
    it('validateIconUrl 是确定性的', () => {
      fc.assert(
        fc.property(
          fc.oneof(validUrlArbitrary, invalidUrlArbitrary),
          (url) => {
            const result1 = validateIconUrl(url)
            const result2 = validateIconUrl(url)
            expect(result1).toBe(result2)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 5.7: URL 验证不修改输入
     * 
     * **Validates: Requirements 4.2**
     * 
     * 验证函数应该是纯函数，不修改输入
     */
    it('URL 验证不修改输入', () => {
      fc.assert(
        fc.property(validUrlArbitrary, (url) => {
          const originalUrl = url
          validateIconUrl(url)
          expect(url).toBe(originalUrl)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 5.8: 带有查询参数和 hash 的有效 URL 应被接受
     * 
     * **Validates: Requirements 4.2**
     * 
     * 测试复杂 URL 格式
     */
    it('带有查询参数和 hash 的有效 URL 应被接受', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            validUrlArbitrary,
            fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes(' ') && !s.includes('#'))),
            fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes(' ')))
          ),
          ([baseUrl, query, hash]) => {
            let url = baseUrl
            if (query) {
              url += `?q=${encodeURIComponent(query)}`
            }
            if (hash) {
              url += `#${encodeURIComponent(hash)}`
            }
            
            const result = validateIconUrl(url)
            expect(result).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
