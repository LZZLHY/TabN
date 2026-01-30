/**
 * FolderPreviewIcon 组件
 * 
 * 文件夹预览图标组件，显示文件夹内前 N 个书签的图标预览
 * 支持多层嵌套文件夹的递归预览
 * 支持自定义圆角和大小属性
 * 
 * 使用 UnifiedIcon 组件进行图标渲染，确保所有图标类型（包括 TEXT）正确显示
 */

import type { CSSProperties, ReactElement } from 'react'
import { Folder } from 'lucide-react'
import { cn } from '../../utils/cn'
import { calculateProportionalRadius } from '../../utils/iconRadius'
import { useAppearanceStore } from '../../stores/appearance'
import { UnifiedIcon, type IconData, type IconVariant } from '../ui/UnifiedIcon'

/**
 * 文件夹预览图标属性
 */
export interface FolderPreviewIconProps {
  /** 文件夹子项（推荐使用 children） */
  children?: IconData[]
  /** 文件夹子项（别名，兼容旧代码） */
  folderChildren?: IconData[]
  /** 所有书签项（用于嵌套文件夹查找） */
  allItems?: IconData[]
  /** 尺寸变体 */
  variant?: IconVariant
  /** 自定义尺寸 */
  size?: number
  /** 自定义圆角 */
  borderRadius?: number | string
  /** 额外的 CSS 类名 */
  className?: string
  /** 额外的样式 */
  style?: CSSProperties
  /** 最大显示数量（默认 9） */
  maxItems?: number
  /** 网格列数（默认 3） */
  gridCols?: number
}

/**
 * 单个预览项的属性（内部使用）
 */
interface PreviewItemProps {
  /** 书签数据 */
  item: IconData & { id?: string; type?: string; parentId?: string | null }
  /** 所有书签项（用于嵌套文件夹查找） */
  allItems?: (IconData & { id?: string; type?: string; parentId?: string | null })[]
  /** 尺寸变体 */
  variant: IconVariant
  /** 自定义尺寸 */
  size?: number
  /** 自定义圆角 */
  borderRadius?: number | string
  /** 嵌套层级（用于控制递归深度） */
  depth?: number
  /** 图标圆角比例 */
  iconRadiusRatio: number
}

/**
 * 根据变体获取子项变体
 * full -> mini, mini -> tiny, tiny -> micro, micro -> micro
 */
function getChildVariant(variant: IconVariant): IconVariant {
  switch (variant) {
    case 'full':
      return 'mini'
    case 'mini':
      return 'tiny'
    case 'tiny':
      return 'micro'
    case 'micro':
      return 'micro'
    default:
      return 'tiny'
  }
}

/**
 * 根据变体获取默认尺寸
 */
function getDefaultSize(variant: IconVariant): number {
  switch (variant) {
    case 'full':
      return 48
    case 'mini':
      return 16
    case 'tiny':
      return 8
    case 'micro':
      return 6
    default:
      return 16
  }
}

/**
 * 计算子项尺寸
 * 根据父容器尺寸和网格布局计算子项尺寸
 */
function calculateChildSize(parentSize: number, gridCols: number, gap: number, padding: number): number {
  // 可用空间 = 父容器尺寸 - 两侧 padding
  const availableSpace = parentSize - padding * 2
  // 子项尺寸 = (可用空间 - 间隙总和) / 列数
  const childSize = (availableSpace - gap * (gridCols - 1)) / gridCols
  return Math.max(Math.floor(childSize), 1)
}

/**
 * 嵌套文件夹预览项（2x2 网格）
 * 用于显示子文件夹内的图标预览
 */
