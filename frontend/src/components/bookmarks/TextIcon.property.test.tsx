/**
 * 文字图标 Unicode 字符支持属性测试
 * **Feature: text-icon, Property 4: Unicode Character Support**
 *
 * **Validates: Requirements 3.5**
 *
 * 设计文档 Property 4 描述：
 * *For any* valid Unicode string (including CJK characters and emoji) within
 * the character limit, the text icon system should correctly store and render
 * the characters.
 *
 * 需求 3.5: THE Text_Icon_System SHALL support Unicode characters including
 * Chinese, Japanese, Korean, and emoji
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as fc from 'fast-check'
import type { TextIconFont } from '@start/shared'
import { TextIcon, calculateFontSize } from './TextIcon'

/**
 * 生成中文字符（CJK 统一汉字）
 * Unicode 范围: U+4E00 - U+9FFF
 */
const chineseCharArbitrary: fc.Arbitrary<string> = fc
  .integer({ min: 0x4e00, max: 0x9fff })
  .map((code) => String.fromCodePoint(code))

/**
 * 生成日文平假名字符
 * Unicode 范围: U+3040 - U+309F
 */
const japaneseHiraganaArbitrary: fc.Arbitrary<string> = fc
  .integer({ min: 0x3040, max: 0x309f })
  .map((code) => String.fromCodePoint(code))

/**
 * 生成日文片假名字符
 * Unicode 范围: U+30A0 - U+30FF
 */
const japaneseKatakanaArbitrary: fc.Arbitrary<string> = fc
  .integer({ min: 0x30a0, max: 0x30ff })
  .map((code) => String.fromCodePoint(code))

/**
 * 生成韩文字符（韩文音节）
 * Unicode 范围: U+AC00 - U+D7AF
 */
const koreanCharArbitrary: fc.Arbitrary<string> = fc
  .integer({ min: 0xac00, max: 0xd7af })
  .map((code) => String.fromCodePoint(code))

/**
 * 生成 Emoji 字符（基本表情）
 * Unicode 范围: U+1F600 - U+1F64F (表情符号)
 */
const emojiArbitrary: fc.Arbitrary<string> = fc
  .integer({ min: 0x1f600, max: 0x1f64f })
  .map((code) => String.fromCodePoint(code))

/**
 * 生成中文字符串（1-4 个字符）
 */
const chineseStringArbitrary: fc.Arbitrary<string> = fc
  .array(chineseCharArbitrary, { minLength: 1, maxLength: 4 })
  .map((chars) => chars.join(''))

/**
 * 生成日文字符串（1-4 个字符，混合平假名和片假名）
 */
const japaneseStringArbitrary: fc.Arbitrary<string> = fc
  .array(fc.oneof(japaneseHiraganaArbitrary, japaneseKatakanaArbitrary), {
    minLength: 1,
    maxLength: 4,
  })
  .map((chars) => chars.join(''))

/**
 * 生成韩文字符串（1-4 个字符）
 */
const koreanStringArbitrary: fc.Arbitrary<string> = fc
  .array(koreanCharArbitrary, { minLength: 1, maxLength: 4 })
  .map((chars) => chars.join(''))

/**
 * 生成 Emoji 字符串（1-2 个字符，因为 emoji 通常较大）
 */
const emojiStringArbitrary: fc.Arbitrary<string> = fc
  .array(emojiArbitrary, { minLength: 1, maxLength: 2 })
  .map((chars) => chars.join(''))

/**
 * 生成 ASCII 字符
 * Unicode 范围: U+0020 - U+007E (可打印 ASCII)
 */
const asciiCharArbitrary: fc.Arbitrary<string> = fc
  .integer({ min: 0x0041, max: 0x007a }) // A-Z, a-z 范围
  .filter((code) => (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a))
  .map((code) => String.fromCodePoint(code))

/**
 * 生成混合 Unicode 字符串
 * 包含中文、日文、韩文、emoji 和 ASCII 的混合
 */
const mixedUnicodeStringArbitrary: fc.Arbitrary<string> = fc
  .array(
    fc.oneof(
      chineseCharArbitrary,
      japaneseHiraganaArbitrary,
      japaneseKatakanaArbitrary,
      koreanCharArbitrary,
      emojiArbitrary,
      asciiCharArbitrary // ASCII 字符
    ),
    { minLength: 1, maxLength: 4 }
  )
  .map((chars) => chars.join(''))

