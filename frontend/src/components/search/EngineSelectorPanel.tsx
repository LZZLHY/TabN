import { useEffect, useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { cn } from '../../utils/cn'
import { EngineOption } from './EngineOption'
import type { SearchEngineConfig } from '../../utils/searchEngine'
import type { SyncedIconInfo } from '../../services/iconSyncService'
import { useAppearanceStore } from '../../stores/appearance'
import { calculateProportionalRadius } from '../../utils/iconRadius'

/** 
 * 每个引擎选项的实际宽度：
 * - 图标 w-12 = 48px
 * - padding p-1.5 = 6px * 2 = 12px
 * - 但实际渲染时按钮会收缩到内容宽度，约 51px
 */
export const ENGINE_OPTION_WIDTH = 51
/** 管理按钮的宽度（与引擎选项相同） */
export const MANAGE_BUTTON_WIDTH = 51
/** 面板内边距 px-3 = 12px * 2 = 24px */
export const PANEL_PADDING = 24
/** 间距 gap-1 = 4px */
export const GAP_WIDTH = 4

/**
 * 根据面板宽度计算可容纳的引擎数量
 */
export function calculateMaxEngineCount(panelWidth: number): number {
  if (!panelWidth) return 4 // 默认值
  // 可用宽度 = 面板宽度 - 内边距 - 管理按钮宽度
  const availableWidth = panelWidth - PANEL_PADDING - MANAGE_BUTTON_WIDTH
  // 每个引擎占用的宽度 = 选项宽度 + 间距
  const widthPerEngine = ENGINE_OPTION_WIDTH + GAP_WIDTH
  // 计算可容纳的引擎数量（至少1个）
  return Math.max(1, Math.floor(availableWidth / widthPerEngine))
}

export interface EngineSelectorPanelProps {
  /** 是否显示面板 */
  isOpen: boolean
  /** 锚点元素 ref，用于定位 */
  anchorRef: React.RefObject<HTMLElement | null>
  /** 显示在面板中的搜索引擎（动态数量，根据面板宽度自动计算） */
  engines: SearchEngineConfig[]
  /** 当前选中的引擎 ID */
  selectedEngineId: string
  /** 获取引擎的同步图标信息 */
  getSyncedIcon: (engineDomain: string) => SyncedIconInfo | null
  /** 全局背景设置 */
  globalBg?: string | null
  /** 图标自定义尺寸 */
  iconSize?: number
  /** 选择引擎回调 */
  onSelect: (engine: SearchEngineConfig) => void
  /** 关闭面板回调 */
  onClose: () => void
  /** 打开引擎管理弹窗回调 */
  onManageEngines?: () => void
  /** 删除引擎回调 */
  onDeleteEngine?: (engineId: string) => void
}

/**
 * 搜索引擎选择面板
 * 显示动态数量的引擎 + 1个加号按钮
 * 根据面板宽度自动计算可容纳的引擎数量
 * 使用 Portal 渲染到 body 层级，样式与 SearchDropdown 完全一致
 */
export function EngineSelectorPanel({
  isOpen,
  anchorRef,
  engines,
  selectedEngineId,
  getSyncedIcon,
  globalBg,
  iconSize,
  onSelect,
  onClose,
  onManageEngines,
  onDeleteEngine,
}: EngineSelectorPanelProps) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)
  
  // 获取样式设置（与 SearchDropdown 完全相同）
  const searchDropdownOpacity = useAppearanceStore((s) => s.searchDropdownOpacity)
  const searchDropdownBlur = useAppearanceStore((s) => s.searchDropdownBlur)
  const iconRadiusRatio = useAppearanceStore((s) => s.iconRadiusRatio)
  
  // 计算动态样式（与 SearchDropdown 完全相同的计算方式）
  const bgOpacity = 0.1 + searchDropdownOpacity * 0.009
  const blurValue = searchDropdownBlur

  // 计算面板位置和宽度
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  
  // 根据面板宽度计算可显示的引擎数量
  const maxEngineCount = useMemo(() => {
    return calculateMaxEngineCount(position?.width || 0)
  }, [position?.width])
  
  useEffect(() => {
    if (!anchorRef?.current) return
    
    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (rect) {
        setPosition({
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
        })
      }
    }
    
    updatePosition()
    const timer = setTimeout(updatePosition, 100)
    
    const resizeObserver = new ResizeObserver(updatePosition)
    resizeObserver.observe(anchorRef.current)
    
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    
    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [anchorRef, isOpen])

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const isInPanel = panelRef.current?.contains(target)
      const isInAnchor = anchorRef.current?.contains(target)
      
      // 检查是否点击在引擎管理弹窗内（通过 data 属性识别）
      const engineDialog = document.querySelector('[data-engine-dialog="true"]')
      const isInEngineDialog = engineDialog?.contains(target)
      
      if (!isInPanel && !isInAnchor && !isInEngineDialog) {
        onClose()
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, anchorRef, onClose])

  // 根据计算的最大数量显示引擎
  const displayEngines = engines.slice(0, maxEngineCount)

  const panelContent = (
    <div
      ref={panelRef}
      data-engine-panel="true"
      className={cn(
        'rounded-2xl border border-glass-border/25 shadow-glass',
        'overflow-hidden',
        // 只对 opacity 和 transform 应用过渡，避免位置属性动画导致从左上角飞出
        'transition-[opacity,transform] duration-300 ease-out origin-top',
        isOpen
          ? 'opacity-100 scale-y-100'
          : 'opacity-0 scale-y-95 pointer-events-none',
        'fixed z-[10000]',
      )}
      style={{
        ...(blurValue > 0 ? {
          backdropFilter: `blur(${blurValue}px)`,
          WebkitBackdropFilter: `blur(${blurValue}px)`,
        } : {}),
        backgroundColor: `rgb(var(--glass) / ${bgOpacity})`,
        ...(position ? {
          top: isOpen ? position.top : position.top - 8,
          left: position.left,
          width: position.width,
        } : {
          top: -9999,
          left: -9999,
        }),
      }}
    >
      {/* 引擎选项 - 水平排列，从左开始，紧凑间距 */}
      <div className="px-3 py-2.5 flex items-center justify-start gap-1">
        {displayEngines.map((engine) => (
          <EngineOption
            key={engine.id}
            engine={engine}
            isSelected={engine.id === selectedEngineId}
            syncedIcon={getSyncedIcon(engine.domain)}
            globalBg={globalBg}
            size={iconSize}
            onClick={() => onSelect(engine)}
            onDelete={onDeleteEngine ? () => onDeleteEngine(engine.id) : undefined}
          />
        ))}
        
        {/* 管理按钮 */}
        {onManageEngines && (
          <button
            type="button"
            onClick={onManageEngines}
            className={cn(
              'flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition-all duration-200',
              'hover:bg-white/10 active:scale-95',
            )}
          >
            <div 
              className={cn(
                'w-12 h-12',
                'flex items-center justify-center',
                'bg-white/10 border border-dashed border-white/30',
              )}
              style={{ borderRadius: calculateProportionalRadius(48, iconRadiusRatio) }}
            >
              <Plus className="w-6 h-6 text-fg/60" />
            </div>
            <span className="text-xs text-fg/60 whitespace-nowrap">{t('settings.engineSelector.manage')}</span>
          </button>
        )}
      </div>
    </div>
  )

  // 在位置计算完成前不渲染，避免从左上角飞出
  if (!position) return null
  
  return createPortal(panelContent, document.body)
}
