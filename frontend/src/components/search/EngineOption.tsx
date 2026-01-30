import { useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'
import { UnifiedIcon } from '../ui/UnifiedIcon'
import type { SearchEngineConfig } from '../../utils/searchEngine'
import type { SyncedIconInfo } from '../../services/iconSyncService'
import { useAppearanceStore } from '../../stores/appearance'
import { calculateProportionalRadius } from '../../utils/iconRadius'

export interface EngineOptionProps {
  /** 搜索引擎配置 */
  engine: SearchEngineConfig
  /** 是否选中 */
  isSelected: boolean
  /** 同步的图标信息（来自书签） */
  syncedIcon?: SyncedIconInfo | null
  /** 全局背景设置 */
  globalBg?: string | null
  /** 自定义尺寸 */
  size?: number
  /** 点击回调 */
  onClick: () => void
  /** 删除回调（悬停时显示删除按钮） */
  onDelete?: () => void
}

/**
 * 搜索引擎选项组件
 * 采用上层图标、下层文字的垂直布局
 * 样式与书签页图标保持一致
 * 使用比例化圆角计算
 */
export function EngineOption({
  engine,
  isSelected,
  syncedIcon,
  globalBg,
  size = 48,
  onClick,
  onDelete,
}: EngineOptionProps) {
  const iconRadiusRatio = useAppearanceStore((s) => s.iconRadiusRatio)
  
  // 处理删除按钮点击
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.()
  }, [onDelete])

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition-all duration-200',
        'hover:bg-white/10 active:scale-95',
        isSelected && 'bg-white/15 ring-2 ring-primary/50',
      )}
    >
      {/* 删除按钮（悬停时显示） */}
      {onDelete && (
        <div
          onClick={handleDelete}
          className={cn(
            'absolute -top-1 -right-1 w-5 h-5 rounded-full',
            'bg-red-500/80 hover:bg-red-500',
            'flex items-center justify-center',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            'cursor-pointer z-10',
          )}
        >
          <X className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      )}

      {/* 图标容器 - 使用 UnifiedIcon */}
      <UnifiedIcon
        iconType={syncedIcon?.iconType}
        iconData={syncedIcon?.iconData}
        iconUrl={syncedIcon?.iconUrl || engine.iconUrl}
        iconBg={syncedIcon?.iconBg || globalBg}
        url={`https://${engine.domain}`}
        name={engine.name}
        size={size}
        borderRadius={calculateProportionalRadius(size, iconRadiusRatio)}
      />

      {/* 引擎名称 */}
      <span className={cn(
        'text-xs text-fg/80 truncate max-w-[64px]',
        isSelected && 'text-fg font-medium',
      )}>
        {engine.name}
      </span>
    </button>
  )
}
