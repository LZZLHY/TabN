/**
 * EngineOption 属性测试
 * 
 * **Feature: unified-icon-system, proportional-icon-radius**
 * 
 * 本测试文件验证搜索引擎组件的核心属性：
 * - Property 7: 搜索引擎组件正确传递自定义样式属性
 * - 使用比例化圆角计算
 * 
 * **Validates: Requirements 8.8**
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import * as fc from 'fast-check'
import { EngineOption } from './EngineOption'
import type { SearchEngineConfig } from '../../utils/searchEngine'
import type { SyncedIconInfo } from '../../services/iconSyncService'
import { useAppearanceStore } from '../../stores/appearance'
import { calculateProportionalRadius } from '../../utils/iconRadius'

// Mock Favicon 组件
vi.mock('../Favicon', () => ({
  Favicon: ({ name, size }: { name?: string; size?: number; onAllFailed?: () => void }) => (
    <span data-testid="favicon" style={{ width: size, height: size }}>{name?.charAt(0) || '?'}</span>
  ),
}))

// Mock UnifiedIcon 组件 - 保留样式属性以便测试验证
vi.mock('../ui/UnifiedIcon', () => ({
  UnifiedIcon: ({
    iconType,
    iconData,
    iconUrl,
    iconBg,
    name,
    size,
    borderRadius,
  }: {
    iconType?: string | null
    iconData?: string | null
    iconUrl?: string | null
    iconBg?: string | null
    name?: string | null
    size?: number
    borderRadius?: number | string
  }) => {
    // 计算实际的 borderRadius 字符串
    const actualBorderRadius =
      borderRadius !== undefined
        ? typeof borderRadius === 'number'
          ? `${borderRadius}px`
          : borderRadius
        : 'var(--start-radius)'

    return (
      <div
        data-testid="unified-icon"
        data-icon-type={iconType || 'AUTO'}
        data-size={size}
        data-border-radius={borderRadius}
        style={{
          width: size ? `${size}px` : '48px',
          height: size ? `${size}px` : '48px',
          borderRadius: actualBorderRadius,
          backgroundColor: iconBg || undefined,
        }}
      >
        {iconType === 'BASE64' && iconData ? (
          <img src={iconData} alt={name || ''} data-testid="icon-img" />
        ) : iconType === 'TEXT' && iconData ? (
          <span data-testid="text-icon">{JSON.parse(iconData).t || name?.charAt(0)}</span>
        ) : (
          <span data-testid="favicon">{name?.charAt(0) || '?'}</span>
        )}
      </div>
    )
  },
}))

/**
 * 生成有效的 size（正整数像素值）
 */
const sizeArbitrary: fc.Arbitrary<number> = fc.integer({ min: 16, max: 128 })

/**
 * 生成有效的圆角比例（0-0.5）
 */
const ratioArbitrary: fc.Arbitrary<number> = fc.double({ min: 0, max: 0.5, noNaN: true })

/**
 * 生成有效的引擎名称
 */
const engineNameArbitrary: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 20 })

/**
 * 生成有效的域名
 */
const domainArbitrary: fc.Arbitrary<string> = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-z]+$/.test(s)),
    fc.constantFrom('.com', '.org', '.net', '.io', '.cn')
  )
  .map(([name, tld]) => `${name}${tld}`)

/**
 * 生成有效的 hex 颜色
 */
const hexColorArbitrary: fc.Arbitrary<string> = fc
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
 * 生成 SearchEngineConfig
 */
const searchEngineConfigArbitrary: fc.Arbitrary<SearchEngineConfig> = fc
  .record({
    id: fc.uuid(),
    name: engineNameArbitrary,
    domain: domainArbitrary,
    isPreset: fc.boolean(),
  })
  .map((data) => ({
    id: data.id,
    name: data.name,
    urlTemplate: `https://${data.domain}/search?q={query}`,
    domain: data.domain,
    isPreset: data.isPreset,
  }))

/**
 * 生成 SyncedIconInfo
 */
const syncedIconInfoArbitrary: fc.Arbitrary<SyncedIconInfo | null> = fc.oneof(
  fc.constant(null),
  fc
    .record({
      iconType: fc.constantFrom('BASE64', 'URL', null),
      iconData: fc.option(fc.constant('data:image/png;base64,test'), { nil: null }),
      iconUrl: fc.option(fc.webUrl(), { nil: null }),
      iconBg: fc.option(fc.oneof(hexColorArbitrary, fc.constant('transparent'), fc.constant('default')), { nil: null }),
      sourceBookmarkId: fc.uuid(),
    })
    .map((data) => ({
      iconType: data.iconType as 'BASE64' | 'URL' | null,
      iconData: data.iconType === 'BASE64' ? (data.iconData ?? 'data:image/png;base64,test') : data.iconData,
      iconUrl: data.iconUrl,
      iconBg: data.iconBg,
      sourceBookmarkId: data.sourceBookmarkId,
    }))
)

