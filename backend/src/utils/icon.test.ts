/**
 * 图标验证工具单元测试
 * Requirements: 4.2, 4.5, 6.5
 */

import { describe, it, expect } from 'vitest'
import {
  validateIconUrl,
  validateBase64Icon,
  validateIconData,
  isValidBase64,
  parseBase64DataUri,
  getBase64MimeType,
  getBase64Size,
  serializeIcon,
  deserializeIcon,
  IconValidation,
  IconData,
} from './icon'

describe('validateIconUrl', () => {
  describe('有效的 URL', () => {
    it('应该接受 https URL', () => {
      expect(validateIconUrl('https://example.com/icon.png')).toBe(true)
    })

    it('应该接受 http URL', () => {
      expect(validateIconUrl('http://example.com/icon.png')).toBe(true)
    })

    it('应该接受带端口的 URL', () => {
      expect(validateIconUrl('https://example.com:8080/icon.png')).toBe(true)
    })

    it('应该接受带查询参数的 URL', () => {
      expect(validateIconUrl('https://example.com/icon.png?size=32')).toBe(true)
    })

    it('应该接受带 hash 的 URL', () => {
      expect(validateIconUrl('https://example.com/icon.png#section')).toBe(true)
    })

    it('应该去除首尾空格后验证', () => {
      expect(validateIconUrl('  https://example.com/icon.png  ')).toBe(true)
    })
  })

  describe('无效的 URL', () => {
    it('应该拒绝空字符串', () => {
      expect(validateIconUrl('')).toBe(false)
    })

    it('应该拒绝 null', () => {
      expect(validateIconUrl(null as unknown as string)).toBe(false)
    })

    it('应该拒绝 undefined', () => {
      expect(validateIconUrl(undefined as unknown as string)).toBe(false)
    })

    it('应该拒绝纯空格', () => {
      expect(validateIconUrl('   ')).toBe(false)
    })

    it('应该拒绝无协议的 URL', () => {
      expect(validateIconUrl('example.com/icon.png')).toBe(false)
    })

    it('应该拒绝 file 协议', () => {
      expect(validateIconUrl('file:///path/to/icon.png')).toBe(false)
    })

    it('应该拒绝 ftp 协议', () => {
      expect(validateIconUrl('ftp://example.com/icon.png')).toBe(false)
    })

    it('应该拒绝 javascript 协议', () => {
      expect(validateIconUrl('javascript:alert(1)')).toBe(false)
    })

    it('应该拒绝 data URI', () => {
      expect(validateIconUrl('data:image/png;base64,abc')).toBe(false)
    })

    it('应该拒绝无效格式', () => {
      expect(validateIconUrl('not a url')).toBe(false)
    })
  })
})

describe('validateBase64Icon', () => {
  // 创建一个小的有效 Base64 PNG 图片数据
  const validSmallPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  describe('有效的 Base64 图标', () => {
    it('应该接受有效的 PNG 图标', () => {
      const result = validateBase64Icon(validSmallPng)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该接受有效的 JPEG 图标', () => {
      const jpegData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q=='
      const result = validateBase64Icon(jpegData)
      expect(result.valid).toBe(true)
    })

    it('应该接受有效的 GIF 图标', () => {
      const gifData = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      const result = validateBase64Icon(gifData)
      expect(result.valid).toBe(true)
    })

    it('应该接受有效的 WebP 图标', () => {
      const webpData = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='
      const result = validateBase64Icon(webpData)
      expect(result.valid).toBe(true)
    })

    it('应该接受有效的 SVG 图标', () => {
      const svgData = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg=='
      const result = validateBase64Icon(svgData)
      expect(result.valid).toBe(true)
    })
  })

  describe('无效的 Base64 图标', () => {
    it('应该拒绝空字符串', () => {
      const result = validateBase64Icon('')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('图标数据不能为空')
    })

    it('应该拒绝 null', () => {
      const result = validateBase64Icon(null as unknown as string)
      expect(result.valid).toBe(false)
    })

    it('应该拒绝纯空格', () => {
      const result = validateBase64Icon('   ')
      expect(result.valid).toBe(false)
    })

    it('应该拒绝无效的 data URI 格式', () => {
      const result = validateBase64Icon('not a data uri')
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('data URI 格式')
    })

    it('应该拒绝缺少 base64 标识的 data URI', () => {
      const result = validateBase64Icon('data:image/png,abc')
      expect(result.valid).toBe(false)
    })

    it('应该拒绝不支持的 MIME 类型', () => {
      const result = validateBase64Icon('data:image/bmp;base64,Qk0=')
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('不支持的图片格式')
    })

    it('应该拒绝非图片 MIME 类型', () => {
      const result = validateBase64Icon('data:text/plain;base64,SGVsbG8=')
      expect(result.valid).toBe(false)
    })
  })

  describe('大小限制', () => {
    it('应该拒绝超过 100KB 的图标', () => {
      // 创建一个超过 100KB 的 Base64 数据
      // 100KB = 102400 bytes, Base64 编码后约 136534 字符
      const largeData = 'A'.repeat(140000)
      const result = validateBase64Icon(`data:image/png;base64,${largeData}`)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('100KB'))).toBe(true)
    })

    it('应该接受刚好 100KB 的图标', () => {
      // 创建一个刚好 100KB 的 Base64 数据
      // 100KB = 102400 bytes, Base64 编码后约 136534 字符
      const exactData = 'A'.repeat(136532)
      const result = validateBase64Icon(`data:image/png;base64,${exactData}`)
      // 这里只检查大小限制，不检查 Base64 有效性
      expect(result.errors.some(e => e.includes('100KB'))).toBe(false)
    })
  })
})

