import { Folder } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Favicon } from '../Favicon'
import { Tooltip } from '../ui/Tooltip'
import { DraggableBookmarkItem } from './DraggableItem'
import { getSortedFolderChildren } from './folderOperations'
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
}

/**
 * 书签页单个书签/文件夹渲染组件
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
}: DrawerBookmarkItemProps) {
  const isFolder = b.type === 'FOLDER'
  const isCombineCandidate = drag.combineCandidateId === b.id
  const isCombineTarget = drag.combineTargetId === b.id
  
  const folderItems = isFolder 
    ? getSortedFolderChildren(allItems.filter(x => x.parentId === b.id), userId, b.id, 'drawer').slice(0, 9) 
    : []
  
  // Determine custom icon source
  let customIconSrc = ''
  if (!isFolder) {
    if (b.iconType === 'URL' && b.iconUrl) {
      customIconSrc = b.iconUrl
    } else if (b.iconType === 'BASE64' && b.iconData) {
      customIconSrc = b.iconData
    }
  }
  const hasCustomIcon = Boolean(customIconSrc)
  const customIconFailed = customIconOk[b.id] === false
  const showCustomIcon = hasCustomIcon && !customIconFailed

  const showCombine = isCombineCandidate || isCombineTarget
  const iconRing = isCombineTarget
    ? 'ring-2 ring-primary ring-offset-2'
    : isCombineCandidate
      ? 'ring-2 ring-primary/60 ring-offset-2'
      : ''

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
      <div className="grid place-items-center">
        <div
          className={cn(
            'bookmark-icon h-12 w-12 rounded-[var(--start-radius)] overflow-hidden grid place-items-center relative',
            isFolder
              ? 'bg-glass/20 border border-glass-border/20 p-[2px]'
              : showCustomIcon
                ? 'bg-white/70'
                : 'bg-primary/15 text-primary font-semibold',
            iconRing,
            showCombine && 'scale-[1.03]',
          )}
          style={{
            transition: 'transform 200ms, box-shadow 200ms',
          }}
        >
          {showCombine && !isFolder ? (
            <div className="absolute inset-0 rounded-[var(--start-radius)] bg-glass/25 border border-primary/60 grid place-items-center">
              <Folder className="w-5 h-5 text-primary" />
            </div>
          ) : null}

          <div className={cn('absolute inset-0', showCombine && !isFolder ? 'opacity-15' : 'opacity-100')}>
            {isFolder ? (
              <div className="grid grid-cols-3 gap-0.5 w-full h-full content-start">
                {folderItems.map((sub) => {
                  let subIcon = ''
                  if (sub.iconType === 'URL' && sub.iconUrl) {
                    subIcon = sub.iconUrl
                  } else if (sub.iconType === 'BASE64' && sub.iconData) {
                    subIcon = sub.iconData
                  }
                  const hasCustomSubIcon = Boolean(subIcon)
                  return (
                    <div
                      key={sub.id}
                      className="w-full pt-[100%] relative bg-black/10 rounded-[2px] overflow-hidden"
                    >
                      {hasCustomSubIcon ? (
                        <img
                          src={subIcon}
                          className="absolute inset-0 w-full h-full object-cover"
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : sub.url ? (
                        <Favicon
                          url={sub.url}
                          size={16}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <>
                {showCustomIcon ? (
                  <img
                    src={customIconSrc}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={() => {
                      setCustomIconOk((prev) => ({ ...prev, [b.id]: false }))
                    }}
                  />
                ) : null}
                {!showCustomIcon && (
                  <Favicon
                    url={b.url || ''}
                    name={b.name}
                    className="h-full w-full object-cover"
                    letterClassName="h-full w-full"
                  />
                )}
              </>
            )}
          </div>
        </div>
        <div className="mt-1.5 text-[11px] text-fg/80 truncate w-16 text-center">{b.name}</div>
        {/* Tags display */}
        <div className="flex flex-wrap justify-center gap-0.5 mt-0.5 w-16 min-h-[14px]">
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
