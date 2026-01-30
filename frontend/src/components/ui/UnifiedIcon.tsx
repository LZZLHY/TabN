import type { CSSProperties } from 'react'
import { useState } from 'react'
import { getDefaultText } from '@start/shared'
import { cn } from '../../utils/cn'
import {
  computeIconBgStyle,
  getIconSrc,
  isTextIcon,
  parseTextIconData,
} from '../../utils/iconUtils'
import { calculateProportionalRadius } from '../../utils/iconRadius'
import { useAppearanceStore } from '../../stores/appearance'
import { Favicon } from '../Favicon'
import { TextIcon } from '../bookmarks/TextIcon'

/**
 * UnifiedIcon - 统一图标渲染组件
 * 
 * 本组件是整个应用中所有图标显示的统一入口，确保图标在各处显示一致。
 * 
 * ## 使用此组件的位置：
 * 
 * ### 书签相关
 * - `BookmarkIcon.tsx` - 书签网格中的图标
 * - `DrawerBookmarkItem.tsx` - 书签抽屉中的图标
 * - `DragOverlay.tsx` - 拖拽时的图标覆盖层
 * - `FolderPreviewIcon.tsx` - 文件夹预览中的小图标
 * - `FolderModal.tsx` - 文件夹模态框中的图标和拖拽覆盖层
 * - `SearchDropdown.tsx` - 搜索建议下拉框中的图标（最近打开、快捷方式匹配）
 * - `BookmarkDrawer.tsx` - 书签抽屉拖拽覆盖层
 * - `BookmarkGrid.tsx` - 书签网格拖拽覆盖层
 * - `PresetSelector.tsx` - 图标预设选择器
 * 
 * ### 搜索引擎相关
 * - `SearchEngineSwitcher.tsx` - 搜索引擎切换器
 * - `EngineOption.tsx` - 搜索引擎选项
 * - `EngineSelectorPanel.tsx` - 搜索引擎选择面板
 * - `AddEngineDialog.tsx` - 添加搜索引擎对话框
 * 
 * ### 其他（保持原有实现，未使用 UnifiedIcon）
 * - `DrawerIconDialog.tsx` - 图标编辑对话框预览（特殊编辑界面）
 * - `SettingsDialog.tsx` - 设置对话框中的搜索引擎图标（特殊竞速加载逻辑）
 * - `BookmarksTab.tsx` (Admin) - 管理后台书签列表（简单显示）
 * 
 * ## 添加新的使用位置时：
 * 1. 在上方列表中添加新位置的说明
 * 2. 确保传递正确的 IconData 属性
 * 3. 选择合适的 variant 或自定义 size/borderRadius
 */

/**
 * 图标类型枚举
 * - AUTO: 自动选择（使用 Favicon 竞速加载）
 * - BASE64: Base64 编码的图片数据
 * - TEXT: 文字图标（使用自定义文字作为图标）
 * - URL: 自定义图标 URL
 */
export type IconType = 'AUTO' | 'BASE64' | 'TEXT' | 'URL'

/**
 * 图标尺寸变体
 * - full: 完整尺寸 (48px)，用于主图标显示
 * - mini: 中等尺寸 (16px)，用于文件夹预览
 * - tiny: 小尺寸 (8px)，用于嵌套文件夹预览
 * - micro: 极小尺寸 (6px)，用于深层嵌套预览
 */
export type IconVariant = 'full' | 'mini' | 'tiny' | 'micro'

/**
 * 图标数据接口
 * 包含渲染图标所需的所有数据
 */
export interface IconData {
  /** 图标类型 */
  iconType?: IconType | string | null
  /** 图标数据（BASE64 或 TEXT 配置 JSON） */
  iconData?: string | null
  /** 图标 URL */
  iconUrl?: string | null
  /** 图标背景配置 */
  iconBg?: string | null
  /** 书签/引擎 URL（用于 Favicon 获取） */
  url?: string | null
  /** 名称（用于首字母回退） */
  name?: string | null
}

/**
 * UnifiedIcon 组件属性
 */
export interface UnifiedIconProps extends IconData {
  /** 尺寸变体 */
  variant?: IconVariant
  /** 自定义尺寸（覆盖 variant 默认值） */
  size?: number
  /** 自定义圆角（覆盖 variant 默认值），支持数字（像素）或字符串（如 '50%'） */
  borderRadius?: number | string
  /** 是否为文件夹 */
  isFolder?: boolean
  /** 文件夹子项（用于文件夹预览） */
  folderChildren?: IconData[]
  /** 所有书签项（用于嵌套文件夹预览） */
  allItems?: IconData[]
  /** 额外的 CSS 类名 */
  className?: string
  /** 额外的样式 */
  style?: CSSProperties
  /** 图标加载失败回调 */
  onError?: () => void
  /** 所有图标源都失败回调 */
  onAllFailed?: () => void
}