describe('isValidBase64', () => {
  it('应该接受有效的 Base64 字符串', () => {
    expect(isValidBase64('SGVsbG8=')).toBe(true)
    expect(isValidBase64('SGVsbG8gV29ybGQ=')).toBe(true)
  })

  it('应该接受无填充的 Base64', () => {
    expect(isValidBase64('AAAA')).toBe(true)
  })

  it('应该接受带填充的 Base64', () => {
    expect(isValidBase64('AA==')).toBe(true)
    expect(isValidBase64('AAA=')).toBe(true)
  })

  it('应该拒绝空字符串', () => {
    expect(isValidBase64('')).toBe(false)
  })

  it('应该拒绝包含非法字符的字符串', () => {
    expect(isValidBase64('Hello!')).toBe(false)
    expect(isValidBase64('Hello World')).toBe(false)
  })

  it('应该拒绝长度不是 4 倍数的字符串', () => {
    expect(isValidBase64('ABC')).toBe(false)
    expect(isValidBase64('ABCDE')).toBe(false)
  })
})

describe('parseBase64DataUri', () => {
  it('应该正确解析有效的 data URI', () => {
    const result = parseBase64DataUri('data:image/png;base64,iVBORw0KGgo=')
    expect(result.mimeType).toBe('image/png')
    expect(result.base64Data).toBe('iVBORw0KGgo=')
  })

  it('应该处理 svg+xml MIME 类型', () => {
    const result = parseBase64DataUri('data:image/svg+xml;base64,PHN2Zz4=')
    expect(result.mimeType).toBe('image/svg+xml')
  })

  it('应该返回 null 对于无效输入', () => {
    expect(parseBase64DataUri('')).toEqual({ mimeType: null, base64Data: null })
    expect(parseBase64DataUri('invalid')).toEqual({ mimeType: null, base64Data: null })
    expect(parseBase64DataUri(null as unknown as string)).toEqual({ mimeType: null, base64Data: null })
  })
})