describe('**Feature: unified-icon-system, Property 7: 搜索引擎组件使用比例化圆角**', () => {
  // 每个测试后清理 DOM
  afterEach(() => {
    cleanup()
  })

  // 每个测试前重置 store
  beforeEach(() => {
    useAppearanceStore.setState({ iconRadiusRatio: 0.25 })
  })

  /**
   * 属性 7.1: 自定义 size 正确传递给 UnifiedIcon
   * 
   * **Validates: Requirements 8.8**
   * 
   * 对于任意 size 值，当传入 EngineOption 组件时，
   * 内部 UnifiedIcon 组件应接收到该尺寸值
   */
  it('自定义 size 正确传递给 UnifiedIcon', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        searchEngineConfigArbitrary,
        (size, engine) => {
          const mockOnClick = vi.fn()

          const { container } = render(
            <EngineOption
              engine={engine}
              isSelected={false}
              size={size}
              onClick={mockOnClick}
            />
          )

          const unifiedIcon = container.querySelector('[data-testid="unified-icon"]')
          expect(unifiedIcon).not.toBeNull()

          // 验证 size 属性正确传递
          expect(unifiedIcon?.getAttribute('data-size')).toBe(String(size))

          // 验证样式正确应用
          const style = unifiedIcon?.getAttribute('style') || ''
          expect(style).toContain(`width: ${size}px`)
          expect(style).toContain(`height: ${size}px`)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7.2: 圆角基于 size 和 iconRadiusRatio 比例计算
   * 
   * **Validates: Requirements 8.8**
   * 
   * 圆角应该根据 size 和 store 中的 iconRadiusRatio 进行比例计算
   */
  it('圆角基于 size 和 iconRadiusRatio 比例计算', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        ratioArbitrary,
        searchEngineConfigArbitrary,
        (size, ratio, engine) => {
          // 设置 store 中的圆角比例
          useAppearanceStore.setState({ iconRadiusRatio: ratio })
          
          const mockOnClick = vi.fn()
          const expectedRadius = calculateProportionalRadius(size, ratio)

          const { container } = render(
            <EngineOption
              engine={engine}
              isSelected={false}
              size={size}
              onClick={mockOnClick}
            />
          )

          const unifiedIcon = container.querySelector('[data-testid="unified-icon"]')
          expect(unifiedIcon).not.toBeNull()

          // 验证 borderRadius 使用比例计算
          expect(unifiedIcon?.getAttribute('data-border-radius')).toBe(String(expectedRadius))
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7.3: 未传入自定义 size 时使用默认值 48px
   * 
   * **Validates: Requirements 8.8**
   * 
   * 当未传入 size 时，应使用默认值 48px
   */
  it('未传入自定义 size 时使用默认值 48px', () => {
    fc.assert(
      fc.property(
        searchEngineConfigArbitrary,
        (engine) => {
          const mockOnClick = vi.fn()

          const { container } = render(
            <EngineOption
              engine={engine}
              isSelected={false}
              onClick={mockOnClick}
            />
          )

          const unifiedIcon = container.querySelector('[data-testid="unified-icon"]')
          expect(unifiedIcon).not.toBeNull()

          // 验证使用默认尺寸 48px
          expect(unifiedIcon?.getAttribute('data-size')).toBe('48')

          // 验证样式使用默认值
          const style = unifiedIcon?.getAttribute('style') || ''
          expect(style).toContain('width: 48px')
          expect(style).toContain('height: 48px')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7.4: syncedIcon 信息正确传递给 UnifiedIcon
   * 
   * **Validates: Requirements 8.8**
   * 
   * 当传入 syncedIcon 时，图标信息应正确传递给 UnifiedIcon
   */
  it('syncedIcon 信息正确传递给 UnifiedIcon', () => {
    fc.assert(
      fc.property(
        searchEngineConfigArbitrary,
        syncedIconInfoArbitrary,
        sizeArbitrary,
        (engine, syncedIcon, size) => {
          const mockOnClick = vi.fn()

          const { container } = render(
            <EngineOption
              engine={engine}
              isSelected={false}
              syncedIcon={syncedIcon}
              size={size}
              onClick={mockOnClick}
            />
          )

          const unifiedIcon = container.querySelector('[data-testid="unified-icon"]')
          expect(unifiedIcon).not.toBeNull()

          // 验证 size 正确传递
          expect(unifiedIcon?.getAttribute('data-size')).toBe(String(size))

          // 如果有 syncedIcon 且 iconType 不为 null，验证图标类型
          if (syncedIcon && syncedIcon.iconType) {
            expect(unifiedIcon?.getAttribute('data-icon-type')).toBe(syncedIcon.iconType)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7.5: globalBg 正确传递给 UnifiedIcon
   * 
   * **Validates: Requirements 8.8**
   * 
   * 当传入 globalBg 时，背景设置应正确传递给 UnifiedIcon
   */
  it('globalBg 正确传递给 UnifiedIcon', () => {
    // 辅助函数：将 hex 颜色转换为 rgb 格式
    const hexToRgb = (hex: string): string => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      if (!result) return hex
      const r = parseInt(result[1], 16)
      const g = parseInt(result[2], 16)
      const b = parseInt(result[3], 16)
      return `rgb(${r}, ${g}, ${b})`
    }

    fc.assert(
      fc.property(
        searchEngineConfigArbitrary,
        fc.oneof(hexColorArbitrary, fc.constant('transparent'), fc.constant('default')),
        sizeArbitrary,
        (engine, globalBg, size) => {
          const mockOnClick = vi.fn()

          const { container } = render(
            <EngineOption
              engine={engine}
              isSelected={false}
              globalBg={globalBg}
              size={size}
              onClick={mockOnClick}
            />
          )

          const unifiedIcon = container.querySelector('[data-testid="unified-icon"]')
          expect(unifiedIcon).not.toBeNull()

          // 验证 size 正确传递
          expect(unifiedIcon?.getAttribute('data-size')).toBe(String(size))

          // 验证背景样式（如果是颜色值）
          // 浏览器会将 hex 颜色转换为 rgb 格式
          if (globalBg.startsWith('#')) {
            const style = unifiedIcon?.getAttribute('style') || ''
            const expectedRgb = hexToRgb(globalBg)
            expect(style).toContain(`background-color: ${expectedRgb}`)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7.6: 选中状态不影响样式属性传递
   * 
   * **Validates: Requirements 8.8**
   * 
   * 无论 isSelected 状态如何，自定义样式属性都应正确传递
   */
  it('选中状态不影响样式属性传递', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        ratioArbitrary,
        searchEngineConfigArbitrary,
        fc.boolean(),
        (size, ratio, engine, isSelected) => {
          useAppearanceStore.setState({ iconRadiusRatio: ratio })
          const expectedRadius = calculateProportionalRadius(size, ratio)
          const mockOnClick = vi.fn()

          const { container } = render(
            <EngineOption
              engine={engine}
              isSelected={isSelected}
              size={size}
              onClick={mockOnClick}
            />
          )

          const unifiedIcon = container.querySelector('[data-testid="unified-icon"]')
          expect(unifiedIcon).not.toBeNull()

          // 验证样式属性不受选中状态影响
          expect(unifiedIcon?.getAttribute('data-size')).toBe(String(size))
          expect(unifiedIcon?.getAttribute('data-border-radius')).toBe(String(expectedRadius))

          const style = unifiedIcon?.getAttribute('style') || ''
          expect(style).toContain(`width: ${size}px`)
          expect(style).toContain(`height: ${size}px`)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7.7: BASE64 类型图标正确渲染
   * 
   * **Validates: Requirements 8.8**
   * 
   * 当 syncedIcon 为 BASE64 类型时，应正确渲染图标
   */
  it('BASE64 类型图标正确渲染', () => {
    fc.assert(
      fc.property(
        searchEngineConfigArbitrary,
        sizeArbitrary,
        (engine, size) => {
          const syncedIcon: SyncedIconInfo = {
            iconType: 'BASE64',
            iconData: 'data:image/png;base64,test',
            iconUrl: null,
            iconBg: null,
            sourceBookmarkId: 'test-bookmark',
          }
          const mockOnClick = vi.fn()

          const { container } = render(
            <EngineOption
              engine={engine}
              isSelected={false}
              syncedIcon={syncedIcon}
              size={size}
              onClick={mockOnClick}
            />
          )

          const unifiedIcon = container.querySelector('[data-testid="unified-icon"]')
          expect(unifiedIcon).not.toBeNull()

          // 验证图标类型为 BASE64
          expect(unifiedIcon?.getAttribute('data-icon-type')).toBe('BASE64')

          // 验证 size 正确传递
          expect(unifiedIcon?.getAttribute('data-size')).toBe(String(size))
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 7.8: 图标容器保持正方形
   * 
   * **Validates: Requirements 8.8**
   * 
   * 图标容器应始终保持正方形（宽度等于高度）
   */
  it('图标容器保持正方形', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        searchEngineConfigArbitrary,
        (size, engine) => {
          const mockOnClick = vi.fn()

          const { container } = render(
            <EngineOption
              engine={engine}
              isSelected={false}
              size={size}
              onClick={mockOnClick}
            />
          )

          const unifiedIcon = container.querySelector('[data-testid="unified-icon"]')
          expect(unifiedIcon).not.toBeNull()

          const style = unifiedIcon?.getAttribute('style') || ''
          // 验证宽度和高度都使用相同的 size 值
          expect(style).toContain(`width: ${size}px`)
          expect(style).toContain(`height: ${size}px`)
        }
      ),
      { numRuns: 100 }
    )
  })
})
