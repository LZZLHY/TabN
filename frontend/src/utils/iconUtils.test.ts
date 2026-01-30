/**
 * iconUtils 单元测试
 * 测试图标工具函数的各种场景
 *
 * Validates: Requirements 6.1-6.6
 */

import { describe, it, expect } from 'vitest'
import {
  computeIconBgStyle,
  getIconSrc,
  isTextIcon,
  parseTextIconData,
  computeBorderRadiusStyle,
} from './iconUtils'

describe('iconUtils', () => {
  /**
   * computeIconBgStyle 函数测试
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   */
  describe('computeIconBgStyle', () => {
    describe('透明背景 (transparent)', () => {
      it('应返回空 className 且无 style', () => {
        const result = computeIconBgStyle('transparent', 'full', false)
        expect(result.className).toBe('')
        expect(result.style).toBeUndefined()
      })

      it('无论 variant 和 hasCustomIcon 如何，透明背景都应一致', () => {
        const variants = ['full', 'mini', 'tiny', 'micro'] as const
        for (const variant of variants) {
          const result1 = computeIconBgStyle('transparent', variant, true)
          const result2 = computeIconBgStyle('transparent', variant, false)
          expect(result1.className).toBe('')
          expect(result1.style).toBeUndefined()
          expect(result2.className).toBe('')
          expect(result2.style).toBeUndefined()
        }
      })
    })

    describe('自定义颜色背景 (#RRGGBB)', () => {
      it('应使用 hex 颜色作为 backgroundColor', () => {
        const result = computeIconBgStyle('#FF5733', 'full', true)
        expect(result.className).toBe('')
        expect(result.style).toEqual({ backgroundColor: '#FF5733' })
      })

      it('应支持各种有效的 hex 颜色', () => {
        const colors = ['#000000', '#FFFFFF', '#123456', '#ABCDEF', '#aabbcc']
        for (const color of colors) {
          const result = computeIconBgStyle(color, 'full', true)
          expect(result.style?.backgroundColor).toBe(color)
        }
      })

      it('应支持小写 hex 颜色', () => {
        const result = computeIconBgStyle('#ff5733', 'mini', false)
        expect(result.style?.backgroundColor).toBe('#ff5733')
      })
    })

    describe('默认毛玻璃效果 (default)', () => {
      it('应返回毛玻璃样式', () => {
        const result = computeIconBgStyle('default', 'full', true)
        expect(result.className).toBe('')
        expect(result.style).toBeDefined()
        expect(result.style?.backdropFilter).toContain('blur')
        expect(result.style?.backgroundColor).toContain('rgba')
      })

      it('null/undefined iconBg 应使用默认毛玻璃效果', () => {
        const resultNull = computeIconBgStyle(null, 'full', true)
        const resultUndefined = computeIconBgStyle(undefined, 'full', true)

        expect(resultNull.style?.backdropFilter).toContain('blur')
        expect(resultUndefined.style?.backdropFilter).toContain('blur')
      })
    })

    describe('带主题色的毛玻璃效果 (default:primary)', () => {
      it('应返回带 primary 类名的毛玻璃样式', () => {
        const result = computeIconBgStyle('default:primary', 'full', true)
        expect(result.className).toBe('bg-primary/20')
        expect(result.style?.backdropFilter).toContain('blur')
        expect(result.style?.boxShadow).toContain('inset')
      })
    })

    describe('指定模糊强度 (default:blur:N)', () => {
      it('应根据 blur 值计算模糊强度', () => {
        const result = computeIconBgStyle('default:blur:50', 'full', true)
        expect(result.style?.backdropFilter).toBe('blur(5px)')
      })

      it('blur:0 应无模糊效果', () => {
        const result = computeIconBgStyle('default:blur:0', 'full', true)
        expect(result.style?.backdropFilter).toBeUndefined()
      })

      it('blur:100 应有最大模糊效果', () => {
        const result = computeIconBgStyle('default:blur:100', 'full', true)
        expect(result.style?.backdropFilter).toBe('blur(10px)')
      })
    })

    describe('组合格式 (default:primary:blur:N)', () => {
      it('应同时应用主题色和指定模糊强度', () => {
        const result = computeIconBgStyle(
          'default:primary:blur:50',
          'full',
          true
        )
        expect(result.className).toBe('bg-primary/20')
        expect(result.style?.backdropFilter).toBe('blur(5px)')
        expect(result.style?.boxShadow).toContain('inset')
      })

      it('顺序不同也应正确解析', () => {
        const result = computeIconBgStyle(
          'default:blur:70:primary',
          'full',
          true
        )
        expect(result.className).toBe('bg-primary/20')
        expect(result.style?.backdropFilter).toBe('blur(7px)')
      })
    })

    describe('无自定义图标时的默认背景', () => {
      it('hasCustomIcon=false 且无 iconBg 时应使用默认样式', () => {
        const result = computeIconBgStyle(null, 'full', false)
        // 默认毛玻璃效果
        expect(result.style?.backdropFilter).toContain('blur')
      })
    })
  })

  /**
   * getIconSrc 函数测试
   * Validates: Requirements 6.1
   */
  describe('getIconSrc', () => {
    describe('BASE64 类型图标', () => {
      it('应直接返回 iconData', () => {
        const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        const result = getIconSrc({
          iconType: 'BASE64',
          iconData: base64Data,
        })
        expect(result).toBe(base64Data)
      })

      it('iconData 为空时应返回 null', () => {
        const result = getIconSrc({
          iconType: 'BASE64',
          iconData: null,
        })
        expect(result).toBeNull()
      })

      it('iconData 为 undefined 时应返回 null', () => {
        const result = getIconSrc({
          iconType: 'BASE64',
          iconData: undefined,
        })
        expect(result).toBeNull()
      })
    })

    describe('URL 类型图标', () => {
      it('应返回 iconUrl', () => {
        const result = getIconSrc({
          iconType: 'URL',
          iconUrl: 'https://example.com/icon.png',
          url: 'https://example.com',
        })
        expect(result).toBe('https://example.com/icon.png')
      })
    })

    describe('来源标记 (source:google)', () => {
      it('应根据来源生成正确的 URL', () => {
        const result = getIconSrc({
          iconUrl: 'source:google',
          url: 'https://example.com/page',
        })
        expect(result).toBe(
          'https://www.google.com/s2/favicons?sz=64&domain=example.com'
        )
      })

      it('source:duckduckgo 应生成 DuckDuckGo URL', () => {
        const result = getIconSrc({
          iconUrl: 'source:duckduckgo',
          url: 'https://github.com/user/repo',
        })
        expect(result).toBe('https://icons.duckduckgo.com/ip3/github.com.ico')
      })

      it('source:iconhorse 应生成 Icon Horse URL', () => {
        const result = getIconSrc({
          iconUrl: 'source:iconhorse',
          url: 'https://twitter.com',
        })
        expect(result).toBe('https://icon.horse/icon/twitter.com')
      })
    })

    describe('空值处理', () => {
      it('无 iconType 和 iconUrl 时应返回 null', () => {
        const result = getIconSrc({})
        expect(result).toBeNull()
      })

      it('iconUrl 为空字符串时应返回 null', () => {
        const result = getIconSrc({
          iconUrl: '',
          url: 'https://example.com',
        })
        // 空字符串 iconUrl 不满足 if (iconUrl) 条件，返回 null
        expect(result).toBeNull()
      })

      it('url 为空时来源标记应返回空字符串', () => {
        const result = getIconSrc({
          iconUrl: 'source:google',
          url: null,
        })
        expect(result).toBe('')
      })
    })
  })

  /**
   * isTextIcon 函数测试
   * Validates: Requirements 6.1
   */
  describe('isTextIcon', () => {
    describe('TEXT 类型返回 true', () => {
      it('iconType 为 "TEXT" 时应返回 true', () => {
        expect(isTextIcon('TEXT')).toBe(true)
      })
    })

    describe('其他类型返回 false', () => {
      it('iconType 为 "AUTO" 时应返回 false', () => {
        expect(isTextIcon('AUTO')).toBe(false)
      })

      it('iconType 为 "BASE64" 时应返回 false', () => {
        expect(isTextIcon('BASE64')).toBe(false)
      })

      it('iconType 为 "URL" 时应返回 false', () => {
        expect(isTextIcon('URL')).toBe(false)
      })

      it('iconType 为其他字符串时应返回 false', () => {
        expect(isTextIcon('UNKNOWN')).toBe(false)
        expect(isTextIcon('text')).toBe(false) // 大小写敏感
        expect(isTextIcon('Text')).toBe(false)
      })
    })

    describe('null/undefined 处理', () => {
      it('iconType 为 null 时应返回 false', () => {
        expect(isTextIcon(null)).toBe(false)
      })

      it('iconType 为 undefined 时应返回 false', () => {
        expect(isTextIcon(undefined)).toBe(false)
      })

      it('iconType 为空字符串时应返回 false', () => {
        expect(isTextIcon('')).toBe(false)
      })
    })
  })

  /**
   * parseTextIconData 函数测试
   * Validates: Requirements 6.1
   */
  describe('parseTextIconData', () => {
    describe('有效 JSON 解析', () => {
      it('应正确解析完整配置', () => {
        const json = JSON.stringify({
          t: 'AB',
          c: '#FF5733',
          f: 'mono',
          s: 60,
        })
        const result = parseTextIconData(json)
        expect(result.text).toBe('AB')
        expect(result.color).toBe('#FF5733')
        expect(result.fontFamily).toBe('mono')
        expect(result.fontSize).toBe(60)
      })

      it('应正确解析最小配置', () => {
        const json = JSON.stringify({ t: 'A', c: '#000000', f: 'system' })
        const result = parseTextIconData(json)
        expect(result.text).toBe('A')
        expect(result.color).toBe('#000000')
        expect(result.fontFamily).toBe('system')
      })

      it('应正确处理默认字号', () => {
        const json = JSON.stringify({ t: 'X', c: '#FFFFFF', f: 'serif' })
        const result = parseTextIconData(json)
        // 未指定字号时，parseTextIconConfig 返回默认值 50
        expect(result.fontSize).toBe(50)
      })

      it('应正确解析 4 字符文字', () => {
        const json = JSON.stringify({ t: 'ABCD', c: '#123456', f: 'system' })
        const result = parseTextIconData(json)
        expect(result.text).toBe('ABCD')
      })
    })

    describe('无效 JSON 处理', () => {
      it('无效 JSON 字符串应返回空文字', () => {
        const result = parseTextIconData('invalid json')
        expect(result.text).toBe('')
      })

      it('空对象 JSON 应返回空文字', () => {
        const result = parseTextIconData('{}')
        expect(result.text).toBe('')
      })

      it('数组 JSON 应返回空文字', () => {
        const result = parseTextIconData('[]')
        expect(result.text).toBe('')
      })
    })

    describe('null/undefined 处理', () => {
      it('null 应返回空文字', () => {
        const result = parseTextIconData(null)
        expect(result.text).toBe('')
      })

      it('undefined 应返回空文字', () => {
        const result = parseTextIconData(undefined)
        expect(result.text).toBe('')
      })

      it('空字符串应返回空文字', () => {
        const result = parseTextIconData('')
        expect(result.text).toBe('')
      })
    })

    describe('边界情况', () => {
      it('超长文字应被截断为 4 字符', () => {
        const json = JSON.stringify({
          t: 'ABCDEFGH',
          c: '#000000',
          f: 'system',
        })
        const result = parseTextIconData(json)
        expect(result.text).toBe('ABCD')
      })

      it('无效颜色格式应返回 undefined', () => {
        const json = JSON.stringify({ t: 'A', c: 'red', f: 'system' })
        const result = parseTextIconData(json)
        expect(result.color).toBeUndefined()
      })

      it('无效字体应使用默认值', () => {
        const json = JSON.stringify({
          t: 'A',
          c: '#000000',
          f: 'invalid-font',
        })
        const result = parseTextIconData(json)
        expect(result.fontFamily).toBe('system')
      })

      it('字号超出范围应使用默认值 50', () => {
        const jsonTooSmall = JSON.stringify({
          t: 'A',
          c: '#000000',
          f: 'system',
          s: 5,
        })
        const jsonTooLarge = JSON.stringify({
          t: 'A',
          c: '#000000',
          f: 'system',
          s: 150,
        })
        const resultSmall = parseTextIconData(jsonTooSmall)
        const resultLarge = parseTextIconData(jsonTooLarge)
        // 默认字号为 50，超出范围时使用默认值
        expect(resultSmall.fontSize).toBe(50)
        expect(resultLarge.fontSize).toBe(50)
      })
    })
  })

  /**
   * computeBorderRadiusStyle 函数测试
   * Validates: Requirements 6.1
   */
  describe('computeBorderRadiusStyle', () => {
    describe('数字圆角转换为像素字符串', () => {
      it('应将数字转换为像素字符串', () => {
        const result = computeBorderRadiusStyle(8, 'full')
        expect(result.containerRadius).toBe('8px')
        expect(result.imageRadius).toBe('8px')
      })

      it('0 应转换为 "0px"', () => {
        const result = computeBorderRadiusStyle(0, 'full')
        expect(result.containerRadius).toBe('0px')
        expect(result.imageRadius).toBe('0px')
      })

      it('大数值应正确转换', () => {
        const result = computeBorderRadiusStyle(100, 'full')
        expect(result.containerRadius).toBe('100px')
        expect(result.imageRadius).toBe('100px')
      })
    })

    describe('字符串圆角原样返回', () => {
      it('百分比字符串应原样返回', () => {
        const result = computeBorderRadiusStyle('50%', 'full')
        expect(result.containerRadius).toBe('50%')
        expect(result.imageRadius).toBe('50%')
      })

      it('像素字符串应原样返回', () => {
        const result = computeBorderRadiusStyle('8px', 'full')
        expect(result.containerRadius).toBe('8px')
        expect(result.imageRadius).toBe('8px')
      })

      it('rem 字符串应原样返回', () => {
        const result = computeBorderRadiusStyle('0.5rem', 'full')
        expect(result.containerRadius).toBe('0.5rem')
        expect(result.imageRadius).toBe('0.5rem')
      })

      it('CSS 变量应原样返回', () => {
        const result = computeBorderRadiusStyle('var(--custom-radius)', 'full')
        expect(result.containerRadius).toBe('var(--custom-radius)')
        expect(result.imageRadius).toBe('var(--custom-radius)')
      })
    })

    describe('未传入时使用 variant 默认值', () => {
      it('full variant 应使用 var(--start-radius)', () => {
        const result = computeBorderRadiusStyle(undefined, 'full')
        expect(result.containerRadius).toBe('var(--start-radius)')
        expect(result.imageRadius).toBe('var(--start-radius)')
      })

      it('mini variant 应使用 2px', () => {
        const result = computeBorderRadiusStyle(undefined, 'mini')
        expect(result.containerRadius).toBe('2px')
        expect(result.imageRadius).toBe('2px')
      })

      it('tiny variant 应使用 1px', () => {
        const result = computeBorderRadiusStyle(undefined, 'tiny')
        expect(result.containerRadius).toBe('1px')
        expect(result.imageRadius).toBe('1px')
      })

      it('micro variant 应使用 0.5px', () => {
        const result = computeBorderRadiusStyle(undefined, 'micro')
        expect(result.containerRadius).toBe('0.5px')
        expect(result.imageRadius).toBe('0.5px')
      })
    })

    describe('容器和图片圆角一致性', () => {
      it('containerRadius 和 imageRadius 应始终相等', () => {
        const testCases = [
          { borderRadius: 10, variant: 'full' as const },
          { borderRadius: '25%', variant: 'mini' as const },
          { borderRadius: undefined, variant: 'tiny' as const },
          { borderRadius: 0, variant: 'micro' as const },
        ]

        for (const { borderRadius, variant } of testCases) {
          const result = computeBorderRadiusStyle(borderRadius, variant)
          expect(result.containerRadius).toBe(result.imageRadius)
        }
      })
    })
  })
})
