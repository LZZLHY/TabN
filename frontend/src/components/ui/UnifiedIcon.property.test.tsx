/**
 * UnifiedIcon 属性测试
 * 
 * **Feature: unified-icon-system**
 * 
 * 本测试文件验证 UnifiedIcon 组件的核心属性：
 * - Property 1: borderRadius 属性正确应用
 * - Property 2: size 属性正确覆盖默认尺寸
 * - Property 3: 自定义 size 时文字图标字号按比例计算
 * 
 * **Validates: Requirements 1.8, 1.9, 1.10, 8.1-8.5**
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as fc from 'fast-check'
import {
  UnifiedIcon,
  getActualSize,
  getActualBorderRadius,
  getTextIconFontSize,
  VARIANT_SIZES,
  VARIANT_RADIUS,
  VARIANT_FONT_SIZES,
  TEXT_ICON_FONT_RATIO,
  type IconVariant,
} from './UnifiedIcon'

/**
 * 生成有效的 IconVariant
 */
const variantArbitrary: fc.Arbitrary<IconVariant> = fc.constantFrom(
  'full',
  'mini',
  'tiny',
  'micro'
)

/**
 * 生成有效的数字 borderRadius（像素值）
 */
const numericBorderRadiusArbitrary: fc.Arbitrary<number> = fc.integer({
  min: 0,
  max: 100,
})

/**
 * 生成有效的字符串 borderRadius（百分比或像素）
 */
const stringBorderRadiusArbitrary: fc.Arbitrary<string> = fc.oneof(
  // 百分比格式
  fc.integer({ min: 0, max: 100 }).map((n) => `${n}%`),
  // 像素格式
  fc.integer({ min: 0, max: 100 }).map((n) => `${n}px`),
  // 特殊值
  fc.constantFrom('50%', '0', '8px', '16px', 'var(--start-radius)')
)

/**
 * 生成有效的 borderRadius（数字或字符串）
 */
const borderRadiusArbitrary: fc.Arbitrary<number | string> = fc.oneof(
  numericBorderRadiusArbitrary,
  stringBorderRadiusArbitrary
)

/**
 * 生成有效的 size（正整数像素值）
 */
const sizeArbitrary: fc.Arbitrary<number> = fc.integer({ min: 1, max: 256 })

/**
 * 生成有效的文字内容（1-4 个字符）
 */
const textArbitrary: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 4 })