function NestedFolderPreview({
  item,
  allItems,
  variant,
  size,
  borderRadius,
  depth = 0,
  iconRadiusRatio,
}: PreviewItemProps) {
  // 获取子文件夹的子项
  const children = allItems?.filter(x => x.parentId === item.id).slice(0, 4) || []
  
  // 计算实际尺寸
  const actualSize = size ?? getDefaultSize(variant)
  const actualBorderRadius = borderRadius ?? calculateProportionalRadius(actualSize, iconRadiusRatio)
  
  // 空文件夹显示文件夹图标
  if (children.length === 0) {
    return (
      <div 
        className="bg-amber-100/50 flex items-center justify-center overflow-hidden"
        style={{
          width: actualSize,
          height: actualSize,
          borderRadius: typeof actualBorderRadius === 'number' ? `${actualBorderRadius}px` : actualBorderRadius,
        }}
        data-testid="folder-preview-empty"
      >
        <Folder 
          className="text-amber-500" 
          style={{ 
            width: actualSize * 0.8, 
            height: actualSize * 0.8 
          }} 
        />
      </div>
    )
  }
  
  // 计算子项尺寸（2x2 网格）
  const gap = Math.max(Math.floor(actualSize * 0.03), 0.5)
  const padding = Math.max(Math.floor(actualSize * 0.03), 0.5)
  const childSize = calculateChildSize(actualSize, 2, gap, padding)
  const childVariant = getChildVariant(variant)
  // 使用比例化圆角计算子图标圆角
  const childBorderRadius = calculateProportionalRadius(childSize, iconRadiusRatio)
  
  return (
    <div 
      className="bg-amber-100/30 grid grid-cols-2 overflow-hidden"
      style={{
        width: actualSize,
        height: actualSize,
        borderRadius: typeof actualBorderRadius === 'number' ? `${actualBorderRadius}px` : actualBorderRadius,
        gap: `${gap}px`,
        padding: `${padding}px`,
      }}
      data-testid="folder-preview-nested"
    >
      {[0, 1, 2, 3].map((idx) => {
        const child = children[idx]
        if (!child) {
          return (
            <div 
              key={`empty-${idx}`} 
              className="bg-black/5"
              style={{
                width: childSize,
                height: childSize,
                borderRadius: `${childBorderRadius}px`,
              }}
            />
          )
        }
        
        // 如果子项是文件夹且深度允许，递归显示
        if (child.type === 'FOLDER' && depth < 2) {
          return (
            <NestedFolderPreview
              key={child.id || `child-${idx}`}
              item={child}
              allItems={allItems}
              variant={childVariant}
              size={childSize}
              borderRadius={childBorderRadius}
              depth={depth + 1}
              iconRadiusRatio={iconRadiusRatio}
            />
          )
        }
        
        // 普通书签使用 UnifiedIcon
        return (
          <UnifiedIcon
            key={child.id || `child-${idx}`}
            iconType={child.iconType}
            iconData={child.iconData}
            iconUrl={child.iconUrl}
            iconBg={child.iconBg}
            url={child.url}
            name={child.name}
            variant={childVariant}
            size={childSize}
            borderRadius={childBorderRadius}
          />
        )
      })}
    </div>
  )
}

/**
 * 单个预览项组件
 * 根据书签类型渲染不同的预览
 */
function PreviewItem({
  item,
  allItems,
  variant,
  size,
  borderRadius,
  depth = 0,
  iconRadiusRatio,
}: PreviewItemProps) {
  const isFolder = item.type === 'FOLDER'
  
  // 计算实际尺寸和圆角
  const actualSize = size ?? getDefaultSize(variant)
  const actualBorderRadius = borderRadius ?? calculateProportionalRadius(actualSize, iconRadiusRatio)
  
  // 如果是文件夹，显示嵌套预览
  if (isFolder) {
    return (
      <NestedFolderPreview
        item={item}
        allItems={allItems}
        variant={variant}
        size={actualSize}
        borderRadius={actualBorderRadius}
        depth={depth}
        iconRadiusRatio={iconRadiusRatio}
      />
    )
  }
  
  // 普通书签使用 UnifiedIcon
  return (
    <UnifiedIcon
      iconType={item.iconType}
      iconData={item.iconData}
      iconUrl={item.iconUrl}
      iconBg={item.iconBg}
      url={item.url}
      name={item.name}
      variant={variant}
      size={actualSize}
      borderRadius={actualBorderRadius}
    />
  )
}

