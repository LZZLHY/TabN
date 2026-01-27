import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, MoreHorizontal, Settings } from 'lucide-react'
import { apiFetch } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useAppearanceStore } from '../stores/appearance'
import { useBookmarkDndStore } from '../stores/bookmarkDnd'
import { useBookmarkDrawerStore } from '../stores/bookmarkDrawer'
import { useBookmarkRefreshStore } from '../stores/bookmarkRefresh'
import { useBookmarkCacheStore } from '../stores/bookmarkCache'
import { cn } from '../utils/cn'
import { normalizeUrl } from '../utils/url'
import { getIconUrl } from '../utils/iconSource'
import { Favicon } from './Favicon'
import { Button } from './ui/Button'
import { useTitleFetch } from '../hooks/useTitleFetch'
import { useClickTracker } from '../hooks/useClickTracker'
import { useIsMobile } from '../hooks/useIsMobile'

// 从 bookmarks 模块导入共享组件和工具
import {
  type Bookmark,
  type BookmarkType,
  type MenuState,
  MAX_ROWS,
  getItemsPerRow,
  BookmarkItem,
  GridContextMenu,
  GridLoginPrompt,
  GridDeleteDialog,
  GridCreateDialog,
  GridEditDialog,
  DrawerIconDialog,
  FolderModal,
  useBookmarkDrag,
  useShortcutSet,
  getOrder,
  saveOrder,
  updateOrderAfterCreateFolder,
  getSortedFolderChildren,
  getNextFolderName,
} from './bookmarks'

// --- Helpers ---

type BookmarkGridProps = {
  /** 显示样式：grid=网格（移动端），dock=底部Dock栏（桌面端） */
  variant?: 'grid' | 'dock'
  /** 打开设置页回调 */
  onOpenSettings?: () => void
}

