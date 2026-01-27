import { ArrowRight, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAppearanceStore } from '../stores/appearance'
import { useAuthStore } from '../stores/auth'
import { useSearchFocusStore } from '../stores/searchFocus'
import { apiFetch } from '../services/api'
import { cn } from '../utils/cn'
import { buildSearchUrl } from '../utils/searchEngine'
import { useSearchHistory } from '../hooks/useSearchHistory'
import { useSearchSuggestions } from '../hooks/useSearchSuggestions'
import { useShortcutMatcher, type Bookmark } from '../hooks/useShortcutMatcher'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { useRecentBookmarks } from '../hooks/useRecentBookmarks'
import { useClickTracker } from '../hooks/useClickTracker'
import { SearchDropdown, type DropdownItem } from './SearchDropdown'
import { getAllDropdownItems } from './searchDropdownUtils'

type Props = {
  className?: string
  /** 是否禁用全局聚焦状态同步（用于书签页等嵌入场景） */
  disableGlobalFocus?: boolean
  /** 是否全宽显示（用于移动端书签页） */
  fullWidth?: boolean
}

export function SearchBox({ className, disableGlobalFocus = false, fullWidth = false }: Props) {
  const [q, setQ] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)  // 搜索框是否完全展开
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 全局聚焦状态
  const setGlobalFocused = useSearchFocusStore((s) => s.setFocused)

  // 同步本地聚焦状态到全局（仅在未禁用时）
  useEffect(() => {
    if (!disableGlobalFocus) {
      setGlobalFocused(isFocused)
    }
  }, [isFocused, setGlobalFocused, disableGlobalFocus])

  // 聚焦时等待展开动画接近完成后再显示下拉框
  useEffect(() => {
    if (!isFocused) return
    // 等待 200ms 后显示下拉框
    const timer = setTimeout(() => setIsExpanded(true), 200)
    return () => {
      clearTimeout(timer)
      setIsExpanded(false)
    }
  }, [isFocused])


  // 从 store 获取设置
  const searchEngine = useAppearanceStore((s) => s.searchEngine)
  const customSearchUrl = useAppearanceStore((s) => s.customSearchUrl)
  const searchHistoryCount = useAppearanceStore((s) => s.searchHistoryCount)
  const searchRowHeight = useAppearanceStore((s) => s.searchRowHeight)
  const recentBookmarksCount = useAppearanceStore((s) => s.recentBookmarksCount)
  const recentBookmarksEnabled = useAppearanceStore((s) => s.recentBookmarksEnabled)
  const recentBookmarksMode = useAppearanceStore((s) => s.recentBookmarksMode)
  const searchGlowBorder = useAppearanceStore((s) => s.searchGlowBorder)
  const searchGlowLight = useAppearanceStore((s) => s.searchGlowLight)
  const searchGlowLightMove = useAppearanceStore((s) => s.searchGlowLightMove)
  
  // 用户信息
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  // 搜索历史
  const { history, addToHistory, removeFromHistory } = useSearchHistory(user?.id)

  // 最近点击的书签（根据模式决定获取数量）
  const recentLimit = recentBookmarksMode === 'fixed' ? recentBookmarksCount : 12
  const { recentBookmarks } = useRecentBookmarks(recentLimit)
  
  // 点击追踪
  const { trackClick } = useClickTracker()

  // 搜索建议（仅在有输入时启用）
  const trimmedQuery = q.trim()
  const { suggestions, isLoading: suggestionsLoading } = useSearchSuggestions(
    trimmedQuery,
    searchEngine,
    isFocused && trimmedQuery.length > 0
  )

  // 快捷方式匹配
  const { matches: shortcuts } = useShortcutMatcher(trimmedQuery, bookmarks)

  // 执行搜索
  const executeSearch = useCallback((query: string) => {
    const trimmed = query.trim()
    if (!trimmed) {
      toast.warning('先输入点东西～')
      return
    }

    // 保存到历史记录
    addToHistory(trimmed)

    // 构建搜索 URL 并打开
    const url = buildSearchUrl(searchEngine, trimmed, customSearchUrl)
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }

    // 清空输入并关闭下拉框
    setQ('')
    setIsFocused(false)
  }, [searchEngine, customSearchUrl, addToHistory])

  // 处理下拉框项目选择
  const handleItemSelect = useCallback((item: DropdownItem) => {
    if (item.type === 'shortcut' || item.type === 'recent') {
      // 打开快捷方式或最近书签
      window.open(item.url, '_blank', 'noopener,noreferrer')
      // 记录点击（会自动触发最近列表刷新）
      void trackClick(item.id)
      setQ('')
      setIsFocused(false)
    } else if (item.type === 'suggestion' || item.type === 'history') {
      // 执行搜索
      executeSearch(item.text)
    }
  }, [executeSearch, trackClick])

  // 构建下拉框项目列表
  const dropdownItems = useMemo(() => {
    if (!isFocused) return []
    
    // 有输入时显示快捷方式和建议（不显示最近书签）
    if (trimmedQuery) {
      return getAllDropdownItems(shortcuts, suggestions, [], [])
    }
    
    // 无输入时显示最近书签和历史
    const recentToShow = recentBookmarksEnabled ? recentBookmarks : []
    return getAllDropdownItems([], [], searchHistoryCount > 0 ? history : [], recentToShow)
  }, [isFocused, trimmedQuery, shortcuts, suggestions, history, searchHistoryCount, recentBookmarks, recentBookmarksEnabled])

  // 键盘导航
  const handleSelectItem = useCallback((index: number) => {
    const item = dropdownItems[index]
    if (!item) return
    handleItemSelect(item)
  }, [dropdownItems, handleItemSelect])

  const handleClose = useCallback(() => {
    setIsFocused(false)
    inputRef.current?.blur()
  }, [])

  const handleSubmit = useCallback(() => {
    executeSearch(q)
  }, [q, executeSearch])

  const { highlightIndex, resetHighlight, handleKeyDown } = useKeyboardNavigation({
    itemCount: dropdownItems.length,
    enabled: isFocused && dropdownItems.length > 0,
    onSelect: handleSelectItem,
    onClose: handleClose,
    onSubmit: handleSubmit,
  })

  // 加载书签数据
  useEffect(() => {
    if (!token) return
    
    const loadBookmarks = async () => {
      try {
        const resp = await apiFetch<{ items: Bookmark[] }>('/api/bookmarks', {
          method: 'GET',
          token,
        })
        if (resp.ok) {
          // 只保留 LINK 类型的书签
          setBookmarks(resp.data.items.filter(b => b.type === 'LINK'))
        }
      } catch {
        // 静默失败
      }
    }
    
    void loadBookmarks()
  }, [token])

  // 点击外部关闭下拉框
  useEffect(() => {
    if (!isFocused) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      // 检查点击是否在搜索框容器内
      const isInContainer = containerRef.current?.contains(target)
      // 检查点击是否在下拉框内（portal 渲染到 body）
      const isInDropdown = dropdownRef.current?.contains(target)
      
      if (!isInContainer && !isInDropdown) {
        setIsFocused(false)
      }
    }

    // 延迟添加监听器，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isFocused])

  // 输入变化时重置高亮
  useEffect(() => {
    resetHighlight()
  }, [q, resetHighlight])

  // 处理删除历史
  const handleDeleteHistory = useCallback((text: string) => {
    removeFromHistory(text)
  }, [removeFromHistory])

  // 预览模式
  const isPreviewMode = useSearchFocusStore((s) => s.isPreviewMode)
  
  // 显示下拉框的条件：需要聚焦且展开动画完成，或者处于预览模式
  const showDropdown = (isFocused && isExpanded && (dropdownItems.length > 0 || suggestionsLoading)) || isPreviewMode

  // 显示的历史记录（仅在无输入时）
  const displayHistory = !trimmedQuery && searchHistoryCount > 0 ? history : []

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative flex items-center transition-all duration-500 ease-out mx-auto',
        'h-12 rounded-2xl backdrop-blur-xl',
        // 边框：开启流光线条时用动画边框，否则用默认边框
        !searchGlowBorder && 'border border-glass-border/20',
        searchGlowBorder && 'glow-border',
        searchGlowBorder && isFocused && 'glow-border-active',
        // 光效：独立控制，不依赖流光线条
        searchGlowLight && isFocused && (searchGlowLightMove ? 'glow-light-move' : 'glow-light-static'),
        // z-index 确保下拉框在其他元素之上
        'z-40',
        // 全宽模式：始终占满容器宽度
        fullWidth ? 'w-full bg-glass/40' : [
          // Initial State: 移动端窄，桌面端也窄
          'w-48 md:w-64 bg-glass/15',
          // Hover State: 桌面端悬浮展开（不显示内容）
          'md:hover:w-[min(620px,90vw)] md:hover:bg-glass/40',
          // Focus State: 聚焦展开（移动端和桌面端都应用）
          'focus-within:w-[min(620px,calc(100vw-2rem))] focus-within:!bg-glass/75',
        ],
        // 开启流光边框时不显示 ring，用流光效果代替
        !searchGlowBorder && 'focus-within:ring-2 focus-within:ring-primary/30',
        className,
      )}
    >
      {/* 搜索图标 - 绝对定位不影响输入框布局 */}
      <Search className={cn(
        'absolute left-4 h-5 w-5 text-fg/50 transition-all duration-300',
        'opacity-0 scale-75',
        'group-focus-within:opacity-100 group-focus-within:scale-100'
      )} />

      {/* 非聚焦状态：显示"搜索"文字（即使有输入内容也显示） */}
      {!isFocused && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          <span className="text-fg/60 font-medium">搜索</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onKeyDown={(e) => {
          // 先处理键盘导航
          handleKeyDown(e)
          
          // 如果没有高亮项且按下 Enter，执行搜索
          if (e.key === 'Enter' && highlightIndex < 0) {
            executeSearch(q)
          }
        }}
        placeholder={isFocused ? "搜索点什么？" : ""}
        className={cn(
          'w-full bg-transparent border-none outline-none px-12 text-fg h-full text-base font-medium text-center',
          'placeholder:text-fg/40',
          // 非聚焦时隐藏输入内容和光标
          !isFocused && 'text-transparent caret-transparent'
        )}
      />

      {/* 搜索按钮 - 绝对定位不影响输入框布局 */}
      <button
        type="button"
        onClick={() => executeSearch(q)}
        className={cn(
          'absolute right-2 p-2 rounded-xl text-primary hover:bg-primary/10 active:bg-primary/20 transition-all duration-300',
          'opacity-0 scale-75 pointer-events-none',
          'group-focus-within:opacity-100 group-focus-within:scale-100 group-focus-within:pointer-events-auto'
        )}
        aria-label="搜索"
      >
        <ArrowRight className="h-5 w-5" />
      </button>

      {/* 搜索下拉框 - 使用 portal 渲染到 body 层级，确保 backdropFilter 能正确模糊背景 */}
      <SearchDropdown
        isVisible={showDropdown}
        anchorRef={containerRef}
        dropdownRef={dropdownRef}
        shortcuts={trimmedQuery ? shortcuts : []}
        suggestions={trimmedQuery ? suggestions : []}
        history={displayHistory}
        recentBookmarks={!trimmedQuery && recentBookmarksEnabled ? recentBookmarks : []}
        recentBookmarksMode={recentBookmarksMode}
        highlightIndex={highlightIndex}
        isLoading={suggestionsLoading}
        rowHeight={searchRowHeight}
        onSelectItem={handleItemSelect}
        onDeleteHistory={handleDeleteHistory}
      />
    </div>
  )
}