/**
 * 变体对应的默认尺寸（像素）
 */
export const VARIANT_SIZES: Record<IconVariant, number> = {
  full: 48,
  mini: 16,
  tiny: 8,
  micro: 6,
}

/**
 * 变体对应的默认圆角
 */
export const VARIANT_RADIUS: Record<IconVariant, string> = {
  full: 'var(--start-radius)',
  mini: '2px',
  tiny: '1px',
  micro: '0.5px',
}

/**
 * 变体对应的文字图标字号
 */
export const VARIANT_FONT_SIZES: Record<IconVariant, number> = {
  full: 50,
  mini: 10,
  tiny: 8,
  micro: 6,
}

/**
 * 文字图标字号计算比例
 * 当传入自定义 size 时，字号 = size * TEXT_ICON_FONT_RATIO
 */
export const TEXT_ICON_FONT_RATIO = 0.5

/**
 * 计算实际使用的尺寸
 * 优先使用自定义 size，否则使用 variant 对应的默认尺寸
 * 
 * @param variant - 图标尺寸变体
 * @param customSize - 自定义尺寸（可选）
 * @returns 实际使用的尺寸（像素）
 */
export function getActualSize(
  variant: IconVariant,
  customSize?: number
): number {
  return customSize ?? VARIANT_SIZES[variant]
}

/**
 * 计算实际使用的圆角
 * 优先级：
 * 1. 自定义 borderRadius（如果提供）
 * 2. 比例化计算（如果提供 size 和 ratio）
 * 3. 变体默认圆角（回退）
 * 
 * @param variant - 图标尺寸变体
 * @param customBorderRadius - 自定义圆角（可选），支持数字（像素）或字符串（如 '50%'）
 * @param size - 图标大小（可选），用于比例化计算
 * @param ratio - 圆角比例（可选），用于比例化计算
 * @returns 实际使用的圆角值（CSS 字符串）
 */
export function getActualBorderRadius(
  variant: IconVariant,
  customBorderRadius?: number | string,
  size?: number,
  ratio?: number
): string {
  // 1. 优先使用自定义值
  if (customBorderRadius !== undefined) {
    return typeof customBorderRadius === 'number'
      ? `${customBorderRadius}px`
      : customBorderRadius
  }
  
  // 2. 使用比例化计算
  if (size !== undefined && ratio !== undefined) {
    const radius = calculateProportionalRadius(size, ratio)
    return `${radius}px`
  }
  
  // 3. 回退到变体默认值
  return VARIANT_RADIUS[variant]
}

/**
 * 计算文字图标的字号
 * 当传入自定义 size 时，按比例自动计算
 * 
 * @param variant - 图标尺寸变体
 * @param customSize - 自定义尺寸（可选）
 * @param customFontSize - 自定义字号（可选）
 * @returns 计算后的字号（像素）
 */
export function getTextIconFontSize(
  variant: IconVariant,
  customSize?: number,
  customFontSize?: number
): number {
  // 如果有自定义字号，直接使用
  if (customFontSize !== undefined) {
    return customFontSize
  }

  // 如果有自定义尺寸，按比例计算
  if (customSize !== undefined) {
    return Math.round(customSize * TEXT_ICON_FONT_RATIO)
  }

  // 否则使用变体默认字号
  return VARIANT_FONT_SIZES[variant]
}

/**
 * UnifiedIcon 组件
 * 
 * 统一的图标渲染组件，支持：
 * - AUTO: 自动竞速加载 Favicon
 * - BASE64: Base64 编码的图片
 * - TEXT: 文字图标
 * - URL: 自定义图标 URL
 * 
 * 支持四种尺寸变体：full (48px)、mini (16px)、tiny (8px)、micro (6px)
 * 支持自定义 size 和 borderRadius 覆盖默认值
 * 
 * 加载失败回退策略：
 * 1. 自定义图标（BASE64/URL）加载失败 → 回退到 Favicon 竞速加载
 * 2. Favicon 加载失败 → 显示首字母（或文字图标如果已配置）
 * 3. 所有图标源都失败时调用 onAllFailed 回调
 */