export function BookmarkGrid({ variant = 'grid', onOpenSettings }: BookmarkGridProps) {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const openDrawer = useBookmarkDrawerStore((s) => s.setOpen)
  const dockShowBookmarks = useAppearanceStore((s) => s.dockShowBookmarks)
  const dockShowSettings = useAppearanceStore((s) => s.dockShowSettings)
  const isDock = variant === 'dock'
  const isMobile = useIsMobile()

  // --- 书签缓存 ---
  const cachedItems = useBookmarkCacheStore((s) => s.items)
  const cachedTags = useBookmarkCacheStore((s) => s.tags)
  const cacheLoading = useBookmarkCacheStore((s) => s.loading)
  const setCacheItems = useBookmarkCacheStore((s) => s.setItems)
  const setCacheTags = useBookmarkCacheStore((s) => s.setTags)
  const setCacheLoading = useBookmarkCacheStore((s) => s.setLoading)
  const updateCacheLoadTime = useBookmarkCacheStore((s) => s.updateLastLoadTime)
  const isCacheValid = useBookmarkCacheStore((s) => s.isCacheValid)

  // --- State ---
  // 使用缓存 store 的数据，本地状态仅用于临时更新
  const allItems = cachedItems
  const loading = cacheLoading
  const setAllItems = setCacheItems
  const setLoading = setCacheLoading
  // 文件夹栈：支持多级文件夹逐级打开/关闭
  const [folderStack, setFolderStack] = useState<Array<{ id: string; originRect: DOMRect | null }>>([])
  const activeFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null
  const folderModalOpen = folderStack.length > 0
  // 打开动画使用栈顶位置，关闭动画也使用栈顶位置（收缩到当前文件夹图标）
  const folderOpenOriginRect = folderStack.length > 0 ? folderStack[folderStack.length - 1].originRect : null
  const folderCloseOriginRect = folderStack.length > 0 ? folderStack[folderStack.length - 1].originRect : null
  
  // 关闭动画层：用于在一级文件夹上面显示二级的关闭动画
  const [closingFolder, setClosingFolder] = useState<{
    id: string
    originRect: DOMRect | null
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

  // UI States
  const [menu, setMenu] = useState<MenuState>({ open: false })
  const [menuClosing, setMenuClosing] = useState(false) // 控制关闭动画
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuOpenTime = useRef(0) // 记录菜单打开时间，用于防止触摸模拟的 click 立即关闭菜单

  // 关闭菜单时先播放动画再移除
  const closeMenu = useCallback(() => {
    setMenuClosing(true)
    setTimeout(() => {
      setMenu({ open: false })
      setMenuClosing(false)
    }, 120) // 动画时长
  }, [])

  // --- Drag state (dnd-kit) ---
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_customIconOk, _setCustomIconOk] = useState<Record<string, boolean>>({})
  
  // All tags for autocomplete
  const [allTags, setAllTags] = useState<string[]>([])

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

  // --- Shortcut Set ---
  const {
    shortcutIds,
    addShortcut,
    removeShortcut,
    cleanupInvalidIds,
    replaceShortcutsAt,
    replaceShortcutWithChildren,
    setShortcutOrder,
    trimToMaxItems,
  } = useShortcutSet(user?.id)

  // 监听屏幕宽度变化，自动裁剪超出的图标
  useEffect(() => {
    // 初始化时立即执行一次
    trimToMaxItems()
    
    let rafId: number | null = null
    let lastWidth = window.innerWidth
    
    const handleResize = () => {
      const currentWidth = window.innerWidth
      // 只在宽度减小时立即检测（防止挤压）
      if (currentWidth < lastWidth) {
        // 取消之前的 RAF，立即执行
        if (rafId) cancelAnimationFrame(rafId)
        trimToMaxItems()
      }
      lastWidth = currentWidth
      
      // 延迟再次检测确保状态正确
      rafId = requestAnimationFrame(() => {
        trimToMaxItems()
      })
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [trimToMaxItems])

  // --- Click Tracker ---
  const { trackClick } = useClickTracker()

  // --- Computed ---
  
  const availableFolders = useMemo(() => {
    return allItems.filter(x => x.type === 'FOLDER' && x.id !== activeFolderId)
  }, [allItems, activeFolderId])

  // Dock栏显示所有在 shortcutSet 中的书签（按 shortcutIds 顺序排列）
  // shortcutIds 的顺序就是显示顺序，不需要额外排序
  const currentItems = useMemo(() => {
    const itemMap = new Map(allItems.map((x) => [x.id, x]))
    return shortcutIds.map((id) => itemMap.get(id)).filter(Boolean) as Bookmark[]
  }, [allItems, shortcutIds])

  const idToItem = useMemo(() => {
    const m = new Map<string, Bookmark>()
    for (const it of currentItems) m.set(it.id, it)
    return m
  }, [currentItems])

  // 直接使用 shortcutIds 作为显示顺序，不需要 useBookmarkOrder 重新排序
  const visibleIds = shortcutIds.filter((id) => idToItem.has(id))

  const activeFolder = useMemo(() => {
    return allItems.find((x) => x.id === activeFolderId)
  }, [allItems, activeFolderId])

  // --- Actions ---

  const load = useCallback(async (forceRefresh = false) => {
    if (!token) return
    
    // 如果缓存有效且不是强制刷新，跳过加载
    if (!forceRefresh && isCacheValid()) {
      return
    }
    
    setLoading(true)
    try {
      const resp = await apiFetch<{ items: Bookmark[] }>('/api/bookmarks', {
        method: 'GET',
        token,
      })
      if (!resp.ok) return
      setAllItems(resp.data.items)
      updateCacheLoadTime()
      // 清理无效的快捷方式 ID
      const validIds = resp.data.items.map(x => x.id)
      cleanupInvalidIds(validIds)
    } finally {
      setLoading(false)
    }
  }, [token, cleanupInvalidIds, isCacheValid, setAllItems, setLoading, updateCacheLoadTime])

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

  // 当用户退出登录时清空书签数据
  const clearCache = useBookmarkCacheStore((s) => s.clearCache)
  useEffect(() => {
    if (!token) {
      clearCache()
      setAllTags([])
      closeAllFolders()
    }
  }, [token, closeAllFolders, clearCache])

  // 首次加载 - 使用 requestIdleCallback 延迟执行，不阻塞首屏渲染
  useEffect(() => {
    const scheduleLoad = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1))
    scheduleLoad(() => {
      void load()
      void loadTags()
    })
  }, [load, loadTags])

  // 当 shortcutIds 变化时，检查是否有新的 ID 不在 allItems 中，如果有则重新加载
  useEffect(() => {
    const allItemIds = new Set(allItems.map(x => x.id))
    const hasMissing = shortcutIds.some(id => !allItemIds.has(id))
    if (hasMissing && token) {
      void load()
    }
  }, [shortcutIds, allItems, token, load])

  // 监听全局书签刷新事件（当书签页更新书签时触发）
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
    if (menu.open) {
      window.addEventListener('click', close)
      window.addEventListener('scroll', close, true)
      return () => {
        window.removeEventListener('click', close)
        window.removeEventListener('scroll', close, true)
      }
    }
    return
  }, [menu.open])

  // 打开后按真实菜单尺寸做边界修正，保证“贴鼠标且不出屏幕”
  useEffect(() => {
    if (!menu.open) return
    const el = menuRef.current
    if (!el) return
    const { x, y } = menu
    const pad = 12
    const rect = el.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width - pad
    const maxY = window.innerHeight - rect.height - pad
    const nx = Math.max(pad, Math.min(x, maxX))
    const ny = Math.max(pad, Math.min(y, maxY))
    if (nx === x && ny === y) return
    setMenu((prev) => (prev.open ? { ...prev, x: nx, y: ny } : prev))
  }, [menu])

  // --- Drag & Drop Logic (native pointer events) ---
  // 拖拽/排序/建夹逻辑已重构到 useBookmarkDrag

  // --- API Actions ---

  const moveToFolder = async (item: Bookmark, targetFolderId: string) => {
    if (!token || !user) return
    const resp = await apiFetch(`/api/bookmarks/${item.id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ parentId: targetFolderId })
    })
    if (resp.ok) {
      // 更新目标文件夹内部顺序：新项目添加到末尾
      const folderOrder = getOrder(user.id, targetFolderId, 'shortcut')
      if (!folderOrder.includes(item.id)) {
        saveOrder(user.id, targetFolderId, [...folderOrder, item.id], 'shortcut')
      }
      toast.success('已移入收藏夹')
      await load()
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
    
    // 3. 使用统一的工具函数更新排序（Dock 栏使用 'shortcut' context）
    updateOrderAfterCreateFolder({
      userId: user.id,
      context: 'shortcut',
      parentId: activeFolderId,
      baseItemId: baseItem.id,
      incomingItemId: incomingItem.id,
      folderId: folder.id,
      currentVisibleIds: originalOrder,
    })
    
    // 4. 更新快捷栏 shortcutIds
    const baseInShortcut = shortcutIds.includes(baseItem.id)
    const incomingInShortcut = shortcutIds.includes(incomingItem.id)
    
    if (baseInShortcut || incomingInShortcut) {
      const idsToRemove = [baseItem.id, incomingItem.id].filter(id => 
        shortcutIds.includes(id)
      )
      const targetId = baseInShortcut ? baseItem.id : incomingItem.id
      replaceShortcutsAt(idsToRemove, folder.id, targetId)
    }
    
    toast.success('已创建收藏夹')
    
    // 5. load() 会触发 useBookmarkOrder 从 localStorage 读取正确的顺序
    // 注意：savePositions() 已在 onDragEnd 中动画开始前调用
    await load()
    
    // 6. load() 完成后，手动触发补位动画
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
        parentId: createParentId, // Create in current or specified
        tags: createTags.length > 0 ? createTags : undefined,
      }),
    })
    
    if (!resp.ok) return toast.error(resp.message)
    toast.success('已创建')
    setCreateOpen(false)
    resetCreateForm()
    
    // 快捷栏创建的书签自动添加到快捷方式集合（仅 LINK 类型）
    // addShortcut 会自动将新书签添加到开头，超出限制时踢出末尾
    if (createType === 'LINK') {
      addShortcut(resp.data.item.id)
    }
    
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
    setVisibleIds: setShortcutOrder,
    getItemById: (id: string) => {
      const it = idToItem.get(id)
      return it ? { id: it.id, type: it.type } : null
    },
    getEl,
    onMergeIntoFolder: async (dragId: string, folderId: string) => {
      const dragItem = idToItem.get(dragId)
      if (!dragItem) return
      await moveToFolder(dragItem, folderId)
    },
    onCreateFolderWith: async (baseId: string, incomingId: string, originalOrder: string[]) => {
      const baseItem = idToItem.get(baseId)
      const incoming = idToItem.get(incomingId)
      if (!baseItem || !incoming) return
      await createFolderWithItems(baseItem, incoming, originalOrder)
    },
    onPersistReorder: (ids: string[]) => {
      setShortcutOrder(ids)
    },
    options: {
      prePush: dndPrePush,
      pushAnimation: dndPushAnim,
      dropAnimation: dndDropAnim,
    },
  })

  // --- Render Helpers ---

  const renderItem = (b: Bookmark, dockMode = false) => (
    <BookmarkItem
      key={b.id}
      item={b}
      allItems={allItems}
      dockMode={dockMode}
      activeDragId={drag.activeId}
      combineCandidateId={drag.combineCandidateId}
      combineTargetId={drag.combineTargetId}
      setElRef={setElRef}
      onPointerDown={(id, ev) => {
        drag.onPointerDown(id, ev.nativeEvent, ev.currentTarget)
      }}
      onClick={(item, e) => {
        if (item.type === 'FOLDER') {
          // 使用模态框打开文件夹
          const target = e?.currentTarget || e?.target
          let rect: DOMRect | null = null
          if (target instanceof HTMLElement) {
            const iconEl = target.querySelector('.bookmark-icon') || target
            rect = iconEl.getBoundingClientRect()
          }
          openFolder(item.id, rect)
        } else if (item.url) {
          trackClick(item.id)
          window.open(item.url, '_blank', 'noopener,noreferrer')
        }
      }}
      onContextMenu={(item, x, y) => {
        setMenu({ open: true, x, y, item })
      }}
      onLongPress={(item, x, y) => {
        menuOpenTime.current = Date.now()
        setMenu({ open: true, x, y, item })
      }}
      onCancelDrag={drag.onDragCancel}
    />
  )

  // 未登录用户显示空状态，不强制跳转
  if (!user) {
    return (
      <div className={cn(
        'relative',
        isDock ? 'inline-flex' : 'w-[min(720px,100%)]'
      )}>
        {isDock ? (
          // Dock 模式：macOS 风格底部栏（移动端非登录态显示空 dock）
          isMobile ? null : (
            <div className="flex items-center gap-1 px-3 py-3 rounded-2xl bg-white/20 dark:bg-black/20 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl">
              {/* 书签页入口 */}
              {dockShowBookmarks && (
                <div className="grid place-items-center group px-1">
                  <button
                    type="button"
                    className="select-none cursor-pointer outline-none focus:outline-none focus:ring-0"
                    onClick={() => openDrawer(true)}
                    title="我的书签"
                  >
                    <div className="bookmark-icon h-12 w-12 rounded-xl grid place-items-center bg-white/40 dark:bg-white/10 text-fg/60 transition-all duration-200 group-hover:scale-125 group-hover:-translate-y-3 group-hover:bg-white/60 dark:group-hover:bg-white/20">
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                  </button>
                </div>
              )}
              
              {/* 设置入口 */}
              {dockShowSettings && onOpenSettings && (
                <div className="grid place-items-center group px-1">
                  <button
                    type="button"
                    className="select-none cursor-pointer outline-none focus:outline-none focus:ring-0"
                    onClick={onOpenSettings}
                    title="设置"
                  >
                    <div className="bookmark-icon h-12 w-12 rounded-xl grid place-items-center bg-white/40 dark:bg-white/10 text-fg/60 transition-all duration-200 group-hover:scale-125 group-hover:-translate-y-3 group-hover:bg-white/60 dark:group-hover:bg-white/20">
                      <Settings className="w-6 h-6" />
                    </div>
                  </button>
                </div>
              )}
              
              {/* 分隔线 */}
              {(dockShowBookmarks || dockShowSettings) && (
                <div className="w-px h-10 bg-white/30 dark:bg-white/10 mx-1" />
              )}
              
              {/* 添加按钮 */}
              <div className="grid place-items-center group px-1">
                <button
                  type="button"
                  className="select-none cursor-pointer outline-none focus:outline-none focus:ring-0"
                  onClick={() => setLoginPromptOpen(true)}
                >
                  <div className="bookmark-icon h-12 w-12 rounded-xl grid place-items-center bg-white/40 dark:bg-white/10 text-fg/60 transition-all duration-200 group-hover:scale-125 group-hover:-translate-y-3 group-hover:bg-white/60 dark:group-hover:bg-white/20">
                    <span className="text-2xl leading-none">+</span>
                  </div>
                </button>
              </div>
            </div>
          )
        ) : (
          // 网格模式
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 justify-items-center">
                {/* 添加按钮 */}
                <button
                  type="button"
                  className={cn('select-none cursor-pointer outline-none focus:outline-none focus:ring-0')}
                  onClick={() => setLoginPromptOpen(true)}
                >
                  <div className="grid place-items-center">
                    <div className="h-12 w-12 rounded-[var(--start-radius)] grid place-items-center bg-white/60 text-fg/80 transition-all duration-300 hover:bg-white/80">
                      <span className="text-2xl leading-none">+</span>
                    </div>
                    <div className="mt-1.5 text-[11px] text-fg/70 truncate w-16 text-center">添加</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 登录提示模态框 */}
        {loginPromptOpen && createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/40 backdrop-enter" onClick={() => setLoginPromptOpen(false)} />
            <div className="relative w-full max-w-sm glass-modal rounded-[var(--start-radius)] p-6 shadow-2xl space-y-4 modal-enter">
              <h3 className="font-semibold text-lg">需要登录</h3>
              <p className="text-sm text-fg/70">
                登录后即可添加和管理书签，数据将自动同步到云端。
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => setLoginPromptOpen(false)}>取消</Button>
                <Button variant="primary" onClick={() => { setLoginPromptOpen(false); navigate('/login'); }}>去登录</Button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    )
  }

  // Dock 模式最大图标数（根据屏幕宽度动态计算）
  const getDesktopMaxItems = () => {
    if (typeof window === 'undefined') return 12
    const width = window.innerWidth
    // 预留空间：左侧边栏(80px) + 功能按钮(约200px: 书签入口+设置+分隔线+添加按钮) + dock栏padding(24px) + 额外安全边距(100px)
    // 增加安全边距确保在挤压发生之前就踢出图标
    const reservedWidth = 80 + 200 + 24 + 100
    const availableWidth = width - reservedWidth
    const itemWidth = 56
    return Math.max(4, Math.min(20, Math.floor(availableWidth / itemWidth)))
  }
  const DOCK_MAX_ITEMS = getDesktopMaxItems()

  return (
    <div className={cn(
      'relative',
      isDock 
        ? 'inline-flex' // Dock 模式：内联 flex，宽度自适应
        : 'w-[min(720px,100%)]' // 网格模式：固定最大宽度
    )}>
      {/* 标题栏 - 仅网格模式显示 */}
      {!isDock && (
        <div className="flex items-center justify-between gap-2 mb-2 h-8">
          <div className="flex items-center gap-2">
             <div className="text-xs text-fg/60">Dock栏</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => load(true)} disabled={loading}>刷新</Button>
          </div>
        </div>
      )}

      {/* Dock 模式：macOS 风格底部栏 */}
      {isDock ? (
        <div className="flex items-center justify-center gap-1 px-3 py-3 rounded-2xl bg-white/20 dark:bg-black/20 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl">
          {/* 书签页入口 - 类似 macOS Launchpad（仅桌面端） */}
          {!isMobile && dockShowBookmarks && (
            <div className="grid place-items-center group px-1">
              <button
                type="button"
                className="select-none cursor-pointer outline-none focus:outline-none focus:ring-0"
                onClick={() => openDrawer(true)}
                title="我的书签"
              >
                <div className="bookmark-icon h-12 w-12 rounded-xl grid place-items-center bg-white/40 dark:bg-white/10 text-fg/60 transition-all duration-200 group-hover:scale-125 group-hover:-translate-y-3 group-hover:bg-white/60 dark:group-hover:bg-white/20">
                  <LayoutGrid className="w-6 h-6" />
                </div>
              </button>
            </div>
          )}
          
          {/* 设置入口（仅桌面端） */}
          {!isMobile && dockShowSettings && onOpenSettings && (
            <div className="grid place-items-center group px-1">
              <button
                type="button"
                className="select-none cursor-pointer outline-none focus:outline-none focus:ring-0"
                onClick={onOpenSettings}
                title="设置"
              >
                <div className="bookmark-icon h-12 w-12 rounded-xl grid place-items-center bg-white/40 dark:bg-white/10 text-fg/60 transition-all duration-200 group-hover:scale-125 group-hover:-translate-y-3 group-hover:bg-white/60 dark:group-hover:bg-white/20">
                  <Settings className="w-6 h-6" />
                </div>
              </button>
            </div>
          )}
          
          {/* 分隔线（仅桌面端） */}
          {!isMobile && (dockShowBookmarks || dockShowSettings) && (
            <div className="w-px h-10 bg-white/30 dark:bg-white/10 mx-1" />
          )}
          
          {(() => {
            // 移动端限制 5 个图标，桌面端限制 12 个
            const maxItems = isMobile ? 5 : DOCK_MAX_ITEMS
            // 新图标在左边（数组开头），超出时踢出最右边的旧图标（数组末尾）
            // 直接截取前 maxItems 个，不需要省略号
            const displayIds = visibleIds.slice(0, maxItems)
            
            return (
              <>
                {/* 书签图标：新的在左边，旧的在右边 */}
                {displayIds.map((id) => idToItem.get(id)).filter(Boolean).map((it) => renderItem(it!, true))}
                
                {/* 分隔线和添加按钮（仅桌面端） */}
                {!isMobile && (
                  <>
                    <div className="w-px h-10 bg-white/30 dark:bg-white/10 mx-1" />
                    <div className="grid place-items-center group px-1">
                      <button
                        type="button"
                        className="select-none cursor-pointer outline-none focus:outline-none focus:ring-0"
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
                        <div className="bookmark-icon h-12 w-12 rounded-xl grid place-items-center bg-white/40 dark:bg-white/10 text-fg/60 transition-all duration-200 group-hover:scale-125 group-hover:-translate-y-3 group-hover:bg-white/60 dark:group-hover:bg-white/20">
                          <span className="text-2xl leading-none">+</span>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </>
            )
          })()}
        </div>
      ) : (
        /* 网格模式：原有样式 */
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 touch-none">
          {(() => {
            const itemsPerRow = getItemsPerRow()
            const maxItems = MAX_ROWS * itemsPerRow - 1
            const hasMore = visibleIds.length > maxItems
            const displayIds = hasMore ? visibleIds.slice(0, maxItems) : visibleIds
            
            return (
              <>
                {displayIds.map((id) => idToItem.get(id)).filter(Boolean).map((it) => renderItem(it!))}
                
                {/* 更多按钮 */}
                {hasMore && (
                  <button
                    type="button"
                    className={cn('select-none cursor-pointer outline-none focus:outline-none focus:ring-0')}
                    onClick={() => openDrawer(true)}
                  >
                    <div className="grid place-items-center">
                      <div className="h-12 w-12 rounded-[var(--start-radius)] grid place-items-center bg-white/40 text-fg/60 transition-all duration-300 hover:bg-white/60">
                        <MoreHorizontal className="w-6 h-6" />
                      </div>
                      <div className="mt-1.5 text-[11px] text-fg/70 truncate w-16 text-center">更多</div>
                    </div>
                  </button>
                )}
                
                {/* 添加按钮 */}
                {!hasMore && (
                  <button
                    type="button"
                    className={cn('select-none cursor-pointer outline-none focus:outline-none focus:ring-0')}
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
                      <div className="h-12 w-12 rounded-[var(--start-radius)] grid place-items-center bg-white/60 text-fg/80 transition-all duration-300 hover:bg-white/80">
                        <span className="text-2xl leading-none">+</span>
                      </div>
                      <div className="mt-1.5 text-[11px] text-fg/70 truncate w-16 text-center">添加</div>
                    </div>
                  </button>
                )}
              </>
            )
          })()}
        </div>
      )}

      {drag.activeId
        ? createPortal(
            <div ref={drag.overlayRef} style={drag.overlayStyle}>
              {(() => {
                const it = allItems.find((x) => x.id === drag.activeId)
                if (!it) return null
                const isFolder = it.type === 'FOLDER'
                const folderItems = isFolder
                  ? getSortedFolderChildren(allItems.filter((x) => x.parentId === it.id), user?.id, it.id, 'shortcut').slice(0, 9)
                  : []
                return (
                  <div className="bm-inner">
                    <div className="grid place-items-center select-none">
                      <div
                        ref={drag.overlayBoxRef}
                        className={cn(
                          'bookmark-icon h-12 w-12 rounded-[var(--start-radius)] overflow-hidden grid place-items-center shadow-2xl select-none',
                          isFolder
                            ? 'bg-glass/20 border border-glass-border/20 p-1'
                            : 'bg-primary/15 text-primary font-semibold',
                        )}
                      >
                      {isFolder ? (
                        <div className="grid grid-cols-3 gap-0.5 w-full h-full content-start">
                          {folderItems.map((sub) => {
                            // 检查自定义图标
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
            document.body,
          )
        : null}


      <GridContextMenu
        menu={menu}
        menuClosing={menuClosing}
        menuOpenTime={menuOpenTime}
        availableFolders={availableFolders}
        onClose={closeMenu}
        onOpenFolder={setActiveFolderId}
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
        onRemoveShortcut={removeShortcut}
        onMoveToFolder={moveToFolder}
      />

      <GridDeleteDialog
        open={deleteOpen}
        isClosing={deleteClosing}
        item={deleteItem}
        mode={deleteMode}
        token={token}
        userId={user?.id}
        activeFolderId={activeFolderId}
        allItems={allItems}
        shortcutIds={shortcutIds}
        visibleIds={visibleIds}
        onClose={() => { setDeleteClosing(true); setTimeout(() => { setDeleteOpen(false); setDeleteClosing(false); }, 150); }}
        setActiveFolderId={setActiveFolderId}
        setOrder={setShortcutOrder}
        removeShortcut={removeShortcut}
        replaceShortcutWithChildren={replaceShortcutWithChildren}
        load={load}
      />

      <GridCreateDialog
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

      <GridEditDialog
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
        load={load}
        loadTags={loadTags}
      />

      {/* 登录提示模态框 */}
      <GridLoginPrompt
        open={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
        onLogin={() => navigate('/login')}
      />

      {/* 图标编辑对话框 */}
      <DrawerIconDialog
        open={iconEditOpen}
        item={iconEditItem}
        token={token}
        onClose={() => setIconEditOpen(false)}
        onSaved={() => load(true)}
      />

      {/* 文件夹模态框 */}
      <FolderModal
        open={folderModalOpen}
        folder={activeFolder ?? null}
        folderItems={(() => {
          // 获取文件夹内的子项并按保存的顺序排列
          const children = allItems.filter(x => x.parentId === activeFolderId)
          if (!user?.id || !activeFolderId) return children
          const folderOrder = getOrder(user.id, activeFolderId, 'shortcut')
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
        context="shortcut"
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
            saveOrder(user.id, activeFolderId, newOrder, 'shortcut')
          }
        }}
        onCreateFolder={async (baseItem, incomingItem, originalOrder) => {
          // 在文件夹内创建子文件夹
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
            
            // 3. 使用统一的工具函数更新排序
            updateOrderAfterCreateFolder({
              userId: user.id,
              context: 'shortcut',
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
          // 移动书签到子文件夹
          if (!token || !user) return
          try {
            const resp = await apiFetch(`/api/bookmarks/${item.id}`, {
              method: 'PATCH',
              token,
              body: JSON.stringify({ parentId: targetFolderId }),
            })
            if (resp.ok) {
              // 更新目标文件夹内部顺序：新项目添加到末尾
              const folderOrder = getOrder(user.id, targetFolderId, 'shortcut')
              const newOrder = [...folderOrder.filter(id => id !== item.id), item.id]
              saveOrder(user.id, targetFolderId, newOrder, 'shortcut')
              toast.success('已移入收藏夹')
              await load(true) // 强制刷新，绕过缓存
            }
          } catch {
            toast.error('移动失败')
          }
        }}
        onContextMenu={(item, x, y) => {
          setMenu({ open: true, x, y, item })
        }}
      />
      
      {/* 关闭动画层：在一级文件夹上面显示二级的关闭动画 */}
      {closingFolder && (() => {
        const closingFolderData = allItems.find(x => x.id === closingFolder.id)
        if (!closingFolderData) return null
        const closingFolderItems = getSortedFolderChildren(allItems.filter(x => x.parentId === closingFolder.id), user?.id, closingFolder.id, 'shortcut')
        return (
          <FolderModal
            open={true}
            folder={closingFolderData}
            folderItems={closingFolderItems}
            allItems={allItems}
            userId={user?.id}
            context="shortcut"
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

    </div>
  )
}
