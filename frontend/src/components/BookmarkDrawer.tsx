import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Folder, X, Settings } from 'lucide-react'
import { apiFetch } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useBookmarkDndStore } from '../stores/bookmarkDnd'
import { useBookmarkDrawerStore } from '../stores/bookmarkDrawer'
import { useAppearanceStore } from '../stores/appearance'
import { useBookmarkRefreshStore } from '../stores/bookmarkRefresh'
import { useBookmarkCacheStore } from '../stores/bookmarkCache'
import { useSettingsDialogStore } from '../stores/settingsDialog'
import { cn } from '../utils/cn'
import { normalizeUrl } from '../utils/url'
import { getIconUrl } from '../utils/iconSource'
import { Favicon } from './Favicon'
import { SearchBox } from './SearchBox'
import { SortModeSelector } from './SortModeSelector'
import { SortModeIconButton } from './SortModeIconButton'
import { useTitleFetch } from '../hooks/useTitleFetch'
import { useClickTracker, getSiteIdFromUrl } from '../hooks/useClickTracker'
import { useIsMobile } from '../hooks/useIsMobile'

// 从 bookmarks 模块导入共享组件和工具
import {
  type Bookmark,
  type BookmarkType,
  type MenuState,
  DrawerBookmarkItem,
  DrawerContextMenu,
  DrawerDeleteDialog,
  DrawerCreateDialog,
  DrawerEditDialog,
  DrawerIconDialog,
  DrawerSavePromptDialog,
  DrawerLoginPrompt,
  FolderModal,
  useLazyVisibility,
  useBookmarkOrder,
  useBookmarkDrag,
  useShortcutSet,
  useSwipeDown,
  getOrder,
  saveOrder,
  updateOrderAfterCreateFolder,
  getSortedFolderChildren,
  getNextFolderName,
} from './bookmarks'

// --- Types ---

// --- Props ---

type BookmarkDrawerProps = {
  open: boolean
  onClose: () => void
  swipeUpProgress?: number
  isSwipeAnimating?: boolean // 是否正在执行返回动画
}

