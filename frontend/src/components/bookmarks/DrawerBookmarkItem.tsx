import { Folder } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Tooltip } from '../ui/Tooltip'
import { DraggableBookmarkItem } from './DraggableItem'
import { DeleteButton } from './DeleteButton'
import { getSortedFolderChildren } from './folderOperations'
import { useAppearanceStore } from '../../stores/appearance'
import { FolderPreviewIcon } from './FolderPreviewIcon'
import { UnifiedIcon, type IconData } from '../ui/UnifiedIcon'
import type { Bookmark } from './types'

type DrawerBookmarkItemProps = {
  item: Bookmark
  allItems: Bookmark[]
  userId?: string
  drag: {
    activeId: string | null
    combineCandidateId: string | null
    combineTargetId: string | null
    onPointerDown: (id: string, ev: PointerEvent, el: HTMLElement) => void
    onDragCancel: () => void
  }
  customIconOk: Record<string, boolean>
  setCustomIconOk: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setElRef: (id: string, el: HTMLDivElement | null) => void
  onFolderClick: (id: string, rect?: DOMRect) => void
  onBookmarkClick: (item: Bookmark) => void
  onContextMenu: (item: Bookmark, x: number, y: number) => void
  onLongPress: (x: number, y: number) => void
  onTagClick: (tag: string) => void
  batchDeleteMode?: boolean
  onBatchDeleteItem?: (item: Bookmark) => void
}

/**
 * 书签页单个书签/文件夹渲染组件
 * 
 * 使用 UnifiedIcon 组件进行图标渲染，确保所有图标类型正确显示
 * 使用 FolderPreviewIcon 组件进行文件夹预览渲染
 */
