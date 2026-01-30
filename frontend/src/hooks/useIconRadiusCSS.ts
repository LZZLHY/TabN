import { useEffect } from 'react'
import { useAppearanceStore } from '../stores/appearance'
import { calculateProportionalRadius } from '../utils/iconRadius'

/**
 * 默认图标大小（用于计算 --start-radius 向后兼容值）
 */
const DEFAULT_ICON_SIZE = 64

/**
 * 更新 CSS 变量
 * @param ratio - 圆角比例（0-0.5）
 */
function updateCSSVariables(ratio: number) {
  const root = document.documentElement
  const defaultRadius = calculateProportionalRadius(DEFAULT_ICON_SIZE, ratio)

  // 设置圆角比例 CSS 变量
  root.style.setProperty('--start-radius-ratio', String(ratio))
  // 设置默认图标大小的圆角值（向后兼容）
  root.style.setProperty('--start-radius', `${defaultRadius}px`)
}

/**
 * CSS 变量更新 hook
 * 
 * 监听 iconRadiusRatio 变化，更新以下 CSS 变量：
 * - `--start-radius-ratio`: 圆角比例值（0-0.5）
 * - `--start-radius`: 默认图标大小（64px）对应的圆角像素值
 * 
 * 需求验收标准：
 * - 5.1: 在文档根元素设置 `--start-radius-ratio` CSS 变量
 * - 5.2: 用户更改圆角比例时，立即更新 CSS 变量值
 * - 5.3: 保持 `--start-radius` 变量用于向后兼容
 */
export function useIconRadiusCSS() {
  const iconRadiusRatio = useAppearanceStore((s) => s.iconRadiusRatio)

  useEffect(() => {
    updateCSSVariables(iconRadiusRatio)
  }, [iconRadiusRatio])
}