export function BookmarkDrawer({ open, onClose, swipeUpProgress = 0, isSwipeAnimating = false }: BookmarkDrawerProps) {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const isMobile = useIsMobile()
  
  // 排序设置
  const sortMode = useAppearanceStore((s) => s.bookmarkDrawerSortMode)
  const setSortMode = useAppearanceStore((s) => s.setBookmarkDrawerSortMode)
  const sortLocked = useAppearanceStore((s) => s.bookmarkSortLocked)
  const bookmarkIconSize = useAppearanceStore((s) => s.bookmarkIconSize)
  const bookmarkIconGap = useAppearanceStore((s) => s.bookmarkIconGap)
  
  // 预览模式（从设置页打开，不影响 history）
  const isPreviewMode = useBookmarkDrawerStore((s) => s.isPreviewMode)

  // --- Shortcut Set ---
  const {
    addShortcut,
    removeShortcut,
    isShortcut,
    isFull,
  } = useShortcutSet(user?.id)

  // --- Click Tracker ---
  const { clickStats, trackClick, refreshStats: refreshClickStats } = useClickTracker()

  // --- 书签缓存 ---
  const cachedItems = useBookmarkCacheStore((s) => s.items)
  const cachedTags = useBookmarkCacheStore((s) => s.tags)
  const setCacheItems = useBookmarkCacheStore((s) => s.setItems)
  const setCacheTags = useBookmarkCacheStore((s) => s.setTags)
  const setCacheLoading = useBookmarkCacheStore((s) => s.setLoading)
  const updateCacheLoadTime = useBookmarkCacheStore((s) => s.updateLastLoadTime)
  const isCacheValid = useBookmarkCacheStore((s) => s.isCacheValid)
  const clearCache = useBookmarkCacheStore((s) => s.clearCache)

  // --- State ---
  // 使用缓存 store 的数据
  const allItems = cachedItems
  const setAllItems = setCacheItems
  const setLoading = setCacheLoading
  // 文件夹栈：支持多级文件夹逐级打开/关闭
  const [folderStack, setFolderStack] = useState<Array<{ id: string; originRect: DOMRect | null }>>([])
  const activeFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null
  const folderModalOpen = folderStack.length > 0
  // 打开动画使用栈顶位置，关闭动画也使用栈顶位置（收缩到当前文件夹图标）
  const folderOpenOriginRect = folderStack.length > 0 ? folderStack[folderStack.length - 1].originRect : null
  // 关闭时：如果栈中只有一个文件夹，收缩到一级图标；否则收缩到当前文件夹图标
  const folderCloseOriginRect = folderStack.length > 0 ? folderStack[folderStack.length - 1].originRect : null
  
  // 关闭动画层：用于在一级文件夹上面显示二级的关闭动画
  // 保存文件夹内容快照，避免 load() 后数据变化导致显示问题
  const [closingFolder, setClosingFolder] = useState<{
    id: string
    originRect: DOMRect | null
    folderItems?: Bookmark[]  // 文件夹内容快照（排除被拖拽的图标）
  } | null>(null)
  
  // 标记一级文件夹不需要打开动画（从二级返回时）
  const [skipOpenAnimation, setSkipOpenAnimation] = useState(false)
  
  // 文件夹栈操作函数
  const openFolder = useCallback((folderId: string, originRect: DOMRect | null) => {
    setFolderStack(prev => [...prev, { id: folderId, originRect }])
  }, [])
  
  const closeCurrentFolder = useCallback(() => {
    if (folderStack.length > 1) {
      // 关闭二级返回一级：设置关闭动画层，然后切换到一级
      const closingItem = folderStack[folderStack.length - 1]
      setClosingFolder(closingItem)
      setSkipOpenAnimation(true) // 一级文件夹不需要打开动画
      setFolderStack(prev => prev.slice(0, -1))
      // 动画完成后清理
      setTimeout(() => {
        setClosingFolder(null)
        setSkipOpenAnimation(false)
      }, 350)
    } else {
      // 关闭一级：正常关闭
      setFolderStack(prev => prev.slice(0, -1))
    }
  }, [folderStack])
  
  const closeAllFolders = useCallback(() => {
    setFolderStack([])
  }, [])
  
  // 兼容旧 API 的 setter（用于子组件）
  const setActiveFolderId = useCallback((id: string | null) => {
    if (id === null) {
      setFolderStack([])
    } else {
      setFolderStack([{ id, originRect: null }])
    }
  }, [])
  
  // Animation state - 用于控制进入/退出动画
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const wasSwipedOpen = useRef(false)
  const justClosed = useRef(false) // 标记是否刚刚关闭，防止闪屏
  const closedViaSwipe = useRef(false) // 标记是否通过下划关闭
  const lastDragEndTimeGlobal = useRef(0) // 记录拖拽结束时间，用于防止拖拽结束后立即触发关闭
  const lastVisibleTime = useRef(0) // 记录页面从后台恢复的时间，用于防止恢复时意外触发关闭

  // 下滑关闭手势
  const swipeDown = useSwipeDown({
    threshold: 120,
    onClose,
    lastDragEndTimeRef: lastDragEndTimeGlobal,
    closedViaSwipeRef: closedViaSwipe,
  })
  
  // 从 useSwipeDown hook 解构需要的值（提前解构以便在 useEffect 中使用）
  const {
    swipeDownProgress,
    isSwipeDownAnimating,
    setSwipeDownProgress,
    setIsSwipeDownAnimating,
    scrollContainerRef,
    contentRef,
    handleSwipeEnd,
  } = swipeDown
  
  // 订阅全局拖拽状态变化，在拖拽结束时记录时间（放在 handlePopState 之前）
  const globalIsDraggingEarly = useBookmarkDndStore((s) => s.isDragging)
  const wasDraggingRef = useRef(false) // 记录上一次的拖拽状态，用于检测从 true 变为 false
  useEffect(() => {
    // 只有从 true 变为 false 时才记录时间（真正的拖拽结束）
    if (wasDraggingRef.current && !globalIsDraggingEarly) {
      lastDragEndTimeGlobal.current = Date.now()
    }
    wasDraggingRef.current = globalIsDraggingEarly
  }, [globalIsDraggingEarly])
  
  // 记录是否通过上划打开（用于跳过开场动画）
  // 同时在新的上划开始时重置 justClosed 标记
  useEffect(() => {
    if (swipeUpProgress > 0 && !open) {
      justClosed.current = false // 新的上划开始，重置关闭标记
    }
    if (swipeUpProgress >= 0.9 && !open) {
      wasSwipedOpen.current = true
    }
  }, [swipeUpProgress, open])
  
  // 处理进入/退出动画
  useEffect(() => {
    if (open) {
      setShouldRender(true)
      closedViaSwipe.current = false
      justClosed.current = false // 打开时重置
      // 如果是通过上划打开的，立即显示，跳过动画（因为上划预览已经显示了）
      if (wasSwipedOpen.current) {
        setIsVisible(true)
        wasSwipedOpen.current = false
      } else {
        // 点击时钟或其他方式打开，延迟设置 isVisible 确保 DOM 已渲染
        const timer = setTimeout(() => {
          setIsVisible(true)
        }, 50)
        return () => clearTimeout(timer)
      }
    } else {
      setIsVisible(false)
      wasSwipedOpen.current = false
      justClosed.current = true // 标记刚刚关闭
      // 如果是通过下滑关闭的，立即卸载，跳过退出动画
      if (closedViaSwipe.current) {
        setShouldRender(false)
        setSwipeDownProgress(0) // 重置进度
        closedViaSwipe.current = false
        return
      }
      // 等待退出动画完成后再卸载组件
      const timer = setTimeout(() => {
        setShouldRender(false)
        justClosed.current = false
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [open, setSwipeDownProgress])

  // 安卓返回键/手势拦截：打开时 push history state，返回时关闭抽屉而不是退出页面
  // 预览模式下不操作 history，避免影响设置页面
  useEffect(() => {
    if (!open || isPreviewMode) return

    // 打开时推入一个 history 状态
    const state = { bookmarkDrawerOpen: true }
    window.history.pushState(state, '')

    const handlePopState = () => {
      // 如果正在拖拽书签或刚刚结束拖拽，忽略 popstate 事件
      if (useBookmarkDndStore.getState().isDragging || Date.now() - lastDragEndTimeGlobal.current < 300) {
        // 重新推入 history 状态，防止意外退出
        window.history.pushState({ bookmarkDrawerOpen: true }, '')
        return
      }
      // 如果页面刚从后台恢复（500ms 内），忽略 popstate 事件
      // 浏览器在后台挂起后恢复时可能会触发意外的 popstate 事件
      if (Date.now() - lastVisibleTime.current < 500) {
        // 重新推入 history 状态，防止意外退出
        window.history.pushState({ bookmarkDrawerOpen: true }, '')
        return
      }
      // 用户按了返回键，使用下滑动画关闭（不设置 closedViaSwipe，保留退出动画）
      setIsSwipeDownAnimating(true)
      setSwipeDownProgress(1)
      setTimeout(() => {
        setIsSwipeDownAnimating(false)
        onClose()
      }, 300)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      // 清理：如果抽屉仍然打开状态被卸载，需要回退 history
      if (window.history.state?.bookmarkDrawerOpen) {
        window.history.back()
      }
    }
  }, [open, onClose, setSwipeDownProgress, setIsSwipeDownAnimating, isPreviewMode])

  // 页面可见性变化处理：从后台恢复时同步状态
  // 浏览器在后台挂起较长时间后可能冻结页面，恢复时需要确保状态一致
  useEffect(() => {
    const syncState = () => {
      // 记录页面恢复时间，用于防止 popstate 事件意外触发关闭
      lastVisibleTime.current = Date.now()
      
      // 页面从后台恢复，检查并同步状态
      if (open) {
        // 书签页应该打开，确保渲染状态正确
        if (!shouldRender) {
          setShouldRender(true)
        }
        if (!isVisible) {
          setIsVisible(true)
        }
        // 确保 history 状态正确
        if (!window.history.state?.bookmarkDrawerOpen && !isPreviewMode) {
          window.history.pushState({ bookmarkDrawerOpen: true }, '')
        }
      }
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncState()
      }
    }
    
    // pageshow 事件处理 bfcache 恢复的情况
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // 页面从 bfcache 恢复
        syncState()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [open, shouldRender, isVisible, isPreviewMode])

  // UI States
  const [menu, setMenu] = useState<MenuState>({ open: false })
  const [menuClosing, setMenuClosing] = useState(false) // 控制关闭动画
  const menuOpenTime = useRef(0) // 记录菜单打开时间，用于防止触摸模拟的 click 立即关闭菜单

  // 关闭菜单时先播放动画再移除
  const closeMenu = useCallback(() => {
    setMenuClosing(true)
    setTimeout(() => {
      setMenu({ open: false })
      setMenuClosing(false)
    }, 120) // 动画时长
  }, [])

  // --- Drag state ---
  const itemElsRef = useRef(new Map<string, HTMLDivElement>())
  const setElRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) itemElsRef.current.set(id, el)
    else itemElsRef.current.delete(id)
  }, [])
  const getEl = useCallback((id: string) => itemElsRef.current.get(id), [])
  const dndPrePush = useBookmarkDndStore((s) => s.prePush)
  const dndPushAnim = useBookmarkDndStore((s) => s.pushAnimation)
  const dndDropAnim = useBookmarkDndStore((s) => s.dropAnimation)

  // Dialogs
  const [editOpen, setEditOpen] = useState(false)
  const [editClosing, setEditClosing] = useState(false)
  const [editItem, setEditItem] = useState<Bookmark | null>(null)
  const [editName, setEditName] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])


  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteClosing, setDeleteClosing] = useState(false)
  const [deleteItem, setDeleteItem] = useState<Bookmark | null>(null)
  const [deleteMode, setDeleteMode] = useState<'release' | 'delete'>('delete')

  const [createOpen, setCreateOpen] = useState(false)
  const [createClosing, setCreateClosing] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [createType, setCreateType] = useState<BookmarkType>('LINK')
  const [createName, setCreateName] = useState('')
  const [createUrl, setCreateUrl] = useState('')
  const [createNote, setCreateNote] = useState('')
  const [createTags, setCreateTags] = useState<string[]>([])
  const [createNameSource, setCreateNameSource] = useState<'user' | 'auto' | 'none'>('none')

  // 登录提示模态框
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)
  
  // 图标编辑对话框
  const [iconEditOpen, setIconEditOpen] = useState(false)
  const [iconEditItem, setIconEditItem] = useState<Bookmark | null>(null)

  // Escape 键关闭 - 优先关闭内部弹窗，再关闭抽屉
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 优先关闭内部弹窗
        if (editOpen) {
          setEditOpen(false)
        } else if (deleteOpen) {
          setDeleteOpen(false)
        } else if (createOpen) {
          setCreateOpen(false)
        } else if (loginPromptOpen) {
          setLoginPromptOpen(false)
        } else if (folderModalOpen) {
          // FolderModal 会自己处理 ESC 关闭（带动画）
          // 这里不需要处理，让事件继续传播到 FolderModal
          return
        } else {
          // 没有内部弹窗时才关闭抽屉
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, editOpen, deleteOpen, createOpen, loginPromptOpen, folderModalOpen])

  const [customIconOk, setCustomIconOk] = useState<Record<string, boolean>>({})
  
  // All tags for autocomplete
  const [allTags, setAllTags] = useState<string[]>([])
  
  // Selected tag for filtering
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // --- Title Fetch ---
  const titleFetch = useTitleFetch()
  
  // 当标题获取成功时，自动填充名称（仅当名称来源不是用户输入时）
  useEffect(() => {
    if (createNameSource === 'none' && !titleFetch.loading && (titleFetch.title || titleFetch.fallback)) {
      const newName = titleFetch.title || titleFetch.fallback || ''
      if (newName && !createName) {
        setCreateName(newName)
        setCreateNameSource('auto')
      }
    }
  }, [titleFetch.title, titleFetch.fallback, titleFetch.loading, createNameSource, createName])

  // 非自定义模式拖拽保存提示
  const [savePromptOpen, setSavePromptOpen] = useState(false)
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null)
  const [originalOrder, setOriginalOrder] = useState<string[] | null>(null)

  // --- Computed ---
  const availableFolders = useMemo(() => {
    return allItems.filter(x => x.type === 'FOLDER' && x.id !== activeFolderId)
  }, [allItems, activeFolderId])

  // 书签页始终显示根目录书签，文件夹内容通过 FolderModal 显示
  const currentItems = useMemo(() => {
    return allItems.filter((x) => x.parentId === null)
  }, [allItems])

  const idToItem = useMemo(() => {
    const m = new Map<string, Bookmark>()
    for (const it of currentItems) m.set(it.id, it)
    return m
  }, [currentItems])

  // 转换为 BookmarkItem 格式用于排序
  const bookmarkItems = useMemo(() => {
    return currentItems.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
    }))
  }, [currentItems])

  // 转换为 BookmarkItemWithUrl 格式用于点击排序
  const bookmarkItemsWithUrl = useMemo(() => {
    return currentItems.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      url: item.url,
    }))
  }, [currentItems])

  // 转换为 BookmarkItemWithTags 格式用于标签排序
  const bookmarkItemsWithTags = useMemo(() => {
    return currentItems.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      tags: item.tags,
    }))
  }, [currentItems])

  // 书签页始终显示根目录书签，folderId 固定为 null
  // activeFolderId 仅用于 FolderModal 显示，不影响主列表排序
  const order = useBookmarkOrder({
    userId: user?.id,
    folderId: null,
    itemIds: currentItems.map((x) => x.id),
    items: bookmarkItems,
    itemsWithUrl: bookmarkItemsWithUrl,
    itemsWithTags: bookmarkItemsWithTags,
    context: 'drawer',
    sortMode,
    clickCounts: clickStats.stats,
    urlToSiteId: getSiteIdFromUrl,
  })
  const visibleIds = order.visibleIds
  
  // 懒加载优化 - 只在书签数量超过阈值时启用
  const lazyLoad = useLazyVisibility(visibleIds.length)

  
  // 当文件夹或筛选变化时重置懒加载状态
  useEffect(() => {
    lazyLoad.resetVisibility()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolderId, selectedTag])

  // --- Actions ---
  const load = useCallback(async (forceRefresh = false) => {
    if (!token) return
    
    // 如果缓存有效且不是强制刷新且没有 tag 筛选，跳过加载
    if (!forceRefresh && !selectedTag && isCacheValid()) {
      return
    }
    
    setLoading(true)
    try {
      // Build URL with optional tag filter
      const url = selectedTag 
        ? `/api/bookmarks?tag=${encodeURIComponent(selectedTag)}`
        : '/api/bookmarks'
      const resp = await apiFetch<{ items: Bookmark[] }>(url, {
        method: 'GET',
        token,
      })
      if (!resp.ok) return
      setAllItems(resp.data.items)
      if (!selectedTag) {
        updateCacheLoadTime()
      }
    } finally {
      setLoading(false)
    }
  }, [token, selectedTag, isCacheValid, setAllItems, setLoading, updateCacheLoadTime])

  // Load all tags for autocomplete
  const loadTags = useCallback(async () => {
    if (!token) return
    // 如果缓存有 tags，跳过加载
    if (cachedTags.length > 0) return
    
    try {
      const resp = await apiFetch<{ tags: string[] }>('/api/bookmarks/tags', {
        method: 'GET',
        token,
      })
      if (resp.ok) {
        setAllTags(resp.data.tags)
        setCacheTags(resp.data.tags)
      }
    } catch {
      // Ignore errors - tags are optional for autocomplete
    }
  }, [token, cachedTags.length, setCacheTags])

  // 预加载：当上划进度超过30%时开始加载数据
  const shouldPreload = swipeUpProgress > 0.3
  const hasPreloaded = useRef(false)
  
  // 当用户退出登录时清空书签数据
  useEffect(() => {
    if (!token) {
      clearCache()
      setAllTags([])
      closeAllFolders()
      setSelectedTag(null)
      hasPreloaded.current = false
    }
  }, [token, closeAllFolders, clearCache])
  
  useEffect(() => {
    if (open || (shouldPreload && !hasPreloaded.current)) {
      hasPreloaded.current = true
      void load()
      void loadTags()
      void refreshClickStats()
    }
    if (!open && !shouldPreload) {
      hasPreloaded.current = false
    }
  }, [load, loadTags, open, refreshClickStats, shouldPreload])

  // 监听全局书签刷新事件（当 Dock 更新书签时触发）
  const refreshCount = useBookmarkRefreshStore((s) => s.refreshCount)
  useEffect(() => {
    if (refreshCount > 0 && token) {
      void load()
    }
  }, [refreshCount, token, load])

  useEffect(() => {
    const close = () => {
      // 如果菜单刚刚打开（< 400ms），忽略这次点击（防止触摸模拟的 click 立即关闭菜单）
      if (Date.now() - menuOpenTime.current < 400) return
      setMenu({ open: false })
    }
    const handleScroll = (e: Event) => {
      // 如果滚动发生在菜单内部，不关闭
      const target = e.target as HTMLElement
      if (target.closest('[data-menu-content]')) return
      close()
    }
    if (menu.open) {
      window.addEventListener('click', close)
      window.addEventListener('scroll', handleScroll, true)
      return () => {
        window.removeEventListener('click', close)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
    return
  }, [menu.open])

  // --- API Actions ---
  const moveToFolder = async (item: Bookmark, targetFolderId: string, triggerAnimation = false) => {
    if (!token || !user) return
    const resp = await apiFetch(`/api/bookmarks/${item.id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ parentId: targetFolderId })
    })
    if (resp.ok) {
      // 更新目标文件夹内部顺序：新项目添加到末尾
      const folderOrder = getOrder(user.id, targetFolderId, 'drawer')
      const newOrder = [...folderOrder.filter(id => id !== item.id), item.id]
      saveOrder(user.id, targetFolderId, newOrder, 'drawer')
      toast.success('已移入收藏夹')
      await load(true) // 强制刷新，绕过缓存
      // 触发补位动画（拖拽放入文件夹时需要）
      if (triggerAnimation) {
        drag.triggerFillAnimation()
      }
    }
  }

  const createFolderWithItems = async (baseItem: Bookmark, incomingItem: Bookmark, originalOrder: string[]) => {
    if (!token || !user) return
    
    // 获取所有文件夹名称，计算下一个可用的名称
    const folderNames = allItems.filter(x => x.type === 'FOLDER').map(x => x.name)
    const folderName = getNextFolderName('收藏夹', folderNames)
    
    // 1. 创建文件夹
    const folderResp = await apiFetch<{ item: Bookmark }>('/api/bookmarks', {
      method: 'POST',
      token,
      body: JSON.stringify({
        name: folderName,
        type: 'FOLDER',
        parentId: activeFolderId
      })
    })
    if (!folderResp.ok) return toast.error(folderResp.message)
    const folder = folderResp.data.item

    // 2. 移动书签到文件夹
    await Promise.all([
      apiFetch(`/api/bookmarks/${baseItem.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ parentId: folder.id })
      }),
      apiFetch(`/api/bookmarks/${incomingItem.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ parentId: folder.id })
      }),
    ])
    
    // 3. 使用统一的工具函数更新排序（会保存到 localStorage）
    updateOrderAfterCreateFolder({
      userId: user.id,
      context: 'drawer',
      parentId: activeFolderId,
      baseItemId: baseItem.id,
      incomingItemId: incomingItem.id,
      folderId: folder.id,
      currentVisibleIds: originalOrder,
    })
    
    toast.success('已创建收藏夹')
    
    // 4. load() 会触发 useBookmarkOrder 从 localStorage 读取正确的顺序
    // 注意：savePositions() 已在 onDragEnd 中动画开始前调用
    await load(true) // 强制刷新，绕过缓存
    
    // 5. load() 完成后，手动触发补位动画
    drag.triggerFillAnimation()
  }
  
  const handleCreate = async () => {
    if (!token) return
    const name = createName.trim()
    const url = normalizeUrl(createUrl)
    // 文件夹必须有名称，书签名称可选（后端会用域名作为默认值）
    if (createType === 'FOLDER' && !name) return toast.warning('文件夹名称不能为空')
    if (createType === 'LINK' && !url) return toast.warning('网址不能为空')

    const resp = await apiFetch<{ item: Bookmark }>('/api/bookmarks', {
      method: 'POST',
      token,
      body: JSON.stringify({
        name: name || undefined,  // 允许空名称
        url: createType === 'LINK' ? url : undefined,
        note: createNote.trim() || undefined,
        type: createType,
        parentId: createParentId,
        tags: createTags.length > 0 ? createTags : undefined,
      }),
    })
    
    if (!resp.ok) return toast.error(resp.message)
    toast.success('已创建')
    setCreateOpen(false)
    resetCreateForm()
    
    const pid = createParentId ?? activeFolderId
    const currentOrder = getOrder(user!.id, pid, 'drawer')
    const base = currentOrder.length ? currentOrder : visibleIds
    const newOrder = [...base.filter((x) => x !== resp.data.item.id), resp.data.item.id]
    saveOrder(user!.id, pid, newOrder, 'drawer')
    order.setOrder(newOrder)
    
    // Refresh tags for autocomplete
    await Promise.all([load(), loadTags()])
  }
  
  const resetCreateForm = () => {
    setCreateName('')
    setCreateUrl('')
    setCreateNote('')
    setCreateTags([])
    setCreateType('LINK')
    setCreateNameSource('none')
    titleFetch.reset()
  }

  const drag = useBookmarkDrag({
    visibleIds,
    setVisibleIds: order.setOrder,
    getItemById: (id: string) => {
      const it = idToItem.get(id)
      return it ? { id: it.id, type: it.type } : null
    },
    getEl,
    onMergeIntoFolder: async (dragId: string, folderId: string) => {
      // 锁定时禁止合并到文件夹
      if (sortLocked) {
        toast.warning('排序已锁定，无法移动')
        return
      }
      const dragItem = idToItem.get(dragId)
      if (!dragItem) return
      // 拖拽放入文件夹时触发补位动画
      await moveToFolder(dragItem, folderId, true)
    },
    onCreateFolderWith: async (baseId: string, incomingId: string, originalOrder: string[]) => {
      // 锁定时禁止创建文件夹
      if (sortLocked) {
        toast.warning('排序已锁定，无法创建文件夹')
        return
      }
      const baseItem = idToItem.get(baseId)
      const incoming = idToItem.get(incomingId)
      if (!baseItem || !incoming) return
      await createFolderWithItems(baseItem, incoming, originalOrder)
    },
    onPersistReorder: (ids: string[]) => {
      // 锁定时不持久化
      if (sortLocked) return
      
      // 非自定义模式：显示保存提示
      if (sortMode !== 'custom') {
        // 保存当前顺序和原始顺序，等待用户确认
        setPendingOrder(ids)
        setOriginalOrder(visibleIds)
        setSavePromptOpen(true)
        return
      }
      
      // 自定义模式：直接持久化
      order.persist(ids)
      order.setOrder(ids)
    },
    options: {
      prePush: dndPrePush,
      pushAnimation: dndPushAnim,
      dropAnimation: dndDropAnim,
    },
    // 锁定时禁用拖拽
    disabled: sortLocked,
  })
  
  // 保存 drag 对象的 ref，用于 FolderModal 的 onDragOutside 回调
  const dragRef = useRef<typeof drag | null>(null)
  useEffect(() => {
    dragRef.current = drag
  })
  
  // 需要在渲染时隐藏的元素 ID（用于拖拽交接时避免瞬移）- 暂时保留，未来可能需要
  const [pendingHideId] = useState<string | null>(null)


  // --- Render Helpers ---
  const renderItem = (b: Bookmark) => {
    // 如果是待隐藏的元素（拖拽交接中），渲染时直接隐藏
    const shouldHide = pendingHideId === b.id
    const item = (
      <DrawerBookmarkItem
        key={b.id}
        item={b}
        allItems={allItems}
        userId={user?.id}
        drag={{
          activeId: drag.activeId,
          combineCandidateId: drag.combineCandidateId,
          combineTargetId: drag.combineTargetId,
          onPointerDown: drag.onPointerDown,
          onDragCancel: drag.onDragCancel,
        }}
        customIconOk={customIconOk}
        setCustomIconOk={setCustomIconOk}
        setElRef={setElRef}
        onFolderClick={(folderId, rect) => {
          openFolder(folderId, rect || null)
        }}
        onBookmarkClick={(item) => {
          if (item.url) {
            trackClick(item.id)
            window.open(item.url, '_blank', 'noopener,noreferrer')
          }
        }}
        onContextMenu={(item, x, y) => {
          setMenu({ open: true, x, y, item })
        }}
        onLongPress={() => {
          menuOpenTime.current = Date.now()
        }}
        onTagClick={setSelectedTag}
      />
    )
    // 用包装 div 隐藏元素，避免瞬移
    if (shouldHide) {
      return (
        <div key={b.id} style={{ opacity: 0, visibility: 'hidden', pointerEvents: 'none' }}>
          {item}
        </div>
      )
    }
    return item
  }

  // 如果是下滑关闭且 open 已经为 false，直接返回 null
  // closedViaSwipe 在 effect 中会被重置
  if (!open && closedViaSwipe.current) {
    return null
  }

  // 上划预览效果：显示书签页淡入
  // 关键：swipeUpProgress 在上划触发后不会立即重置，所以预览会保持到真实页面可见
  // 当 open 且 isVisible 时隐藏预览，实现无缝过渡
  // 如果刚刚关闭，不显示预览，防止闪屏
  const showSwipePreview = swipeUpProgress > 0 && !(open && isVisible) && !justClosed.current

  if (!shouldRender && !showSwipePreview && !isSwipeAnimating) return null

  // 上划预览模式 - 书签页从底部滑出 + 淡入，背景模糊
  // 显示真实内容，让用户可以一直上划直接进入
  if (showSwipePreview || isSwipeAnimating) {
    // 书签页从底部滑出：translateY 从 70% 到 0（从屏幕底部滑入）
    const slideUp = 70 * (1 - swipeUpProgress)
    // 背景模糊程度随进度增加（0 到 24px）
    const blurAmount = swipeUpProgress * 24
    // 背景透明度随进度增加（0 到 0.3）
    const bgOpacity = swipeUpProgress * 0.3
    // 是否需要过渡动画（返回时）
    const needTransition = isSwipeAnimating
    
    // 获取要显示的书签（最多显示12个预览）
    const previewItems = visibleIds.slice(0, 12).map(id => idToItem.get(id)).filter(Boolean) as Bookmark[]
    const hasData = previewItems.length > 0
    
    return createPortal(
      <div className="fixed inset-0 z-[100] flex flex-col pointer-events-none overflow-hidden">
        {/* 背景遮罩 - 透明度和模糊度随上划进度渐变，返回时带过渡动画 */}
        <div 
          className="absolute inset-0"
          style={{ 
            backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`,
            backdropFilter: `blur(${blurAmount}px)`,
            WebkitBackdropFilter: `blur(${blurAmount}px)`,
            transition: needTransition ? 'all 300ms ease-out' : 'none',
          }}
        />
        
        {/* 书签页内容 - 从底部滑出 + 淡入，返回时带过渡动画 */}
        <div 
          className="relative flex flex-col h-full w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6"
          style={{ 
            transform: `translateY(${slideUp}%)`,
            opacity: swipeUpProgress,
            transition: needTransition ? 'all 300ms ease-out' : 'none',
          }}
        >
          {/* 顶部 - 搜索栏居中 */}
          <div className="flex justify-center mb-6">
            <SearchBox disableGlobalFocus />
          </div>
          
          {/* 真实书签网格预览 - 只有有书签时才显示 */}
          {hasData && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 min-h-full">
                {/* 使用 CSS Grid 布局，每行从左开始但整体居中 */}
                <div 
                  className="grid justify-center"
                  style={{ 
                    gridTemplateColumns: `repeat(auto-fill, ${Math.max(bookmarkIconSize, 64)}px)`,
                    gap: bookmarkIconGap,
                    alignItems: 'start'
                  }}
                >
                  {previewItems.map((b) => {
                    const isFolder = b.type === 'FOLDER'
                    
                    // 图标逻辑：优先自定义图标
                    let customIcon = ''
                    if (b.iconType === 'URL' && b.iconUrl) {
                      customIcon = b.iconUrl
                    } else if (b.iconType === 'BASE64' && b.iconData) {
                      customIcon = b.iconData
                    }
                    const hasCustomIcon = Boolean(customIcon)
                    
                    return (
                      <div key={b.id} className="select-none relative group w-16">
                        <div className="grid place-items-center">
                          <div className={cn(
                            'relative w-12 h-12 rounded-[var(--start-radius)] flex items-center justify-center overflow-hidden',
                            isFolder
                              ? 'bg-glass/20 border border-glass-border/20'
                              : hasCustomIcon
                                ? 'bg-white/70'
                                : 'bg-primary/15 text-primary font-semibold'
                          )}>
                            {isFolder ? (
                              <Folder className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            ) : hasCustomIcon ? (
                              <img src={customIcon} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                            ) : (
                              <Favicon url={b.url || ''} name={b.name} className="h-full w-full object-cover" letterClassName="h-full w-full" />
                            )}
                          </div>
                          <div className="mt-1.5 text-[11px] text-fg/80 truncate w-16 text-center">{b.name}</div>
                          {/* 标签占位 - 与真实页面保持相同高度 */}
                          <div className="w-16 min-h-[14px] mt-0.5" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col">
      {/* 背景遮罩 - 带动画，下滑时逐渐透明和减少模糊 */}
      {/* 移除 onClick，改为只能通过下滑或返回键关闭 */}
      <div 
        className={cn(
          "absolute inset-0 pointer-events-none transition-all duration-300 ease-out",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          backgroundColor: `rgba(0, 0, 0, ${0.3 * (1 - swipeDownProgress)})`,
          backdropFilter: `blur(${24 * (1 - swipeDownProgress)}px)`,
          WebkitBackdropFilter: `blur(${24 * (1 - swipeDownProgress)}px)`,
          // 下滑时禁用过渡，让手势跟手
          transition: swipeDownProgress > 0 && !isSwipeDownAnimating ? 'none' : undefined,
        }}
      />
      
      {/* 内容区域 - 带动画，下滑时向下移动并淡出 */}
      <div 
        className={cn(
          "relative flex flex-col h-full w-full px-2 sm:px-4 py-4 sm:py-6",
          "transition-all duration-300 ease-out",
          // touch-action: none 阻止浏览器默认的下拉刷新
          "touch-none",
          isVisible 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-4"
        )}
        style={{ 
          transform: swipeDownProgress > 0 ? `translateY(${swipeDownProgress * 15}%)` : undefined,
          opacity: swipeDownProgress > 0 ? 1 - swipeDownProgress : undefined,
          // 下滑时禁用过渡，让手势跟手
          transition: swipeDownProgress > 0 && !isSwipeDownAnimating ? 'none' : undefined,
        }}
        ref={contentRef}
        onTouchEnd={handleSwipeEnd}
        onTouchCancel={handleSwipeEnd}
      >
        {/* 顶部栏 - 固定不滚动，占满宽度，z-index 高于书签图标 */}
        <div className="flex-shrink-0 pb-4 bg-transparent w-full relative z-50">
          {isMobile ? (
            /* 移动端布局：标题在左上角，排序图标和设置在右上角，搜索框在下方 */
            <div className="space-y-3">
              {/* 第一行：标题 + 右侧控件 */}
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-fg/90">书签</h1>
                <div className="flex items-center gap-1">
                  <SortModeIconButton
                    value={sortMode}
                    onChange={setSortMode}
                    locked={sortLocked}
                  />
                  <button
                    onClick={() => {
                      onClose()
                      // 延迟打开设置，等待书签页关闭动画完成
                      setTimeout(() => {
                        useSettingsDialogStore.getState().setOpen(true)
                      }, 350)
                    }}
                    className="p-2 rounded-lg bg-glass/20 hover:bg-glass/40 transition-colors"
                    title="设置"
                  >
                    <Settings className="w-5 h-5 text-fg/70" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg bg-glass/20 hover:bg-glass/40 transition-colors"
                    title="关闭"
                  >
                    <X className="w-5 h-5 text-fg/70" />
                  </button>
                </div>
              </div>
              {/* 第二行：搜索框（带侧边距） */}
              <div className="px-2">
                <SearchBox disableGlobalFocus fullWidth />
              </div>
            </div>
          ) : (
            /* 桌面端布局：搜索框居中，右侧控件固定在最右侧 */
            <div className="relative h-12 w-full">
              {/* 搜索框 - 绝对定位居中 */}
              <div className="absolute left-1/2 top-0 -translate-x-1/2 z-50">
                <SearchBox disableGlobalFocus />
              </div>
              
              {/* 右侧控件：排序选择器 + 关闭按钮 - 绝对定位在最右侧 */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <SortModeSelector
                  value={sortMode}
                  onChange={setSortMode}
                  locked={sortLocked}
                />
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-glass/20 hover:bg-glass/40 transition-colors"
                  title="关闭书签页 (Esc)"
                >
                  <X className="w-5 h-5 text-fg/70" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 书签网格 - 可滚动，无边框，支持懒加载，z-index 低于顶部栏 */}
        {/* overscroll-contain 阻止浏览器下拉刷新，同时保留滚动功能 */}
        <div 
          className="flex-1 overflow-y-auto overscroll-contain" 
          ref={(el) => {
            lazyLoad.setScrollContainer(el)
            scrollContainerRef.current = el
          }}
        >
          <div className="p-4 min-h-full max-w-4xl mx-auto">
            <div 
              className="grid justify-center"
              style={{ 
                gridTemplateColumns: `repeat(auto-fill, ${Math.max(bookmarkIconSize, 64)}px)`,
                gap: bookmarkIconGap,
                alignItems: 'start'
              }}
            >
              {visibleIds.map((id) => {
                const it = idToItem.get(id)
                if (!it) return null
                
                // 懒加载：未进入视窗的显示骨架屏
                if (lazyLoad.enabled && !lazyLoad.isVisible(id)) {
                  return (
                    <div
                      key={id}
                      ref={(el) => lazyLoad.registerRef(id, el)}
                      data-lazy-id={id}
                      className="w-16"
                    >
                      <div className="grid place-items-center">
                        <div 
                          className="rounded-[var(--start-radius)] bg-glass/20 animate-pulse" 
                          style={{ width: bookmarkIconSize, height: bookmarkIconSize }}
                        />
                        <div className="mt-1.5 h-3 w-10 rounded bg-glass/15 animate-pulse" />
                        <div style={{ width: Math.max(bookmarkIconSize, 64) }} className="min-h-[14px] mt-0.5" />
                      </div>
                    </div>
                  )
                }
                
                // 已加载项：包裹 ref 用于懒加载追踪
                return (
                  <div
                    key={id}
                    ref={lazyLoad.enabled ? (el) => lazyLoad.registerRef(id, el) : undefined}
                    data-lazy-id={id}
                  >
                    {renderItem(it)}
                  </div>
                )
              })}

              {/* 添加按钮 */}
              <button
                type="button"
                className={cn('select-none cursor-pointer outline-none focus:outline-none focus:ring-0 w-16')}
                onClick={() => {
                  if (!user) {
                    setLoginPromptOpen(true)
                    return
                  }
                  setCreateParentId(activeFolderId)
                  setCreateType('LINK')
                  setCreateOpen(true)
                }}
              >
                <div className="grid place-items-center">
                  <div 
                    className="rounded-[var(--start-radius)] grid place-items-center bg-white/60 text-fg/80 hover:bg-white/80 transition-all duration-200"
                    style={{ width: bookmarkIconSize, height: bookmarkIconSize }}
                  >
                    <span className="text-2xl leading-none">+</span>
                  </div>
                  <div 
                    className="mt-1.5 text-[11px] text-fg/70 truncate text-center"
                    style={{ width: Math.max(bookmarkIconSize, 64) }}
                  >
                    添加
                  </div>
                  {/* Placeholder for tags area to match bookmark height */}
                  <div style={{ width: Math.max(bookmarkIconSize, 64) }} className="min-h-[14px] mt-0.5" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 拖拽覆盖层 */}
      {drag.activeId && createPortal(
        <div ref={drag.overlayRef} style={drag.overlayStyle}>
          {(() => {
            const it = allItems.find((x) => x.id === drag.activeId)
            if (!it) return null
            const isFolder = it.type === 'FOLDER'
            const folderItems = isFolder
              ? getSortedFolderChildren(allItems.filter((x) => x.parentId === it.id), user?.id, it.id, 'drawer').slice(0, 9)
              : []
            return (
              <div className="bm-inner">
                <div className="grid place-items-center select-none">
                  <div
                    ref={drag.overlayBoxRef}
                    className={cn(
                      'bookmark-icon rounded-[var(--start-radius)] overflow-hidden grid place-items-center shadow-2xl select-none',
                      isFolder
                        ? 'bg-glass/20 border border-glass-border/20 p-1'
                        : 'bg-primary/15 text-primary font-semibold',
                    )}
                    style={{ width: bookmarkIconSize, height: bookmarkIconSize }}
                  >
                  {isFolder ? (
                    <div className="grid grid-cols-3 gap-0.5 w-full h-full content-start">
                      {folderItems.map((sub) => {
                        const isSubFolder = sub.type === 'FOLDER'
                        
                        // 如果是子文件夹，显示其内容预览
                        if (isSubFolder) {
                          const subFolderItems = allItems.filter(x => x.parentId === sub.id).slice(0, 4)
                          if (subFolderItems.length === 0) {
                            // 空文件夹显示文件夹图标
                            return (
                              <div
                                key={sub.id}
                                className="w-full pt-[100%] relative bg-amber-100/50 rounded-[2px] overflow-hidden"
                              >
                                <Folder className="absolute inset-0 w-full h-full p-0.5 text-amber-500" />
                              </div>
                            )
                          }
                          // 显示子文件夹内的前 4 个项目的缩略图（2x2 布局）
                          return (
                            <div
                              key={sub.id}
                              className="w-full pt-[100%] relative bg-amber-100/30 rounded-[2px] overflow-hidden"
                            >
                              <div className="absolute inset-0 grid grid-cols-2 gap-px p-px">
                                {[0, 1, 2, 3].map((idx) => {
                                  const child = subFolderItems[idx]
                                  if (!child) {
                                    return <div key={`empty-${idx}`} className="bg-black/5 rounded-[1px] aspect-square" />
                                  }
                                  const isChildFolder = child.type === 'FOLDER'
                                  if (isChildFolder) {
                                    // 获取嵌套文件夹内的子项
                                    const nestedItems = allItems.filter(x => x.parentId === child.id).slice(0, 4)
                                    if (nestedItems.length === 0) {
                                      return (
                                        <div key={child.id} className="w-full h-full bg-amber-100/50 rounded-[1px] flex items-center justify-center aspect-square">
                                          <Folder className="w-full h-full p-[1px] text-amber-500" />
                                        </div>
                                      )
                                    }
                                    // 显示嵌套文件夹内的前 4 个图标（2x2 网格）
                                    return (
                                      <div key={child.id} className="w-full h-full bg-amber-100/30 rounded-[1px] grid grid-cols-2 gap-[0.5px] p-[0.5px] aspect-square">
                                        {[0, 1, 2, 3].map((nestedIdx) => {
                                          const nestedChild = nestedItems[nestedIdx]
                                          if (!nestedChild) {
                                            return <div key={`nested-empty-${nestedIdx}`} className="bg-black/5 rounded-[0.5px] aspect-square" />
                                          }
                                          if (nestedChild.type === 'FOLDER') {
                                            return (
                                              <div key={nestedChild.id} className="bg-amber-100/50 rounded-[0.5px] flex items-center justify-center aspect-square">
                                                <Folder className="w-full h-full p-px text-amber-500" />
                                              </div>
                                            )
                                          }
                                          let nestedIcon = ''
                                          if (nestedChild.iconType === 'BASE64' && nestedChild.iconData) {
                                            nestedIcon = nestedChild.iconData
                                          } else if (nestedChild.iconUrl) {
                                            nestedIcon = getIconUrl(nestedChild.url, nestedChild.iconUrl)
                                          }
                                          if (nestedIcon) {
                                            return (
                                              <img
                                                key={nestedChild.id}
                                                src={nestedIcon}
                                                className="w-full h-full object-cover rounded-[0.5px] aspect-square"
                                                alt=""
                                                loading="lazy"
                                                decoding="async"
                                              />
                                            )
                                          }
                                          return (
                                            <Favicon
                                              key={nestedChild.id}
                                              url={nestedChild.url || ''}
                                              size={6}
                                              className="w-full h-full object-cover rounded-[0.5px] aspect-square"
                                            />
                                          )
                                        })}
                                      </div>
                                    )
                                  }
                                  let childIcon = ''
                                  if (child.iconType === 'BASE64' && child.iconData) {
                                    childIcon = child.iconData
                                  } else if (child.iconUrl) {
                                    childIcon = getIconUrl(child.url, child.iconUrl)
                                  }
                                  if (childIcon) {
                                    return (
                                      <img
                                        key={child.id}
                                        src={childIcon}
                                        className="w-full h-full object-cover rounded-[1px]"
                                        alt=""
                                        loading="lazy"
                                        decoding="async"
                                      />
                                    )
                                  }
                                  return (
                                    <Favicon
                                      key={child.id}
                                      url={child.url || ''}
                                      size={8}
                                      className="w-full h-full object-cover rounded-[1px]"
                                    />
                                  )
                                })}
                              </div>
                            </div>
                          )
                        }
                        
                        // 普通书签图标
                        let subIcon = ''
                        if (sub.iconType === 'BASE64' && sub.iconData) {
                          subIcon = sub.iconData
                        } else if (sub.iconUrl) {
                          subIcon = getIconUrl(sub.url, sub.iconUrl)
                        }
                        return (
                          <div
                            key={sub.id}
                            className="w-full pt-[100%] relative bg-black/10 rounded-[2px] overflow-hidden"
                          >
                            {subIcon ? (
                              <img
                                src={subIcon}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : sub.url ? (
                              <Favicon
                                url={sub.url}
                                name={sub.name}
                                size={16}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    (() => {
                      // 检查自定义图标
                      let customIcon = ''
                      if (it.iconType === 'BASE64' && it.iconData) {
                        customIcon = it.iconData
                      } else if (it.iconUrl) {
                        customIcon = getIconUrl(it.url, it.iconUrl)
                      }
                      return customIcon ? (
                        <img
                          src={customIcon}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Favicon
                          url={it.url || ''}
                          name={it.name}
                          className="h-full w-full object-cover"
                          letterClassName="h-full w-full"
                        />
                      )
                    })()
                  )}
                  </div>
                  <div className="mt-1.5 text-[11px] text-fg/80 truncate w-16 text-center">
                    {it.name}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>,
        document.body
      )}


      {/* 右键菜单 */}
      <DrawerContextMenu
        menu={menu}
        menuClosing={menuClosing}
        menuOpenTime={menuOpenTime}
        availableFolders={availableFolders}
        isShortcut={isShortcut}
        isShortcutFull={isFull}
        activeFolderId={activeFolderId}
        onClose={closeMenu}
        onOpenFolder={(folderId) => {
          openFolder(folderId, null)
        }}
        onAddToFolder={(folderId) => { setCreateParentId(folderId); setCreateType('LINK'); setCreateOpen(true); }}
        onEdit={(item) => { 
          setEditItem(item); 
          setEditName(item.name); 
          if (item.type === 'LINK') {
            setEditUrl(item.url!); 
            setEditNote(item.note || ''); 
            setEditTags(item.tags || []);
          }
          setEditOpen(true); 
        }}
        onEditIcon={(item) => {
          setIconEditItem(item)
          setIconEditOpen(true)
        }}
        onDelete={(item, mode) => { setDeleteItem(item); setDeleteMode(mode); setDeleteOpen(true); }}
        onAddShortcut={addShortcut}
        onRemoveShortcut={removeShortcut}
        onMoveToFolder={moveToFolder}
        onRemoveFromFolder={async (item) => {
          if (!token || !user || !activeFolderId) return
          // 获取当前文件夹的父级 ID
          const currentFolder = allItems.find(x => x.id === activeFolderId)
          const targetParentId = currentFolder?.parentId || null
          
          // 移动书签到上一级
          const resp = await apiFetch(`/api/bookmarks/${item.id}`, {
            method: 'PATCH',
            token,
            body: JSON.stringify({ parentId: targetParentId })
          })
          if (!resp.ok) {
            toast.error('移动失败')
            return
          }
          
          // 更新排序：从当前文件夹移除
          const currentOrder = getOrder(user.id, activeFolderId, 'drawer')
          const newOrder = currentOrder.filter(id => id !== item.id)
          saveOrder(user.id, activeFolderId, newOrder, 'drawer')
          
          // 添加到上一级：插入到当前文件夹的下一个位置
          const parentOrder = getOrder(user.id, targetParentId, 'drawer')
          const folderIndex = parentOrder.indexOf(activeFolderId)
          if (!parentOrder.includes(item.id)) {
            if (folderIndex !== -1) {
              // 插入到文件夹的下一个位置
              const newParentOrder = [...parentOrder]
              newParentOrder.splice(folderIndex + 1, 0, item.id)
              saveOrder(user.id, targetParentId, newParentOrder, 'drawer')
            } else {
              // 如果找不到文件夹位置，添加到末尾
              saveOrder(user.id, targetParentId, [...parentOrder, item.id], 'drawer')
            }
          }
          
          // 检查文件夹是否变为空，如果是则自动删除文件夹
          const remainingItems = allItems.filter(x => x.parentId === activeFolderId && x.id !== item.id)
          if (remainingItems.length === 0) {
            // 删除空文件夹
            const deleteResp = await apiFetch(`/api/bookmarks/${activeFolderId}`, {
              method: 'DELETE',
              token,
            })
            if (deleteResp.ok) {
              // 从上一级排序中移除文件夹
              const updatedParentOrder = getOrder(user.id, targetParentId, 'drawer').filter(id => id !== activeFolderId)
              saveOrder(user.id, targetParentId, updatedParentOrder, 'drawer')
              // 关闭文件夹模态框
              setActiveFolderId(null)
              toast.success('文件夹已清空并删除')
            } else {
              toast.success(targetParentId ? '已移至上级文件夹' : '已移至书签页')
            }
          } else {
            toast.success(targetParentId ? '已移至上级文件夹' : '已移至书签页')
          }
          
          await load()
        }}
      />

      {/* 删除确认对话框 */}
      <DrawerDeleteDialog
        open={deleteOpen}
        isClosing={deleteClosing}
        item={deleteItem}
        mode={deleteMode}
        token={token}
        userId={user?.id}
        activeFolderId={activeFolderId}
        allItems={allItems}
        visibleIds={(() => {
          // 根据被删除项的 parentId 获取正确的顺序
          // 如果被删除项在文件夹内，使用该文件夹内的顺序
          if (deleteItem && deleteItem.parentId && user?.id) {
            const parentOrder = getOrder(user.id, deleteItem.parentId, 'drawer')
            if (parentOrder.length > 0) {
              return parentOrder
            }
            // 如果没有保存的顺序，使用 allItems 中该文件夹内的子项顺序
            return allItems.filter(x => x.parentId === deleteItem.parentId).map(x => x.id)
          }
          return visibleIds
        })()}
        onClose={() => { setDeleteClosing(true); setTimeout(() => { setDeleteOpen(false); setDeleteClosing(false); }, 150); }}
        onDeleted={() => {}}
        setActiveFolderId={setActiveFolderId}
        setOrder={order.setOrder}
        removeShortcut={removeShortcut}
        load={load}
      />

      {/* 创建对话框 */}
      <DrawerCreateDialog
        open={createOpen}
        isClosing={createClosing}
        parentId={createParentId}
        createType={createType}
        setCreateType={(type) => {
          setCreateType(type)
          // 切换到文件夹类型时，如果名称为空或是自动生成的，预填充下一个可用的文件夹名称
          if (type === 'FOLDER' && (createName === '' || createNameSource !== 'user')) {
            const folderNames = allItems.filter(x => x.type === 'FOLDER').map(x => x.name)
            const suggestedName = getNextFolderName('新建文件夹', folderNames)
            setCreateName(suggestedName)
            setCreateNameSource('auto')
          }
        }}
        createUrl={createUrl}
        setCreateUrl={setCreateUrl}
        createName={createName}
        setCreateName={setCreateName}
        createNameSource={createNameSource}
        setCreateNameSource={setCreateNameSource}
        createNote={createNote}
        setCreateNote={setCreateNote}
        createTags={createTags}
        setCreateTags={setCreateTags}
        titleFetch={titleFetch}
        allTags={allTags}
        onCloseWithReset={() => { setCreateClosing(true); setTimeout(() => { setCreateOpen(false); setCreateClosing(false); resetCreateForm(); }, 150); }}
        onCreate={handleCreate}
      />

      {/* 保存排序提示对话框 */}
      <DrawerSavePromptDialog
        open={savePromptOpen}
        pendingOrder={pendingOrder}
        onClose={() => {
          setSavePromptOpen(false)
          setPendingOrder(null)
          setOriginalOrder(null)
        }}
        onRestore={() => {
          if (originalOrder) {
            order.setOrder(originalOrder)
          }
        }}
        onSave={() => {
          if (pendingOrder) {
            order.persist(pendingOrder)
            order.setOrder(pendingOrder)
            setSortMode('custom')
          }
        }}
      />

      {/* 编辑对话框 */}
      <DrawerEditDialog
        open={editOpen}
        isClosing={editClosing}
        item={editItem}
        token={token}
        editName={editName}
        setEditName={setEditName}
        editUrl={editUrl}
        setEditUrl={setEditUrl}
        editNote={editNote}
        setEditNote={setEditNote}
        editTags={editTags}
        setEditTags={setEditTags}
        allTags={allTags}
        onClose={() => { setEditClosing(true); setTimeout(() => { setEditOpen(false); setEditClosing(false); }, 150); }}
        onSaved={(itemId) => {
          setCustomIconOk(prev => {
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
        }}
        load={load}
        loadTags={loadTags}
      />

      {/* 图标编辑对话框 */}
      <DrawerIconDialog
        open={iconEditOpen}
        item={iconEditItem}
        token={token}
        onClose={() => setIconEditOpen(false)}
        onSaved={() => {
          if (iconEditItem) {
            setCustomIconOk(prev => {
              const next = { ...prev };
              delete next[iconEditItem.id];
              return next;
            });
          }
          load(true)
        }}
      />

      {/* 登录提示模态框 */}
      <DrawerLoginPrompt
        open={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
        onLogin={() => { onClose(); navigate('/login'); }}
      />

      {/* 文件夹模态框 */}
      <FolderModal
        open={folderModalOpen}
        folder={allItems.find(x => x.id === activeFolderId) ?? null}
        folderItems={(() => {
          // 获取文件夹内的子项并按保存的顺序排列
          const children = allItems.filter(x => x.parentId === activeFolderId)
          if (!user?.id || !activeFolderId) return children
          const folderOrder = getOrder(user.id, activeFolderId, 'drawer')
          if (!folderOrder.length) return children
          const orderMap = new Map(folderOrder.map((id, i) => [id, i]))
          return [...children].sort((a, b) => {
            const ia = orderMap.get(a.id) ?? Infinity
            const ib = orderMap.get(b.id) ?? Infinity
            return ia - ib
          })
        })()}
        allItems={allItems}
        userId={user?.id}
        context="drawer"
        openOriginRect={folderOpenOriginRect}
        closeOriginRect={folderCloseOriginRect}
        hasParent={folderStack.length > 1}
        autoClose={false}
        forceExpanded={skipOpenAnimation}
        onClose={() => {
          // 逐级关闭文件夹
          closeCurrentFolder()
        }}
        onItemClick={(item) => {
          if (item.url) {
            trackClick(item.id)
            window.open(item.url, '_blank', 'noopener,noreferrer')
          }
        }}
        onSubFolderClick={(folder, rect) => {
          // 打开子文件夹（压入栈）
          openFolder(folder.id, rect)
        }}
        onReorder={(newOrder) => {
          // 保存文件夹内的排序
          if (user?.id && activeFolderId) {
            saveOrder(user.id, activeFolderId, newOrder, 'drawer')
          }
        }}
        onCreateFolder={async (baseItem, incomingItem, originalOrder) => {
          // 在文件夹内创建子文件夹（参考书签页的 createFolderWithItems 逻辑）
          if (!token || !user || !activeFolderId) return
          try {
            // 获取所有文件夹名称，计算下一个可用的名称
            const folderNames = allItems.filter(x => x.type === 'FOLDER').map(x => x.name)
            const folderName = getNextFolderName('收藏夹', folderNames)
            
            // 1. 创建文件夹
            const resp = await apiFetch<{ item: Bookmark }>('/api/bookmarks', {
              method: 'POST',
              token,
              body: JSON.stringify({
                name: folderName,
                type: 'FOLDER',
                parentId: activeFolderId,
              }),
            })
            if (!resp.ok) {
              toast.error(resp.message || '创建文件夹失败')
              return
            }
            const newFolder = resp.data.item
            
            // 2. 移动两个书签到新文件夹
            await Promise.all([
              apiFetch(`/api/bookmarks/${baseItem.id}`, {
                method: 'PATCH',
                token,
                body: JSON.stringify({ parentId: newFolder.id }),
              }),
              apiFetch(`/api/bookmarks/${incomingItem.id}`, {
                method: 'PATCH',
                token,
                body: JSON.stringify({ parentId: newFolder.id }),
              }),
            ])
            
            // 3. 使用统一的工具函数更新排序（会保存到 localStorage）
            updateOrderAfterCreateFolder({
              userId: user.id,
              context: 'drawer',
              parentId: activeFolderId,
              baseItemId: baseItem.id,
              incomingItemId: incomingItem.id,
              folderId: newFolder.id,
              currentVisibleIds: originalOrder,
            })
            
            toast.success('已创建收藏夹')
            
            // 4. 重新加载数据（强制刷新，绕过缓存）
            await load(true)
          } catch {
            toast.error('创建文件夹失败')
          }
        }}
        onMoveToFolder={async (item, targetFolderId) => {
          // 移动书签到子文件夹（参考书签页的 moveToFolder 逻辑）
          if (!token || !user) return
          try {
            const resp = await apiFetch(`/api/bookmarks/${item.id}`, {
              method: 'PATCH',
              token,
              body: JSON.stringify({ parentId: targetFolderId }),
            })
            if (resp.ok) {
              // 更新目标文件夹内部顺序：新项目添加到末尾
              const folderOrder = getOrder(user.id, targetFolderId, 'drawer')
              const newOrder = [...folderOrder.filter(id => id !== item.id), item.id]
              saveOrder(user.id, targetFolderId, newOrder, 'drawer')
              toast.success('已移入收藏夹')
              // 等待 load() 完成，以便触发补位动画（强制刷新，绕过缓存）
              await load(true)
            }
          } catch {
            toast.error('移动失败')
          }
        }}
        onContextMenu={(item, x, y) => {
          setMenu({ open: true, x, y, item })
        }}
        onDragOutside={async (item, pointerPos, grabOffset) => {
          // 拖拽到文件夹外部：将书签移动到书签页并关闭文件夹，然后接管拖拽
          if (!token || !user || !activeFolderId) return
          
          // 1. 将书签从文件夹移动到根目录
          const resp = await apiFetch(`/api/bookmarks/${item.id}`, {
            method: 'PATCH',
            token,
            body: JSON.stringify({ parentId: null }),
          })
          if (!resp.ok) {
            toast.error('移动失败')
            return
          }
          
          // 2. 更新排序：从当前文件夹移除
          const currentOrder = getOrder(user.id, activeFolderId, 'drawer')
          const newOrder = currentOrder.filter(id => id !== item.id)
          saveOrder(user.id, activeFolderId, newOrder, 'drawer')
          
          // 3. 添加到书签页末尾
          const rootOrder = getOrder(user.id, null, 'drawer')
          if (!rootOrder.includes(item.id)) {
            saveOrder(user.id, null, [...rootOrder, item.id], 'drawer')
          }
          
          // 4. 关闭文件夹（使用关闭动画层）
          const closingItem = folderStack[folderStack.length - 1]
          if (closingItem) {
            const targetOriginRect = folderStack.length > 1 
              ? folderStack[0].originRect
              : closingItem.originRect
            // 保存文件夹内容快照，排除被拖拽的图标
            const snapshotItems = getSortedFolderChildren(
              allItems.filter(x => x.parentId === closingItem.id && x.id !== item.id),
              user?.id,
              closingItem.id,
              'drawer'
            )
            setClosingFolder({ ...closingItem, originRect: targetOriginRect, folderItems: snapshotItems })
          }
          setFolderStack([])
          setSkipOpenAnimation(false)
          
          // 动画完成后清理
          setTimeout(() => {
            setClosingFolder(null)
          }, 350)
          
          // 5. 关键修复：直接更新缓存中的数据，而不是等待 API 返回
          // 这样可以立即更新 React 状态，确保 DOM 渲染
          const updatedItem = { ...item, parentId: null }
          const updatedItems = allItems.map(x => x.id === item.id ? updatedItem : x)
          setAllItems(updatedItems)
          
          // 6. 等待 React 状态更新和 DOM 渲染
          // 使用 flushSync 确保状态同步更新，然后等待 DOM 渲染
          await new Promise<void>(resolve => {
            // 等待两帧，确保 React 状态更新和 DOM 渲染完成
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve()
              })
            })
          })
          
          // 7. 接管拖拽状态
          if (dragRef.current) {
            dragRef.current.takeoverDrag(item.id, pointerPos, grabOffset)
          }
        }}
      />
      
      {/* 关闭动画层：在一级文件夹上面显示二级的关闭动画 */}
      {closingFolder && (() => {
        const closingFolderData = allItems.find(x => x.id === closingFolder.id)
        if (!closingFolderData) return null
        // 使用保存的快照，如果没有则动态计算（兼容旧逻辑）
        const closingFolderItems = closingFolder.folderItems ?? getSortedFolderChildren(allItems.filter(x => x.parentId === closingFolder.id), user?.id, closingFolder.id, 'drawer')
        return (
          <FolderModal
            open={true}
            folder={closingFolderData}
            folderItems={closingFolderItems}
            allItems={allItems}
            userId={user?.id}
            context="drawer"
            openOriginRect={closingFolder.originRect}
            closeOriginRect={closingFolder.originRect}
            hasParent={false}
            autoClose={true}
            onClose={() => {}}
            onItemClick={() => {}}
            onSubFolderClick={() => {}}
          />
        )
      })()}
    </div>,
    document.body
  )
}
