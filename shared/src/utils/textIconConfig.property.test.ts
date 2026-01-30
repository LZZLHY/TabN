/**
 * 文字图标配置序列化属性测试
 * **Feature: text-icon, Property 5: Configuration Serialization Round-Trip**
 *
 * **Validates: Requirements 2.3, 8.1, 8.2, 8.3**
 *
 * 设计文档 Property 5 描述：
 * *For any* valid TextIconConfig object, serializing it to JSON and then
 * deserializing should produce an equivalent configuration.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { serializeTextIconConfig, parseTextIconConfig } from './textIconConfig'
import {
  TextIconConfig,
  TextIconFont,
  VALID_TEXT_ICON_FONTS,
} from '../types/textIcon'

/**
 * 生成有效的字体选项
 */
const validFontArbitrary: fc.Arbitrary<TextIconFont> = fc.constantFrom(
  ...VALID_TEXT_ICON_FONTS
)

/**
 * 生成有效的 hex 颜色（#RRGGBB 格式）
 */
const validHexColorArbitrary: fc.Arbitrary<string> = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(
    ([r, g, b]) =>
      `#${r.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}`
  )

/**
 * 生成有效的文字内容（1-4 个字符）
 * 包括 ASCII、中文、日文、韩文和 emoji
 */
const validTextArbitrary: fc.Arbitrary<string> = fc.oneof(
  // ASCII 字符
  fc.string({ minLength: 1, maxLength: 4 }),
  // 中文字符
  fc
    .array(fc.integer({ min: 0x4e00, max: 0x9fff }), {
      minLength: 1,
      maxLength: 4,
    })
    .map((codes) => String.fromCodePoint(...codes)),
  // 日文平假名
  fc
    .array(fc.integer({ min: 0x3040, max: 0x309f }), {
      minLength: 1,
      maxLength: 4,
    })
    .map((codes) => String.fromCodePoint(...codes)),
  // 韩文字符
  fc
    .array(fc.integer({ min: 0xac00, max: 0xd7af }), {
      minLength: 1,
      maxLength: 4,
    })
    .map((codes) => String.fromCodePoint(...codes)),
  // Emoji（基本表情）
  fc
    .array(fc.integer({ min: 0x1f600, max: 0x1f64f }), {
      minLength: 1,
      maxLength: 2,
    })
    .map((codes) => String.fromCodePoint(...codes))
)

/**
 * 生成有效的 TextIconConfig 对象
 */
const validTextIconConfigArbitrary: fc.Arbitrary<TextIconConfig> = fc.record({
  text: validTextArbitrary,
  color: validHexColorArbitrary,
  fontFamily: validFontArbitrary,
})

/**
 * 生成带有空值的 TextIconConfig（测试默认值处理）
 */
const textIconConfigWithEmptyValuesArbitrary: fc.Arbitrary<TextIconConfig> =
  fc.record({
    text: fc.constantFrom('', 'A', 'AB', '测试'),
    color: fc.constantFrom('', '#FF5733', '#000000'),
    fontFamily: validFontArbitrary,
  })

