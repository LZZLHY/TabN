import { Folder } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Favicon } from '../Favicon'
import { Tooltip } from '../ui/Tooltip'
import { DraggableBookmarkItem } from './DraggableItem'
import { getSortedFolderChildren } from './folderOperations'
import type { Bookmark } from './types'
import type { BookmarkContext } from '../../types/bookmark'

type BookmarkItemProps = {
  item: Bookmark
  allItems: Bookmark[]
  userId?: string
  context?: BookmarkContext
  dockMode?: boolean
  activeDragId: string | null
  combineCandidateId: string | null
  combineTargetId: string | null
  setElRef: (id: string, el: HTMLDivElement | null) => void
  onPointerDown: (id: string, ev: React.PointerEvent<HTMLDivElement>) => void
  onClick: (item: Bookmark, e?: React.MouseEvent) => void
  onContextMenu: (item: Bookmark, x: number, y: number) => void
  onLongPress: (item: Bookmark, x: number, y: number) => void
  onCancelDrag: () => void
}

/**
 * 书签项渲染组件
 * 封装单个书签/文件夹的渲染逻辑，支持 Grid 和 Dock 两种模式
 */
export function BookmarkItem({
  item,
  allItems,
  userId,
  context = 'shortcut',
  dockMode = false,
  activeDragId,
  combineCandidateId,
  combineTargetId,
  setElRef,
  onPointerDown,
  onClick,
  onContextMenu,
  onLongPress,
  onCancelDrag,
}: BookmarkItemProps) {
  const isFolder = item.type === 'FOLDER'
  const isCombineCandidate = combineCandidateId === item.id
  const isCombineTarget = combineTargetId === item.id
  
  const folderItems = isFolder 
    ? getSortedFolderChildren(allItems.filter(x => x.parentId === item.id), userId, item.id, context).slice(0, 9) 
    : []

  const showCombine = isCombineCandidate || isCombineTarget
  const iconRing = isCombineTarget
    ? 'ring-2 ring-primary ring-offset-2'
    : isCombineCandidate
      ? 'ring-2 ring-primary/60 ring-offset-2'
      : ''
  
  // Dock 模式样式
  // 关键：当有拖拽进行时（activeDragId !== null），禁用 hover 动画
  // 因为 hover 动画会改变元素矩形，导致 hitItem 检测不稳定
  const isDragging = activeDragId !== null
  const dockIconClass = dockMode && !isDragging
    ? 'group-hover:scale-125 group-hover:-translate-y-3' 
    : ''

  return (
    <DraggableBookmarkItem
      key={item.id}
      item={item}
      activeDragId={activeDragId}
      setElRef={setElRef}
      className={dockMode ? 'flex items-center' : undefined}
      onPointerDown={(id, ev) => {
        // 只在左键/主指针启动拖拽，避免右键菜单、滚轮点击等触发拖拽
        if (ev.button !== 0) return
        onPointerDown(id, ev)
      }}
      onClick={(e) => {
        // 关键：如果正在拖拽（移动距离超过阈值），不执行点击
        if (activeDragId) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        onClick(item, e)
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        const x = e.clientX + 8
        const y = e.clientY + 8
        onContextMenu(item, x, y)
      }}
      onLongPress={(x, y) => {
        onLongPress(item, x, y)
      }}
      onCancelDrag={onCancelDrag}
    >
      <Tooltip
        content={
          <div className="space-y-1">
            <div className="font-medium">{item.name}</div>
            {item.note && <div className="text-fg/70 text-xs">{item.note}</div>}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {item.tags.map((tag) => (
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
      <div className={cn('grid place-items-center', dockMode ? 'group px-1' : '')}>
        <div
          className={cn(
            'bookmark-icon h-12 w-12 overflow-hidden grid place-items-center transition-all duration-200 relative',
            dockMode ? 'rounded-xl' : 'rounded-[var(--start-radius)]',
            isFolder
              ? dockMode 
                ? 'bg-white/30 dark:bg-white/10 border border-white/40 dark:border-white/20 p-[2px]'
                : 'bg-glass/20 border border-glass-border/20 p-[2px]'
              : dockMode
                ? 'bg-white/40 dark:bg-white/15'
                : 'bg-primary/15 text-primary font-semibold',
            iconRing,
            showCombine && 'scale-[1.03]',
            dockIconClass,
          )}
        >
          {/* 叠加创建收藏夹：在目标图标上显示"文件夹框"覆盖提示 */}
          {showCombine && !isFolder ? (
            <div className={cn(
              'absolute inset-0 bg-glass/25 border border-primary/60 grid place-items-center',
              dockMode ? 'rounded-xl' : 'rounded-[var(--start-radius)]'
            )}>
              <Folder className="w-5 h-5 text-primary" />
            </div>
          ) : null}

          <div className={cn('absolute inset-0', showCombine && !isFolder ? 'opacity-15' : 'opacity-100')}>
            {isFolder ? (
              <div className="grid grid-cols-3 gap-0.5 w-full h-full content-start">
                {folderItems.map((sub) => (
                  <div
                    key={sub.id}
                    className="w-full pt-[100%] relative bg-black/10 rounded-[2px] overflow-hidden"
                  >
                    {sub.url ? (
                      <Favicon
                        url={sub.url}
                        name={sub.name}
                        size={16}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <Favicon
                url={item.url || ''}
                name={item.name}
                className="h-full w-full object-cover"
                letterClassName="h-full w-full"
              />
            )}
          </div>
        </div>
        {/* Dock 模式不显示文字标签 */}
        {!dockMode && <div className="mt-1.5 text-[11px] text-fg/80 truncate w-16 text-center">{item.name}</div>}
      </div>
      </Tooltip>
    </DraggableBookmarkItem>
  )
}
