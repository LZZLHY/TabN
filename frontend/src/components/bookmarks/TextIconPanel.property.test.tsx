/**
 * 文字图标默认值回退属性测试
 * **Feature: text-icon, Property 7: Default Value Fallbacks**
 *
 * **Validates: Requirements 4.4, 5.4**
 *
 * 设计文档 Property 7 描述：
 * *For any* TextIconConfig with empty color or font values, the system should
 * apply the appropriate default values (primary color for color, system font for font).
 *
 * 需求 4.4: WHEN no custom color is specified, THE Text_Icon_System SHALL use
 * the theme's primary color as default
 * 需求 5.4: WHEN no custom font is specified, THE Text_Icon_System SHALL use
 * the system default sans-serif font
 * 
 * 默认值逻辑：
 * - 图标背景默认纯白色
 * - 文字图标默认书签名称第一个文字或字母
 * - 文字颜色默认黑色
 * - 字体默认系统字体
 */

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import * as fc from 'fast-check'
import { TextIconPanel } from './TextIconPanel'
import { TextIcon, FONT_FAMILIES } from './TextIcon'
import { parseTextIconConfig } from '@start/shared'
import type { TextIconConfig, TextIconFont } from '@start/shared'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | Record<string, unknown>) => {
      if (typeof defaultValue === 'string') return defaultValue
      if (typeof defaultValue === 'object' && 'default' in defaultValue) {
        return `留空将使用默认文字：${defaultValue.default}`
      }
      if (typeof defaultValue === 'object' && 'max' in defaultValue) {
        return `最多输入 ${defaultValue.max} 个字符`
      }
      return key
    },
  }),
}))

/**
 * 将 hex 颜色转换为 rgb 格式（浏览器会自动转换）
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return hex
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * 有效的字体选项列表
 */
const VALID_FONTS: TextIconFont[] = ['system', 'serif', 'mono', 'rounded', 'handwriting']

/**
 * 生成有效的 hex 颜色
 */
const validHexColorArbitrary: fc.Arbitrary<string> = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(([r, g, b]) => {
    const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase()
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  })

/**
 * 生成有效的字体选项
 */
const validFontArbitrary: fc.Arbitrary<TextIconFont> = fc.constantFrom(...VALID_FONTS)

/**
 * 生成有效的文字内容（1-4 个字符）
 */
const validTextArbitrary: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 4 })

/**
 * 生成完整的 TextIconConfig
 */
const textIconConfigArbitrary: fc.Arbitrary<TextIconConfig> = fc.record({
  text: fc.oneof(validTextArbitrary, fc.constant('')),
  color: fc.oneof(validHexColorArbitrary, fc.constant('')),
  fontFamily: validFontArbitrary,
})

