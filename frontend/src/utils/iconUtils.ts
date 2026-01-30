/**
 * 图标工具函数
 * 提供统一的图标样式计算、源 URL 获取、类型判断等功能
 */

import type { CSSProperties } from 'react'
import type { TextIconFont } from '@start/shared'
import { parseTextIconConfig } from '@start/shared'
import type { IconData, IconVariant } from '../components/ui/UnifiedIcon'
import { VARIANT_RADIUS } from '../components/ui/UnifiedIcon'
import { getIconUrl } from './iconSource'

/**
 * 解析后的文字图标数据
 */
export interface ParsedTextIconData {
  /** 显示文字 */
  text: string
  /** 文字颜色 */
  color?: string
  /** 字体系列 */
  fontFamily?: TextIconFont
  /** 字号 */
  fontSize?: number
}

/**
 * 计算图标背景样式
 * 统一处理所有背景类型：透明、自定义颜色、毛玻璃效果
 *
 * 背景配置格式：
 * - "transparent": 透明背景
 * - "#RRGGBB": 自定义颜色背景
 * - "default": 默认毛玻璃效果
 * - "default:primary": 带主题色的毛玻璃效果
 * - "default:blur:N": 指定模糊强度的毛玻璃效果
 * - "default:primary:blur:N": 带主题色和指定模糊强度的毛玻璃效果
 *
 * @param iconBg - 图标背景配置
 * @param variant - 图标尺寸变体（用于确定默认样式）
 * @param hasCustomIcon - 是否有自定义图标（影响默认背景样式）
 * @returns 背景样式对象，包含 className 和可选的 style
 *
 * @example
 * // 透明背景
 * computeIconBgStyle('transparent', 'full', false)
 * // => { className: '' }
 *
 * @example
 * // 自定义颜色背景
 * computeIconBgStyle('#FF5733', 'full', true)
 * // => { className: '', style: { backgroundColor: '#FF5733' } }
 *
 * @example
 * // 毛玻璃背景
 * computeIconBgStyle('default:primary:blur:50', 'full', true)
 * // => { className: 'bg-primary/20', style: { backdropFilter: 'blur(5px)', ... } }
 */
