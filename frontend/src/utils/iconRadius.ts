/**
 * 图标圆角比例化计算工具
 * 
 * 实现图标圆角随图标大小按比例缩放的功能，
 * 确保不同大小的图标在视觉上保持一致的圆角程度。
 */

/**
 * 默认圆角比例（25%）
 * 对应 64px 图标 16px 圆角的视觉效果
 */
export const DEFAULT_RADIUS_RATIO = 0.25

/**
 * 计算比例化圆角值
 * 
 * @param size - 图标大小（像素）
 * @param ratio - 圆角比例（0-0.5）
 * @returns 圆角像素值，四舍五入到最近的 0.5px
 * 
 * @example
 * // 64px 图标，25% 比例 -> 16px 圆角
 * calculateProportionalRadius(64, 0.25) // 返回 16
 * 
 * @example
 * // 32px 图标，12.5% 比例 -> 4px 圆角
 * calculateProportionalRadius(32, 0.125) // 返回 4
 * 
 * @example
 * // 6px 图标，25% 比例 -> 1.5px 圆角
 * calculateProportionalRadius(6, 0.25) // 返回 1.5
 */
export function calculateProportionalRadius(size: number, ratio: number): number {
  const rawRadius = size * ratio
  // 四舍五入到最近的 0.5px
  return Math.round(rawRadius * 2) / 2
}