export function UnifiedIcon({
  iconType,
  iconData,
  iconUrl,
  iconBg,
  url,
  name,
  variant = 'full',
  size: customSize,
  borderRadius: customBorderRadius,
  className,
  style,
  onError,
  onAllFailed,
}: UnifiedIconProps) {
  // 跟踪自定义图标是否加载失败，用于回退到 Favicon
  const [customIconFailed, setCustomIconFailed] = useState(false)

  // 获取全局圆角比例设置
  const iconRadiusRatio = useAppearanceStore((s) => s.iconRadiusRatio)

  // 计算实际尺寸和圆角
  const actualSize = getActualSize(variant, customSize)
  const actualBorderRadius = getActualBorderRadius(
    variant,
    customBorderRadius,
    actualSize,
    iconRadiusRatio
  )

  // 获取图标源
  const iconSrc = getIconSrc({ iconType, iconData, iconUrl, url })
  const hasCustomIcon = Boolean(iconSrc) && !customIconFailed

  // 计算背景样式
  const bgStyle = computeIconBgStyle(iconBg, variant, hasCustomIcon)

  // 容器样式
  const containerStyle: CSSProperties = {
    width: actualSize,
    height: actualSize,
    borderRadius: actualBorderRadius,
    ...bgStyle.style,
    ...style,
  }

  // 图片样式（应用相同的圆角）
  const imageStyle: CSSProperties = {
    borderRadius: actualBorderRadius,
  }

  /**
   * 处理自定义图标加载失败
   * 设置 customIconFailed 状态，触发回退到 Favicon
   */
  const handleCustomIconError = () => {
    setCustomIconFailed(true)
    onError?.()
  }

  /**
   * 处理 Favicon 加载失败（所有源都失败）
   * 调用 onAllFailed 回调
   */
  const handleFaviconAllFailed = () => {
    onAllFailed?.()
  }

  // TEXT 类型图标
  if (isTextIcon(iconType)) {
    const config = parseTextIconData(iconData || null)
    const displayText = config.text || getDefaultText(name || '', url || '')
    const fontSize = getTextIconFontSize(variant, customSize, config.fontSize)

    return (
      <div
        className={cn(
          'overflow-hidden grid place-items-center',
          bgStyle.className,
          className
        )}
        style={containerStyle}
        data-testid="unified-icon"
        data-icon-type="TEXT"
      >
        <TextIcon
          text={displayText}
          color={config.color || undefined}
          fontFamily={config.fontFamily}
          fontSize={fontSize}
          size={actualSize}
          className="h-full w-full"
        />
      </div>
    )
  }

  // BASE64 类型图标（未失败时显示）
  if (iconType === 'BASE64' && iconSrc && !customIconFailed) {
    return (
      <div
        className={cn(
          'overflow-hidden grid place-items-center',
          bgStyle.className,
          className
        )}
        style={containerStyle}
        data-testid="unified-icon"
        data-icon-type="BASE64"
      >
        <img
          src={iconSrc}
          alt=""
          className="h-full w-full object-cover"
          style={imageStyle}
          loading="lazy"
          decoding="async"
          onError={handleCustomIconError}
        />
      </div>
    )
  }

  // URL 类型图标（有自定义 iconUrl，未失败时显示）
  if ((iconType === 'URL' || iconUrl) && iconSrc && !customIconFailed) {
    return (
      <div
        className={cn(
          'overflow-hidden grid place-items-center',
          bgStyle.className,
          className
        )}
        style={containerStyle}
        data-testid="unified-icon"
        data-icon-type="URL"
      >
        <img
          src={iconSrc}
          alt=""
          className="h-full w-full object-cover"
          style={imageStyle}
          loading="lazy"
          decoding="async"
          onError={handleCustomIconError}
        />
      </div>
    )
  }

  // AUTO 类型、无自定义图标、或自定义图标加载失败：使用 Favicon 竞速加载
  // Favicon 组件内部已经有首字母回退逻辑
  return (
    <div
      className={cn(
        'overflow-hidden grid place-items-center',
        bgStyle.className,
        className
      )}
      style={containerStyle}
      data-testid="unified-icon"
      data-icon-type={customIconFailed ? 'FALLBACK' : 'AUTO'}
    >
      <Favicon
        url={url || ''}
        name={name || undefined}
        size={actualSize}
        className="h-full w-full object-cover"
        letterClassName="h-full w-full"
        onAllFailed={handleFaviconAllFailed}
      />
    </div>
  )
}