describe('validateIconData', () => {
  const validSmallPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  describe('URL 类型', () => {
    it('应该接受有效的 URL 图标', () => {
      const result = validateIconData({
        type: 'URL',
        value: 'https://example.com/icon.png',
      })
      expect(result.valid).toBe(true)
    })

    it('应该拒绝无效的 URL 图标', () => {
      const result = validateIconData({
        type: 'URL',
        value: 'not a url',
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('图标 URL 格式无效')
    })
  })

  describe('BASE64 类型', () => {
    it('应该接受有效的 Base64 图标', () => {
      const result = validateIconData({
        type: 'BASE64',
        value: validSmallPng,
      })
      expect(result.valid).toBe(true)
    })

    it('应该拒绝无效的 Base64 图标', () => {
      const result = validateIconData({
        type: 'BASE64',
        value: 'invalid base64',
      })
      expect(result.valid).toBe(false)
    })
  })

  describe('无效输入', () => {
    it('应该拒绝 null', () => {
      const result = validateIconData(null as unknown as { type: 'URL' | 'BASE64'; value: string })
      expect(result.valid).toBe(false)
    })

    it('应该拒绝无效的类型', () => {
      const result = validateIconData({
        type: 'INVALID' as 'URL',
        value: 'test',
      })
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('图标类型无效')
    })

    it('应该拒绝空值', () => {
      const result = validateIconData({
        type: 'URL',
        value: '',
      })
      expect(result.valid).toBe(false)
    })
  })
})

describe('getBase64MimeType', () => {
  it('应该返回正确的 MIME 类型', () => {
    expect(getBase64MimeType('data:image/png;base64,abc=')).toBe('image/png')
    expect(getBase64MimeType('data:image/jpeg;base64,abc=')).toBe('image/jpeg')
  })

  it('应该返回 null 对于无效输入', () => {
    expect(getBase64MimeType('invalid')).toBe(null)
    expect(getBase64MimeType('')).toBe(null)
  })
})

describe('getBase64Size', () => {
  it('应该返回正确的估算大小', () => {
    // 4 个 Base64 字符 = 3 字节
    const size = getBase64Size('data:image/png;base64,AAAA')
    expect(size).toBe(3)
  })

  it('应该返回 0 对于无效输入', () => {
    expect(getBase64Size('invalid')).toBe(0)
    expect(getBase64Size('')).toBe(0)
  })
})

describe('IconValidation 常量', () => {
  it('应该有正确的最大 Base64 大小', () => {
    expect(IconValidation.maxBase64Size).toBe(100 * 1024)
  })

  it('应该包含所有支持的 MIME 类型', () => {
    expect(IconValidation.allowedMimeTypes).toContain('image/png')
    expect(IconValidation.allowedMimeTypes).toContain('image/jpeg')
    expect(IconValidation.allowedMimeTypes).toContain('image/gif')
    expect(IconValidation.allowedMimeTypes).toContain('image/svg+xml')
    expect(IconValidation.allowedMimeTypes).toContain('image/webp')
  })
})

describe('serializeIcon', () => {
  describe('有效的图标数据', () => {
    it('应该正确序列化 URL 类型图标', () => {
      const icon: IconData = {
        type: 'URL',
        value: 'https://example.com/icon.png',
      }
      const result = serializeIcon(icon)
      expect(result).toBe('{"type":"URL","value":"https://example.com/icon.png"}')
    })

    it('应该正确序列化 BASE64 类型图标', () => {
      const icon: IconData = {
        type: 'BASE64',
        value: 'data:image/png;base64,iVBORw0KGgo=',
      }
      const result = serializeIcon(icon)
      expect(result).toBe('{"type":"BASE64","value":"data:image/png;base64,iVBORw0KGgo="}')
    })

    it('应该保留空字符串值', () => {
      const icon: IconData = {
        type: 'URL',
        value: '',
      }
      const result = serializeIcon(icon)
      expect(result).toBe('{"type":"URL","value":""}')
    })
  })

  describe('无效的图标数据', () => {
    it('应该拒绝 null', () => {
      expect(() => serializeIcon(null as unknown as IconData)).toThrow('图标数据不能为空')
    })

    it('应该拒绝 undefined', () => {
      expect(() => serializeIcon(undefined as unknown as IconData)).toThrow('图标数据不能为空')
    })

    it('应该拒绝无效的类型', () => {
      expect(() => serializeIcon({ type: 'INVALID' as 'URL', value: 'test' })).toThrow('图标类型无效')
    })

    it('应该拒绝缺少类型', () => {
      expect(() => serializeIcon({ value: 'test' } as unknown as IconData)).toThrow('图标类型无效')
    })

    it('应该拒绝 null 值', () => {
      expect(() => serializeIcon({ type: 'URL', value: null as unknown as string })).toThrow('图标值不能为空')
    })

    it('应该拒绝 undefined 值', () => {
      expect(() => serializeIcon({ type: 'URL', value: undefined as unknown as string })).toThrow('图标值不能为空')
    })
  })
})

describe('deserializeIcon', () => {
  describe('有效的 JSON 字符串', () => {
    it('应该正确反序列化 URL 类型图标', () => {
      const json = '{"type":"URL","value":"https://example.com/icon.png"}'
      const result = deserializeIcon(json)
      expect(result).toEqual({
        type: 'URL',
        value: 'https://example.com/icon.png',
      })
    })

    it('应该正确反序列化 BASE64 类型图标', () => {
      const json = '{"type":"BASE64","value":"data:image/png;base64,iVBORw0KGgo="}'
      const result = deserializeIcon(json)
      expect(result).toEqual({
        type: 'BASE64',
        value: 'data:image/png;base64,iVBORw0KGgo=',
      })
    })

    it('应该处理带空格的 JSON 字符串', () => {
      const json = '  {"type":"URL","value":"https://example.com/icon.png"}  '
      const result = deserializeIcon(json)
      expect(result.type).toBe('URL')
    })

    it('应该处理空字符串值', () => {
      const json = '{"type":"URL","value":""}'
      const result = deserializeIcon(json)
      expect(result.value).toBe('')
    })
  })

  describe('无效的 JSON 字符串', () => {
    it('应该拒绝空字符串', () => {
      expect(() => deserializeIcon('')).toThrow('JSON 字符串不能为空')
    })

    it('应该拒绝 null', () => {
      expect(() => deserializeIcon(null as unknown as string)).toThrow('JSON 字符串不能为空')
    })

    it('应该拒绝纯空格', () => {
      expect(() => deserializeIcon('   ')).toThrow('JSON 字符串不能为空')
    })

    it('应该拒绝无效的 JSON 格式', () => {
      expect(() => deserializeIcon('not json')).toThrow('JSON 格式无效')
    })

    it('应该拒绝非对象 JSON', () => {
      expect(() => deserializeIcon('"string"')).toThrow('JSON 数据必须是对象')
    })

    it('应该拒绝数组 JSON', () => {
      expect(() => deserializeIcon('[]')).toThrow('JSON 数据必须是对象')
    })

    it('应该拒绝无效的类型', () => {
      expect(() => deserializeIcon('{"type":"INVALID","value":"test"}')).toThrow('图标类型无效')
    })

    it('应该拒绝缺少类型', () => {
      expect(() => deserializeIcon('{"value":"test"}')).toThrow('图标类型无效')
    })

    it('应该拒绝缺少值', () => {
      expect(() => deserializeIcon('{"type":"URL"}')).toThrow('图标值必须是字符串')
    })

    it('应该拒绝非字符串值', () => {
      expect(() => deserializeIcon('{"type":"URL","value":123}')).toThrow('图标值必须是字符串')
    })

    it('应该拒绝 null 值', () => {
      expect(() => deserializeIcon('{"type":"URL","value":null}')).toThrow('图标值必须是字符串')
    })
  })
})

describe('序列化往返一致性', () => {
  /**
   * Requirements: 9.3
   * 序列化后再反序列化应产生等价的对象
   */
  it('URL 类型图标应保持往返一致性', () => {
    const original: IconData = {
      type: 'URL',
      value: 'https://example.com/icon.png',
    }
    const serialized = serializeIcon(original)
    const deserialized = deserializeIcon(serialized)
    expect(deserialized).toEqual(original)
  })

  it('BASE64 类型图标应保持往返一致性', () => {
    const original: IconData = {
      type: 'BASE64',
      value: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    }
    const serialized = serializeIcon(original)
    const deserialized = deserializeIcon(serialized)
    expect(deserialized).toEqual(original)
  })

  it('空值图标应保持往返一致性', () => {
    const original: IconData = {
      type: 'URL',
      value: '',
    }
    const serialized = serializeIcon(original)
    const deserialized = deserializeIcon(serialized)
    expect(deserialized).toEqual(original)
  })

  it('包含特殊字符的 URL 应保持往返一致性', () => {
    const original: IconData = {
      type: 'URL',
      value: 'https://example.com/icon.png?size=32&format=png#section',
    }
    const serialized = serializeIcon(original)
    const deserialized = deserializeIcon(serialized)
    expect(deserialized).toEqual(original)
  })

  it('包含中文的 URL 应保持往返一致性', () => {
    const original: IconData = {
      type: 'URL',
      value: 'https://example.com/图标.png',
    }
    const serialized = serializeIcon(original)
    const deserialized = deserializeIcon(serialized)
    expect(deserialized).toEqual(original)
  })
})
