import { useCallback, useRef } from 'react'
import { cn } from '../../utils/cn'
import type { Bookmark } from './types'

type DraggableBookmarkItemProps = {
  item: Bookmark
  activeDragId: string | null
  setElRef: (id: string, el: HTMLDivElement | null) => void
  onPointerDown: (id: string, ev: React.PointerEvent<HTMLDivElement>) => void
  onClick: (e: React.MouseEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
  onLongPress?: (x: number, y: number) => void
  onCancelDrag?: () => void
  title?: string
  children: React.ReactNode
  /** 是否限制只有点击图标区域才触发拖拽（用于书签页） */
  iconOnlyDrag?: boolean
  className?: string
}

/**
 * 可拖拽书签项组件
 * 支持长按呼出右键菜单（移动端）
 */
export function DraggableBookmarkItem(props: DraggableBookmarkItemProps) {
  const { 
    item, 
    activeDragId, 
    setElRef, 
    onPointerDown, 
    onClick, 
    onContextMenu, 
    onLongPress, 
    onCancelDrag, 
    title, 
    children,
    iconOnlyDrag = false,
    className,
  } = props

  const mergedRef = (el: HTMLDivElement | null) => {
    setElRef(item.id, el)
  }

  const isBeingDragged = activeDragId === item.id
  
  // 长按检测（仅移动端触摸）
  // 逻辑：按久一点（> 200ms）松手后显示菜单，而不是按住时显示
  // - 短按（< 200ms）松手 → 打开书签
  // - 按住并移动 → 拖拽
  // - 按久一点（> 200ms）松手且没移动 → 显示菜单
  const touchStartTime = useRef(0)
  const touchStartPos = useRef({ x: 0, y: 0 })
  const hasMoved = useRef(false)
  const longPressHandled = useRef(false) // 标记长按是否已处理（用于阻止 onClick）
  const longPressThreshold = 200 // 比拖拽阈值（5px 移动）的判定时间稍长即可

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY }
    touchStartTime.current = Date.now()
    hasMoved.current = false
    longPressHandled.current = false
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartPos.current.x
    const dy = touch.clientY - touchStartPos.current.y
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      hasMoved.current = true
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!onLongPress) return
    const duration = Date.now() - touchStartTime.current
    // 按久一点（> 阈值）松手且没移动 → 显示菜单
    if (duration > longPressThreshold && !hasMoved.current) {
      // 阻止事件传播，防止触发 pointerup 等后续事件
      e.preventDefault()
      e.stopPropagation()
      longPressHandled.current = true
      // 取消拖拽
      onCancelDrag?.()
      // 显示菜单
      const touch = e.changedTouches[0]
      onLongPress(touch.clientX + 8, touch.clientY + 8)
      // 阻止触摸模拟的所有后续事件（pointerup, mouseup, click）
      const blockEvent = (ev: Event) => {
        ev.stopPropagation()
        ev.stopImmediatePropagation()
        ev.preventDefault()
      }
      // 在捕获阶段阻止所有可能关闭菜单的事件
      window.addEventListener('pointerup', blockEvent, { capture: true, once: true })
      window.addEventListener('mouseup', blockEvent, { capture: true, once: true })
      window.addEventListener('click', blockEvent, { capture: true, once: true })
      // 安全起见，500ms 后移除监听器（如果没有触发）
      setTimeout(() => {
        window.removeEventListener('pointerup', blockEvent, { capture: true })
        window.removeEventListener('mouseup', blockEvent, { capture: true })
        window.removeEventListener('click', blockEvent, { capture: true })
      }, 500)
    }
  }, [onLongPress, onCancelDrag])

  return (
    <div
      ref={mergedRef}
      className={cn(
        'select-none relative group touch-none',
        iconOnlyDrag && 'w-16',
        isBeingDragged ? 'opacity-0 pointer-events-none' : 'opacity-100',
        className,
      )}
      style={{
        transition: 'opacity 150ms',
      }}
      onPointerDown={(e) => {
        if (iconOnlyDrag) {
          // 只有点击图标区域才触发拖拽，文字区域不触发
          const target = e.target as HTMLElement
          if (target.closest('.bookmark-icon')) {
            onPointerDown(item.id, e)
          }
        } else {
          // 不拦截，让拖拽逻辑正常工作
          onPointerDown(item.id, e)
        }
      }}
      onClick={(e) => {
        // 如果正在拖拽或长按已处理，阻止点击事件
        if (activeDragId || longPressHandled.current) {
          e.preventDefault()
          e.stopPropagation()
          longPressHandled.current = false
          return
        }
        onClick(e)
      }}
      onContextMenu={onContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      title={title}
    >
      <div className="bm-inner flex items-center">{children}</div>
    </div>
  )
}
