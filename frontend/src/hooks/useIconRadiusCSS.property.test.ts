import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { renderHook, act } from '@testing-library/react'
import { useIconRadiusCSS } from './useIconRadiusCSS'
import { useAppearanceStore } from '../stores/appearance'
import { calculateProportionalRadius } from '../utils/iconRadius'

/**
 * Property 6: CSS 变量响应式更新
 * 
 * 对于任意圆角比例变化，CSS 变量应该立即更新：
 * - `--start-radius-ratio` 应该等于新的比例值
 * - `--start-radius` 应该等于 `64 × ratio`（默认图标大小的圆角）
 * 
 * Feature: proportional-icon-radius, Property 6: CSS 变量响应式更新
 * **Validates: Requirements 5.2**
 */
describe('Property 6: CSS 变量响应式更新', () => {
  const DEFAULT_ICON_SIZE = 64

  // 保存原始 CSS 变量值以便恢复
  let originalRadiusRatio: string | null
  let originalRadius: string | null

  beforeEach(() => {
    // 保存原始值
    originalRadiusRatio = document.documentElement.style.getPropertyValue('--start-radius-ratio')
    originalRadius = document.documentElement.style.getPropertyValue('--start-radius')
    
    // 重置 store 状态
    useAppearanceStore.getState().resetAppearance()
    
    // 清除 localStorage 以确保测试隔离
    localStorage.removeItem('start:appearance')
  })

  afterEach(() => {
    // 恢复原始 CSS 变量值
    if (originalRadiusRatio) {
      document.documentElement.style.setProperty('--start-radius-ratio', originalRadiusRatio)
    } else {
      document.documentElement.style.removeProperty('--start-radius-ratio')
    }
    
    if (originalRadius) {
      document.documentElement.style.setProperty('--start-radius', originalRadius)
    } else {
      document.documentElement.style.removeProperty('--start-radius')
    }
  })

  it('should update --start-radius-ratio CSS variable to match the ratio value', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.5, noNaN: true }),
        (ratio) => {
          // 渲染 hook
          const { unmount } = renderHook(() => useIconRadiusCSS())

          // 更新 store 中的圆角比例
          act(() => {
            useAppearanceStore.getState().setIconRadiusRatio(ratio)
          })

          // 验证：--start-radius-ratio 应该等于新的比例值
          const cssRatioValue = document.documentElement.style.getPropertyValue('--start-radius-ratio')
          expect(parseFloat(cssRatioValue)).toBeCloseTo(ratio, 10)

          // 清理
          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should update --start-radius CSS variable to equal 64 × ratio', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.5, noNaN: true }),
        (ratio) => {
          // 渲染 hook
          const { unmount } = renderHook(() => useIconRadiusCSS())

          // 更新 store 中的圆角比例
          act(() => {
            useAppearanceStore.getState().setIconRadiusRatio(ratio)
          })

          // 计算期望的圆角值
          const expectedRadius = calculateProportionalRadius(DEFAULT_ICON_SIZE, ratio)

          // 验证：--start-radius 应该等于 64 × ratio（四舍五入到 0.5px）
          const cssRadiusValue = document.documentElement.style.getPropertyValue('--start-radius')
          expect(cssRadiusValue).toBe(`${expectedRadius}px`)

          // 清理
          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should update CSS variables immediately when ratio changes multiple times', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 0.5, noNaN: true }), { minLength: 2, maxLength: 10 }),
        (ratios) => {
          // 渲染 hook
          const { unmount } = renderHook(() => useIconRadiusCSS())

          // 依次更新多个比例值
          for (const ratio of ratios) {
            act(() => {
              useAppearanceStore.getState().setIconRadiusRatio(ratio)
            })

            // 验证每次更新后 CSS 变量都正确
            const cssRatioValue = document.documentElement.style.getPropertyValue('--start-radius-ratio')
            const cssRadiusValue = document.documentElement.style.getPropertyValue('--start-radius')
            const expectedRadius = calculateProportionalRadius(DEFAULT_ICON_SIZE, ratio)

            expect(parseFloat(cssRatioValue)).toBeCloseTo(ratio, 10)
            expect(cssRadiusValue).toBe(`${expectedRadius}px`)
          }

          // 清理
          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should set CSS variables on initial render with current store value', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.5, noNaN: true }),
        (ratio) => {
          // 先设置 store 中的值
          act(() => {
            useAppearanceStore.getState().setIconRadiusRatio(ratio)
          })

          // 然后渲染 hook
          const { unmount } = renderHook(() => useIconRadiusCSS())

          // 验证：CSS 变量应该在初始渲染时就被设置
          const cssRatioValue = document.documentElement.style.getPropertyValue('--start-radius-ratio')
          const cssRadiusValue = document.documentElement.style.getPropertyValue('--start-radius')
          const expectedRadius = calculateProportionalRadius(DEFAULT_ICON_SIZE, ratio)

          expect(parseFloat(cssRatioValue)).toBeCloseTo(ratio, 10)
          expect(cssRadiusValue).toBe(`${expectedRadius}px`)

          // 清理
          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle boundary values correctly', () => {
    const { unmount } = renderHook(() => useIconRadiusCSS())

    // 测试边界值 0
    act(() => {
      useAppearanceStore.getState().setIconRadiusRatio(0)
    })
    expect(document.documentElement.style.getPropertyValue('--start-radius-ratio')).toBe('0')
    expect(document.documentElement.style.getPropertyValue('--start-radius')).toBe('0px')

    // 测试边界值 0.5
    act(() => {
      useAppearanceStore.getState().setIconRadiusRatio(0.5)
    })
    expect(document.documentElement.style.getPropertyValue('--start-radius-ratio')).toBe('0.5')
    expect(document.documentElement.style.getPropertyValue('--start-radius')).toBe('32px') // 64 × 0.5 = 32

    // 测试默认值 0.25
    act(() => {
      useAppearanceStore.getState().resetAppearance()
    })
    expect(document.documentElement.style.getPropertyValue('--start-radius-ratio')).toBe('0.25')
    expect(document.documentElement.style.getPropertyValue('--start-radius')).toBe('16px') // 64 × 0.25 = 16

    // 清理
    unmount()
  })

  it('should maintain consistency between ratio and radius CSS variables', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.5, noNaN: true }),
        (ratio) => {
          // 渲染 hook
          const { unmount } = renderHook(() => useIconRadiusCSS())

          // 更新 store 中的圆角比例
          act(() => {
            useAppearanceStore.getState().setIconRadiusRatio(ratio)
          })

          // 获取 CSS 变量值
          const cssRatioValue = parseFloat(
            document.documentElement.style.getPropertyValue('--start-radius-ratio')
          )
          const cssRadiusValue = document.documentElement.style.getPropertyValue('--start-radius')
          
          // 从 --start-radius 提取数值
          const radiusMatch = cssRadiusValue.match(/^([\d.]+)px$/)
          expect(radiusMatch).not.toBeNull()
          
          const radiusNumber = parseFloat(radiusMatch![1])
          
          // 验证：--start-radius 应该等于 calculateProportionalRadius(64, --start-radius-ratio)
          const expectedRadius = calculateProportionalRadius(DEFAULT_ICON_SIZE, cssRatioValue)
          expect(radiusNumber).toBe(expectedRadius)

          // 清理
          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })
})
