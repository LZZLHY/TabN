/**
 * 文字图标类型定义
 * 用于文字图标功能的配置和渲染
 */

/**
 * 支持的字体选项
 * - system: 系统默认 sans-serif
 * - serif: 衬线字体
 * - mono: 等宽字体
 * - rounded: 圆角字体
 * - handwriting: 手写风格
 */
export type TextIconFont =
  | 'system'
  | 'serif'
  | 'mono'
  | 'rounded'
  | 'handwriting'

/**
 * 文字排版布局
 * - auto: 自动根据字号选择布局
 * - single: 单行显示
 * - grid: 2x2 网格显示
 */
export type TextIconLayout = 'auto' | 'single' | 'grid'

/**
 * 文字图标配置接口
 * 存储文字图标的自定义设置
 */
export interface TextIconConfig {
  /** 自定义文字内容（1-4 字符） */
  text: string
  /** 文字颜色（hex 格式，如 #FF5733） */
  color: string
  /** 字体系列标识符 */
  fontFamily: TextIconFont
  /** 字号大小（10-100，默认 50） */
  fontSize?: number
  /** 排版布局 */
  layout?: TextIconLayout
}

/**
 * 有效的字体选项列表
 */
export const VALID_TEXT_ICON_FONTS: TextIconFont[] = [
  'system',
  'serif',
  'mono',
  'rounded',
  'handwriting',
]

/**
 * 有效的布局选项列表
 */
export const VALID_TEXT_ICON_LAYOUTS: TextIconLayout[] = [
  'auto',
  'single',
  'grid',
]

/**
 * 检查字体是否有效
 * @param font 字体名称
 * @returns 是否为有效的 TextIconFont
 */
export function isValidTextIconFont(font: unknown): font is TextIconFont {
  return typeof font === 'string' && VALID_TEXT_ICON_FONTS.includes(font as TextIconFont)
}

/**
 * 检查布局是否有效
 * @param layout 布局名称
 * @returns 是否为有效的 TextIconLayout
 */
export function isValidTextIconLayout(layout: unknown): layout is TextIconLayout {
  return typeof layout === 'string' && VALID_TEXT_ICON_LAYOUTS.includes(layout as TextIconLayout)
}

/**
 * 默认文字图标配置
 */
export const DEFAULT_TEXT_ICON_CONFIG: TextIconConfig = {
  text: '',
  color: '',
  fontFamily: 'system',
  fontSize: 50,
  layout: 'auto',
}