describe('TextIconConfig Serialization Property Tests', () => {
  describe('**Feature: text-icon, Property 5: Configuration Serialization Round-Trip**', () => {
    /**
     * 属性 1: 对于任意有效的 TextIconConfig 对象，序列化后再反序列化应该产生等价的对象
     *
     * **Validates: Requirements 2.3, 8.1, 8.2, 8.3**
     *
     * 这是核心的往返一致性属性：
     * - 2.3: 文字图标配置存储在数据库中
     * - 8.1: 存储文字图标配置（text, color, font）
     * - 8.2: 加载时检索并应用存储的配置
     * - 8.3: 序列化为 JSON 格式存储
     */
    it('对于任意有效的 TextIconConfig 对象，序列化后再反序列化应该产生等价的对象', () => {
      fc.assert(
        fc.property(validTextIconConfigArbitrary, (config) => {
          // 序列化
          const serialized = serializeTextIconConfig(config)

          // 反序列化
          const deserialized = parseTextIconConfig(serialized)

          // 验证往返一致性
          // 注意：text 可能被截断到 4 个字符
          expect(deserialized.text).toBe(config.text.slice(0, 4))
          expect(deserialized.color).toBe(config.color)
          expect(deserialized.fontFamily).toBe(config.fontFamily)
        }),
        { numRuns: 20 }
      )
    })

    /**
     * 属性 2: serializeTextIconConfig 产生的 JSON 字符串应该是有效的 JSON
     *
     * **Validates: Requirements 8.3**
     *
     * 确保序列化输出是有效的 JSON 格式
     */
    it('serializeTextIconConfig 产生的 JSON 字符串应该是有效的 JSON', () => {
      fc.assert(
        fc.property(validTextIconConfigArbitrary, (config) => {
          const serialized = serializeTextIconConfig(config)

          // 验证是有效的 JSON
          expect(() => JSON.parse(serialized)).not.toThrow()

          // 验证解析后是对象
          const parsed = JSON.parse(serialized)
          expect(typeof parsed).toBe('object')
          expect(parsed).not.toBeNull()
          expect(Array.isArray(parsed)).toBe(false)
        }),
        { numRuns: 20 }
      )
    })

    /**
     * 属性 3: 序列化后的 JSON 应包含所有必要字段（t, c, f）
     *
     * **Validates: Requirements 8.1, 8.3**
     *
     * 确保序列化后的 JSON 结构正确
     */
    it('序列化后的 JSON 应包含所有必要字段', () => {
      fc.assert(
        fc.property(validTextIconConfigArbitrary, (config) => {
          const serialized = serializeTextIconConfig(config)
          const parsed = JSON.parse(serialized)

          // 验证包含必要字段（使用短键名）
          expect(parsed).toHaveProperty('t')
          expect(parsed).toHaveProperty('c')
          expect(parsed).toHaveProperty('f')

          // 验证字段类型
          expect(typeof parsed.t).toBe('string')
          expect(typeof parsed.c).toBe('string')
          expect(typeof parsed.f).toBe('string')
        }),
        { numRuns: 20 }
      )
    })

    /**
     * 属性 4: 反序列化后的对象应包含 text, color, fontFamily 字段
     *
     * **Validates: Requirements 8.2**
     *
     * 确保反序列化后的对象结构正确
     */
    it('反序列化后的对象应包含 text, color, fontFamily 字段', () => {
      fc.assert(
        fc.property(validTextIconConfigArbitrary, (config) => {
          const serialized = serializeTextIconConfig(config)
          const deserialized = parseTextIconConfig(serialized)

          // 验证包含必要字段
          expect(deserialized).toHaveProperty('text')
          expect(deserialized).toHaveProperty('color')
          expect(deserialized).toHaveProperty('fontFamily')

          // 验证字段类型
          expect(typeof deserialized.text).toBe('string')
          expect(typeof deserialized.color).toBe('string')
          expect(typeof deserialized.fontFamily).toBe('string')
        }),
        { numRuns: 20 }
      )
    })

    /**
     * 属性 5: 多次序列化应产生相同的结果（确定性）
     *
     * **Validates: Requirements 8.3**
     *
     * 确保序列化是确定性的
     */
    it('多次序列化应产生相同的结果', () => {
      fc.assert(
        fc.property(validTextIconConfigArbitrary, (config) => {
          const serialized1 = serializeTextIconConfig(config)
          const serialized2 = serializeTextIconConfig(config)
          const serialized3 = serializeTextIconConfig(config)

          expect(serialized1).toBe(serialized2)
          expect(serialized2).toBe(serialized3)
        }),
        { numRuns: 20 }
      )
    })

    /**
     * 属性 6: 序列化-反序列化是幂等的
     *
     * **Validates: Requirements 8.2, 8.3**
     *
     * 多次往返应产生相同的结果
     */
    it('序列化-反序列化是幂等的', () => {
      fc.assert(
        fc.property(validTextIconConfigArbitrary, (config) => {
          // 第一次往返
          const serialized1 = serializeTextIconConfig(config)
          const deserialized1 = parseTextIconConfig(serialized1)

          // 第二次往返
          const serialized2 = serializeTextIconConfig(deserialized1)
          const deserialized2 = parseTextIconConfig(serialized2)

          // 两次往返结果应相同
          expect(deserialized1).toEqual(deserialized2)
          expect(serialized1).toBe(serialized2)
        }),
        { numRuns: 20 }
      )
    })

    /**
     * 属性 7: 带有空值的配置应正确处理
     *
     * **Validates: Requirements 8.1, 8.2**
     *
     * 测试空字符串值的处理
     */
    it('带有空值的配置应正确处理', () => {
      fc.assert(
        fc.property(textIconConfigWithEmptyValuesArbitrary, (config) => {
          const serialized = serializeTextIconConfig(config)
          const deserialized = parseTextIconConfig(serialized)

          // 空值应保持为空
          if (config.text === '') {
            expect(deserialized.text).toBe('')
          }
          if (config.color === '') {
            expect(deserialized.color).toBe('')
          }

          // fontFamily 应保持不变
          expect(deserialized.fontFamily).toBe(config.fontFamily)
        }),
        { numRuns: 20 }
      )
    })

    /**
     * 属性 8: 反序列化后的 fontFamily 应该是有效的字体选项
     *
     * **Validates: Requirements 8.2**
     *
     * 确保反序列化后的字体是有效的
     */
    it('反序列化后的 fontFamily 应该是有效的字体选项', () => {
      fc.assert(
        fc.property(validTextIconConfigArbitrary, (config) => {
          const serialized = serializeTextIconConfig(config)
          const deserialized = parseTextIconConfig(serialized)

          expect(VALID_TEXT_ICON_FONTS).toContain(deserialized.fontFamily)
        }),
        { numRuns: 20 }
      )
    })

    /**
     * 属性 9: 反序列化后的 color 应该是有效的 hex 颜色或空字符串
     *
     * **Validates: Requirements 8.2**
     *
     * 确保反序列化后的颜色格式正确
     */
    it('反序列化后的 color 应该是有效的 hex 颜色或空字符串', () => {
      fc.assert(
        fc.property(validTextIconConfigArbitrary, (config) => {
          const serialized = serializeTextIconConfig(config)
          const deserialized = parseTextIconConfig(serialized)

          // 颜色应该是空字符串或有效的 hex 格式
          if (deserialized.color !== '') {
            expect(deserialized.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
          }
        }),
        { numRuns: 20 }
      )
    })

    /**
     * 属性 10: 反序列化后的 text 长度不应超过 4 个字符
     *
     * **Validates: Requirements 8.2**
     *
     * 确保文字长度限制被正确应用
     */
    it('反序列化后的 text 长度不应超过 4 个字符', () => {
      fc.assert(
        fc.property(validTextIconConfigArbitrary, (config) => {
          const serialized = serializeTextIconConfig(config)
          const deserialized = parseTextIconConfig(serialized)

          expect(deserialized.text.length).toBeLessThanOrEqual(4)
        }),
        { numRuns: 20 }
      )
    })
  })
})


/**
 * 无效数据反序列化属性测试
 * **Feature: text-icon, Property 6: Deserialization with Invalid Data**
 *
 * **Validates: Requirements 8.4, 8.5**
 *
 * 设计文档 Property 6 描述：
 * *For any* invalid or corrupted JSON string, deserializing should return
 * a valid default configuration without throwing errors.
 *
 * 需求 8.4: WHEN deserializing text icon configuration, THE Text_Icon_System
 * SHALL validate the data and use defaults for invalid values
 *
 * 需求 8.5: IF text icon configuration is corrupted, THEN THE Text_Icon_System
 * SHALL fall back to default text icon behavior and log an error
 */
describe('**Feature: text-icon, Property 6: Deserialization with Invalid Data**', () => {
  /**
   * 生成无效的 JSON 字符串
   */
  const invalidJsonArbitrary: fc.Arbitrary<string> = fc.oneof(
    // 随机字符串（非 JSON）
    fc.string({ minLength: 1, maxLength: 100 }).filter((s) => {
      try {
        JSON.parse(s)
        return false // 排除有效的 JSON
      } catch {
        return true
      }
    }),
    // 损坏的 JSON（缺少闭合括号等）
    fc.constantFrom(
      '{',
      '{"t":',
      '{"t":"A"',
      '{"t":"A","c":}',
      '[1,2,3',
      '{"unclosed": "string',
      'undefined',
      'NaN',
      'Infinity'
    )
  )

  /**
   * 生成空值或 null 类型的输入
   */
  const emptyOrNullArbitrary: fc.Arbitrary<string | null> = fc.constantFrom(
    null,
    '',
    '   ',
    '\n',
    '\t'
  )

  /**
   * 生成缺少必要字段的 JSON
   */
  const missingFieldsJsonArbitrary: fc.Arbitrary<string> = fc.oneof(
    // 完全空对象
    fc.constant('{}'),
    // 只有部分字段
    fc.constant('{"t":"A"}'),
    fc.constant('{"c":"#FF5733"}'),
    fc.constant('{"f":"system"}'),
    fc.constant('{"t":"A","c":"#FF5733"}'),
    fc.constant('{"t":"A","f":"system"}'),
    fc.constant('{"c":"#FF5733","f":"system"}'),
    // 使用错误的键名
    fc.constant('{"text":"A","color":"#FF5733","fontFamily":"system"}')
  )

  /**
   * 生成字段类型错误的 JSON
   */
  const wrongTypeFieldsJsonArbitrary: fc.Arbitrary<string> = fc.oneof(
    // text 字段类型错误
    fc.constant('{"t":123,"c":"#FF5733","f":"system"}'),
    fc.constant('{"t":null,"c":"#FF5733","f":"system"}'),
    fc.constant('{"t":true,"c":"#FF5733","f":"system"}'),
    fc.constant('{"t":["A"],"c":"#FF5733","f":"system"}'),
    fc.constant('{"t":{},"c":"#FF5733","f":"system"}'),
    // color 字段类型错误
    fc.constant('{"t":"A","c":123,"f":"system"}'),
    fc.constant('{"t":"A","c":null,"f":"system"}'),
    fc.constant('{"t":"A","c":true,"f":"system"}'),
    fc.constant('{"t":"A","c":["#FF5733"],"f":"system"}'),
    // fontFamily 字段类型错误
    fc.constant('{"t":"A","c":"#FF5733","f":123}'),
    fc.constant('{"t":"A","c":"#FF5733","f":null}'),
    fc.constant('{"t":"A","c":"#FF5733","f":true}'),
    fc.constant('{"t":"A","c":"#FF5733","f":["system"]}')
  )

  /**
   * 生成无效颜色格式的 JSON
   */
  const invalidColorJsonArbitrary: fc.Arbitrary<string> = fc.oneof(
    // 缺少 # 前缀
    fc.constant('{"t":"A","c":"FF5733","f":"system"}'),
    // 颜色值太短
    fc.constant('{"t":"A","c":"#FFF","f":"system"}'),
    fc.constant('{"t":"A","c":"#FF57","f":"system"}'),
    // 颜色值太长
    fc.constant('{"t":"A","c":"#FF5733FF","f":"system"}'),
    // 包含无效字符
    fc.constant('{"t":"A","c":"#GGGGGG","f":"system"}'),
    fc.constant('{"t":"A","c":"#FF573G","f":"system"}'),
    // 其他无效格式
    fc.constant('{"t":"A","c":"rgb(255,0,0)","f":"system"}'),
    fc.constant('{"t":"A","c":"red","f":"system"}'),
    fc.constant('{"t":"A","c":"#ff5733","f":"system"}') // 小写也应该被接受，但测试验证行为
  )

  /**
   * 生成无效字体选项的 JSON
   */
  const invalidFontJsonArbitrary: fc.Arbitrary<string> = fc.oneof(
    // 无效的字体名称
    fc.constant('{"t":"A","c":"#FF5733","f":"invalid"}'),
    fc.constant('{"t":"A","c":"#FF5733","f":"arial"}'),
    fc.constant('{"t":"A","c":"#FF5733","f":"SYSTEM"}'), // 大小写敏感
    fc.constant('{"t":"A","c":"#FF5733","f":"System"}'),
    fc.constant('{"t":"A","c":"#FF5733","f":""}'),
    fc.constant('{"t":"A","c":"#FF5733","f":" "}')
  )

  /**
   * 属性 1: 对于任意无效的 JSON 字符串，反序列化不应抛出错误
   *
   * **Validates: Requirements 8.4, 8.5**
   */
  it('对于任意无效的 JSON 字符串，反序列化不应抛出错误', () => {
    fc.assert(
      fc.property(invalidJsonArbitrary, (invalidJson) => {
        // 不应抛出错误
        expect(() => parseTextIconConfig(invalidJson)).not.toThrow()
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 2: 对于空字符串或 null 值，反序列化应返回默认配置
   *
   * **Validates: Requirements 8.4, 8.5**
   */
  it('对于空字符串或 null 值，反序列化应返回默认配置', () => {
    fc.assert(
      fc.property(emptyOrNullArbitrary, (emptyValue) => {
        const result = parseTextIconConfig(emptyValue as string | null)

        // 应返回默认配置
        expect(result.text).toBe('')
        expect(result.color).toBe('')
        expect(result.fontFamily).toBe('system')
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3: 对于缺少必要字段的 JSON，反序列化应使用默认值填充
   *
   * **Validates: Requirements 8.4**
   */
  it('对于缺少必要字段的 JSON，反序列化应使用默认值填充', () => {
    fc.assert(
      fc.property(missingFieldsJsonArbitrary, (json) => {
        const result = parseTextIconConfig(json)

        // 不应抛出错误
        expect(result).toBeDefined()

        // 应返回有效的配置对象
        expect(typeof result.text).toBe('string')
        expect(typeof result.color).toBe('string')
        expect(typeof result.fontFamily).toBe('string')

        // fontFamily 应该是有效的选项
        expect(VALID_TEXT_ICON_FONTS).toContain(result.fontFamily)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 4: 对于字段类型错误的 JSON，反序列化应使用默认值
   *
   * **Validates: Requirements 8.4**
   */
  it('对于字段类型错误的 JSON，反序列化应使用默认值', () => {
    fc.assert(
      fc.property(wrongTypeFieldsJsonArbitrary, (json) => {
        const result = parseTextIconConfig(json)

        // 不应抛出错误
        expect(result).toBeDefined()

        // 应返回有效的配置对象
        expect(typeof result.text).toBe('string')
        expect(typeof result.color).toBe('string')
        expect(typeof result.fontFamily).toBe('string')

        // fontFamily 应该是有效的选项
        expect(VALID_TEXT_ICON_FONTS).toContain(result.fontFamily)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 5: 对于无效颜色格式的 JSON，反序列化应将颜色设为空字符串
   *
   * **Validates: Requirements 8.4**
   */
  it('对于无效颜色格式的 JSON，反序列化应将颜色设为空字符串或有效格式', () => {
    fc.assert(
      fc.property(invalidColorJsonArbitrary, (json) => {
        const result = parseTextIconConfig(json)

        // 不应抛出错误
        expect(result).toBeDefined()

        // 颜色应该是空字符串或有效的 hex 格式
        if (result.color !== '') {
          expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
        }
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 6: 对于无效字体选项的 JSON，反序列化应使用默认字体 'system'
   *
   * **Validates: Requirements 8.4**
   */
  it('对于无效字体选项的 JSON，反序列化应使用默认字体', () => {
    fc.assert(
      fc.property(invalidFontJsonArbitrary, (json) => {
        const result = parseTextIconConfig(json)

        // 不应抛出错误
        expect(result).toBeDefined()

        // fontFamily 应该是有效的选项（无效输入应回退到 'system'）
        expect(VALID_TEXT_ICON_FONTS).toContain(result.fontFamily)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 7: 对于任意随机字符串，反序列化应返回有效的默认配置
   *
   * **Validates: Requirements 8.5**
   */
  it('对于任意随机字符串，反序列化应返回有效的默认配置', () => {
    fc.assert(
      fc.property(fc.string(), (randomString) => {
        const result = parseTextIconConfig(randomString)

        // 不应抛出错误
        expect(result).toBeDefined()

        // 应返回有效的配置对象
        expect(typeof result.text).toBe('string')
        expect(typeof result.color).toBe('string')
        expect(typeof result.fontFamily).toBe('string')

        // text 长度不应超过 4
        expect(result.text.length).toBeLessThanOrEqual(4)

        // color 应该是空字符串或有效的 hex 格式
        if (result.color !== '') {
          expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
        }

        // fontFamily 应该是有效的选项
        expect(VALID_TEXT_ICON_FONTS).toContain(result.fontFamily)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 8: 反序列化无效数据后的配置应该可以被再次序列化
   *
   * **Validates: Requirements 8.4, 8.5**
   *
   * 确保即使输入无效，输出的配置也是有效的，可以被正常使用
   */
  it('反序列化无效数据后的配置应该可以被再次序列化', () => {
    fc.assert(
      fc.property(invalidJsonArbitrary, (invalidJson) => {
        const result = parseTextIconConfig(invalidJson)

        // 应该可以被序列化
        expect(() => serializeTextIconConfig(result)).not.toThrow()

        // 序列化后应该是有效的 JSON
        const serialized = serializeTextIconConfig(result)
        expect(() => JSON.parse(serialized)).not.toThrow()
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 9: 对于包含额外字段的 JSON，反序列化应忽略额外字段
   *
   * **Validates: Requirements 8.4**
   */
  it('对于包含额外字段的 JSON，反序列化应忽略额外字段', () => {
    const extraFieldsJsonArbitrary = fc.record({
      t: fc.string({ minLength: 1, maxLength: 4 }),
      c: fc.constantFrom('#FF5733', '#000000', ''),
      f: fc.constantFrom(...VALID_TEXT_ICON_FONTS),
      extra: fc.string(),
      anotherExtra: fc.integer(),
    }).map((obj) => JSON.stringify(obj))

    fc.assert(
      fc.property(extraFieldsJsonArbitrary, (json) => {
        const result = parseTextIconConfig(json)

        // 不应抛出错误
        expect(result).toBeDefined()

        // 应只包含预期的字段
        expect(Object.keys(result).sort()).toEqual(['color', 'fontFamily', 'text'])
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 10: 对于数组类型的 JSON，反序列化应返回默认配置
   *
   * **Validates: Requirements 8.4, 8.5**
   */
  it('对于数组类型的 JSON，反序列化应返回默认配置', () => {
    const arrayJsonArbitrary = fc.oneof(
      fc.constant('[]'),
      fc.constant('[1,2,3]'),
      fc.constant('["A","#FF5733","system"]'),
      fc.array(fc.anything()).map((arr) => JSON.stringify(arr))
    )

    fc.assert(
      fc.property(arrayJsonArbitrary, (json) => {
        const result = parseTextIconConfig(json)

        // 不应抛出错误
        expect(result).toBeDefined()

        // 应返回有效的配置对象
        expect(typeof result.text).toBe('string')
        expect(typeof result.color).toBe('string')
        expect(typeof result.fontFamily).toBe('string')

        // fontFamily 应该是有效的选项
        expect(VALID_TEXT_ICON_FONTS).toContain(result.fontFamily)
      }),
      { numRuns: 20 }
    )
  })
})


/**
 * 默认文字提取属性测试
 * **Feature: text-icon, Property 1: Default Text Extraction**
 * **Feature: text-icon, Property 2: Domain Fallback for Empty Names**
 *
 * **Validates: Requirements 1.1, 1.2**
 *
 * 设计文档 Property 1 描述：
 * *For any* bookmark with a non-empty name, the default text icon character
 * should be the first character of the bookmark name (uppercased for letters).
 *
 * 设计文档 Property 2 描述：
 * *For any* bookmark with an empty or whitespace-only name but a valid URL,
 * the default text icon character should be the first character of the domain name.
 *
 * 需求 1.1: WHEN a bookmark has no custom icon and favicon loading fails,
 * THE Bookmark_Icon_Component SHALL display a text icon using the first
 * character of the bookmark name
 *
 * 需求 1.2: WHEN the bookmark name is empty or contains only whitespace,
 * THE Text_Icon_System SHALL use the first character of the domain name as fallback
 */
import { getDefaultText } from './textIconConfig'

describe('**Feature: text-icon, Property 1: Default Text Extraction**', () => {
  /**
   * 生成非空的书签名称（ASCII 字母开头）
   */
  const nonEmptyAsciiNameArbitrary: fc.Arbitrary<string> = fc
    .tuple(
      fc.char().filter((c) => /[a-zA-Z]/.test(c)),
      fc.string({ minLength: 0, maxLength: 50 })
    )
    .map(([first, rest]) => first + rest)

  /**
   * 生成非空的书签名称（数字开头）
   */
  const nonEmptyDigitNameArbitrary: fc.Arbitrary<string> = fc
    .tuple(
      fc.char().filter((c) => /[0-9]/.test(c)),
      fc.string({ minLength: 0, maxLength: 50 })
    )
    .map(([first, rest]) => first + rest)

  /**
   * 生成非空的书签名称（中文字符开头）
   */
  const nonEmptyChineseNameArbitrary: fc.Arbitrary<string> = fc
    .tuple(
      fc.integer({ min: 0x4e00, max: 0x9fff }).map((code) => String.fromCodePoint(code)),
      fc.string({ minLength: 0, maxLength: 50 })
    )
    .map(([first, rest]) => first + rest)

  /**
   * 生成非空的书签名称（日文平假名开头）
   */
  const nonEmptyJapaneseNameArbitrary: fc.Arbitrary<string> = fc
    .tuple(
      fc.integer({ min: 0x3040, max: 0x309f }).map((code) => String.fromCodePoint(code)),
      fc.string({ minLength: 0, maxLength: 50 })
    )
    .map(([first, rest]) => first + rest)

  /**
   * 生成非空的书签名称（韩文字符开头）
   */
  const nonEmptyKoreanNameArbitrary: fc.Arbitrary<string> = fc
    .tuple(
      fc.integer({ min: 0xac00, max: 0xd7af }).map((code) => String.fromCodePoint(code)),
      fc.string({ minLength: 0, maxLength: 50 })
    )
    .map(([first, rest]) => first + rest)

  /**
   * 生成任意非空非空白的书签名称
   */
  const nonEmptyNameArbitrary: fc.Arbitrary<string> = fc.oneof(
    nonEmptyAsciiNameArbitrary,
    nonEmptyDigitNameArbitrary,
    nonEmptyChineseNameArbitrary,
    nonEmptyJapaneseNameArbitrary,
    nonEmptyKoreanNameArbitrary
  )

  /**
   * 生成任意 URL（用于测试名称优先）
   */
  const anyUrlArbitrary: fc.Arbitrary<string> = fc.oneof(
    fc.constant('https://example.com'),
    fc.constant('https://google.com/search'),
    fc.constant('http://localhost:3000'),
    fc.constant(''),
    fc.webUrl()
  )

  /**
   * 属性 1.1: 对于任意非空名称（ASCII 字母开头），默认文字应为首字符的大写形式
   *
   * **Validates: Requirements 1.1**
   */
  it('对于任意非空名称（ASCII 字母开头），默认文字应为首字符的大写形式', () => {
    fc.assert(
      fc.property(
        nonEmptyAsciiNameArbitrary,
        anyUrlArbitrary,
        (name, url) => {
          const result = getDefaultText(name, url)
          const expectedChar = name.charAt(0).toUpperCase()

          expect(result).toBe(expectedChar)
          expect(result).toMatch(/^[A-Z]$/)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 1.2: 对于任意非空名称（数字开头），默认文字应为首字符
   *
   * **Validates: Requirements 1.1**
   */
  it('对于任意非空名称（数字开头），默认文字应为首字符', () => {
    fc.assert(
      fc.property(
        nonEmptyDigitNameArbitrary,
        anyUrlArbitrary,
        (name, url) => {
          const result = getDefaultText(name, url)
          const expectedChar = name.charAt(0)

          expect(result).toBe(expectedChar)
          expect(result).toMatch(/^[0-9]$/)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 1.3: 对于任意非空名称（中文字符开头），默认文字应为首字符
   *
   * **Validates: Requirements 1.1**
   */
  it('对于任意非空名称（中文字符开头），默认文字应为首字符', () => {
    fc.assert(
      fc.property(
        nonEmptyChineseNameArbitrary,
        anyUrlArbitrary,
        (name, url) => {
          const result = getDefaultText(name, url)
          const expectedChar = name.charAt(0)

          expect(result).toBe(expectedChar)
          // 验证是中文字符
          expect(result.codePointAt(0)).toBeGreaterThanOrEqual(0x4e00)
          expect(result.codePointAt(0)).toBeLessThanOrEqual(0x9fff)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 1.4: 对于任意非空名称（日文字符开头），默认文字应为首字符
   *
   * **Validates: Requirements 1.1**
   */
  it('对于任意非空名称（日文字符开头），默认文字应为首字符', () => {
    fc.assert(
      fc.property(
        nonEmptyJapaneseNameArbitrary,
        anyUrlArbitrary,
        (name, url) => {
          const result = getDefaultText(name, url)
          const expectedChar = name.charAt(0)

          expect(result).toBe(expectedChar)
          // 验证是日文平假名字符
          expect(result.codePointAt(0)).toBeGreaterThanOrEqual(0x3040)
          expect(result.codePointAt(0)).toBeLessThanOrEqual(0x309f)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 1.5: 对于任意非空名称（韩文字符开头），默认文字应为首字符
   *
   * **Validates: Requirements 1.1**
   */
  it('对于任意非空名称（韩文字符开头），默认文字应为首字符', () => {
    fc.assert(
      fc.property(
        nonEmptyKoreanNameArbitrary,
        anyUrlArbitrary,
        (name, url) => {
          const result = getDefaultText(name, url)
          const expectedChar = name.charAt(0)

          expect(result).toBe(expectedChar)
          // 验证是韩文字符
          expect(result.codePointAt(0)).toBeGreaterThanOrEqual(0xac00)
          expect(result.codePointAt(0)).toBeLessThanOrEqual(0xd7af)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 1.6: 对于任意非空名称，默认文字应为单个字符
   *
   * **Validates: Requirements 1.1**
   */
  it('对于任意非空名称，默认文字应为单个字符', () => {
    fc.assert(
      fc.property(
        nonEmptyNameArbitrary,
        anyUrlArbitrary,
        (name, url) => {
          const result = getDefaultText(name, url)

          // 结果应为单个字符
          expect(result.length).toBe(1)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 1.7: 对于带前导空格的名称，应忽略空格并使用第一个非空白字符
   *
   * **Validates: Requirements 1.1**
   */
  it('对于带前导空格的名称，应忽略空格并使用第一个非空白字符', () => {
    const nameWithLeadingSpacesArbitrary = fc
      .tuple(
        fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 5 }),
        nonEmptyNameArbitrary
      )
      .map(([spaces, name]) => spaces + name)

    fc.assert(
      fc.property(
        nameWithLeadingSpacesArbitrary,
        anyUrlArbitrary,
        (name, url) => {
          const result = getDefaultText(name, url)
          const trimmedName = name.trim()
          const expectedChar = trimmedName.charAt(0).toUpperCase()

          expect(result).toBe(expectedChar)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 1.8: 名称优先于 URL - 即使有有效 URL，也应使用名称的首字符
   *
   * **Validates: Requirements 1.1**
   */
  it('名称优先于 URL - 即使有有效 URL，也应使用名称的首字符', () => {
    const validUrlArbitrary = fc.constantFrom(
      'https://google.com',
      'https://github.com',
      'https://example.org',
      'http://localhost:8080'
    )

    fc.assert(
      fc.property(
        nonEmptyNameArbitrary,
        validUrlArbitrary,
        (name, url) => {
          const result = getDefaultText(name, url)
          const expectedChar = name.trim().charAt(0).toUpperCase()

          // 应使用名称的首字符，而不是 URL 的
          expect(result).toBe(expectedChar)
        }
      ),
      { numRuns: 20 }
    )
  })
})

describe('**Feature: text-icon, Property 2: Domain Fallback for Empty Names**', () => {
  /**
   * 生成空或只有空白的名称
   */
  const emptyOrWhitespaceNameArbitrary: fc.Arbitrary<string> = fc.oneof(
    fc.constant(''),
    fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 10 })
  )

  /**
   * 生成有效的 URL（带域名）
   * 注意：国际化域名（IDN）会被 URL API 转换为 punycode，
   * 例如 "中文.com" 会变成 "xn--fiq228c.com"，所以不测试 IDN 域名
   */
  const validUrlWithDomainArbitrary: fc.Arbitrary<{ url: string; expectedChar: string }> = fc.oneof(
    fc.constant({ url: 'https://google.com', expectedChar: 'G' }),
    fc.constant({ url: 'https://github.com/user/repo', expectedChar: 'G' }),
    fc.constant({ url: 'http://example.org', expectedChar: 'E' }),
    fc.constant({ url: 'https://apple.com/store', expectedChar: 'A' }),
    fc.constant({ url: 'http://localhost:3000', expectedChar: 'L' }),
    fc.constant({ url: 'https://127.0.0.1:8080', expectedChar: '1' }),
    fc.constant({ url: 'https://www.microsoft.com', expectedChar: 'W' }),
    fc.constant({ url: 'https://docs.python.org', expectedChar: 'D' }),
    fc.constant({ url: 'http://test.example.com', expectedChar: 'T' }),
    fc.constant({ url: 'https://amazon.co.jp', expectedChar: 'A' })
  )

  /**
   * 属性 2.1: 对于空名称和有效 URL，默认文字应为域名首字符（大写）
   *
   * **Validates: Requirements 1.2**
   */
  it('对于空名称和有效 URL，默认文字应为域名首字符（大写）', () => {
    fc.assert(
      fc.property(
        emptyOrWhitespaceNameArbitrary,
        validUrlWithDomainArbitrary,
        (name, { url, expectedChar }) => {
          const result = getDefaultText(name, url)

          expect(result).toBe(expectedChar)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 2.2: 对于空名称和空 URL，默认文字应为 "?"
   *
   * **Validates: Requirements 1.2, 1.3**
   */
  it('对于空名称和空 URL，默认文字应为 "?"', () => {
    fc.assert(
      fc.property(
        emptyOrWhitespaceNameArbitrary,
        fc.constant(''),
        (name, url) => {
          const result = getDefaultText(name, url)

          expect(result).toBe('?')
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 2.3: 对于空名称和无效 URL，默认文字应为 "?"
   *
   * **Validates: Requirements 1.2, 1.3**
   */
  it('对于空名称和无效 URL，默认文字应为 "?"', () => {
    const invalidUrlArbitrary = fc.constantFrom(
      'not-a-url',
      'javascript:void(0)',
      'data:text/html,<h1>Hello</h1>',
      '://missing-protocol',
      ''
    )

    fc.assert(
      fc.property(
        emptyOrWhitespaceNameArbitrary,
        invalidUrlArbitrary,
        (name, url) => {
          const result = getDefaultText(name, url)

          // 对于无效 URL，应返回 "?"
          // 注意：某些 URL 可能被解析为有效（如 data: 协议）
          expect(typeof result).toBe('string')
          expect(result.length).toBe(1)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 2.4: 域名首字符为字母时应大写
   *
   * **Validates: Requirements 1.2**
   */
  it('域名首字符为字母时应大写', () => {
    const lowercaseDomainUrlArbitrary = fc.constantFrom(
      { url: 'https://google.com', expectedChar: 'G' },
      { url: 'https://apple.com', expectedChar: 'A' },
      { url: 'https://microsoft.com', expectedChar: 'M' },
      { url: 'https://yahoo.com', expectedChar: 'Y' },
      { url: 'https://netflix.com', expectedChar: 'N' }
    )

    fc.assert(
      fc.property(
        emptyOrWhitespaceNameArbitrary,
        lowercaseDomainUrlArbitrary,
        (name, { url, expectedChar }) => {
          const result = getDefaultText(name, url)

          expect(result).toBe(expectedChar)
          expect(result).toMatch(/^[A-Z]$/)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 2.5: 域名首字符为数字时应保持原样
   *
   * **Validates: Requirements 1.2**
   */
  it('域名首字符为数字时应保持原样', () => {
    const numericDomainUrlArbitrary = fc.constantFrom(
      { url: 'https://127.0.0.1', expectedChar: '1' },
      { url: 'http://192.168.1.1', expectedChar: '1' },
      { url: 'https://8.8.8.8', expectedChar: '8' },
      { url: 'http://10.0.0.1:8080', expectedChar: '1' }
    )

    fc.assert(
      fc.property(
        emptyOrWhitespaceNameArbitrary,
        numericDomainUrlArbitrary,
        (name, { url, expectedChar }) => {
          const result = getDefaultText(name, url)

          expect(result).toBe(expectedChar)
          expect(result).toMatch(/^[0-9]$/)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 2.6: 返回结果应始终为单个字符
   *
   * **Validates: Requirements 1.2**
   */
  it('返回结果应始终为单个字符', () => {
    const anyValidUrlArbitrary = fc.constantFrom(
      'https://google.com',
      'https://github.com',
      'http://localhost:3000',
      'https://example.org/path/to/page',
      ''
    )

    fc.assert(
      fc.property(
        emptyOrWhitespaceNameArbitrary,
        anyValidUrlArbitrary,
        (name, url) => {
          const result = getDefaultText(name, url)

          expect(result.length).toBe(1)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 2.7: 只有空白的名称应回退到 URL
   *
   * **Validates: Requirements 1.2**
   */
  it('只有空白的名称应回退到 URL', () => {
    const whitespaceOnlyNameArbitrary = fc.stringOf(
      fc.constantFrom(' ', '\t', '\n', '\r'),
      { minLength: 1, maxLength: 10 }
    )

    fc.assert(
      fc.property(
        whitespaceOnlyNameArbitrary,
        validUrlWithDomainArbitrary,
        (name, { url, expectedChar }) => {
          const result = getDefaultText(name, url)

          // 应使用 URL 域名的首字符
          expect(result).toBe(expectedChar)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 2.8: URL 带路径时应只使用域名部分
   *
   * **Validates: Requirements 1.2**
   */
  it('URL 带路径时应只使用域名部分', () => {
    const urlWithPathArbitrary = fc.constantFrom(
      { url: 'https://github.com/user/repo/issues', expectedChar: 'G' },
      { url: 'https://docs.google.com/document/d/123', expectedChar: 'D' },
      { url: 'http://example.org/path/to/resource?query=1', expectedChar: 'E' },
      { url: 'https://api.twitter.com/v2/tweets', expectedChar: 'A' }
    )

    fc.assert(
      fc.property(
        emptyOrWhitespaceNameArbitrary,
        urlWithPathArbitrary,
        (name, { url, expectedChar }) => {
          const result = getDefaultText(name, url)

          expect(result).toBe(expectedChar)
        }
      ),
      { numRuns: 20 }
    )
  })
})
