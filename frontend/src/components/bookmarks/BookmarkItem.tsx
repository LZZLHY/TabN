import { useState } from 'react'
import { cn } from '../../utils/cn'
import { Tooltip } from '../ui/Tooltip'
import { DraggableBookmarkItem } from './DraggableItem'
import { BookmarkIcon } from './BookmarkIcon'
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
  const isCombineCandidate = combineCandidateId === item.id
  const isCombineTarget = combineTargetId === item.id
  const showCombine = isCombineCandidate || isCombineTarget
  
  // 自定义图标失败状态
  const [customIconFailed, setCustomIconFailed] = useState(false)

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
        <BookmarkIcon
          bookmark={item}
          allItems={allItems}
          userId={userId}
          context={context}
          showCombine={showCombine}
          isCombineTarget={isCombineTarget}
          isCombineCandidate={isCombineCandidate}
          dockMode={dockMode}
          customIconFailed={customIconFailed}
          onCustomIconError={() => setCustomIconFailed(true)}
        />
        {/* Dock 模式不显示文字标签 */}
        {!dockMode && <div className="mt-1.5 text-[11px] text-fg/80 truncate w-16 text-center">{item.name}</div>}
      </div>
      </Tooltip>
    </DraggableBookmarkItem>
  )
}