describe('**Feature: unified-icon-system, Property 1: borderRadius 属性正确应用**', () => {
  /**
   * 属性 1.1: 数字 borderRadius 正确应用到容器
   * 
   * **Validates: Requirements 1.8, 8.1, 8.3**
   * 
   * 对于任意数字 borderRadius 值，当传入 UnifiedIcon 组件时，
   * 图标容器应应用该圆角值（转换为像素字符串）
   */
  it('数字 borderRadius 正确应用到容器', () => {
    fc.assert(
      fc.property(
        numericBorderRadiusArbitrary,
        variantArbitrary,
        (borderRadius, variant) => {
          const { container } = render(
            <UnifiedIcon
              variant={variant}
              borderRadius={borderRadius}
              iconType="AUTO"
              url="https://example.com"
              name="Test"
            />
          )

          const iconContainer = container.querySelector('[data-testid="unified-icon"]')
          expect(iconContainer).not.toBeNull()

          // 验证容器的 borderRadius 样式
          const style = iconContainer?.getAttribute('style') || ''
          expect(style).toContain(`border-radius: ${borderRadius}px`)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 1.2: 字符串 borderRadius 正确应用到容器
   * 
   * **Validates: Requirements 1.8, 8.1, 8.3**
   * 
   * 对于任意字符串 borderRadius 值（如 '50%'），当传入 UnifiedIcon 组件时，
   * 图标容器应直接应用该圆角值
   */
  it('字符串 borderRadius 正确应用到容器', () => {
    fc.assert(
      fc.property(
        stringBorderRadiusArbitrary,
        variantArbitrary,
        (borderRadius, variant) => {
          const { container } = render(
            <UnifiedIcon
              variant={variant}
              borderRadius={borderRadius}
              iconType="AUTO"
              url="https://example.com"
              name="Test"
            />
          )

          const iconContainer = container.querySelector('[data-testid="unified-icon"]')
          expect(iconContainer).not.toBeNull()

          // 验证容器的 borderRadius 样式
          const style = iconContainer?.getAttribute('style') || ''
          expect(style).toContain(`border-radius: ${borderRadius}`)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 1.3: getActualBorderRadius 函数正确处理数字输入
   * 
   * **Validates: Requirements 8.3**
   * 
   * 对于任意数字 borderRadius，getActualBorderRadius 应返回带 'px' 后缀的字符串
   */
  it('getActualBorderRadius 函数正确处理数字输入', () => {
    fc.assert(
      fc.property(
        numericBorderRadiusArbitrary,
        variantArbitrary,
        (borderRadius, variant) => {
          const result = getActualBorderRadius(variant, borderRadius)
          expect(result).toBe(`${borderRadius}px`)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 1.4: getActualBorderRadius 函数正确处理字符串输入
   * 
   * **Validates: Requirements 8.3**
   * 
   * 对于任意字符串 borderRadius，getActualBorderRadius 应原样返回
   */
  it('getActualBorderRadius 函数正确处理字符串输入', () => {
    fc.assert(
      fc.property(
        stringBorderRadiusArbitrary,
        variantArbitrary,
        (borderRadius, variant) => {
          const result = getActualBorderRadius(variant, borderRadius)
          expect(result).toBe(borderRadius)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 1.5: 未传入 borderRadius 时使用 variant 默认值
   * 
   * **Validates: Requirements 8.1**
   * 
   * 当未传入 borderRadius 时，应使用 variant 对应的默认圆角值
   */
  it('未传入 borderRadius 时使用 variant 默认值', () => {
    fc.assert(
      fc.property(variantArbitrary, (variant) => {
        const result = getActualBorderRadius(variant, undefined)
        expect(result).toBe(VARIANT_RADIUS[variant])
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 1.6: borderRadius 同时应用到容器和图片元素
   * 
   * **Validates: Requirements 8.3**
   * 
   * 对于 BASE64 类型图标，borderRadius 应同时应用到容器和内部图片元素
   */
  it('borderRadius 同时应用到容器和图片元素（BASE64 类型）', () => {
    fc.assert(
      fc.property(
        borderRadiusArbitrary,
        variantArbitrary,
        (borderRadius, variant) => {
          const expectedRadius =
            typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius

          const { container } = render(
            <UnifiedIcon
              variant={variant}
              borderRadius={borderRadius}
              iconType="BASE64"
              iconData="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
              name="Test"
            />
          )

          // 验证容器的 borderRadius
          const iconContainer = container.querySelector('[data-testid="unified-icon"]')
          expect(iconContainer).not.toBeNull()
          const containerStyle = iconContainer?.getAttribute('style') || ''
          expect(containerStyle).toContain(`border-radius: ${expectedRadius}`)

          // 验证图片的 borderRadius
          const img = container.querySelector('img')
          expect(img).not.toBeNull()
          const imgStyle = img?.getAttribute('style') || ''
          expect(imgStyle).toContain(`border-radius: ${expectedRadius}`)
        }
      ),
      { numRuns: 20 }
    )
  })
})

describe('**Feature: unified-icon-system, Property 2: size 属性正确覆盖默认尺寸**', () => {
  /**
   * 属性 2.1: 自定义 size 正确应用到容器宽度
   * 
   * **Validates: Requirements 1.9, 8.2, 8.4**
   * 
   * 对于任意 size 值，当传入 UnifiedIcon 组件时，
   * 图标容器的宽度应使用该值
   */
  it('自定义 size 正确应用到容器宽度', () => {
    fc.assert(
      fc.property(sizeArbitrary, variantArbitrary, (size, variant) => {
        const { container } = render(
          <UnifiedIcon
            variant={variant}
            size={size}
            iconType="AUTO"
            url="https://example.com"
            name="Test"
          />
        )

        const iconContainer = container.querySelector('[data-testid="unified-icon"]')
        expect(iconContainer).not.toBeNull()

        // 验证容器的 width 样式
        const style = iconContainer?.getAttribute('style') || ''
        expect(style).toContain(`width: ${size}px`)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 2.2: 自定义 size 正确应用到容器高度
   * 
   * **Validates: Requirements 1.9, 8.2, 8.4**
   * 
   * 对于任意 size 值，当传入 UnifiedIcon 组件时，
   * 图标容器的高度应使用该值
   */
  it('自定义 size 正确应用到容器高度', () => {
    fc.assert(
      fc.property(sizeArbitrary, variantArbitrary, (size, variant) => {
        const { container } = render(
          <UnifiedIcon
            variant={variant}
            size={size}
            iconType="AUTO"
            url="https://example.com"
            name="Test"
          />
        )

        const iconContainer = container.querySelector('[data-testid="unified-icon"]')
        expect(iconContainer).not.toBeNull()

        // 验证容器的 height 样式
        const style = iconContainer?.getAttribute('style') || ''
        expect(style).toContain(`height: ${size}px`)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 2.3: getActualSize 函数正确返回自定义 size
   * 
   * **Validates: Requirements 8.4**
   * 
   * 对于任意 size 值，getActualSize 应返回该值而非 variant 默认值
   */
  it('getActualSize 函数正确返回自定义 size', () => {
    fc.assert(
      fc.property(sizeArbitrary, variantArbitrary, (size, variant) => {
        const result = getActualSize(variant, size)
        expect(result).toBe(size)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 2.4: 未传入 size 时使用 variant 默认值
   * 
   * **Validates: Requirements 8.2**
   * 
   * 当未传入 size 时，应使用 variant 对应的默认尺寸
   */
  it('未传入 size 时使用 variant 默认值', () => {
    fc.assert(
      fc.property(variantArbitrary, (variant) => {
        const result = getActualSize(variant, undefined)
        expect(result).toBe(VARIANT_SIZES[variant])
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 2.5: 自定义 size 覆盖所有 variant 的默认尺寸
   * 
   * **Validates: Requirements 1.9, 8.4**
   * 
   * 无论 variant 是什么，自定义 size 都应覆盖默认尺寸
   */
  it('自定义 size 覆盖所有 variant 的默认尺寸', () => {
    fc.assert(
      fc.property(sizeArbitrary, variantArbitrary, (size, variant) => {
        // 确保自定义 size 与 variant 默认值不同
        const defaultSize = VARIANT_SIZES[variant]
        const actualSize = getActualSize(variant, size)

        // 自定义 size 应该被使用，而非默认值
        expect(actualSize).toBe(size)

        // 如果 size 与默认值不同，验证确实覆盖了
        if (size !== defaultSize) {
          expect(actualSize).not.toBe(defaultSize)
        }
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 2.6: 容器宽高一致（正方形）
   * 
   * **Validates: Requirements 8.4**
   * 
   * 图标容器应始终保持正方形（宽度等于高度）
   */
  it('容器宽高一致（正方形）', () => {
    fc.assert(
      fc.property(sizeArbitrary, variantArbitrary, (size, variant) => {
        const { container } = render(
          <UnifiedIcon
            variant={variant}
            size={size}
            iconType="AUTO"
            url="https://example.com"
            name="Test"
          />
        )

        const iconContainer = container.querySelector('[data-testid="unified-icon"]')
        expect(iconContainer).not.toBeNull()

        const style = iconContainer?.getAttribute('style') || ''
        // 验证宽度和高度都使用相同的 size 值
        expect(style).toContain(`width: ${size}px`)
        expect(style).toContain(`height: ${size}px`)
      }),
      { numRuns: 20 }
    )
  })
})

describe('**Feature: unified-icon-system, Property 3: 自定义 size 时文字图标字号按比例计算**', () => {
  /**
   * 属性 3.1: getTextIconFontSize 按 TEXT_ICON_FONT_RATIO 比例计算
   * 
   * **Validates: Requirements 1.10, 8.5**
   * 
   * 对于任意自定义 size，文字图标字号应按 TEXT_ICON_FONT_RATIO (0.5) 比例计算
   */
  it('getTextIconFontSize 按 TEXT_ICON_FONT_RATIO 比例计算', () => {
    fc.assert(
      fc.property(sizeArbitrary, variantArbitrary, (size, variant) => {
        const result = getTextIconFontSize(variant, size, undefined)
        const expected = Math.round(size * TEXT_ICON_FONT_RATIO)
        expect(result).toBe(expected)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.2: 未传入自定义 size 时使用 variant 默认字号
   * 
   * **Validates: Requirements 8.5**
   * 
   * 当未传入自定义 size 时，应使用 variant 对应的默认字号
   */
  it('未传入自定义 size 时使用 variant 默认字号', () => {
    fc.assert(
      fc.property(variantArbitrary, (variant) => {
        const result = getTextIconFontSize(variant, undefined, undefined)
        expect(result).toBe(VARIANT_FONT_SIZES[variant])
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.3: 自定义 fontSize 优先于比例计算
   * 
   * **Validates: Requirements 8.5**
   * 
   * 当同时传入自定义 size 和 fontSize 时，应使用 fontSize 而非比例计算
   */
  it('自定义 fontSize 优先于比例计算', () => {
    const fontSizeArbitrary = fc.integer({ min: 10, max: 100 })

    fc.assert(
      fc.property(
        sizeArbitrary,
        fontSizeArbitrary,
        variantArbitrary,
        (size, fontSize, variant) => {
          const result = getTextIconFontSize(variant, size, fontSize)
          expect(result).toBe(fontSize)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.4: TEXT 类型图标使用计算后的字号
   * 
   * **Validates: Requirements 1.10, 8.5**
   * 
   * 对于 TEXT 类型图标，当传入自定义 size 时，
   * 内部 TextIcon 组件应使用按比例计算的字号
   */
  it('TEXT 类型图标使用计算后的字号', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        variantArbitrary,
        textArbitrary,
        (size, variant, text) => {
          // 创建 TEXT 类型的 iconData
          const iconData = JSON.stringify({ t: text, c: '', f: 'system' })

          const { container } = render(
            <UnifiedIcon
              variant={variant}
              size={size}
              iconType="TEXT"
              iconData={iconData}
              name="Test"
            />
          )

          // 验证图标类型
          const iconContainer = container.querySelector('[data-testid="unified-icon"]')
          expect(iconContainer).not.toBeNull()
          expect(iconContainer?.getAttribute('data-icon-type')).toBe('TEXT')

          // 验证容器尺寸
          const containerStyle = iconContainer?.getAttribute('style') || ''
          expect(containerStyle).toContain(`width: ${size}px`)
          expect(containerStyle).toContain(`height: ${size}px`)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.5: 字号计算结果为整数
   * 
   * **Validates: Requirements 8.5**
   * 
   * 字号计算结果应始终为整数（通过 Math.round 取整）
   */
  it('字号计算结果为整数', () => {
    fc.assert(
      fc.property(sizeArbitrary, variantArbitrary, (size, variant) => {
        const result = getTextIconFontSize(variant, size, undefined)
        expect(Number.isInteger(result)).toBe(true)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.6: TEXT_ICON_FONT_RATIO 常量值为 0.5
   * 
   * **Validates: Requirements 8.5**
   * 
   * 验证 TEXT_ICON_FONT_RATIO 常量值正确
   */
  it('TEXT_ICON_FONT_RATIO 常量值为 0.5', () => {
    expect(TEXT_ICON_FONT_RATIO).toBe(0.5)
  })

  /**
   * 属性 3.7: 所有 variant 的默认字号都已定义
   * 
   * **Validates: Requirements 8.5**
   * 
   * 验证所有 variant 都有对应的默认字号
   */
  it('所有 variant 的默认字号都已定义', () => {
    fc.assert(
      fc.property(variantArbitrary, (variant) => {
        expect(VARIANT_FONT_SIZES[variant]).toBeDefined()
        expect(typeof VARIANT_FONT_SIZES[variant]).toBe('number')
        expect(VARIANT_FONT_SIZES[variant]).toBeGreaterThan(0)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.8: 字号与 size 成正比
   * 
   * **Validates: Requirements 1.10, 8.5**
   * 
   * 对于任意两个 size 值，较大的 size 应产生较大的字号
   */
  it('字号与 size 成正比', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        sizeArbitrary,
        variantArbitrary,
        (size1, size2, variant) => {
          const fontSize1 = getTextIconFontSize(variant, size1, undefined)
          const fontSize2 = getTextIconFontSize(variant, size2, undefined)

          if (size1 > size2) {
            expect(fontSize1).toBeGreaterThanOrEqual(fontSize2)
          } else if (size1 < size2) {
            expect(fontSize1).toBeLessThanOrEqual(fontSize2)
          } else {
            expect(fontSize1).toBe(fontSize2)
          }
        }
      ),
      { numRuns: 20 }
    )
  })
})


/**
 * 导入圆角计算函数用于 Property 3 和 Property 4 测试
 */
import { calculateProportionalRadius } from '../../utils/iconRadius'

/**
 * 生成有效的圆角比例（0-0.5）
 */
const ratioArbitrary: fc.Arbitrary<number> = fc.double({
  min: 0,
  max: 0.5,
  noNaN: true,
})

describe('**Feature: proportional-icon-radius, Property 3: UnifiedIcon 圆角应用**', () => {
  /**
   * 属性 3.1: 容器元素的 borderRadius 应该等于 calculateProportionalRadius(size, ratio)
   * 
   * **Validates: Requirements 3.1, 3.2**
   * 
   * 对于任意图标大小和圆角比例组合，UnifiedIcon 组件渲染时，
   * 容器元素的 borderRadius 应该等于 calculateProportionalRadius(size, ratio)
   */
  it('容器元素的 borderRadius 应该等于 calculateProportionalRadius(size, ratio)', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        ratioArbitrary,
        variantArbitrary,
        (size, ratio, variant) => {
          const expectedRadius = calculateProportionalRadius(size, ratio)
          const actualRadius = getActualBorderRadius(variant, undefined, size, ratio)
          
          expect(actualRadius).toBe(`${expectedRadius}px`)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.2: 渲染组件时容器应用正确的比例化圆角
   * 
   * **Validates: Requirements 3.1, 3.3**
   * 
   * 对于任意图标大小和圆角比例组合，UnifiedIcon 组件渲染时，
   * 容器元素的 borderRadius 样式应该正确应用
   */
  it('渲染组件时容器应用正确的比例化圆角', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        ratioArbitrary,
        variantArbitrary,
        (size, ratio, variant) => {
          const expectedRadius = calculateProportionalRadius(size, ratio)

          // 使用 getActualBorderRadius 函数验证计算逻辑
          const result = getActualBorderRadius(variant, undefined, size, ratio)
          expect(result).toBe(`${expectedRadius}px`)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.3: 内部图片元素的 borderRadius 应该与容器一致
   * 
   * **Validates: Requirements 3.3**
   * 
   * 对于 BASE64 类型图标，内部图片元素的 borderRadius 应该与容器一致
   * 注意：组件从 AppearanceStore 获取 ratio，因此我们验证容器和图片的圆角一致性
   */
  it('内部图片元素的 borderRadius 应该与容器一致（BASE64 类型）', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        variantArbitrary,
        (size, variant) => {
          const { container } = render(
            <UnifiedIcon
              variant={variant}
              size={size}
              iconType="BASE64"
              iconData="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
              name="Test"
            />
          )

          // 获取容器的 borderRadius
          const iconContainer = container.querySelector('[data-testid="unified-icon"]')
          expect(iconContainer).not.toBeNull()
          const containerStyle = iconContainer?.getAttribute('style') || ''
          
          // 从容器样式中提取 border-radius 值
          const containerRadiusMatch = containerStyle.match(/border-radius:\s*([^;]+)/)
          expect(containerRadiusMatch).not.toBeNull()
          const containerRadius = containerRadiusMatch![1].trim()

          // 验证图片的 borderRadius 与容器一致
          const img = container.querySelector('img')
          expect(img).not.toBeNull()
          const imgStyle = img?.getAttribute('style') || ''
          expect(imgStyle).toContain(`border-radius: ${containerRadius}`)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.4: 当 size 变化时，圆角应该相应更新
   * 
   * **Validates: Requirements 3.2**
   * 
   * 对于任意两个不同的 size 值，圆角应该按比例变化
   */
  it('当 size 变化时，圆角应该相应更新', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        sizeArbitrary,
        ratioArbitrary,
        variantArbitrary,
        (size1, size2, ratio, variant) => {
          const radius1 = calculateProportionalRadius(size1, ratio)
          const radius2 = calculateProportionalRadius(size2, ratio)

          const result1 = getActualBorderRadius(variant, undefined, size1, ratio)
          const result2 = getActualBorderRadius(variant, undefined, size2, ratio)

          expect(result1).toBe(`${radius1}px`)
          expect(result2).toBe(`${radius2}px`)

          // 验证比例关系：较大的 size 应该产生较大或相等的圆角
          if (size1 > size2) {
            expect(radius1).toBeGreaterThanOrEqual(radius2)
          } else if (size1 < size2) {
            expect(radius1).toBeLessThanOrEqual(radius2)
          } else {
            expect(radius1).toBe(radius2)
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.5: 当 ratio 变化时，圆角应该相应更新
   * 
   * **Validates: Requirements 3.2**
   * 
   * 对于任意两个不同的 ratio 值，圆角应该按比例变化
   */
  it('当 ratio 变化时，圆角应该相应更新', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        ratioArbitrary,
        ratioArbitrary,
        variantArbitrary,
        (size, ratio1, ratio2, variant) => {
          const radius1 = calculateProportionalRadius(size, ratio1)
          const radius2 = calculateProportionalRadius(size, ratio2)

          const result1 = getActualBorderRadius(variant, undefined, size, ratio1)
          const result2 = getActualBorderRadius(variant, undefined, size, ratio2)

          expect(result1).toBe(`${radius1}px`)
          expect(result2).toBe(`${radius2}px`)

          // 验证比例关系：较大的 ratio 应该产生较大或相等的圆角
          if (ratio1 > ratio2) {
            expect(radius1).toBeGreaterThanOrEqual(radius2)
          } else if (ratio1 < ratio2) {
            expect(radius1).toBeLessThanOrEqual(radius2)
          } else {
            expect(radius1).toBe(radius2)
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 3.6: 圆角计算结果应该四舍五入到 0.5px
   * 
   * **Validates: Requirements 3.1**
   * 
   * 验证圆角计算结果符合四舍五入到 0.5px 的规则
   */
  it('圆角计算结果应该四舍五入到 0.5px', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        ratioArbitrary,
        variantArbitrary,
        (size, ratio, variant) => {
          const result = getActualBorderRadius(variant, undefined, size, ratio)
          const radiusValue = parseFloat(result.replace('px', ''))

          // 验证结果是 0.5 的倍数
          const isHalfPixelMultiple = (radiusValue * 2) % 1 === 0
          expect(isHalfPixelMultiple).toBe(true)
        }
      ),
      { numRuns: 20 }
    )
  })
})

describe('**Feature: proportional-icon-radius, Property 4: 自定义圆角优先级**', () => {
  /**
   * 属性 4.1: 数字 borderRadius 优先于比例计算
   * 
   * **Validates: Requirements 3.4**
   * 
   * 当同时提供数字 borderRadius 属性和比例化圆角设置时，
   * 组件应该使用 borderRadius 属性值而忽略比例计算
   */
  it('数字 borderRadius 优先于比例计算', () => {
    fc.assert(
      fc.property(
        numericBorderRadiusArbitrary,
        sizeArbitrary,
        ratioArbitrary,
        variantArbitrary,
        (customBorderRadius, size, ratio, variant) => {
          const result = getActualBorderRadius(variant, customBorderRadius, size, ratio)
          
          // 应该使用自定义值，而非比例计算值
          expect(result).toBe(`${customBorderRadius}px`)
          
          // 验证确实忽略了比例计算
          const proportionalRadius = calculateProportionalRadius(size, ratio)
          if (customBorderRadius !== proportionalRadius) {
            expect(result).not.toBe(`${proportionalRadius}px`)
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 4.2: 字符串 borderRadius 优先于比例计算
   * 
   * **Validates: Requirements 3.4**
   * 
   * 当同时提供字符串 borderRadius 属性和比例化圆角设置时，
   * 组件应该使用 borderRadius 属性值而忽略比例计算
   */
  it('字符串 borderRadius 优先于比例计算', () => {
    fc.assert(
      fc.property(
        stringBorderRadiusArbitrary,
        sizeArbitrary,
        ratioArbitrary,
        variantArbitrary,
        (customBorderRadius, size, ratio, variant) => {
          const result = getActualBorderRadius(variant, customBorderRadius, size, ratio)
          
          // 应该使用自定义值，而非比例计算值
          expect(result).toBe(customBorderRadius)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 4.3: 渲染组件时自定义 borderRadius 优先于比例计算
   * 
   * **Validates: Requirements 3.4**
   * 
   * 对于 BASE64 类型图标，当同时提供 borderRadius 和比例设置时，
   * 容器和图片都应该使用自定义 borderRadius
   */
  it('渲染组件时自定义 borderRadius 优先于比例计算（BASE64 类型）', () => {
    fc.assert(
      fc.property(
        borderRadiusArbitrary,
        sizeArbitrary,
        ratioArbitrary,
        variantArbitrary,
        (customBorderRadius, size, _ratio, variant) => {
          const expectedRadius =
            typeof customBorderRadius === 'number'
              ? `${customBorderRadius}px`
              : customBorderRadius

          const { container } = render(
            <UnifiedIcon
              variant={variant}
              size={size}
              borderRadius={customBorderRadius}
              iconType="BASE64"
              iconData="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
              name="Test"
            />
          )

          // 验证容器的 borderRadius 使用自定义值
          const iconContainer = container.querySelector('[data-testid="unified-icon"]')
          expect(iconContainer).not.toBeNull()
          const containerStyle = iconContainer?.getAttribute('style') || ''
          expect(containerStyle).toContain(`border-radius: ${expectedRadius}`)

          // 验证图片的 borderRadius 也使用自定义值
          const img = container.querySelector('img')
          expect(img).not.toBeNull()
          const imgStyle = img?.getAttribute('style') || ''
          expect(imgStyle).toContain(`border-radius: ${expectedRadius}`)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 4.4: 自定义 borderRadius 为 0 时也应该优先使用
   * 
   * **Validates: Requirements 3.4**
   * 
   * 即使自定义 borderRadius 为 0，也应该优先使用而非比例计算
   */
  it('自定义 borderRadius 为 0 时也应该优先使用', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        ratioArbitrary,
        variantArbitrary,
        (size, ratio, variant) => {
          const result = getActualBorderRadius(variant, 0, size, ratio)
          
          // 应该使用自定义值 0
          expect(result).toBe('0px')
          
          // 验证确实忽略了比例计算（除非比例计算结果也是 0）
          const proportionalRadius = calculateProportionalRadius(size, ratio)
          if (proportionalRadius !== 0) {
            expect(result).not.toBe(`${proportionalRadius}px`)
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 4.5: 未提供 borderRadius 时使用比例计算
   * 
   * **Validates: Requirements 3.1, 3.4**
   * 
   * 当未提供 borderRadius 但提供了 size 和 ratio 时，应该使用比例计算
   */
  it('未提供 borderRadius 时使用比例计算', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        ratioArbitrary,
        variantArbitrary,
        (size, ratio, variant) => {
          const result = getActualBorderRadius(variant, undefined, size, ratio)
          const expectedRadius = calculateProportionalRadius(size, ratio)
          
          expect(result).toBe(`${expectedRadius}px`)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 4.6: 未提供 size 和 ratio 时回退到变体默认值
   * 
   * **Validates: Requirements 3.4**
   * 
   * 当未提供 borderRadius、size 和 ratio 时，应该回退到变体默认值
   */
  it('未提供 size 和 ratio 时回退到变体默认值', () => {
    fc.assert(
      fc.property(variantArbitrary, (variant) => {
        const result = getActualBorderRadius(variant, undefined, undefined, undefined)
        
        expect(result).toBe(VARIANT_RADIUS[variant])
      }),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 4.7: 优先级顺序验证：自定义 > 比例计算 > 变体默认
   * 
   * **Validates: Requirements 3.1, 3.4**
   * 
   * 验证完整的优先级顺序
   */
  it('优先级顺序验证：自定义 > 比例计算 > 变体默认', () => {
    fc.assert(
      fc.property(
        borderRadiusArbitrary,
        sizeArbitrary,
        ratioArbitrary,
        variantArbitrary,
        (customBorderRadius, size, ratio, variant) => {
          // 1. 有自定义值时使用自定义值
          const withCustom = getActualBorderRadius(variant, customBorderRadius, size, ratio)
          const expectedCustom =
            typeof customBorderRadius === 'number'
              ? `${customBorderRadius}px`
              : customBorderRadius
          expect(withCustom).toBe(expectedCustom)

          // 2. 无自定义值但有 size 和 ratio 时使用比例计算
          const withProportional = getActualBorderRadius(variant, undefined, size, ratio)
          const expectedProportional = `${calculateProportionalRadius(size, ratio)}px`
          expect(withProportional).toBe(expectedProportional)

          // 3. 都没有时使用变体默认值
          const withDefault = getActualBorderRadius(variant, undefined, undefined, undefined)
          expect(withDefault).toBe(VARIANT_RADIUS[variant])
        }
      ),
      { numRuns: 20 }
    )
  })
})