export function DrawerBookmarkItem({
  item: b,
  allItems,
  userId,
  drag,
  customIconOk,
  setCustomIconOk,
  setElRef,
  onFolderClick,
  onBookmarkClick,
  onContextMenu,
  onLongPress,
  onTagClick,
  batchDeleteMode = false,
  onBatchDeleteItem,
}: DrawerBookmarkItemProps) {
  const isFolder = b.type === 'FOLDER'
  const isCombineCandidate = drag.combineCandidateId === b.id
  const isCombineTarget = drag.combineTargetId === b.id
  const bookmarkIconSize = useAppearanceStore((s) => s.bookmarkIconSize)
  
  const folderItems = isFolder 
    ? getSortedFolderChildren(allItems.filter(x => x.parentId === b.id), userId, b.id, 'drawer').slice(0, 9) 
    : []
  
  // 检查自定义图标是否失败
  const customIconFailed = customIconOk[b.id] === false

  const showCombine = isCombineCandidate || isCombineTarget
  const iconRing = isCombineTarget
    ? 'ring-2 ring-primary ring-offset-2'
    : isCombineCandidate
      ? 'ring-2 ring-primary/60 ring-offset-2'
      : ''

  // 计算图标背景样式
  const getIconBgStyle = (): { className: string; style?: React.CSSProperties } => {
    // 文件夹使用固定样式
    if (isFolder) {
      return { className: 'bg-glass/20 border border-glass-border/20 p-[2px]' }
    }
    
    // 根据 iconBg 设置背景
    const iconBg = b.iconBg
    
    // 透明背景
    if (iconBg === 'transparent') {
      return { className: '' }  // 无背景
    }
    
    // 自定义颜色背景
    if (iconBg && iconBg.startsWith('#')) {
      return { 
        className: '',
        style: { backgroundColor: iconBg }
      }
    }
    
    // 毛玻璃背景（default 或 default:primary:blur:N 格式）
    if (!iconBg || iconBg.startsWith('default')) {
      const usePrimary = iconBg?.includes('primary') || false
      const blurMatch = iconBg?.match(/blur:(\d+)/)
      const blurIntensity = blurMatch ? parseInt(blurMatch[1]) : 70  // 默认 70
      
      // 根据强度计算 backdrop-blur 和背景透明度
      const blurPx = Math.round(blurIntensity / 10)  // 0-10px
      const bgOpacity = blurIntensity / 100 * 0.7  // 0-0.7
      
      // 毛玻璃效果：白色半透明背景 + 可选的主题色叠加
      const baseStyle: React.CSSProperties = {
        backdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
        WebkitBackdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
      }
      
      if (usePrimary) {
        return { 
          className: 'bg-primary/20',
          style: {
            ...baseStyle,
            boxShadow: `inset 0 0 0 100px rgba(255, 255, 255, ${bgOpacity * 0.5})`
          }
        }
      } else {
        return { 
          className: '',
          style: {
            ...baseStyle,
            backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`
          }
        }
      }
    }
    
    // 默认背景（原始）- fallback
    // 判断是否有自定义图标
    const hasCustomIcon = Boolean(
      (b.iconType === 'BASE64' && b.iconData) || 
      b.iconUrl || 
      b.iconType === 'TEXT'
    )
    if (hasCustomIcon && !customIconFailed) {
      return { className: 'bg-white/70' }
    }
    return { className: 'bg-primary/15 text-primary font-semibold' }
  }
  
  const iconBgStyle = getIconBgStyle()

  // 将 Bookmark 转换为 IconData 格式
  const convertToIconData = (bookmark: Bookmark): IconData & { id: string; type: string; parentId: string | null } => ({
    id: bookmark.id,
    type: bookmark.type,
    parentId: bookmark.parentId,
    iconType: bookmark.iconType,
    iconData: bookmark.iconData,
    iconUrl: bookmark.iconUrl,
    iconBg: bookmark.iconBg,
    url: bookmark.url,
    name: bookmark.name,
  })

  return (
    <DraggableBookmarkItem
      key={b.id}
      item={b}
      activeDragId={drag.activeId}
      setElRef={setElRef}
      iconOnlyDrag
      onPointerDown={(id, ev) => {
        if (ev.button !== 0) return
        drag.onPointerDown(id, ev.nativeEvent, ev.currentTarget)
      }}
      onClick={(e) => {
        if (drag.activeId) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        if (isFolder) {
          // 获取图标元素的位置用于动画
          const target = e.currentTarget
          const iconEl = target.querySelector('.bookmark-icon')
          const rect = iconEl?.getBoundingClientRect()
          onFolderClick(b.id, rect)
        } else {
          onBookmarkClick(b)
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu(b, e.clientX + 8, e.clientY + 8)
      }}
      onLongPress={(x, y) => {
        onLongPress(x, y)
        onContextMenu(b, x, y)
      }}
      onCancelDrag={drag.onDragCancel}
    >
      <Tooltip
        content={
          <div className="space-y-1">
            <div className="font-medium">{b.name}</div>
            {b.note && <div className="text-fg/70 text-xs">{b.note}</div>}
            {b.tags && b.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {b.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-primary/20 text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        }
        position="top"
        delay={600}
      >
      <div className="grid place-items-center group/icon">
        <div
          className={cn(
            'bookmark-icon rounded-[var(--start-radius)] grid place-items-center relative',
            'group-hover/icon:scale-110 group-hover/icon:shadow-lg group-hover/icon:shadow-black/10',
            'group-active/icon:scale-95',
            iconBgStyle.className,
            iconRing,
            showCombine && 'scale-[1.03]',
            batchDeleteMode && 'bookmark-shake',
          )}
          style={{
            width: bookmarkIconSize,
            height: bookmarkIconSize,
            transition: 'transform 150ms ease-out, box-shadow 150ms ease-out, width 200ms, height 200ms',
            ...iconBgStyle.style,
          }}
        >
          {/* 批量删除模式下的删除按钮 - 放在图标容器内但不受 overflow-hidden 影响 */}
          {batchDeleteMode && (
            <DeleteButton
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onBatchDeleteItem?.(b)
              }}
            />
          )}
          {showCombine && !isFolder ? (
            <div className="absolute inset-0 rounded-[var(--start-radius)] overflow-hidden bg-glass/25 border border-primary/60 grid place-items-center">
              <Folder className="w-5 h-5 text-primary" />
            </div>
          ) : null}

          <div className={cn('absolute inset-0 rounded-[var(--start-radius)] overflow-hidden', showCombine && !isFolder ? 'opacity-15' : 'opacity-100')}>
            {isFolder ? (
              // 文件夹使用 FolderPreviewIcon 组件
              <FolderPreviewIcon
                children={folderItems.map(convertToIconData)}
                allItems={allItems.map(convertToIconData)}
                variant="full"
                size={bookmarkIconSize}
                borderRadius="var(--start-radius)"
                className="w-full h-full"
              />
            ) : (
              // 普通书签使用 UnifiedIcon 组件
              <UnifiedIcon
                iconType={b.iconType}
                iconData={b.iconData}
                iconUrl={b.iconUrl}
                iconBg={b.iconBg}
                url={b.url}
                name={b.name}
                variant="full"
                size={bookmarkIconSize}
                borderRadius="var(--start-radius)"
                className="h-full w-full"
                onError={() => {
                  setCustomIconOk((prev) => ({ ...prev, [b.id]: false }))
                }}
              />
            )}
          </div>
        </div>
        <div 
          className="mt-1.5 text-[11px] text-fg/80 truncate text-center"
          style={{ width: Math.max(bookmarkIconSize, 64) }}
        >
          {b.name}
        </div>
        {/* Tags display */}
        <div 
          className="flex flex-wrap justify-center gap-0.5 mt-0.5 min-h-[14px]"
          style={{ width: Math.max(bookmarkIconSize, 64) }}
        >
          {b.tags && b.tags.length > 0 && (
            <>
              {b.tags.slice(0, 2).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTagClick(tag)
                  }}
                  className={cn(
                    'px-1 py-0 rounded text-[8px] leading-tight',
                    'bg-primary/10 text-primary/80 hover:bg-primary/20',
                    'transition-colors truncate max-w-[30px]'
                  )}
                  title={tag}
                >
                  {tag}
                </button>
              ))}
              {b.tags.length > 2 && (
                <span className="text-[8px] text-fg/50">+{b.tags.length - 2}</span>
              )}
            </>
          )}
        </div>
      </div>
      </Tooltip>
    </DraggableBookmarkItem>
  )
}
