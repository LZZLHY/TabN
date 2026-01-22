/**
 * 图标数据序列化属性测试
 * **Feature: bookmark-tags-and-icon-api, Property 12: 图标数据序列化往返一致性**
 * 
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
 * 
 * 设计文档 Property 12 描述：
 * *For any* 有效的图标数据对象，序列化为 JSON 后再反序列化应产生等价的对象。
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  serializeIcon,
  deserializeIcon,
  IconData,
  IconType,
  IconValidation,
} from './icon'

/**
 * 生成有效的 URL 字符串
 * 只生成 http 和 https 协议的 URL
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
 * 生成有效的图标类型
 */
const iconTypeArbitrary: fc.Arbitrary<IconType> = fc.constantFrom('URL', 'BASE64')

/**
 * 生成有效的 URL 类型图标数据
 */
const urlIconDataArbitrary: fc.Arbitrary<IconData> = validUrlArbitrary.map(url => ({
  type: 'URL' as const,
  value: url,
}))

/**
 * 生成有效的 BASE64 类型图标数据
 */
const base64IconDataArbitrary: fc.Arbitrary<IconData> = validBase64DataUriArbitrary.map(dataUri => ({
  type: 'BASE64' as const,
  value: dataUri,
}))

/**
 * 生成任意有效的图标数据（URL 或 BASE64）
 */
const validIconDataArbitrary: fc.Arbitrary<IconData> = fc.oneof(
  urlIconDataArbitrary,
  base64IconDataArbitrary
)

/**
 * 生成包含特殊字符的 URL（用于测试边界情况）
 */
const urlWithSpecialCharsArbitrary = fc.tuple(
  fc.constantFrom('http', 'https'),
  fc.webUrl({ validSchemes: ['http', 'https'] }),
  fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes(' '))),
  fc.option(fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes(' ')))
).map(([scheme, baseUrl, query, hash]) => {
  let url = baseUrl
  if (query) {
    url += `?q=${encodeURIComponent(query)}`
  }
  if (hash) {
    url += `#${encodeURIComponent(hash)}`
  }
  return url
})

const urlIconWithSpecialCharsArbitrary: fc.Arbitrary<IconData> = urlWithSpecialCharsArbitrary.map(url => ({
  type: 'URL' as const,
  value: url,
}))

