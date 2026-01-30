import { useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useAppearanceStore } from '../../stores/appearance'
import { useBookmarkCacheStore } from '../../stores/bookmarkCache'
import { 
  getSearchEngineById,
  type SearchEngineConfig,
} from '../../utils/searchEngine'
import { 
  findMatchingBookmarkIcon, 
  getGlobalIconBackground,
  type SyncedIconInfo,
} from '../../services/iconSyncService'
import { UnifiedIcon } from '../ui/UnifiedIcon'
import { EngineSelectorPanel, calculateMaxEngineCount } from './EngineSelectorPanel'
import { AddEngineDialog } from './AddEngineDialog'
import { calculateProportionalRadius } from '../../utils/iconRadius'

export interface SearchEngineSwitcherProps {
  /** 是否可见（搜索框展开时显示） */
  isVisible: boolean
  /** 搜索框容器 ref，用于面板定位对齐 */
  searchBoxRef?: React.RefObject<HTMLElement | null>
  /** 切换搜索引擎回调 */
  onEngineChange?: (engine: SearchEngineConfig) => void
}

/**
 * 搜索引擎切换器组件
 * 包含触发按钮和弹出选择面板
 */
export function SearchEngineSwitcher({
  isVisible,
  searchBoxRef,
  onEngineChange,
}: SearchEngineSwitcherProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false)
  const [panelWidth, setPanelWidth] = useState(0)

  // 当搜索框失去焦点时（isVisible 变为 false），关闭引擎选择面板
  // 使用 useLayoutEffect 同步更新，避免闪烁
  useLayoutEffect(() => {
    if (!isVisible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 需要同步关闭面板避免闪烁
      setIsPanelOpen(false)
    }
  }, [isVisible])

  // 监听搜索框宽度变化，计算面板可容纳的引擎数量
  useEffect(() => {
    const ref = searchBoxRef?.current
    if (!ref) return

    const updateWidth = () => {
      const rect = ref.getBoundingClientRect()
      setPanelWidth(rect.width)
    }

    updateWidth()
    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(ref)

    return () => resizeObserver.disconnect()
  }, [searchBoxRef])

  // 根据面板宽度计算最大引擎数量
  const maxEngineCount = useMemo(() => {
    return calculateMaxEngineCount(panelWidth)
  }, [panelWidth])

  // Store 状态
  const selectedEngineId = useAppearanceStore((s) => s.selectedEngineId)
  const customEngines = useAppearanceStore((s) => s.customEngines)
  const enabledEngineIds = useAppearanceStore((s) => s.enabledEngineIds)
  const iconRadiusRatio = useAppearanceStore((s) => s.iconRadiusRatio)
  const setSelectedEngineId = useAppearanceStore((s) => s.setSelectedEngineId)
  const addCustomEngine = useAppearanceStore((s) => s.addCustomEngine)
  const toggleEngineEnabled = useAppearanceStore((s) => s.toggleEngineEnabled)

  // 书签缓存
  const bookmarks = useBookmarkCacheStore((s) => s.items)

  // 获取启用的搜索引擎（不再限制数量，由面板宽度动态决定显示数量）
  const enabledEngines = useMemo(() => {
    return enabledEngineIds
      .map((id) => getSearchEngineById(id, customEngines))
  }, [enabledEngineIds, customEngines])

  // 获取当前选中的引擎
  const currentEngine = useMemo(() => 
    getSearchEngineById(selectedEngineId, customEngines),
    [selectedEngineId, customEngines]
  )

  // 获取全局背景设置
  const globalBg = useMemo(() => 
    getGlobalIconBackground(bookmarks),
    [bookmarks]
  )

  // 获取引擎的同步图标信息
  const getSyncedIcon = useCallback((engineDomain: string): SyncedIconInfo | null => {
    return findMatchingBookmarkIcon(engineDomain, bookmarks)
  }, [bookmarks])

  // 获取当前引擎的图标信息
  const currentSyncedIcon = useMemo(() => 
    getSyncedIcon(currentEngine.domain),
    [getSyncedIcon, currentEngine.domain]
  )

  // 处理引擎选择
  const handleSelectEngine = useCallback((engine: SearchEngineConfig) => {
    setSelectedEngineId(engine.id)
    setIsPanelOpen(false)
    onEngineChange?.(engine)
  }, [setSelectedEngineId, onEngineChange])

  // 处理添加自定义引擎
  const handleAddCustomEngine = useCallback((engine: Omit<SearchEngineConfig, 'id' | 'isPreset'>) => {
    addCustomEngine(engine)
  }, [addCustomEngine])

  // 处理切换引擎启用状态
  const handleToggleEngine = useCallback((engineId: string) => {
    toggleEngineEnabled(engineId)
  }, [toggleEngineEnabled])

  // 处理删除引擎（从选择面板中移除，不是真正删除）
  const handleDeleteEngine = useCallback((engineId: string) => {
    // 只是从启用列表中移除，不删除引擎本身
    toggleEngineEnabled(engineId)
  }, [toggleEngineEnabled])

  if (!isVisible) return null

  return (
    <>
      {/* 触发按钮 */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className={cn(
          'flex items-center gap-0.5 p-1 rounded-lg transition-all duration-200',
          'hover:bg-white/10 active:scale-95',
          isPanelOpen && 'bg-white/10',
        )}
      >
        {/* 当前引擎图标 - 使用 UnifiedIcon */}
        <UnifiedIcon
          iconType={currentSyncedIcon?.iconType}
          iconData={currentSyncedIcon?.iconData}
          iconUrl={currentSyncedIcon?.iconUrl || currentEngine.iconUrl}
          iconBg={currentSyncedIcon?.iconBg || globalBg}
          url={`https://${currentEngine.domain}`}
          name={currentEngine.name}
          size={24}
          borderRadius={calculateProportionalRadius(24, iconRadiusRatio)}
        />

        {/* 下拉箭头 */}
        <ChevronDown className={cn(
          'w-3 h-3 text-fg/50 transition-transform duration-200',
          isPanelOpen && 'rotate-180',
        )} />
      </button>

      {/* 选择面板 - 显示启用的引擎 + 管理按钮 */}
      <EngineSelectorPanel
        isOpen={isPanelOpen}
        anchorRef={searchBoxRef || buttonRef}
        engines={enabledEngines}
        selectedEngineId={selectedEngineId}
        getSyncedIcon={getSyncedIcon}
        globalBg={globalBg}
        onSelect={handleSelectEngine}
        onClose={() => setIsPanelOpen(false)}
        onManageEngines={() => {
          setIsManageDialogOpen(true)
        }}
        onDeleteEngine={handleDeleteEngine}
      />

      {/* 引擎管理弹窗 */}
      <AddEngineDialog
        isOpen={isManageDialogOpen}
        onClose={() => setIsManageDialogOpen(false)}
        onToggleEngine={handleToggleEngine}
        onSaveCustom={handleAddCustomEngine}
        getSyncedIcon={getSyncedIcon}
        globalBg={globalBg}
        maxEngineCount={maxEngineCount}
      />
    </>
  )
}
