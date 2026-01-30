import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '../../utils/cn'
import type { SearchEngineConfig } from '../../utils/searchEngine'

export interface EngineContextMenuProps {
  /** 是否显示 */
  isOpen: boolean
  /** 位置 */
  position: { x: number; y: number }
  /** 目标引擎 */
  engine: SearchEngineConfig | null
  /** 关闭回调 */
  onClose: () => void
  /** 编辑回调 */
  onEdit: (engine: SearchEngineConfig) => void
  /** 删除回调 */
  onDelete: (engineId: string) => void
}

/**
 * 自定义搜索引擎的上下文菜单
 */
export function EngineContextMenu({
  isOpen,
  position,
  engine,
  onClose,
  onEdit,
  onDelete,
}: EngineContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !engine) return null

  const menuContent = (
    <div
      ref={menuRef}
      data-engine-menu="true"
      className={cn(
        'fixed z-[10002] min-w-[120px] py-1 rounded-lg',
        'bg-glass/95 backdrop-blur-xl border border-glass-border/30 shadow-xl',
        'animate-in fade-in-0 zoom-in-95 duration-150',
      )}
      style={{
        top: position.y,
        left: position.x,
      }}
    >
      <button
        type="button"
        onClick={() => {
          onEdit(engine)
          onClose()
        }}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2',
          'text-sm text-fg/80 hover:bg-white/10 transition-colors',
        )}
      >
        <Pencil className="w-4 h-4" />
        编辑
      </button>
      <button
        type="button"
        onClick={() => {
          onDelete(engine.id)
          onClose()
        }}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2',
          'text-sm text-red-400 hover:bg-red-500/10 transition-colors',
        )}
      >
        <Trash2 className="w-4 h-4" />
        删除
      </button>
    </div>
  )

  return createPortal(menuContent, document.body)
}
