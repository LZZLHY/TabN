/* eslint-disable react-refresh/only-export-components */
import type { CSSProperties } from 'react'
import { cn } from '../../utils/cn'
import type { TextIconFont } from '@start/shared'

/**
 * 字体映射配置
 * 将字体标识符映射到 CSS font-family 值
 */
export const FONT_FAMILIES: Record<TextIconFont, string> = {
  system: 'ui-sans-serif, system-ui, sans-serif',
  serif: 'ui-serif, Georgia, serif',
  mono: 'ui-monospace, monospace',
  rounded: '"SF Pro Rounded", "Nunito", ui-sans-serif, sans-serif',
  handwriting: '"Comic Sans MS", "Segoe Script", cursive',
}

/**
 * TextIcon 组件属性
 */
export interface TextIconProps {
  /** 显示的文字内容 */
  text: string
  /** 文字颜色（hex 格式） */
  color?: string
  /** 字体系列 */
  fontFamily?: TextIconFont
  /** 图标尺寸（像素） */
  size?: number
  /** 字号大小（10-100，默认 50） */
  fontSize?: number
  /** 背景样式（继承自 iconBg） */
  bgStyle?: {
    className: string
    style?: CSSProperties
  }
  /** 额外的 CSS 类名 */
  className?: string
}

/**
 * 判断字符是否为窄字符（英文瘦体字母、数字1、标点等）
 */
function isNarrowChar(char: string): boolean {
  return /^[1LIJijl|!.,;:'`]$/.test(char)
}

/**
 * 判断字符是否为中等宽度字符（大部分英文字母和数字）
 */
function isMediumChar(char: string): boolean {
  return /^[a-zA-Z0-9]$/.test(char)
}

/**
 * 计算字符串的相对宽度权重
 * 窄字符权重 0.5，中等字符权重 0.7，宽字符（中文等）权重 1.0
 */
function calculateTextWidth(text: string): number {
  let width = 0
  for (const char of text) {
    if (isNarrowChar(char)) {
      width += 0.5
    } else if (isMediumChar(char)) {
      width += 0.7
    } else {
      // 中文、日文、韩文等宽字符
      width += 1.0
    }
  }
  return width
}

/**
 * 根据字号和文字宽度计算实际字体大小（像素）
 * 
 * @param fontSize 字号大小 (10-100)
 * @param size 图标尺寸（像素）
 * @param textWidth 文字相对宽度
 * @returns 计算后的字体大小（像素）
 */
function calculateActualFontSize(fontSize: number, size: number, textWidth: number): number {
  // 基础比例：字号映射到图标尺寸的比例 (10-100 -> 0.25-0.85)
  const baseRatio = 0.25 + (fontSize - 10) * (0.6 / 90)
  
  // 根据文字宽度调整：宽度越大，字体越小
  // 单字符时不缩小，多字符时按宽度比例缩小
  const widthFactor = textWidth <= 1 ? 1 : Math.min(1, 1.2 / textWidth)
  
  return Math.round(size * baseRatio * widthFactor)
}

/**
 * 文字图标渲染组件
 * 
 * 用于渲染基于文字的书签图标，支持：
 * - 1-4 个字符的文字显示
 * - 自定义颜色和字体
 * - 自定义字号大小
 * - 智能字体大小计算（根据字符宽度）
 * - Unicode 字符（中文、日文、韩文、emoji）
 * - 与现有 iconBg 背景样式兼容
 */
export function TextIcon({
  text,
  color = 'currentColor',
  fontFamily = 'system',
  size = 48,
  fontSize = 50,
  bgStyle,
  className,
}: TextIconProps) {
  // 限制文字长度为 4 个字符
  const displayText = [...text].slice(0, 4).join('')
  
  // 获取字体 CSS 值
  const fontFamilyValue = FONT_FAMILIES[fontFamily] || FONT_FAMILIES.system
  
  // 计算文字相对宽度
  const textWidth = calculateTextWidth(displayText)
  
  // 计算实际字体大小
  const actualFontSize = calculateActualFontSize(fontSize, size, textWidth)
  
  // 判断是否使用 className 控制尺寸
  const useClassSize = className?.includes('w-full') || className?.includes('h-full')
  
  return (
    <div
      className={cn(
        'flex items-center justify-center select-none',
        bgStyle?.className,
        className,
      )}
      style={{
        ...(!useClassSize && { width: size, height: size }),
        ...bgStyle?.style,
      }}
    >
      <span
        style={{
          fontSize: `${actualFontSize}px`,
          fontFamily: fontFamilyValue,
          color,
          lineHeight: 1,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        {displayText || '?'}
      </span>
    </div>
  )
}

/**
 * @deprecated 使用 fontSize 属性代替
 */
export function calculateFontSize(text: string, size: number): number {
  const charCount = [...text].length
  let ratio: number
  switch (charCount) {
    case 0:
    case 1:
      ratio = 0.55
      break
    case 2:
      ratio = 0.45
      break
    case 3:
      ratio = 0.35
      break
    default:
      ratio = 0.28
      break
  }
  return Math.round(size * ratio)
}