describe('**Feature: text-icon, Property 4: Unicode Character Support**', () => {
  /**
   * 属性 4.1: 中文字符正确渲染
   *
   * **Validates: Requirements 3.5**
   *
   * 对于任意中文字符串（1-4 个字符），TextIcon 组件应正确渲染
   */
  it('中文字符正确渲染', () => {
    fc.assert(
      fc.property(chineseStringArbitrary, (text) => {
        const { container } = render(<TextIcon text={text} />)

        // 获取渲染的文字
        const span = container.querySelector('span')
        expect(span).not.toBeNull()

        // 验证渲染的文字与输入一致（最多 4 个字符）
        const expectedText = [...text].slice(0, 4).join('')
        expect(span?.textContent).toBe(expectedText)

        // 验证每个字符都是中文字符
        const renderedChars = [...(span?.textContent || '')]
        renderedChars.forEach((char) => {
          const codePoint = char.codePointAt(0)
          expect(codePoint).toBeGreaterThanOrEqual(0x4e00)
          expect(codePoint).toBeLessThanOrEqual(0x9fff)
        })
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 4.2: 日文字符正确渲染
   *
   * **Validates: Requirements 3.5**
   *
   * 对于任意日文字符串（平假名和片假名），TextIcon 组件应正确渲染
   */
  it('日文字符正确渲染', () => {
    fc.assert(
      fc.property(japaneseStringArbitrary, (text) => {
        const { container } = render(<TextIcon text={text} />)

        // 获取渲染的文字
        const span = container.querySelector('span')
        expect(span).not.toBeNull()

        // 验证渲染的文字与输入一致（最多 4 个字符）
        const expectedText = [...text].slice(0, 4).join('')
        expect(span?.textContent).toBe(expectedText)

        // 验证每个字符都是日文字符（平假名或片假名）
        const renderedChars = [...(span?.textContent || '')]
        renderedChars.forEach((char) => {
          const codePoint = char.codePointAt(0)
          const isHiragana =
            codePoint !== undefined &&
            codePoint >= 0x3040 &&
            codePoint <= 0x309f
          const isKatakana =
            codePoint !== undefined &&
            codePoint >= 0x30a0 &&
            codePoint <= 0x30ff
          expect(isHiragana || isKatakana).toBe(true)
        })
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 4.3: 韩文字符正确渲染
   *
   * **Validates: Requirements 3.5**
   *
   * 对于任意韩文字符串，TextIcon 组件应正确渲染
   */
  it('韩文字符正确渲染', () => {
    fc.assert(
      fc.property(koreanStringArbitrary, (text) => {
        const { container } = render(<TextIcon text={text} />)

        // 获取渲染的文字
        const span = container.querySelector('span')
        expect(span).not.toBeNull()

        // 验证渲染的文字与输入一致（最多 4 个字符）
        const expectedText = [...text].slice(0, 4).join('')
        expect(span?.textContent).toBe(expectedText)

        // 验证每个字符都是韩文字符
        const renderedChars = [...(span?.textContent || '')]
        renderedChars.forEach((char) => {
          const codePoint = char.codePointAt(0)
          expect(codePoint).toBeGreaterThanOrEqual(0xac00)
          expect(codePoint).toBeLessThanOrEqual(0xd7af)
        })
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 4.4: Emoji 正确渲染
   *
   * **Validates: Requirements 3.5**
   *
   * 对于任意 Emoji 字符串，TextIcon 组件应正确渲染
   */
  it('Emoji 正确渲染', () => {
    fc.assert(
      fc.property(emojiStringArbitrary, (text) => {
        const { container } = render(<TextIcon text={text} />)

        // 获取渲染的文字
        const span = container.querySelector('span')
        expect(span).not.toBeNull()

        // 验证渲染的文字与输入一致（最多 4 个字符）
        const expectedText = [...text].slice(0, 4).join('')
        expect(span?.textContent).toBe(expectedText)

        // 验证每个字符都是 Emoji
        const renderedChars = [...(span?.textContent || '')]
        renderedChars.forEach((char) => {
          const codePoint = char.codePointAt(0)
          expect(codePoint).toBeGreaterThanOrEqual(0x1f600)
          expect(codePoint).toBeLessThanOrEqual(0x1f64f)
        })
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 4.5: 混合 Unicode 字符正确渲染
   *
   * **Validates: Requirements 3.5**
   *
   * 对于任意混合 Unicode 字符串（中文、日文、韩文、emoji、ASCII），
   * TextIcon 组件应正确渲染
   */
  it('混合 Unicode 字符正确渲染', () => {
    fc.assert(
      fc.property(mixedUnicodeStringArbitrary, (text) => {
        const { container } = render(<TextIcon text={text} />)

        // 获取渲染的文字
        const span = container.querySelector('span')
        expect(span).not.toBeNull()

        // 验证渲染的文字与输入一致（最多 4 个字符）
        const expectedText = [...text].slice(0, 4).join('')
        expect(span?.textContent).toBe(expectedText)

        // 验证字符数量不超过 4
        const renderedChars = [...(span?.textContent || '')]
        expect(renderedChars.length).toBeLessThanOrEqual(4)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 4.6: calculateFontSize 正确计算 Unicode 字符数量
   *
   * **Validates: Requirements 3.5**
   *
   * 对于任意 Unicode 字符串，calculateFontSize 应正确计算字符数量
   * 并返回相应的字体大小
   */
  it('calculateFontSize 正确计算 Unicode 字符数量', () => {
    const size = 48

    fc.assert(
      fc.property(mixedUnicodeStringArbitrary, (text) => {
        const fontSize = calculateFontSize(text, size)
        const charCount = [...text].length

        // 根据字符数量验证字体大小
        let expectedRatio: number
        switch (charCount) {
          case 0:
          case 1:
            expectedRatio = 0.55
            break
          case 2:
            expectedRatio = 0.45
            break
          case 3:
            expectedRatio = 0.35
            break
          default:
            expectedRatio = 0.28
            break
        }

        const expectedFontSize = Math.round(size * expectedRatio)
        expect(fontSize).toBe(expectedFontSize)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 4.7: 中文字符的字体大小计算正确
   *
   * **Validates: Requirements 3.5**
   *
   * 验证中文字符被正确计数（每个汉字算一个字符）
   */
  it('中文字符的字体大小计算正确', () => {
    const size = 48

    fc.assert(
      fc.property(chineseStringArbitrary, (text) => {
        const fontSize = calculateFontSize(text, size)
        const charCount = [...text].length

        // 验证字符计数正确
        expect(charCount).toBe(text.length) // 中文字符 length 和展开后长度相同

        // 验证字体大小计算正确
        let expectedRatio: number
        switch (charCount) {
          case 0:
          case 1:
            expectedRatio = 0.55
            break
          case 2:
            expectedRatio = 0.45
            break
          case 3:
            expectedRatio = 0.35
            break
          default:
            expectedRatio = 0.28
            break
        }

        const expectedFontSize = Math.round(size * expectedRatio)
        expect(fontSize).toBe(expectedFontSize)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 4.8: Emoji 字符的字体大小计算正确
   *
   * **Validates: Requirements 3.5**
   *
   * 验证 Emoji 字符被正确计数（每个 emoji 算一个字符，即使它在 UTF-16 中是代理对）
   */
  it('Emoji 字符的字体大小计算正确', () => {
    const size = 48

    fc.assert(
      fc.property(emojiStringArbitrary, (text) => {
        const fontSize = calculateFontSize(text, size)
        const charCount = [...text].length

        // Emoji 使用展开运算符正确计数
        // 例如 "😀" 的 length 是 2（代理对），但 [...text].length 是 1
        expect(charCount).toBeLessThanOrEqual(text.length)

        // 验证字体大小计算正确
        let expectedRatio: number
        switch (charCount) {
          case 0:
          case 1:
            expectedRatio = 0.55
            break
          case 2:
            expectedRatio = 0.45
            break
          default:
            expectedRatio = 0.35
            break
        }

        const expectedFontSize = Math.round(size * expectedRatio)
        expect(fontSize).toBe(expectedFontSize)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 4.9: Unicode 字符渲染后保持不变
   *
   * **Validates: Requirements 3.5**
   *
   * 验证 Unicode 字符在渲染过程中不会被修改或损坏
   */
  it('Unicode 字符渲染后保持不变', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          chineseStringArbitrary,
          japaneseStringArbitrary,
          koreanStringArbitrary,
          emojiStringArbitrary
        ),
        (text) => {
          const { container } = render(<TextIcon text={text} />)

          const span = container.querySelector('span')
          const renderedText = span?.textContent || ''

          // 验证渲染的文字与输入一致（最多 4 个字符）
          const expectedText = [...text].slice(0, 4).join('')
          expect(renderedText).toBe(expectedText)

          // 验证字符没有被损坏（通过比较 code points）
          const expectedCodePoints = [...expectedText].map((c) =>
            c.codePointAt(0)
          )
          const renderedCodePoints = [...renderedText].map((c) =>
            c.codePointAt(0)
          )
          expect(renderedCodePoints).toEqual(expectedCodePoints)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 4.10: 空字符串渲染为占位符
   *
   * **Validates: Requirements 3.5**
   *
   * 验证空字符串输入时显示占位符 "?"
   */
  it('空字符串渲染为占位符', () => {
    const { container } = render(<TextIcon text="" />)

    const span = container.querySelector('span')
    expect(span?.textContent).toBe('?')
  })
})


/**
 * 文字图标字符限制属性测试
 * **Feature: text-icon, Property 3: Text Character Limit**
 *
 * **Validates: Requirements 3.2, 3.3**
 *
 * 设计文档 Property 3 描述：
 * *For any* string input to the text icon text field, the resulting stored text
 * should be at most 4 characters long.
 *
 * 需求 3.2: THE Text_Icon_System SHALL limit custom text to a maximum of 4 characters
 * 需求 3.3: WHEN custom text exceeds the character limit, THE Icon_Editor SHALL
 * prevent input and display a validation message
 */
describe('**Feature: text-icon, Property 3: Text Character Limit**', () => {
  /**
   * 生成任意长度的 ASCII 字符串
   */
  const arbitraryAsciiString: fc.Arbitrary<string> = fc.string({
    minLength: 0,
    maxLength: 100,
  })

  /**
   * 生成任意长度的 Unicode 字符串（包含 CJK 和 emoji）
   */
  const arbitraryUnicodeString: fc.Arbitrary<string> = fc
    .array(
      fc.oneof(
        // ASCII 字母
        fc
          .integer({ min: 0x41, max: 0x7a })
          .filter(
            (code) =>
              (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)
          )
          .map((code) => String.fromCodePoint(code)),
        // 中文字符
        fc
          .integer({ min: 0x4e00, max: 0x9fff })
          .map((code) => String.fromCodePoint(code)),
        // 日文平假名
        fc
          .integer({ min: 0x3040, max: 0x309f })
          .map((code) => String.fromCodePoint(code)),
        // 韩文字符
        fc
          .integer({ min: 0xac00, max: 0xd7af })
          .map((code) => String.fromCodePoint(code)),
        // Emoji
        fc
          .integer({ min: 0x1f600, max: 0x1f64f })
          .map((code) => String.fromCodePoint(code))
      ),
      { minLength: 0, maxLength: 50 }
    )
    .map((chars) => chars.join(''))

  /**
   * 属性 3.1: 任意长度字符串输入后，渲染的文字不超过 4 个字符
   *
   * **Validates: Requirements 3.2**
   *
   * 对于任意长度的字符串输入，TextIcon 组件渲染的文字长度应不超过 4 个字符
   */
  it('任意长度字符串输入后，渲染的文字不超过 4 个字符', () => {
    fc.assert(
      fc.property(arbitraryAsciiString, (text) => {
        const { container } = render(<TextIcon text={text} />)

        const span = container.querySelector('span')
        expect(span).not.toBeNull()

        // 获取渲染的文字（使用展开运算符正确计算 Unicode 字符数）
        const renderedText = span?.textContent || ''
        const renderedCharCount = [...renderedText].length

        // 验证渲染的文字不超过 4 个字符
        // 注意：空字符串会显示 "?" 占位符，所以最小长度是 1
        expect(renderedCharCount).toBeLessThanOrEqual(4)
        expect(renderedCharCount).toBeGreaterThanOrEqual(1)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.2: 超过 4 个字符的输入被正确截断
   *
   * **Validates: Requirements 3.2, 3.3**
   *
   * 对于超过 4 个字符的输入，TextIcon 组件应将其截断为 4 个字符
   */
  it('超过 4 个字符的输入被正确截断', () => {
    // 生成长度大于 4 的字符串
    const longStringArbitrary = fc.string({ minLength: 5, maxLength: 100 })

    fc.assert(
      fc.property(longStringArbitrary, (text) => {
        const { container } = render(<TextIcon text={text} />)

        const span = container.querySelector('span')
        expect(span).not.toBeNull()

        const renderedText = span?.textContent || ''
        const renderedCharCount = [...renderedText].length

        // 验证截断后正好是 4 个字符
        expect(renderedCharCount).toBe(4)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.3: 截断保留前 4 个字符
   *
   * **Validates: Requirements 3.2, 3.3**
   *
   * 对于超过 4 个字符的输入，截断应保留前 4 个字符
   */
  it('截断保留前 4 个字符', () => {
    // 生成长度大于 4 的字符串
    const longStringArbitrary = fc.string({ minLength: 5, maxLength: 100 })

    fc.assert(
      fc.property(longStringArbitrary, (text) => {
        const { container } = render(<TextIcon text={text} />)

        const span = container.querySelector('span')
        expect(span).not.toBeNull()

        const renderedText = span?.textContent || ''

        // 验证渲染的文字是原始文字的前 4 个字符
        const expectedText = [...text].slice(0, 4).join('')
        expect(renderedText).toBe(expectedText)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.4: Unicode 字符（包括 emoji）的截断正确处理
   *
   * **Validates: Requirements 3.2, 3.3**
   *
   * 对于包含 Unicode 字符（中文、日文、韩文、emoji）的输入，
   * 截断应正确处理，保留前 4 个 Unicode 字符（而非 UTF-16 代码单元）
   */
  it('Unicode 字符（包括 emoji）的截断正确处理', () => {
    fc.assert(
      fc.property(arbitraryUnicodeString, (text) => {
        const { container } = render(<TextIcon text={text} />)

        const span = container.querySelector('span')
        expect(span).not.toBeNull()

        const renderedText = span?.textContent || ''
        const renderedCharCount = [...renderedText].length

        // 验证渲染的文字不超过 4 个 Unicode 字符
        expect(renderedCharCount).toBeLessThanOrEqual(4)

        // 验证渲染的文字是原始文字的前 4 个 Unicode 字符
        const inputChars = [...text]
        if (inputChars.length > 0) {
          const expectedText = inputChars.slice(0, 4).join('')
          expect(renderedText).toBe(expectedText)
        } else {
          // 空字符串显示占位符 "?"
          expect(renderedText).toBe('?')
        }
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.5: 空字符串和短字符串不受影响
   *
   * **Validates: Requirements 3.2**
   *
   * 对于长度不超过 4 个字符的输入，TextIcon 组件应原样显示
   * （空字符串除外，会显示占位符 "?"）
   */
  it('空字符串和短字符串不受影响', () => {
    // 生成长度 0-4 的字符串
    const shortStringArbitrary = fc.string({ minLength: 0, maxLength: 4 })

    fc.assert(
      fc.property(shortStringArbitrary, (text) => {
        const { container } = render(<TextIcon text={text} />)

        const span = container.querySelector('span')
        expect(span).not.toBeNull()

        const renderedText = span?.textContent || ''

        if (text.length === 0) {
          // 空字符串显示占位符 "?"
          expect(renderedText).toBe('?')
        } else {
          // 非空短字符串原样显示
          expect(renderedText).toBe(text)
        }
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.6: 字符限制对所有字体类型一致
   *
   * **Validates: Requirements 3.2**
   *
   * 无论使用哪种字体，字符限制都应一致为 4 个字符
   */
  it('字符限制对所有字体类型一致', () => {
    const fontFamilies: TextIconFont[] = [
      'system',
      'serif',
      'mono',
      'rounded',
      'handwriting',
    ]
    const longStringArbitrary = fc.string({ minLength: 5, maxLength: 50 })

    fc.assert(
      fc.property(
        longStringArbitrary,
        fc.constantFrom(...fontFamilies),
        (text, fontFamily) => {
          const { container } = render(
            <TextIcon text={text} fontFamily={fontFamily} />
          )

          const span = container.querySelector('span')
          expect(span).not.toBeNull()

          const renderedText = span?.textContent || ''
          const renderedCharCount = [...renderedText].length

          // 验证所有字体类型都遵循 4 字符限制
          expect(renderedCharCount).toBe(4)

          // 验证截断保留前 4 个字符
          const expectedText = [...text].slice(0, 4).join('')
          expect(renderedText).toBe(expectedText)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.7: 字符限制对所有尺寸一致
   *
   * **Validates: Requirements 3.2**
   *
   * 无论图标尺寸如何，字符限制都应一致为 4 个字符
   */
  it('字符限制对所有尺寸一致', () => {
    const longStringArbitrary = fc.string({ minLength: 5, maxLength: 50 })
    const sizeArbitrary = fc.integer({ min: 16, max: 256 })

    fc.assert(
      fc.property(longStringArbitrary, sizeArbitrary, (text, size) => {
        const { container } = render(<TextIcon text={text} size={size} />)

        const span = container.querySelector('span')
        expect(span).not.toBeNull()

        const renderedText = span?.textContent || ''
        const renderedCharCount = [...renderedText].length

        // 验证所有尺寸都遵循 4 字符限制
        expect(renderedCharCount).toBe(4)

        // 验证截断保留前 4 个字符
        const expectedText = [...text].slice(0, 4).join('')
        expect(renderedText).toBe(expectedText)
      }),
      { numRuns: 20 }
    )
  })
})