/**
 * 文件夹预览图标组件
 * 
 * 显示文件夹内前 N 个书签的图标预览
 * 支持多层嵌套文件夹的递归预览
 * 支持自定义圆角和大小属性
 * 
 * @example
 * // 基本用法
 * <FolderPreviewIcon children={folderItems} />
 * 
 * @example
 * // 自定义尺寸和圆角
 * <FolderPreviewIcon 
 *   children={folderItems} 
 *   size={64} 
 *   borderRadius={8} 
 * />
 * 
 * @example
 * // 支持嵌套文件夹
 * <FolderPreviewIcon 
 *   children={folderItems} 
 *   allItems={allBookmarks} 
 * />
 */
export function FolderPreviewIcon({
  children,
  folderChildren,
  allItems,
  variant = 'mini',
  size,
  borderRadius,
  className,
  style,
  maxItems = 9,
  gridCols = 3,
}: FolderPreviewIconProps): ReactElement {
  // 从 store 获取圆角比例
  const iconRadiusRatio = useAppearanceStore((s) => s.iconRadiusRatio)
  
  // 计算实际尺寸
  const actualSize = size ?? getDefaultSize(variant)
  // 使用比例化圆角计算
  const actualBorderRadius = borderRadius ?? calculateProportionalRadius(actualSize, iconRadiusRatio)
  
  // 限制显示数量（防御性处理 undefined，支持 children 和 folderChildren 两种属性名）
  const items = children ?? folderChildren ?? []
  const displayItems = items.slice(0, maxItems)
  
  // 空文件夹显示文件夹图标
  if (displayItems.length === 0) {
    return (
      <div 
        className={cn(
          'bg-amber-100/50 flex items-center justify-center overflow-hidden',
          className
        )}
        style={{
          width: actualSize,
          height: actualSize,
          borderRadius: typeof actualBorderRadius === 'number' ? `${actualBorderRadius}px` : actualBorderRadius,
          ...style,
        }}
        data-testid="folder-preview-icon"
        data-empty="true"
      >
        <Folder 
          className="text-amber-500" 
          style={{ 
            width: actualSize * 0.5, 
            height: actualSize * 0.5 
          }} 
        />
      </div>
    )
  }
  
  // 计算子项尺寸
  const gap = Math.max(Math.floor(actualSize * 0.02), 0.5)
  const padding = Math.max(Math.floor(actualSize * 0.08), 1)
  const childSize = calculateChildSize(actualSize, gridCols, gap, padding)
  const childVariant = getChildVariant(variant)
  // 使用比例化圆角计算子图标圆角
  const childBorderRadius = calculateProportionalRadius(childSize, iconRadiusRatio)
  
  return (
    <div 
      className={cn(
        'bg-glass/20 border border-glass-border/20 overflow-hidden',
        className
      )}
      style={{
        width: actualSize,
        height: actualSize,
        borderRadius: typeof actualBorderRadius === 'number' ? `${actualBorderRadius}px` : actualBorderRadius,
        display: 'grid',
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gap: `${gap}px`,
        padding: `${padding}px`,
        alignContent: 'start',
        ...style,
      }}
      data-testid="folder-preview-icon"
      data-item-count={displayItems.length}
    >
      {displayItems.map((item, idx) => (
        <PreviewItem
          key={(item as { id?: string }).id || `item-${idx}`}
          item={item as IconData & { id?: string; type?: string; parentId?: string | null }}
          allItems={allItems as (IconData & { id?: string; type?: string; parentId?: string | null })[] | undefined}
          variant={childVariant}
          size={childSize}
          borderRadius={childBorderRadius}
          depth={0}
          iconRadiusRatio={iconRadiusRatio}
        />
      ))}
    </div>
  )
}

export default FolderPreviewIcon
