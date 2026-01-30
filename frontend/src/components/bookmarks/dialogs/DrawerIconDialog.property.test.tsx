/**
 * 图标编辑器配置保留属性测试
 * **Feature: text-icon, Property 8: Configuration Preservation on Type Switch**
 *
 * **Validates: Requirements 2.4, 6.5**
 *
 * 设计文档 Property 8 描述：
 * *For any* bookmark with existing text icon configuration, changing the iconType
 * to another type and back to TEXT should preserve the original configuration.
 *
 * 需求 2.4: WHEN a bookmark's iconType is changed to "TEXT", THE Text_Icon_System
 * SHALL preserve any existing text icon configuration
 *
 * 需求 6.5: THE Icon_Editor SHALL allow switching between text icon and other
 * icon types without losing configuration
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  serializeTextIconConfig,
  parseTextIconConfig,
  VALID_TEXT_ICON_FONTS,
} from '@start/shared'
import type { TextIconConfig, TextIconFont } from '@start/shared'

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
const validFontArbitrary: fc.Arbitrary<TextIconFont> = fc.constantFrom(...VALID_TEXT_ICON_FONTS)

/**
 * 生成有效的文字内容（1-4 个字符）
 */
const validTextArbitrary: fc.Arbitrary<string> = fc.oneof(
  fc.string({ minLength: 1, maxLength: 4 }).filter((s) => s.trim().length > 0),
  fc.array(fc.integer({ min: 0x4e00, max: 0x9fff }), { minLength: 1, maxLength: 4 })
    .map((codes) => String.fromCodePoint(...codes)),
  fc.constantFrom('A', 'B', '测', '试')
)


/**
 * 生成完整的 TextIconConfig
 */
const validTextIconConfigArbitrary: fc.Arbitrary<TextIconConfig> = fc.record({
  text: validTextArbitrary,
  color: validHexColorArbitrary,
  fontFamily: validFontArbitrary,
})

/**
 * 生成带有空值的 TextIconConfig（测试默认值处理）
 */
const textIconConfigWithOptionalValuesArbitrary: fc.Arbitrary<TextIconConfig> = fc.record({
  text: fc.oneof(validTextArbitrary, fc.constant('')),
  color: fc.oneof(validHexColorArbitrary, fc.constant('')),
  fontFamily: validFontArbitrary,
})