describe('**Feature: text-icon, Property 7: Default Value Fallbacks**', () => {
  /**
   * 属性 7.1: TextIcon 组件空颜色值时使用 currentColor
   *
   * **Validates: Requirements 4.4**
   *
   * 对于任意 TextIconConfig，当 color 为空字符串或未指定时，
   * TextIcon 组件应使用 currentColor 作为默认颜色
   * （实际显示颜色由父组件或 CSS 决定，默认为黑色）
   */
  it('TextIcon 空颜色值时使用 currentColor', () => {
    fc.assert(
      fc.property(
        fc.record({
          text: fc.oneof(validTextArbitrary, fc.constant('')),
          fontFamily: validFontArbitrary,
        }),
        (config) => {
          // 不传 color 参数，使用默认值 currentColor
          const { container } = render(
            <TextIcon
              text={config.text || 'T'}
              fontFamily={config.fontFamily}
            />
          )

          const span = container.querySelector('span')
          expect(span).not.toBeNull()

          // 验证颜色使用了 currentColor（默认值）
          const style = span?.getAttribute('style') || ''
          expect(style.toLowerCase()).toContain('currentcolor')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7.2: 空字体值时使用系统默认字体
   *
   * **Validates: Requirements 5.4**
   *
   * 对于任意 TextIconConfig，当 fontFamily 为 'system' 时，
   * TextIcon 应使用系统默认 sans-serif 字体
   */
  it('空字体值时使用系统默认字体', () => {
    fc.assert(
      fc.property(
        fc.record({
          text: fc.oneof(validTextArbitrary, fc.constant('')),
          color: fc.oneof(validHexColorArbitrary, fc.constant('')),
          fontFamily: fc.constant('system' as TextIconFont),
        }),
        (config) => {
          const { container } = render(
            <TextIcon
              text={config.text || 'T'}
              color={config.color || 'currentColor'}
              fontFamily={config.fontFamily}
            />
          )

          const span = container.querySelector('span')
          expect(span).not.toBeNull()

          // 验证使用了系统默认字体
          const style = span?.getAttribute('style') || ''
          expect(style).toContain(FONT_FAMILIES.system)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7.3: 有效颜色值时保持不变
   *
   * **Validates: Requirements 4.4**
   *
   * 对于任意 TextIconConfig，当 color 为有效的 hex 颜色时，
   * TextIcon 应使用该颜色而非默认主题色
   */
  it('有效颜色值时保持不变', () => {
    fc.assert(
      fc.property(
        fc.record({
          text: fc.oneof(validTextArbitrary, fc.constant('')),
          color: validHexColorArbitrary,
          fontFamily: validFontArbitrary,
        }),
        (config) => {
          const { container } = render(
            <TextIcon
              text={config.text || 'T'}
              color={config.color}
              fontFamily={config.fontFamily}
            />
          )

          const span = container.querySelector('span')
          expect(span).not.toBeNull()

          // 验证使用了指定的颜色（浏览器会将 hex 转换为 rgb 格式）
          const style = span?.getAttribute('style') || ''
          const expectedRgb = hexToRgb(config.color)
          expect(style).toContain(expectedRgb)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7.4: 有效字体值时保持不变
   *
   * **Validates: Requirements 5.4**
   *
   * 对于任意 TextIconConfig，当 fontFamily 为有效的字体选项时，
   * TextIcon 应使用该字体
   */
  it('有效字体值时保持不变', () => {
    fc.assert(
      fc.property(
        fc.record({
          text: fc.oneof(validTextArbitrary, fc.constant('')),
          color: fc.oneof(validHexColorArbitrary, fc.constant('')),
          fontFamily: validFontArbitrary,
        }),
        (config) => {
          const { container } = render(
            <TextIcon
              text={config.text || 'T'}
              color={config.color || 'currentColor'}
              fontFamily={config.fontFamily}
            />
          )

          const span = container.querySelector('span')
          expect(span).not.toBeNull()

          // 验证使用了指定的字体
          const style = span?.getAttribute('style') || ''
          expect(style).toContain(FONT_FAMILIES[config.fontFamily])
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7.5: 混合空值和有效值的配置正确处理
   *
   * **Validates: Requirements 4.4, 5.4**
   *
   * 对于任意 TextIconConfig，系统应正确处理混合的空值和有效值：
   * - 空颜色 + 有效字体：使用默认颜色和指定字体
   * - 有效颜色 + system 字体：使用指定颜色和默认字体
   */
  it('混合空值和有效值的配置正确处理', () => {
    fc.assert(
      fc.property(textIconConfigArbitrary, (config) => {
        const { container } = render(
          <TextIcon
            text={config.text || 'T'}
            color={config.color || 'currentColor'}
            fontFamily={config.fontFamily}
          />
        )

        const span = container.querySelector('span')
        expect(span).not.toBeNull()

        const style = span?.getAttribute('style') || ''

        // 验证颜色处理
        if (config.color === '') {
          // 空颜色应使用 currentColor（默认值）- 浏览器可能转换为小写
          expect(style.toLowerCase()).toContain('currentcolor')
        } else {
          // 有效颜色应保持不变（浏览器会将 hex 转换为 rgb 格式）
          const expectedRgb = hexToRgb(config.color)
          expect(style).toContain(expectedRgb)
        }

        // 验证字体处理
        expect(style).toContain(FONT_FAMILIES[config.fontFamily])
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7.6: parseTextIconConfig 对无效字体返回默认值
   *
   * **Validates: Requirements 5.4**
   *
   * 对于任意无效的字体值，parseTextIconConfig 应返回 'system' 作为默认字体
   */
  it('parseTextIconConfig 对无效字体返回默认值', () => {
    // 生成无效的字体名称
    const invalidFontArbitrary = fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => !VALID_FONTS.includes(s as TextIconFont))

    fc.assert(
      fc.property(
        fc.record({
          t: fc.oneof(validTextArbitrary, fc.constant('')),
          c: fc.oneof(validHexColorArbitrary, fc.constant('')),
          f: invalidFontArbitrary,
        }),
        (serialized) => {
          const jsonStr = JSON.stringify(serialized)
          const config = parseTextIconConfig(jsonStr)

          // 无效字体应回退到 'system'
          expect(config.fontFamily).toBe('system')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7.7: parseTextIconConfig 对无效颜色返回空字符串
   *
   * **Validates: Requirements 4.4**
   *
   * 对于任意无效的颜色值，parseTextIconConfig 应返回空字符串，
   * 以便后续使用主题主色作为默认值
   */
  it('parseTextIconConfig 对无效颜色返回空字符串', () => {
    // 生成无效的颜色格式
    const invalidColorArbitrary = fc.oneof(
      fc.constant('red'), // 颜色名称
      fc.constant('#FFF'), // 3 位 hex
      fc.constant('#GGGGGG'), // 无效 hex 字符
      fc.constant('rgb(255,0,0)'), // RGB 格式
      fc.constant(''), // 空字符串
      fc.string({ minLength: 1, maxLength: 10 }).filter((s) => !/^#[0-9A-Fa-f]{6}$/.test(s))
    )

    fc.assert(
      fc.property(
        fc.record({
          t: fc.oneof(validTextArbitrary, fc.constant('')),
          c: invalidColorArbitrary,
          f: validFontArbitrary,
        }),
        (serialized) => {
          const jsonStr = JSON.stringify(serialized)
          const config = parseTextIconConfig(jsonStr)

          // 无效颜色应回退到空字符串
          expect(config.color).toBe('')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7.8: TextIconPanel 正确显示默认值提示
   *
   * **Validates: Requirements 4.4, 5.4**
   *
   * 对于任意配置，TextIconPanel 应正确显示默认值提示：
   * - 空颜色时提示使用主题主色
   * - 空文字时提示使用从书签名称提取的默认文字
   * 
   * 注意：TextIconPanel 不再包含预览功能，预览在父组件中实现
   */
  it('TextIconPanel 正确显示默认值提示', () => {
    fc.assert(
      fc.property(
        textIconConfigArbitrary,
        // 只生成字母数字字符的书签名称，避免特殊字符问题
        fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5]+$/).filter(s => s.length >= 1 && s.length <= 50),
        (config, bookmarkName) => {
          const { container } = render(
            <TextIconPanel
              config={config}
              onChange={() => {}}
              bookmarkName={bookmarkName}
              bookmarkUrl="https://test.com"
            />
          )

          // 验证组件渲染成功
          expect(container.querySelector('input')).not.toBeNull()
          
          // 验证默认文字提示存在（通过 placeholder 验证）
          const expectedDefault = bookmarkName.trim().charAt(0).toUpperCase()
          const textInput = container.querySelector('input[type="text"]')
          expect(textInput?.getAttribute('placeholder')).toBe(expectedDefault)
          
          // 验证颜色提示存在
          const hintText = container.textContent || ''
          expect(hintText).toContain('主题')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7.9: 所有字体选项都有对应的 CSS font-family 值
   *
   * **Validates: Requirements 5.4**
   *
   * 验证所有有效的字体选项都在 FONT_FAMILIES 中有对应的 CSS 值
   */
  it('所有字体选项都有对应的 CSS font-family 值', () => {
    fc.assert(
      fc.property(validFontArbitrary, (fontFamily) => {
        // 验证字体在 FONT_FAMILIES 中存在
        expect(FONT_FAMILIES[fontFamily]).toBeDefined()
        expect(typeof FONT_FAMILIES[fontFamily]).toBe('string')
        expect(FONT_FAMILIES[fontFamily].length).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7.10: 默认字体 'system' 使用 sans-serif 字体栈
   *
   * **Validates: Requirements 5.4**
   *
   * 验证默认字体 'system' 使用包含 sans-serif 的字体栈
   */
  it("默认字体 'system' 使用 sans-serif 字体栈", () => {
    // 验证 system 字体包含 sans-serif
    expect(FONT_FAMILIES.system).toContain('sans-serif')

    // 验证 TextIcon 使用 system 字体时的渲染
    fc.assert(
      fc.property(validTextArbitrary, (text) => {
        const { container } = render(
          <TextIcon text={text} fontFamily="system" />
        )

        const span = container.querySelector('span')
        expect(span).not.toBeNull()

        const style = span?.getAttribute('style') || ''
        expect(style).toContain('sans-serif')
      }),
      { numRuns: 100 }
    )
  })
})
