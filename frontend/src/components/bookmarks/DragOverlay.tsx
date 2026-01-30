import { createPortal } from 'react-dom'
import { cn } from '../../utils/cn'
import { getSortedFolderChildren } from './folderOperations'
import { FolderPreviewIcon } from './FolderPreviewIcon'
import { UnifiedIcon, type IconData } from '../ui/UnifiedIcon'
import { computeIconBgStyle } from '../../utils/iconUtils'
import type { Bookmark } from './types'
import type { BookmarkContext } from '../../types/bookmark'

/**
 * DragOverlay 组件属性
 */
type DragOverlayProps = {
  /** 当前拖拽的书签 ID */
  activeId: string | null
  /** 所有书签项 */
  allItems: Bookmark[]
  /** 用户 ID */
  userId?: string
  /** 书签上下文 */
  context?: BookmarkContext
  /** 覆盖层引用 */
  overlayRef: React.RefObject<HTMLDivElement>
  /** 覆盖层盒子引用 */
  overlayBoxRef: React.RefObject<HTMLDivElement>
  /** 覆盖层样式 */
  overlayStyle: React.CSSProperties
  /** 自定义尺寸 */
  size?: number
  /** 自定义圆角 */
  borderRadius?: number | string
}

/**
 * 拖拽覆盖层组件
 * 
 * 显示正在拖拽的书签项
 * 使用 UnifiedIcon 组件进行图标渲染，支持所有图标类型（包括 TEXT）
 * 支持自定义 size 和 borderRadius 属性
 * 
 * @example
 * // 基本用法
 * <DragOverlay
 *   activeId={activeId}
 *   allItems={bookmarks}
 *   overlayRef={overlayRef}
 *   overlayBoxRef={overlayBoxRef}
 *   overlayStyle={overlayStyle}
 * />
 * 
 * @example
 * // 自定义尺寸和圆角
 * <DragOverlay
 *   activeId={activeId}
 *   allItems={bookmarks}
 *   overlayRef={overlayRef}
 *   overlayBoxRef={overlayBoxRef}
 *   overlayStyle={overlayStyle}
 *   size={64}
 *   borderRadius={8}
 * />
 */
export function DragOverlay({
  activeId,
  allItems,
  userId,
  context = 'shortcut',
  overlayRef,
  overlayBoxRef,
  overlayStyle,
  size: customSize,
  borderRadius: customBorderRadius,
}: DragOverlayProps) {
  if (!activeId) return null

  const item = allItems.find((x) => x.id === activeId)
  if (!item) return null

  const isFolder = item.type === 'FOLDER'
  
  // 计算实际尺寸和圆角
  const actualSize = customSize ?? 48
  const actualBorderRadius = customBorderRadius !== undefined
    ? (typeof customBorderRadius === 'number' ? `${customBorderRadius}px` : customBorderRadius)
    : 'var(--start-radius)'

  // 获取文件夹子项（用于文件夹预览）
  const folderItems = isFolder
    ? getSortedFolderChildren(
        allItems.filter((x) => x.parentId === item.id),
        userId,
        item.id,
        context
      ).slice(0, 9)
    : []

  // 将 Bookmark 转换为 IconData（用于 FolderPreviewIcon）
  const folderIconData: (IconData & { id?: string; type?: string; parentId?: string | null })[] = folderItems.map(b => ({
    id: b.id,
    type: b.type,
    parentId: b.parentId,
    iconType: b.iconType,
    iconData: b.iconData,
    iconUrl: b.iconUrl,
    iconBg: b.iconBg,
    url: b.url,
    name: b.name,
  }))

  // 将所有书签转换为 IconData（用于嵌套文件夹预览）
  const allIconData: (IconData & { id?: string; type?: string; parentId?: string | null })[] = allItems.map(b => ({
    id: b.id,
    type: b.type,
    parentId: b.parentId,
    iconType: b.iconType,
    iconData: b.iconData,
    iconUrl: b.iconUrl,
    iconBg: b.iconBg,
    url: b.url,
    name: b.name,
  }))

  // 计算图标背景样式
  const getIconBgStyle = (): { className: string; style?: React.CSSProperties } => {
    // 文件夹使用固定样式（由 FolderPreviewIcon 处理）
    if (isFolder) {
      return { className: '' }
    }
    
    // 使用统一的背景样式计算函数
    const hasCustomIcon = Boolean(
      (item.iconType === 'BASE64' && item.iconData) || 
      item.iconUrl ||
      item.iconType === 'TEXT'
    )
    return computeIconBgStyle(item.iconBg, 'full', hasCustomIcon)
  }
  
  const iconBgStyle = getIconBgStyle()

  return createPortal(
    <div ref={overlayRef} style={overlayStyle}>
      <div className="bm-inner">
        <div className="grid place-items-center select-none">
          <div
            ref={overlayBoxRef}
            className={cn(
              'bookmark-icon overflow-hidden grid place-items-center shadow-2xl select-none',
              !isFolder && iconBgStyle.className,
            )}
            style={{
              width: actualSize,
              height: actualSize,
              borderRadius: actualBorderRadius,
              ...(!isFolder ? iconBgStyle.style : {}),
            }}
            data-testid="drag-overlay"
            data-is-folder={isFolder}
          >
            {isFolder ? (
              <FolderPreviewIcon
                children={folderIconData}
                allItems={allIconData}
                variant="full"
                size={actualSize}
                borderRadius={customBorderRadius}
                maxItems={9}
                gridCols={3}
              />
            ) : (
              <UnifiedIcon
                iconType={item.iconType}
                iconData={item.iconData}
                iconUrl={item.iconUrl}
                iconBg={item.iconBg}
                url={item.url}
                name={item.name}
                variant="full"
                size={actualSize}
                borderRadius={customBorderRadius}
              />
            )}
          </div>
          <div className="mt-1.5 text-[11px] text-fg/80 truncate w-16 text-center">
            {item.name}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