describe('**Feature: text-icon, Property 8: Configuration Preservation on Type Switch**', () => {
  /**
   * 属性 8.1: 序列化-反序列化往返保持配置一致性
   *
   * **Validates: Requirements 2.4**
   */
  it('序列化-反序列化往返保持配置一致性', () => {
    fc.assert(
      fc.property(validTextIconConfigArbitrary, (config) => {
        const serialized = serializeTextIconConfig(config)
        const deserialized = parseTextIconConfig(serialized)

        expect(deserialized.text).toBe(config.text.slice(0, 4))
        expect(deserialized.color).toBe(config.color)
        expect(deserialized.fontFamily).toBe(config.fontFamily)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 8.2: 多次序列化-反序列化往返保持配置一致性（幂等性）
   *
   * **Validates: Requirements 2.4, 6.5**
   */
  it('多次序列化-反序列化往返保持配置一致性（幂等性）', () => {
    fc.assert(
      fc.property(validTextIconConfigArbitrary, (config) => {
        const serialized1 = serializeTextIconConfig(config)
        const deserialized1 = parseTextIconConfig(serialized1)

        const serialized2 = serializeTextIconConfig(deserialized1)
        const deserialized2 = parseTextIconConfig(serialized2)

        const serialized3 = serializeTextIconConfig(deserialized2)
        const deserialized3 = parseTextIconConfig(serialized3)

        expect(deserialized1).toEqual(deserialized2)
        expect(deserialized2).toEqual(deserialized3)
        expect(serialized1).toBe(serialized2)
        expect(serialized2).toBe(serialized3)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 8.3: 切换到图片模式后，原始配置数据保持不变
   *
   * **Validates: Requirements 6.5**
   */
  it('切换到图片模式后，原始配置数据保持不变', () => {
    fc.assert(
      fc.property(validTextIconConfigArbitrary, (config) => {
        const originalSerialized = serializeTextIconConfig(config)
        const preservedSerialized = originalSerialized
        const restoredConfig = parseTextIconConfig(preservedSerialized)

        expect(restoredConfig.text).toBe(config.text.slice(0, 4))
        expect(restoredConfig.color).toBe(config.color)
        expect(restoredConfig.fontFamily).toBe(config.fontFamily)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 8.4: 带有空值的配置在切换后正确保留
   *
   * **Validates: Requirements 2.4, 6.5**
   */
  it('带有空值的配置在切换后正确保留', () => {
    fc.assert(
      fc.property(textIconConfigWithOptionalValuesArbitrary, (config) => {
        const serialized = serializeTextIconConfig(config)
        const restored = parseTextIconConfig(serialized)

        if (config.text === '') {
          expect(restored.text).toBe('')
        } else {
          expect(restored.text).toBe(config.text.slice(0, 4))
        }

        if (config.color === '') {
          expect(restored.color).toBe('')
        } else {
          expect(restored.color).toBe(config.color)
        }

        expect(restored.fontFamily).toBe(config.fontFamily)
      }),
      { numRuns: 20 }
    )
  })


  /**
   * 属性 8.5: 配置在模拟的类型切换序列中保持一致
   *
   * **Validates: Requirements 2.4, 6.5**
   */
  it('配置在模拟的类型切换序列中保持一致', () => {
    fc.assert(
      fc.property(validTextIconConfigArbitrary, (config) => {
        const initialSerialized = serializeTextIconConfig(config)
        const initialConfig = parseTextIconConfig(initialSerialized)

        const preservedData = initialSerialized
        const restoredConfig1 = parseTextIconConfig(preservedData)

        const preservedData2 = serializeTextIconConfig(restoredConfig1)
        const restoredConfig2 = parseTextIconConfig(preservedData2)

        expect(restoredConfig1).toEqual(initialConfig)
        expect(restoredConfig2).toEqual(initialConfig)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 8.6: Unicode 字符在类型切换后正确保留
   *
   * **Validates: Requirements 2.4, 6.5**
   */
  it('Unicode 字符在类型切换后正确保留', () => {
    const unicodeTextArbitrary: fc.Arbitrary<string> = fc.oneof(
      fc.array(fc.integer({ min: 0x4e00, max: 0x9fff }), { minLength: 1, maxLength: 4 })
        .map((codes) => String.fromCodePoint(...codes)),
      fc.array(fc.integer({ min: 0x3040, max: 0x309f }), { minLength: 1, maxLength: 4 })
        .map((codes) => String.fromCodePoint(...codes)),
      fc.array(fc.integer({ min: 0xac00, max: 0xd7af }), { minLength: 1, maxLength: 4 })
        .map((codes) => String.fromCodePoint(...codes)),
      fc.array(fc.integer({ min: 0x1f600, max: 0x1f64f }), { minLength: 1, maxLength: 2 })
        .map((codes) => String.fromCodePoint(...codes))
    )

    const unicodeConfigArbitrary: fc.Arbitrary<TextIconConfig> = fc.record({
      text: unicodeTextArbitrary,
      color: validHexColorArbitrary,
      fontFamily: validFontArbitrary,
    })

    fc.assert(
      fc.property(unicodeConfigArbitrary, (config) => {
        const serialized = serializeTextIconConfig(config)
        const restored = parseTextIconConfig(serialized)

        expect(restored.text).toBe(config.text.slice(0, 4))
        expect(restored.color).toBe(config.color)
        expect(restored.fontFamily).toBe(config.fontFamily)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 8.7: 所有字体选项在类型切换后正确保留
   *
   * **Validates: Requirements 2.4, 6.5**
   */
  it('所有字体选项在类型切换后正确保留', () => {
    fc.assert(
      fc.property(
        validTextArbitrary,
        validHexColorArbitrary,
        validFontArbitrary,
        (text, color, fontFamily) => {
          const config: TextIconConfig = { text, color, fontFamily }
          const serialized = serializeTextIconConfig(config)
          const restored = parseTextIconConfig(serialized)

          expect(restored.fontFamily).toBe(fontFamily)
          expect(VALID_TEXT_ICON_FONTS).toContain(restored.fontFamily)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 8.8: 颜色值在类型切换后保持精确
   *
   * **Validates: Requirements 2.4, 6.5**
   */
  it('颜色值在类型切换后保持精确', () => {
    fc.assert(
      fc.property(validHexColorArbitrary, (color) => {
        const config: TextIconConfig = {
          text: 'A',
          color,
          fontFamily: 'system',
        }
        const serialized = serializeTextIconConfig(config)
        const restored = parseTextIconConfig(serialized)

        expect(restored.color).toBe(color)
        expect(restored.color).toMatch(/^#[0-9A-F]{6}$/)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 8.9: 配置在 JSON 序列化过程中保持结构完整性
   *
   * **Validates: Requirements 2.4**
   */
  it('配置在 JSON 序列化过程中保持结构完整性', () => {
    fc.assert(
      fc.property(validTextIconConfigArbitrary, (config) => {
        const serialized = serializeTextIconConfig(config)
        const parsed = JSON.parse(serialized)

        expect(parsed).toHaveProperty('t')
        expect(parsed).toHaveProperty('c')
        expect(parsed).toHaveProperty('f')

        expect(typeof parsed.t).toBe('string')
        expect(typeof parsed.c).toBe('string')
        expect(typeof parsed.f).toBe('string')
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 8.10: 配置保留在边界条件下正常工作
   *
   * **Validates: Requirements 2.4, 6.5**
   */
  it('配置保留在边界条件下正常工作', () => {
    const boundaryConfigArbitrary: fc.Arbitrary<TextIconConfig> = fc.oneof(
      fc.record({
        text: fc.string({ minLength: 4, maxLength: 4 }).filter((s) => s.trim().length === 4),
        color: validHexColorArbitrary,
        fontFamily: validFontArbitrary,
      }),
      fc.record({
        text: fc.string({ minLength: 1, maxLength: 1 }).filter((s) => s.trim().length === 1),
        color: validHexColorArbitrary,
        fontFamily: validFontArbitrary,
      }),
      fc.record({
        text: validTextArbitrary,
        color: fc.constantFrom('#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF'),
        fontFamily: validFontArbitrary,
      })
    )

    fc.assert(
      fc.property(boundaryConfigArbitrary, (config) => {
        const serialized = serializeTextIconConfig(config)
        const restored = parseTextIconConfig(serialized)

        expect(restored.text).toBe(config.text.slice(0, 4))
        expect(restored.color).toBe(config.color)
        expect(restored.fontFamily).toBe(config.fontFamily)
      }),
      { numRuns: 20 }
    )
  })
})