export function computeIconBgStyle(
  iconBg: string | null | undefined,
  variant: IconVariant,
  hasCustomIcon: boolean
): { className: string; style?: CSSProperties } {
  // Note: variant is included for future extensibility (e.g., different default styles per variant)
  // Currently not used but kept for API consistency with design spec
  void variant

  // 透明背景
  if (iconBg === 'transparent') {
    return { className: '' }
  }

  // 自定义颜色背景（以 # 开头的 hex 颜色）
  if (iconBg && iconBg.startsWith('#')) {
    return {
      className: '',
      style: { backgroundColor: iconBg },
    }
  }

  // 毛玻璃背景（default 或 default:primary:blur:N 格式）
  if (!iconBg || iconBg.startsWith('default')) {
    const usePrimary = iconBg?.includes('primary') || false
    const blurMatch = iconBg?.match(/blur:(\d+)/)
    const blurIntensity = blurMatch ? parseInt(blurMatch[1]) : 70

    const blurPx = Math.round(blurIntensity / 10)
    const bgOpacity = (blurIntensity / 100) * 0.7

    // 毛玻璃效果：白色半透明背景 + 可选的主题色叠加
    const baseStyle: CSSProperties = {
      backdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
      WebkitBackdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
    }

    if (usePrimary) {
      return {
        className: 'bg-primary/20',
        style: {
          ...baseStyle,
          boxShadow: `inset 0 0 0 100px rgba(255, 255, 255, ${bgOpacity * 0.5})`,
        },
      }
    } else {
      return {
        className: '',
        style: {
          ...baseStyle,
          backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`,
        },
      }
    }
  }

  // 默认背景（fallback）
  if (hasCustomIcon) {
    return { className: 'bg-white/70' }
  }
  return { className: 'bg-primary/15 text-primary font-semibold' }
}

/**
 * 获取图标源 URL
 * 处理 BASE64、URL、来源标记等不同格式
 *
 * @param iconData - 图标数据对象
 * @returns 图标源 URL 或 null
 *
 * @example
 * // BASE64 类型
 * getIconSrc({ iconType: 'BASE64', iconData: 'data:image/png;base64,...' })
 * // => 'data:image/png;base64,...'
 *
 * @example
 * // URL 类型
 * getIconSrc({ iconType: 'URL', iconUrl: 'https://example.com/icon.png', url: 'https://example.com' })
 * // => 'https://example.com/icon.png'
 *
 * @example
 * // 来源标记
 * getIconSrc({ iconUrl: 'source:google', url: 'https://example.com' })
 * // => 'https://www.google.com/s2/favicons?sz=64&domain=example.com'
 */
export function getIconSrc(iconData: IconData): string | null {
  const { iconType, iconData: data, iconUrl, url } = iconData

  // BASE64 类型直接使用 iconData
  if (iconType === 'BASE64' && data) {
    return data
  }

  // URL 类型或有 iconUrl 时，使用 getIconUrl 处理
  if (iconUrl) {
    return getIconUrl(url || null, iconUrl)
  }

  return null
}

/**
 * 判断是否为 TEXT 类型图标
 *
 * @param iconType - 图标类型
 * @returns 是否为 TEXT 类型
 *
 * @example
 * isTextIcon('TEXT') // => true
 * isTextIcon('AUTO') // => false
 * isTextIcon(null)   // => false
 */
export function isTextIcon(iconType: string | null | undefined): boolean {
  return iconType === 'TEXT'
}

/**
 * 解析 TEXT 图标配置
 * 从 iconData JSON 中提取文字、颜色、字体、字号
 *
 * @param iconData - 图标数据 JSON 字符串
 * @returns 解析后的文字图标数据
 *
 * @example
 * parseTextIconData('{"t":"AB","c":"#FF5733","f":"mono","s":60}')
 * // => { text: 'AB', color: '#FF5733', fontFamily: 'mono', fontSize: 60 }
 *
 * @example
 * parseTextIconData(null)
 * // => { text: '' }
 *
 * @example
 * parseTextIconData('invalid json')
 * // => { text: '' }
 */
export function parseTextIconData(
  iconData: string | null | undefined
): ParsedTextIconData {
  const config = parseTextIconConfig(iconData || null)

  return {
    text: config.text,
    color: config.color || undefined,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
  }
}

/**
 * 计算容器和图片的圆角样式
 * 确保容器和内部图片同时应用相同的圆角值
 *
 * @param borderRadius - 自定义圆角值（数字表示像素，字符串如 '50%'）
 * @param variant - 图标尺寸变体（用于获取默认圆角）
 * @returns 容器和图片的圆角样式
 *
 * @example
 * // 使用自定义数字圆角
 * computeBorderRadiusStyle(8, 'full')
 * // => { containerRadius: '8px', imageRadius: '8px' }
 *
 * @example
 * // 使用自定义字符串圆角
 * computeBorderRadiusStyle('50%', 'full')
 * // => { containerRadius: '50%', imageRadius: '50%' }
 *
 * @example
 * // 使用变体默认圆角
 * computeBorderRadiusStyle(undefined, 'full')
 * // => { containerRadius: 'var(--start-radius)', imageRadius: 'var(--start-radius)' }
 *
 * @example
 * // mini 变体默认圆角
 * computeBorderRadiusStyle(undefined, 'mini')
 * // => { containerRadius: '2px', imageRadius: '2px' }
 */
export function computeBorderRadiusStyle(
  borderRadius: number | string | undefined,
  variant: IconVariant
): { containerRadius: string; imageRadius: string } {
  let radius: string

  if (borderRadius !== undefined) {
    // 使用自定义圆角
    radius =
      typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius
  } else {
    // 使用变体默认圆角
    radius = VARIANT_RADIUS[variant]
  }

  return {
    containerRadius: radius,
    imageRadius: radius,
  }
}
