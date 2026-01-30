import { Clock, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '../utils/cn'
import { useAppearanceStore } from '../stores/appearance'
import { UnifiedIcon } from './ui/UnifiedIcon'

export type DropdownItem =
  | { type: 'shortcut'; id: string; name: string; url: string; favicon: string; iconBg?: string | null; iconType?: 'BASE64' | 'URL' | 'TEXT' | null; iconData?: string | null; iconUrl?: string | null }
  | { type: 'suggestion'; text: string }
  | { type: 'history'; text: string }
  | { type: 'recent'; id: string; name: string; url: string; favicon: string | null }

interface ShortcutMatch {
  id: string
  name: string
  url: string
  favicon: string
  // 添加完整的书签图标信息
  iconBg?: string | null
  iconType?: 'BASE64' | 'URL' | 'TEXT' | null
  iconData?: string | null
  iconUrl?: string | null
}

interface RecentBookmark {
  id: string
  name: string
  url: string
  favicon: string | null
  iconUrl?: string | null
  iconType?: string | null
  iconData?: string | null
  iconBg?: string | null
}

interface SearchDropdownProps {
  /** 是否可见 */
  isVisible: boolean
  /** 锚点元素的 ref，用于定位下拉框 */
  anchorRef?: React.RefObject<HTMLElement | null>
  /** 下拉框元素的 ref，用于外部点击检测 */
  dropdownRef?: React.RefObject<HTMLDivElement | null>
  /** 快捷方式匹配结果 */
  shortcuts: ShortcutMatch[]
  /** 搜索建议 */
  suggestions: string[]
  /** 搜索历史 */
  history: string[]
  /** 最近点击的书签 */
  recentBookmarks?: RecentBookmark[]
  /** 最近打开显示模式 */
  recentBookmarksMode?: 'fixed' | 'dynamic'
  /** 当前高亮索引，-1 表示无选中 */
  highlightIndex: number
  /** 是否正在加载建议 */
  isLoading?: boolean
  /** 每行高度（px） */
  rowHeight?: number
  /** 选择项目回调 */
  onSelectItem: (item: DropdownItem) => void
  /** 删除历史项回调 */
  onDeleteHistory: (text: string) => void
}

export function SearchDropdown({
  isVisible,
  anchorRef,
  dropdownRef,
  shortcuts,
  suggestions,
  history,
  recentBookmarks = [],
  recentBookmarksMode = 'dynamic',
  highlightIndex,
  isLoading,
  rowHeight = 40,
  onSelectItem,
  onDeleteHistory,
}: SearchDropdownProps) {
  const { t } = useTranslation()
  // 获取样式设置
  const searchDropdownOpacity = useAppearanceStore((s) => s.searchDropdownOpacity)
  const searchDropdownBlur = useAppearanceStore((s) => s.searchDropdownBlur)
  
  // 计算动态样式
  // 不透明度：0% -> 0.1, 100% -> 1.0（完全不透明）
  const bgOpacity = 0.1 + searchDropdownOpacity * 0.009
  // 模糊度：直接使用设置值（0-128px）
  const blurValue = searchDropdownBlur
  
  // 计算下拉框位置（用于 portal 渲染）
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  
  useEffect(() => {
    if (!anchorRef?.current) return
    
    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (rect) {
        setPosition({
          top: rect.bottom + 8, // 8px 间距
          left: rect.left + rect.width / 2,
          width: Math.min(620, window.innerWidth - 32),
        })
      }
    }
    
    // 立即计算位置
    updatePosition()
    
    // 延迟再次计算，确保搜索框展开动画完成后位置正确
    const timer = setTimeout(updatePosition, 100)
    
    // 使用 ResizeObserver 监听搜索框尺寸变化
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
  }, [anchorRef, isVisible])
  
  // 动态模式：计算能显示多少个书签
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(recentBookmarks.length)
  // 用于首次渲染时先显示所有书签以便测量
  const [measured, setMeasured] = useState(false)
  // 记录上次的书签数据，用于检测变化
  const prevBookmarksRef = useRef<string>('')

  // 监听容器宽度变化，计算能显示多少个
  useEffect(() => {
    // 关闭时不重置 measured，保持当前显示数量，避免关闭动画时闪烁
    if (!isVisible) return
    
    if (recentBookmarksMode !== 'dynamic' || recentBookmarks.length === 0) {
      setVisibleCount(recentBookmarks.length)
      setMeasured(true)
      return
    }

    // 检测书签数据是否变化，变化时需要重新测量
    const bookmarksKey = recentBookmarks.map(b => b.id).join(',')
    if (bookmarksKey !== prevBookmarksRef.current) {
      prevBookmarksRef.current = bookmarksKey
      setMeasured(false)
    }

    const container = containerRef.current
    if (!container) return

    const calculateVisibleCount = () => {
      const containerWidth = container.offsetWidth
      const children = container.children
      let totalWidth = 0
      let count = 0
      const gap = 6 // gap-1.5 = 6px

      // 遍历实际渲染的子元素，计算能显示多少个
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement
        const childWidth = child.offsetWidth + (i > 0 ? gap : 0)
        if (totalWidth + childWidth > containerWidth) break
        totalWidth += childWidth
        count++
      }

      setVisibleCount(Math.max(1, count)) // 至少显示 1 个
      setMeasured(true)
    }

    // 使用 requestAnimationFrame 确保 DOM 已渲染
    requestAnimationFrame(calculateVisibleCount)

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(calculateVisibleCount)
    })
    observer.observe(container)

    return () => observer.disconnect()
  }, [isVisible, recentBookmarks, recentBookmarksMode])

  // 根据模式决定显示的书签
  // 动态模式下：测量前显示所有（用于测量），测量后只显示计算出的数量
  const displayedRecentBookmarks = recentBookmarksMode === 'dynamic'
    ? (measured ? recentBookmarks.slice(0, visibleCount) : recentBookmarks)
    : recentBookmarks

  // 构建所有项目的扁平列表，用于键盘导航
  const allItems: DropdownItem[] = [
    ...recentBookmarks.map((b) => ({ type: 'recent' as const, ...b })),
    ...shortcuts.map((s) => ({ type: 'shortcut' as const, ...s })),
    ...suggestions.map((text) => ({ type: 'suggestion' as const, text })),
    ...history.map((text) => ({ type: 'history' as const, text })),
  ]

  const hasContent = allItems.length > 0 || isLoading
  if (!hasContent) return null

  let currentIndex = 0

  // 如果有 anchorRef，使用 portal 渲染到 body 层级
  // 这样 backdropFilter 才能正确模糊背景图片
  const dropdownContent = (
    <div
      ref={dropdownRef}
      className={cn(
        'rounded-2xl border border-glass-border/25 shadow-glass',
        'overflow-hidden',
        // 缓入缓出动画 - 只对 opacity 和 transform 应用过渡，避免位置属性动画导致从左上角飞出
        'transition-[opacity,transform] duration-300 ease-out',
        // 非 portal 模式下的动画
        !anchorRef && (isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'),
        // portal 模式下的动画（不使用 translate-y，因为会和 transform 冲突）
        anchorRef && (isVisible
          ? 'opacity-100 scale-100'
          : 'opacity-0 scale-95 pointer-events-none'),
        // 根据是否使用 portal 决定定位方式
        anchorRef ? 'fixed z-[9999]' : 'absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-[min(620px,calc(100vw-2rem))]',
      )}
      style={{
        // 模糊度和不透明度（模糊度为0时不应用 backdropFilter）
        ...(blurValue > 0 ? {
          backdropFilter: `blur(${blurValue}px)`,
          WebkitBackdropFilter: `blur(${blurValue}px)`,
        } : {}),
        backgroundColor: `rgb(var(--glass) / ${bgOpacity})`,
        // portal 模式下使用计算的位置，动画通过 top 偏移实现
        ...(anchorRef && position ? {
          top: isVisible ? position.top : position.top - 8,
          left: position.left,
          transform: 'translateX(-50%)',
          width: position.width,
        } : {}),
      }}
    >
      <div className="max-h-[min(320px,50vh)] overflow-y-auto overflow-x-hidden py-2 overscroll-contain">
        {/* 最近点击的书签区域 */}
        {recentBookmarks.length > 0 && (
          <div className="px-3 pb-2">
            <div className="text-[10px] text-fg/50 mb-1.5 px-1">{t('home.recentlyOpened')}</div>
            <div
              ref={containerRef}
              className={cn(
                'flex gap-1.5 overflow-hidden',
                recentBookmarksMode === 'dynamic' ? 'flex-nowrap' : 'flex-wrap'
              )}
            >
              {displayedRecentBookmarks.map((bookmark) => {
                const itemIndex = currentIndex++
                const isHighlighted = highlightIndex === itemIndex
                return (
                  <button
                    key={`recent-${bookmark.id}`}
                    type="button"
                    onClick={() => onSelectItem({ type: 'recent', ...bookmark })}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-xl shrink-0',
                      'text-sm transition-all duration-150',
                      'border',
                      isHighlighted
                        ? 'bg-primary/20 border-primary/30 text-fg'
                        : 'bg-glass/20 border-glass-border/10 text-fg/90 hover:bg-primary/15 hover:border-primary/20 hover:text-fg',
                    )}
                  >
                    {(() => {
                      return (
                        <UnifiedIcon
                          iconType={bookmark.iconType}
                          iconData={bookmark.iconData}
                          iconUrl={bookmark.iconUrl}
                          iconBg={bookmark.iconBg}
                          url={bookmark.url}
                          name={bookmark.name}
                          variant="mini"
                          borderRadius="calc(var(--start-radius)*0.33)"
                        />
                      )
                    })()}
                    <span className="truncate max-w-[120px]">{bookmark.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 分隔线 */}
        {recentBookmarks.length > 0 && (shortcuts.length > 0 || suggestions.length > 0 || history.length > 0) && (
          <div className="h-px bg-glass-border/10 mx-3 my-1" />
        )}

        {/* 快捷方式匹配区域 */}
        {shortcuts.length > 0 && (
          <div className="px-3 pb-2">
            <div className="text-[10px] text-fg/50 mb-1.5 px-1">{t('home.shortcuts')}</div>
            <div className="flex flex-wrap gap-1.5 overflow-hidden">
              {shortcuts.map((shortcut) => {
                const itemIndex = currentIndex++
                const isHighlighted = highlightIndex === itemIndex
                return (
                  <button
                    key={shortcut.id}
                    type="button"
                    onClick={() => onSelectItem({ type: 'shortcut', ...shortcut })}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-xl',
                      'text-sm transition-all duration-150',
                      'border',
                      isHighlighted
                        ? 'bg-primary/20 border-primary/30 text-fg'
                        : 'bg-glass/20 border-glass-border/10 text-fg/90 hover:bg-primary/15 hover:border-primary/20 hover:text-fg',
                    )}
                  >
                    {(() => {
                      return (
                        <UnifiedIcon
                          iconType={shortcut.iconType}
                          iconData={shortcut.iconData}
                          iconUrl={shortcut.iconUrl}
                          iconBg={shortcut.iconBg}
                          url={shortcut.url}
                          name={shortcut.name}
                          variant="mini"
                          borderRadius="calc(var(--start-radius)*0.33)"
                        />
                      )
                    })()}
                    <span className="truncate max-w-[120px]">{shortcut.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 分隔线 */}
        {shortcuts.length > 0 && (suggestions.length > 0 || history.length > 0) && (
          <div className="h-px bg-glass-border/10 mx-3 my-1" />
        )}

        {/* 搜索建议区域 */}
        {suggestions.length > 0 && (
          <div className="px-2 space-y-1">
            {suggestions.map((text) => {
              const itemIndex = currentIndex++
              const isHighlighted = highlightIndex === itemIndex
              return (
                <button
                  key={`suggestion-${text}`}
                  type="button"
                  onClick={() => onSelectItem({ type: 'suggestion', text })}
                  style={{ height: `${rowHeight}px` }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 text-left',
                    'text-sm transition-all duration-150',
                    'rounded-xl border',
                    isHighlighted
                      ? 'bg-primary/20 border-primary/30 text-fg'
                      : 'border-transparent text-fg/80 hover:bg-primary/10 hover:border-primary/20 hover:text-fg',
                  )}
                >
                  <Search className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isHighlighted ? 'text-primary' : 'text-fg/40',
                  )} />
                  <span className="truncate">{text}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* 分隔线 */}
        {suggestions.length > 0 && history.length > 0 && (
          <div className="h-px bg-glass-border/10 mx-3 my-1" />
        )}

        {/* 搜索历史区域 */}
        {history.length > 0 && (
          <div className="px-2 space-y-1">
            {suggestions.length === 0 && shortcuts.length === 0 && (
              <div className="text-[10px] text-fg/50 px-2 py-1">{t('home.searchHistory')}</div>
            )}
            {history.map((text) => {
              const itemIndex = currentIndex++
              const isHighlighted = highlightIndex === itemIndex
              return (
                <div
                  key={`history-${text}`}
                  style={{ height: `${rowHeight}px` }}
                  className={cn(
                    'group flex items-center gap-3 px-3',
                    'text-sm transition-all duration-150',
                    'rounded-xl border',
                    isHighlighted
                      ? 'bg-primary/20 border-primary/30 text-fg'
                      : 'border-transparent text-fg/80 hover:bg-primary/10 hover:border-primary/20 hover:text-fg',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectItem({ type: 'history', text })}
                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                  >
                    <Clock className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      isHighlighted ? 'text-primary' : 'text-fg/40',
                    )} />
                    <span className="truncate">{text}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteHistory(text)
                    }}
                    className={cn(
                      'p-1 rounded-lg text-fg/30 hover:text-fg/60 hover:bg-glass/30',
                      'opacity-0 group-hover:opacity-100 transition-all',
                    )}
                    title="删除此记录"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* 加载状态 */}
        {isLoading && suggestions.length === 0 && (
          <div className="px-4 py-3 text-sm text-fg/50 text-center">
            正在获取建议...
          </div>
        )}
      </div>
    </div>
  )

  // 如果有 anchorRef，使用 portal 渲染到 body 层级
  if (anchorRef) {
    // 在位置计算完成前不渲染，避免从左上角飞出
    if (!position) return null
    return createPortal(dropdownContent, document.body)
  }

  return dropdownContent
}