describe('Icon Serialization Property Tests', () => {
  describe('**Feature: bookmark-tags-and-icon-api, Property 12: 图标数据序列化往返一致性**', () => {
    /**
     * 属性 1: 对于任意有效的 IconData 对象，serializeIcon 后再 deserializeIcon 应该产生等价的对象
     * 
     * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
     * 
     * 这是核心的往返一致性属性：
     * - 9.1: 将图标数据序列化为 JSON 格式
     * - 9.2: 将 JSON 数据反序列化为图标对象
     * - 9.3: 序列化后再反序列化应产生等价的对象
     * - 9.4: 在图标数据中包含类型标识
     */
    it('对于任意有效的 IconData 对象，serializeIcon 后再 deserializeIcon 应该产生等价的对象', () => {
      fc.assert(
        fc.property(validIconDataArbitrary, (iconData) => {
          // 序列化
          const serialized = serializeIcon(iconData)
          
          // 反序列化
          const deserialized = deserializeIcon(serialized)
          
          // 验证往返一致性
          expect(deserialized).toEqual(iconData)
          expect(deserialized.type).toBe(iconData.type)
          expect(deserialized.value).toBe(iconData.value)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 2: serializeIcon 产生的 JSON 字符串应该是有效的 JSON
     * 
     * **Validates: Requirements 9.1**
     * 
     * 确保序列化输出是有效的 JSON 格式
     */
    it('serializeIcon 产生的 JSON 字符串应该是有效的 JSON', () => {
      fc.assert(
        fc.property(validIconDataArbitrary, (iconData) => {
          const serialized = serializeIcon(iconData)
          
          // 验证是有效的 JSON
          expect(() => JSON.parse(serialized)).not.toThrow()
          
          // 验证解析后是对象
          const parsed = JSON.parse(serialized)
          expect(typeof parsed).toBe('object')
          expect(parsed).not.toBeNull()
          expect(Array.isArray(parsed)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 3: deserializeIcon 后的对象应该包含 type 和 value 字段
     * 
     * **Validates: Requirements 9.2, 9.4**
     * 
     * 确保反序列化后的对象结构正确
     */
    it('deserializeIcon 后的对象应该包含 type 和 value 字段', () => {
      fc.assert(
        fc.property(validIconDataArbitrary, (iconData) => {
          const serialized = serializeIcon(iconData)
          const deserialized = deserializeIcon(serialized)
          
          // 验证包含必要字段
          expect(deserialized).toHaveProperty('type')
          expect(deserialized).toHaveProperty('value')
          
          // 验证类型正确
          expect(['URL', 'BASE64']).toContain(deserialized.type)
          expect(typeof deserialized.value).toBe('string')
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 4: URL 类型图标的往返一致性
     * 
     * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
     * 
     * 专门测试 URL 类型图标的序列化往返
     */
    it('URL 类型图标应保持往返一致性', () => {
      fc.assert(
        fc.property(urlIconDataArbitrary, (iconData) => {
          const serialized = serializeIcon(iconData)
          const deserialized = deserializeIcon(serialized)
          
          expect(deserialized).toEqual(iconData)
          expect(deserialized.type).toBe('URL')
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 5: BASE64 类型图标的往返一致性
     * 
     * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
     * 
     * 专门测试 BASE64 类型图标的序列化往返
     */
    it('BASE64 类型图标应保持往返一致性', () => {
      fc.assert(
        fc.property(base64IconDataArbitrary, (iconData) => {
          const serialized = serializeIcon(iconData)
          const deserialized = deserializeIcon(serialized)
          
          expect(deserialized).toEqual(iconData)
          expect(deserialized.type).toBe('BASE64')
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 6: 包含特殊字符的 URL 应保持往返一致性
     * 
     * **Validates: Requirements 9.3**
     * 
     * 测试包含查询参数、hash 等特殊字符的 URL
     */
    it('包含特殊字符的 URL 应保持往返一致性', () => {
      fc.assert(
        fc.property(urlIconWithSpecialCharsArbitrary, (iconData) => {
          const serialized = serializeIcon(iconData)
          const deserialized = deserializeIcon(serialized)
          
          expect(deserialized).toEqual(iconData)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 7: 序列化后的 JSON 应包含类型标识
     * 
     * **Validates: Requirements 9.4**
     * 
     * 确保序列化后的 JSON 中包含 type 字段
     */
    it('序列化后的 JSON 应包含类型标识', () => {
      fc.assert(
        fc.property(validIconDataArbitrary, (iconData) => {
          const serialized = serializeIcon(iconData)
          const parsed = JSON.parse(serialized)
          
          // 验证包含类型标识
          expect(parsed).toHaveProperty('type')
          expect(['URL', 'BASE64']).toContain(parsed.type)
          expect(parsed.type).toBe(iconData.type)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 8: 多次序列化应产生相同的结果（确定性）
     * 
     * **Validates: Requirements 9.1**
     * 
     * 确保序列化是确定性的
     */
    it('多次序列化应产生相同的结果', () => {
      fc.assert(
        fc.property(validIconDataArbitrary, (iconData) => {
          const serialized1 = serializeIcon(iconData)
          const serialized2 = serializeIcon(iconData)
          const serialized3 = serializeIcon(iconData)
          
          expect(serialized1).toBe(serialized2)
          expect(serialized2).toBe(serialized3)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 9: 序列化-反序列化是幂等的
     * 
     * **Validates: Requirements 9.3**
     * 
     * 多次往返应产生相同的结果
     */
    it('序列化-反序列化是幂等的', () => {
      fc.assert(
        fc.property(validIconDataArbitrary, (iconData) => {
          // 第一次往返
          const serialized1 = serializeIcon(iconData)
          const deserialized1 = deserializeIcon(serialized1)
          
          // 第二次往返
          const serialized2 = serializeIcon(deserialized1)
          const deserialized2 = deserializeIcon(serialized2)
          
          // 两次往返结果应相同
          expect(deserialized1).toEqual(deserialized2)
          expect(serialized1).toBe(serialized2)
        }),
        { numRuns: 100 }
      )
    })
  })
})
