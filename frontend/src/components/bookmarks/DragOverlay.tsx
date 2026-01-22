import { createPortal } from 'react-dom'
import { cn } from '../../utils/cn'
import { Favicon } from '../Favicon'
import { getSortedFolderChildren } from './folderOperations'
import type { Bookmark } from './types'
import type { BookmarkContext } from '../../types/bookmark'

type DragOverlayProps = {
  activeId: string | null
  allItems: Bookmark[]
  userId?: string
  context?: BookmarkContext
  overlayRef: React.RefObject<HTMLDivElement>
  overlayBoxRef: React.RefObject<HTMLDivElement>
  overlayStyle: React.CSSProperties
}

/**
 * 拖拽覆盖层组件
 * 显示正在拖拽的书签项
 */
export function DragOverlay({
  activeId,
  allItems,
  userId,
  context = 'shortcut',
  overlayRef,
  overlayBoxRef,
  overlayStyle,
}: DragOverlayProps) {
  if (!activeId) return null

  const item = allItems.find((x) => x.id === activeId)
  if (!item) return null

  const isFolder = item.type === 'FOLDER'
  const folderItems = isFolder
    ? getSortedFolderChildren(allItems.filter((x) => x.parentId === item.id), userId, item.id, context).slice(0, 9)
    : []

  return createPortal(
    <div ref={overlayRef} style={overlayStyle}>
      <div className="bm-inner">
        <div className="grid place-items-center select-none">
          <div
            ref={overlayBoxRef}
            className={cn(
              'bookmark-icon h-12 w-12 rounded-[var(--start-radius)] overflow-hidden grid place-items-center shadow-2xl select-none',
              isFolder
                ? 'bg-glass/20 border border-glass-border/20 p-1'
                : 'bg-primary/15 text-primary font-semibold',
            )}
          >
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
          <div className="mt-1.5 text-[11px] text-fg/80 truncate w-16 text-center">
            {item.name}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
