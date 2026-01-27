import { useState, useRef, useEffect } from 'react'
import { ArrowDownAZ, FolderUp, FolderDown, GripVertical, MousePointerClick, Lock, Tag, ArrowUpDown } from 'lucide-react'
import { cn } from '../utils/cn'
import type { SortMode } from '../types/bookmark'

const SORT_MODE_OPTIONS: { value: SortMode; label: string; icon: React.ReactNode }[] = [
  { value: 'custom', label: '自定义', icon: <GripVertical className="w-4 h-4" /> },
  { value: 'folders-first', label: '文件夹在前', icon: <FolderUp className="w-4 h-4" /> },
  { value: 'links-first', label: '链接在前', icon: <FolderDown className="w-4 h-4" /> },
  { value: 'alphabetical', label: '按名称 A-Z', icon: <ArrowDownAZ className="w-4 h-4" /> },
  { value: 'click-count', label: '按点击次数', icon: <MousePointerClick className="w-4 h-4" /> },
  { value: 'by-tag', label: '按标签分类', icon: <Tag className="w-4 h-4" /> },
]

type SortModeIconButtonProps = {
  value: SortMode
  onChange: (mode: SortMode) => void
  locked?: boolean
  className?: string
}

/**
 * 图标版排序选择器，用于移动端
 * 点击展开显示选项列表
 */
export function SortModeIconButton({ value, onChange, locked, className }: SortModeIconButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* 图标按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-2 rounded-lg transition-colors',
          'bg-glass/20 hover:bg-glass/40',
          'flex items-center gap-1'
        )}
      >
        <ArrowUpDown className="w-5 h-5 text-fg/70" />
        {locked && <Lock className="w-3 h-3 text-fg/50" />}
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 min-w-[140px] glass-panel-strong rounded-xl p-1.5 border border-glass-border/25 shadow-xl animate-in fade-in zoom-in-95 duration-150">
          {SORT_MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                value === option.value
                  ? 'bg-primary/20 text-primary'
                  : 'hover:bg-glass/30 text-fg/80'
              )}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
