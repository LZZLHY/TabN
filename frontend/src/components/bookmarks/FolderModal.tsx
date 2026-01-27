import { createPortal } from 'react-dom'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Folder as FolderIcon } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Favicon } from '../Favicon'
import { getSortedFolderChildren } from './folderOperations'
import { getIconUrl } from '../../utils/iconSource'
import { useAppearanceStore } from '../../stores/appearance'
import { useBookmarkDrag } from './useBookmarkDrag'
import type { Bookmark } from './types'
import type { BookmarkContext } from '../../types/bookmark'

type FolderModalProps = {
  open: boolean
  folder: Bookmark | null
  folderItems: Bookmark[]
  allItems: Bookmark[] // 用于子文件夹预览
  userId?: string
  context?: BookmarkContext
  openOriginRect: DOMRect | null // 打开动画的起始位置（当前文件夹图标位置）
  closeOriginRect: DOMRect | null // 关闭动画的目标位置（一级文件夹图标位置）
  hasParent?: boolean // 是否有上一级文件夹（用于区分关闭一级和关闭二级）
  autoClose?: boolean // 是否自动播放关闭动画（用于关闭动画层）
  forceExpanded?: boolean // 强制立即展开（无动画）
  onClose: () => void
  onItemClick: (item: Bookmark) => void
  onSubFolderClick: (folder: Bookmark, rect: DOMRect) => void
  /** 拖拽排序回调 */
  onReorder?: (newOrder: string[]) => void
  /** 建夹回调 */
  onCreateFolder?: (baseItem: Bookmark, incomingItem: Bookmark, originalOrder: string[]) => void
  /** 移动到文件夹回调 */
  onMoveToFolder?: (item: Bookmark, targetFolderId: string) => void
  /** 右键菜单回调 */
  onContextMenu?: (item: Bookmark, x: number, y: number) => void
  /** 拖拽到文件夹外部时的回调（用于将图标拖出文件夹到书签页） */
  onDragOutside?: (item: Bookmark, pointerPos: { x: number; y: number }, grabOffset: { x: number; y: number }) => void
}

/**
 * 文件夹模态框组件
 * 从小文件夹图标位置放大到居中显示
 */
export function FolderModal({
  open,
  folder,
  folderItems,
  allItems,
  userId,
  context,
  openOriginRect,
  closeOriginRect,
  hasParent = false,
  autoClose = false,
  forceExpanded = false,
  onClose,
  onItemClick,
  onSubFolderClick,
  onReorder,
  onCreateFolder,
  onMoveToFolder,
  onContextMenu,
  onDragOutside,
}: FolderModalProps) {
  // 获取图标大小和间距设置
  const bookmarkIconSize = useAppearanceStore((s) => s.bookmarkIconSize)
  const bookmarkIconGap = useAppearanceStore((s) => s.bookmarkIconGap)
  const sortLocked = useAppearanceStore((s) => s.bookmarkSortLocked)
  const [isClosing, setIsClosing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  // 保存打开时的图标位置（用于关闭动画）
  const [savedOrigin, setSavedOrigin] = useState<{ x: number; y: number; size: number } | null>(null)
  // 记录上一次的文件夹 ID，用于检测文件夹切换
  const prevFolderIdRef = useRef<string | null>(null)
  // 是否禁用过渡动画（用于切换文件夹时瞬间更新位置）
  const [skipTransition, setSkipTransition] = useState(false)
  // 标记是否是从关闭动画返回上一级（不需要播放打开动画）
  const isReturningRef = useRef(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  
  // 拖拽相关状态
  const itemElsRef = useRef<Map<string, HTMLDivElement>>(new Map())
  // 直接从 folderItems 派生 visibleIds，拖拽时临时覆盖
  const baseIds = useMemo(() => folderItems.map(item => item.id), [folderItems])
  const [dragOrderOverride, setDragOrderOverride] = useState<string[] | null>(null)
  // 当文件夹切换时，重置拖拽排序覆盖
  const prevFolderIdForDragRef = useRef<string | null>(null)
  if (folder?.id !== prevFolderIdForDragRef.current) {
    prevFolderIdForDragRef.current = folder?.id ?? null
    if (dragOrderOverride !== null) {
      setDragOrderOverride(null)
    }
  }
  // 如果 dragOrderOverride 中的 ID 不在 baseIds 中，说明文件夹已切换，使用 baseIds
  const visibleIds = useMemo(() => {
    if (!dragOrderOverride) return baseIds
    // 检查 dragOrderOverride 是否与当前 baseIds 匹配
    const baseIdSet = new Set(baseIds)
    const isValid = dragOrderOverride.every(id => baseIdSet.has(id))
    return isValid ? dragOrderOverride : baseIds
  }, [dragOrderOverride, baseIds])
  const setVisibleIds = useCallback((idsOrFn: string[] | ((prev: string[]) => string[])) => {
    if (typeof idsOrFn === 'function') {
      setDragOrderOverride(prev => idsOrFn(prev ?? baseIds))
    } else {
      setDragOrderOverride(idsOrFn)
    }
  }, [baseIds])
  
  // 获取元素引用
  const getEl = useCallback((id: string) => itemElsRef.current.get(id), [])
  
  // 获取书签项
  const getItemById = useCallback((id: string) => {
    const item = folderItems.find(x => x.id === id)
    if (!item) return null
    return { id: item.id, type: item.type }
  }, [folderItems])
  
  // 用于在回调中访问 drag 的 ref
  const dragRef = useRef<ReturnType<typeof useBookmarkDrag> | null>(null)
  
  // 移动到文件夹回调
  const handleMergeIntoFolder = useCallback(async (activeId: string, folderId: string) => {
    const item = folderItems.find(x => x.id === activeId)
    if (item && onMoveToFolder) {
      // 等待移动完成后触发补位动画
      await onMoveToFolder(item, folderId)
      dragRef.current?.triggerFillAnimation()
    }
  }, [folderItems, onMoveToFolder])
  
  // 建夹回调
  const handleCreateFolderWith = useCallback(async (baseId: string, incomingId: string, originalOrder: string[]) => {
    const baseItem = folderItems.find(x => x.id === baseId)
    const incomingItem = folderItems.find(x => x.id === incomingId)
    if (baseItem && incomingItem && onCreateFolder) {
      // 等待建夹完成后触发补位动画
      await onCreateFolder(baseItem, incomingItem, originalOrder)
      dragRef.current?.triggerFillAnimation()
    }
  }, [folderItems, onCreateFolder])
  
  // 持久化排序回调
  const handlePersistReorder = useCallback((ids: string[]) => {
    if (onReorder) {
      onReorder(ids)
    }
  }, [onReorder])
  
  // 拖拽 hook
  const drag = useBookmarkDrag({
    visibleIds,
    setVisibleIds,
    getItemById,
    getEl,
    onMergeIntoFolder: handleMergeIntoFolder,
    onCreateFolderWith: handleCreateFolderWith,
    onPersistReorder: handlePersistReorder,
    disabled: sortLocked || !onReorder,
  })
  
  // 更新 dragRef（在 useEffect 中更新，避免在渲染期间修改 ref）
  useEffect(() => {
    dragRef.current = drag
  })
  
  // 拖拽到文件夹外部检测
  const dragOutsideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isOutsideRef = useRef(false)
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null)
  const dragActiveIdRef = useRef<string | null>(null)
  const dragCancelRef = useRef<(() => void) | null>(null)
  const onDragOutsideRef = useRef<FolderModalProps['onDragOutside']>(onDragOutside)
  const folderItemsRef = useRef<Bookmark[]>(folderItems)
  
  // 同步更新 ref
  useEffect(() => {
    dragActiveIdRef.current = drag.activeId
  }, [drag.activeId])

  useEffect(() => {
    dragCancelRef.current = drag.onDragCancel
  }, [drag.onDragCancel])

  useEffect(() => {
    onDragOutsideRef.current = onDragOutside
  }, [onDragOutside])

  useEffect(() => {
    folderItemsRef.current = folderItems
  }, [folderItems])
  
  useEffect(() => {
    // 如果没有拖拽或没有 onDragOutside 回调，不需要检测
    if (!drag.activeId || !onDragOutsideRef.current) {
      // 清理计时器
      if (dragOutsideTimerRef.current) {
        clearTimeout(dragOutsideTimerRef.current)
        dragOutsideTimerRef.current = null
      }
      isOutsideRef.current = false
      return
    }
    
    // 监听指针移动事件
    const handlePointerMove = (e: PointerEvent) => {
      // 保存最新的指针位置
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY }
      
      if (!dragActiveIdRef.current || !modalRef.current) return
      
      const modalRect = modalRef.current.getBoundingClientRect()
      const isOutside = 
        e.clientX < modalRect.left ||
        e.clientX > modalRect.right ||
        e.clientY < modalRect.top ||
        e.clientY > modalRect.bottom
      
      if (isOutside && !isOutsideRef.current) {
        // 刚刚移出模态框，开始计时
        isOutsideRef.current = true
        if (dragOutsideTimerRef.current) {
          clearTimeout(dragOutsideTimerRef.current)
        }
        dragOutsideTimerRef.current = setTimeout(() => {
          // 悬停时间到，触发回调
          const activeId = dragActiveIdRef.current
          if (!activeId) {
            return
          }
          const item = folderItemsRef.current.find(x => x.id === activeId)
          const pos = lastPointerPosRef.current
          // 直接从 dragRef 读取 grabOffset（因为它是 getter）
          const grabOffset = dragRef.current?.grabOffset ?? { x: 32, y: 32 }
          const cb = onDragOutsideRef.current
          if (item && cb && pos) {
            // 取消当前拖拽
            dragCancelRef.current?.()
            // 触发回调，传递项、指针位置和抓取偏移量
            cb(item, pos, grabOffset)
          }
        }, 400) // 400ms 悬停时间
      } else if (!isOutside && isOutsideRef.current) {
        // 移回模态框内，取消计时
        isOutsideRef.current = false
        if (dragOutsideTimerRef.current) {
          clearTimeout(dragOutsideTimerRef.current)
          dragOutsideTimerRef.current = null
        }
      }
    }
    
    window.addEventListener('pointermove', handlePointerMove)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      if (dragOutsideTimerRef.current) {
        clearTimeout(dragOutsideTimerRef.current)
        dragOutsideTimerRef.current = null
      }
    }
  }, [drag.activeId])
  
  // 根据 visibleIds 排序 folderItems
  const sortedItems = useMemo(() => {
    const idToItem = new Map(folderItems.map(item => [item.id, item]))
    return visibleIds.map(id => idToItem.get(id)).filter((x): x is Bookmark => x !== undefined)
  }, [folderItems, visibleIds])

  // 计算打开动画的起始位置（当前文件夹图标位置）
  const getOpenOrigin = useCallback(() => {
    let ox = window.innerWidth / 2
    let oy = window.innerHeight / 2
    let sz = bookmarkIconSize
    
    if (openOriginRect) {
      ox = openOriginRect.left + openOriginRect.width / 2
      oy = openOriginRect.top + openOriginRect.height / 2
      sz = openOriginRect.width
    }
    
    return { x: ox, y: oy, size: sz }
  }, [openOriginRect, bookmarkIconSize])
  
  // 计算关闭动画的目标位置（一级文件夹图标位置）
  const getCloseOrigin = useCallback(() => {
    let ox = window.innerWidth / 2
    let oy = window.innerHeight / 2
    let sz = bookmarkIconSize
    
    if (closeOriginRect) {
      ox = closeOriginRect.left + closeOriginRect.width / 2
      oy = closeOriginRect.top + closeOriginRect.height / 2
      sz = closeOriginRect.width
    }
    
    return { x: ox, y: oy, size: sz }
  }, [closeOriginRect, bookmarkIconSize])

  // autoClose 模式：自动播放关闭动画
  useLayoutEffect(() => {
    if (autoClose && open && folder) {
      // 先展开，然后稍微延迟后开始关闭动画（避免与一级显示的空窗期）
      const closeOrigin = getCloseOrigin()
      
      // 使用 requestAnimationFrame 确保正确的执行顺序
      requestAnimationFrame(() => {
        setSavedOrigin(closeOrigin)
        setIsExpanded(true)
        
        // 延迟 50ms 开始关闭动画
        setTimeout(() => {
          setIsClosing(true)
          setIsExpanded(false)
        }, 50)
      })
    }
  }, [autoClose, open, folder, getCloseOrigin])
  
  // 打开时保存位置并触发动画
  useEffect(() => {
    // 如果是 autoClose 模式，不执行打开动画
    if (autoClose) return
    // 如果正在关闭动画中，不要干扰
    if (isClosing) return
    
    if (open && folder) {
      const isNewFolder = prevFolderIdRef.current !== folder.id
      
      if (isNewFolder) {
        // 如果是 forceExpanded 模式，只更新 prevFolderIdRef，不执行打开动画
        if (forceExpanded) {
          prevFolderIdRef.current = folder.id
          return
        }
        
        // 切换到新文件夹时，从打开位置开始动画
        const openOrigin = getOpenOrigin()
        
        // 使用 requestAnimationFrame 链式调用确保正确的执行顺序
        // 第一帧：设置初始状态（收缩到图标位置）
        requestAnimationFrame(() => {
          setSkipTransition(true)
          setSavedOrigin(openOrigin)
          setIsExpanded(false)
          
          // 第二帧：启用过渡
          requestAnimationFrame(() => {
            setSkipTransition(false)
            
            // 第三帧：展开
            requestAnimationFrame(() => {
              setIsExpanded(true)
            })
          })
        })
        prevFolderIdRef.current = folder.id
      }
    } else if (!open && !isClosing) {
      prevFolderIdRef.current = null
    }
  }, [open, folder, getOpenOrigin, isClosing, autoClose, forceExpanded])

  // 关闭动画
  const handleClose = useCallback(() => {
    if (isClosing) return // 防止重复调用
    
    // 获取关闭动画的目标位置
    const closeOrigin = getCloseOrigin()
    
    if (hasParent) {
      // 关闭二级文件夹返回一级：
      // 1. 先切换到一级内容（但保持展开状态）
      // 2. 然后播放关闭动画（收缩到二级图标位置）
      
      // 保存关闭动画的目标位置
      setSavedOrigin(closeOrigin)
      
      // 标记为返回上一级
      isReturningRef.current = true
      
      // 先切换到一级内容
      onClose()
      
      // 下一帧开始关闭动画
      requestAnimationFrame(() => {
        setIsClosing(true)
        setIsExpanded(false)
        
        // 动画完成后：恢复展开状态（显示一级文件夹）
        setTimeout(() => {
          setIsClosing(false)
          setSavedOrigin(null)
          isReturningRef.current = false
          // 恢复展开状态，显示一级文件夹
          setSkipTransition(true)
          setIsExpanded(true)
          requestAnimationFrame(() => {
            setSkipTransition(false)
          })
        }, 320)
      })
    } else {
      // 关闭一级文件夹：使用正常的关闭动画
      setSavedOrigin(closeOrigin)
      setIsClosing(true)
      setIsExpanded(false)
      
      // 等待动画完成后清理
      setTimeout(() => {
        setIsClosing(false)
        setSavedOrigin(null)
        onClose()
      }, 320)
    }
  }, [isClosing, onClose, getCloseOrigin, hasParent])
  
  // ESC 键关闭（带动画）
  useEffect(() => {
    if (!open && !isClosing) return
    
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation() // 阻止事件冒泡到父组件
        handleClose()
      }
    }
    
    window.addEventListener('keydown', onKeyDown, true) // 使用捕获阶段
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, isClosing, handleClose])

  if (!open && !isClosing) return null
  if (!folder) return null

  // 计算动画参数
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  // 使用保存的位置，如果没有则使用关闭位置
  const origin = savedOrigin || getCloseOrigin()
  
  // 计算模态框最终尺寸
  const modalWidth = Math.max(bookmarkIconSize, 64) * 3 + bookmarkIconGap * 2 + 48 + 60
  // 初始缩放比例 - 精确匹配图标大小
  const initialScale = origin.size / modalWidth
  
  // 当 forceExpanded 为 true 时，直接覆盖 isExpanded 为 true（无动画立即展开）
  // 当 autoClose 为 true 且还没开始关闭时，也显示为展开状态
  const effectiveIsExpanded = forceExpanded ? true : (autoClose && !isClosing ? true : isExpanded)

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      {/* 背景遮罩 - autoClose 模式不需要背景遮罩（一级文件夹已经有了） */}
      {!autoClose && (
        <div 
          className={cn(
            'absolute inset-0 bg-black/40 backdrop-blur-sm',
            'transition-opacity duration-300 ease-out'
          )}
          style={{ opacity: effectiveIsExpanded ? 1 : 0 }}
          onClick={handleClose}
        />
      )}
      
      {/* 模态框内容 - 网格布局，宽度根据图标大小动态计算，至少显示4列 */}
      <div
        ref={modalRef}
        className="relative max-w-[90vw] glass-modal rounded-3xl shadow-2xl overflow-hidden"
        style={{
          width: `${modalWidth}px`,
          // 使用 will-change 优化性能，避免卡顿
          willChange: 'transform, opacity',
          transformOrigin: 'center center',
          // 单阶段平滑动画：从图标位置/大小 → 中心/完整大小
          // 使用 translate 先移动到图标位置，再 scale 缩小
          transform: effectiveIsExpanded
            ? 'translate(0, 0) scale(1)'
            : `translate(${origin.x - centerX}px, ${origin.y - centerY}px) scale(${initialScale})`,
          opacity: effectiveIsExpanded ? 1 : 0,
          // 使用平滑的缓动曲线（打开和关闭都用同样的动画）
          // skipTransition 或 forceExpanded 时禁用过渡，用于切换文件夹时瞬间移动到新位置
          // autoClose 模式在关闭动画开始后启用过渡
          transition: (skipTransition || forceExpanded || (autoClose && !isClosing)) ? 'none' : 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms ease-out',
        } as React.CSSProperties}
      >
        {/* 标题 - 居中显示在顶部 */}
        <div className="text-center pt-4 pb-3">
          <h3 className="text-lg font-medium text-fg/90">{folder.name}</h3>
        </div>

        {/* 内容区域 - 网格布局，单行数量与书签页保持一致 */}
        <div 
          ref={contentRef}
          className="px-6 pb-6 overflow-y-auto max-h-[60vh]"
        >
          {sortedItems.length === 0 ? (
            <div className="text-center text-fg/50 py-6 px-8">
              文件夹为空
            </div>
          ) : (
            <div 
              className="grid justify-center"
              style={{ 
                // 固定3列，与书签页图标大小一致
                gridTemplateColumns: `repeat(3, ${Math.max(bookmarkIconSize, 64)}px)`,
                gap: bookmarkIconGap,
                alignItems: 'start'
              }}
            >
              {sortedItems.map((item) => {
                const isSubFolder = item.type === 'FOLDER'
                const isCombineCandidate = drag.combineCandidateId === item.id
                const isCombineTarget = drag.combineTargetId === item.id
                const isDragging = drag.activeId === item.id
                
                return (
                  <div
                    key={item.id}
                    ref={(el) => {
                      if (el) itemElsRef.current.set(item.id, el)
                      else itemElsRef.current.delete(item.id)
                    }}
                    className={cn(
                      'select-none relative group',
                      !sortLocked && onReorder && 'cursor-grab active:cursor-grabbing',
                      isDragging && 'opacity-0',
                    )}
                    style={{ transition: 'opacity 150ms' }}
                    onPointerDown={(e) => {
                      if (!sortLocked && onReorder) {
                        drag.onPointerDown(item.id, e.nativeEvent)
                      }
                    }}
                    onClick={(e) => {
                      // 如果正在拖拽，不触发点击
                      if (drag.activeId) return
                      if (isSubFolder) {
                        const rect = e.currentTarget.getBoundingClientRect()
                        onSubFolderClick(item, rect)
                      } else {
                        onItemClick(item)
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      onContextMenu?.(item, e.clientX + 8, e.clientY + 8)
                    }}
                  >
                    {/* bm-inner 放在内层，与书签页结构保持一致，用于 FLIP 动画 */}
                    <div className="bm-inner flex flex-col items-center gap-1.5 p-1 rounded-xl transition-colors group/icon">
                      <div
                        className={cn(
                          'bookmark-icon rounded-xl overflow-hidden grid place-items-center',
                          'group-hover/icon:scale-110 group-hover/icon:shadow-lg group-hover/icon:shadow-black/10',
                          'group-active/icon:scale-95',
                          isSubFolder
                            ? 'bg-glass/30 border border-glass-border/20 p-[2px]'
                            : 'bg-white/70',
                          isCombineTarget && 'ring-2 ring-primary ring-offset-2',
                          isCombineCandidate && 'ring-2 ring-primary/60 ring-offset-2',
                        )}
                        style={{ 
                          width: bookmarkIconSize, 
                          height: bookmarkIconSize,
                          transition: 'transform 150ms ease-out, box-shadow 150ms ease-out',
                        }}
                      >
                        {isSubFolder ? (
                          <FolderPreview items={getSortedFolderChildren(allItems.filter(x => x.parentId === item.id), userId, item.id, context || 'drawer').slice(0, 9)} allItems={allItems} />
                        ) : (
                          <FolderItemIconContent bookmark={item} />
                        )}
                      </div>
                      <span 
                        className="text-[10px] text-fg/70 truncate text-center"
                        style={{ width: bookmarkIconSize }}
                      >
                        {item.name}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* 拖拽覆盖层 */}
      {drag.activeId && (() => {
        const item = folderItems.find(x => x.id === drag.activeId)
        if (!item) return null
        const isSubFolder = item.type === 'FOLDER'
        
        return (
          <div ref={drag.overlayRef} style={drag.overlayStyle}>
            <div className="bm-inner">
              <div className="grid place-items-center select-none">
                <div
                  ref={drag.overlayBoxRef}
                  className={cn(
                    'bookmark-icon rounded-xl overflow-hidden grid place-items-center shadow-2xl select-none',
                    isSubFolder
                      ? 'bg-glass/30 border border-glass-border/20 p-[2px]'
                      : 'bg-white/70',
                  )}
                  style={{ width: bookmarkIconSize, height: bookmarkIconSize }}
                >
                  {isSubFolder ? (
                    <FolderPreview items={getSortedFolderChildren(allItems.filter(x => x.parentId === item.id), userId, item.id, context || 'drawer').slice(0, 9)} allItems={allItems} />
                  ) : (
                    <FolderItemIconContent bookmark={item} />
                  )}
                </div>
                <div className="mt-1.5 text-[11px] text-fg/80 truncate text-center" style={{ width: bookmarkIconSize }}>
                  {item.name}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>,
    document.body
  )
}

/**
 * 文件夹内书签图标内容组件（不包含外层容器）
 * 支持自定义图标加载失败后回退到 Favicon
 */
function FolderItemIconContent({ bookmark }: { bookmark: Bookmark }) {
  const [iconFailed, setIconFailed] = useState(false)
  
  // 检查自定义图标
  let customIcon = ''
  if (bookmark.iconType === 'BASE64' && bookmark.iconData) {
    customIcon = bookmark.iconData
  } else if (bookmark.iconUrl) {
    customIcon = getIconUrl(bookmark.url, bookmark.iconUrl)
  }
  const hasCustomIcon = Boolean(customIcon) && !iconFailed
  
  if (hasCustomIcon) {
    return (
      <img
        src={customIcon}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        onError={() => setIconFailed(true)}
      />
    )
  }
  
  return (
    <Favicon
      url={bookmark.url || ''}
      name={bookmark.name}
      className="h-full w-full object-cover"
      letterClassName="h-full w-full"
    />
  )
}

/**
 * 文件夹预览中的小图标组件
 * 支持显示书签图标或子文件夹预览
 */
function FolderPreviewIcon({ bookmark, subFolderItems, allItems }: { bookmark: Bookmark; subFolderItems?: Bookmark[]; allItems?: Bookmark[] }) {
  const isSubFolder = bookmark.type === 'FOLDER'
  
  // 如果是子文件夹，显示其内容预览
  if (isSubFolder) {
    const children = subFolderItems || []
    if (children.length === 0) {
      return (
        <div className="w-full pt-[100%] relative bg-amber-100/50 rounded-[2px] overflow-hidden">
          <FolderIcon className="absolute inset-0 w-full h-full p-0.5 text-amber-500" />
        </div>
      )
    }
    // 显示子文件夹内的前 4 个项目的缩略图（始终保持 2x2 布局）
    return (
      <div className="w-full pt-[100%] relative bg-amber-100/30 rounded-[2px] overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-2 gap-px p-px">
          {[0, 1, 2, 3].map((idx) => {
            const child = children[idx]
            if (!child) {
              return <div key={`empty-${idx}`} className="bg-black/5 rounded-[1px] aspect-square" />
            }
            // 如果子项是文件夹，获取其嵌套子项
            const nestedItems = child.type === 'FOLDER' && allItems
              ? allItems.filter(x => x.parentId === child.id).slice(0, 4)
              : undefined
            return <MiniIcon key={child.id} bookmark={child} nestedItems={nestedItems} />
          })}
        </div>
      </div>
    )
  }
  
  // 普通书签图标逻辑
  let customIcon = ''
  if (bookmark.iconType === 'BASE64' && bookmark.iconData) {
    customIcon = bookmark.iconData
  } else if (bookmark.iconUrl) {
    customIcon = getIconUrl(bookmark.url, bookmark.iconUrl)
  }
  const hasCustomIcon = Boolean(customIcon)
  
  return (
    <div className="w-full pt-[100%] relative bg-black/10 rounded-[2px] overflow-hidden">
      {hasCustomIcon ? (
        <img
          src={customIcon}
          className="absolute inset-0 w-full h-full object-cover"
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : bookmark.url ? (
        <Favicon
          url={bookmark.url}
          size={16}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <FolderIcon className="absolute inset-0 w-full h-full p-0.5 text-amber-500" />
      )}
    </div>
  )
}

/**
 * 极小图标组件（用于嵌套文件夹预览中的 2x2 网格内的图标）
 * 不再递归，只显示简单图标
 */
function TinyIcon({ bookmark }: { bookmark: Bookmark }) {
  const isFolder = bookmark.type === 'FOLDER'
  
  if (isFolder) {
    return (
      <div className="bg-amber-100/50 rounded-[0.5px] flex items-center justify-center aspect-square">
        <FolderIcon className="w-full h-full p-px text-amber-500" />
      </div>
    )
  }
  
  let customIcon = ''
  if (bookmark.iconType === 'BASE64' && bookmark.iconData) {
    customIcon = bookmark.iconData
  } else if (bookmark.iconUrl) {
    customIcon = getIconUrl(bookmark.url, bookmark.iconUrl)
  }
  const hasCustomIcon = Boolean(customIcon)
  
  if (hasCustomIcon) {
    return (
      <img
        src={customIcon}
        className="w-full h-full object-cover rounded-[0.5px] aspect-square"
        alt=""
        loading="lazy"
        decoding="async"
      />
    )
  }
  
  return (
    <Favicon
      url={bookmark.url || ''}
      size={6}
      className="w-full h-full object-cover rounded-[0.5px] aspect-square"
    />
  )
}

/**
 * 超小图标组件（用于子文件夹预览中的 2x2 网格）
 * 支持显示嵌套文件夹内的图标预览
 */
function MiniIcon({ bookmark, nestedItems }: { bookmark: Bookmark; nestedItems?: Bookmark[] }) {
  const isFolder = bookmark.type === 'FOLDER'
  
  if (isFolder) {
    const children = nestedItems || []
    if (children.length === 0) {
      // 空文件夹显示文件夹图标
      return (
        <div className="w-full h-full bg-amber-100/50 rounded-[1px] flex items-center justify-center aspect-square">
          <FolderIcon className="w-full h-full p-[1px] text-amber-500" />
        </div>
      )
    }
    // 显示嵌套文件夹内的前 4 个图标（2x2 网格）
    return (
      <div className="w-full h-full bg-amber-100/30 rounded-[1px] grid grid-cols-2 gap-[0.5px] p-[0.5px] aspect-square">
        {[0, 1, 2, 3].map((idx) => {
          const child = children[idx]
          if (!child) {
            return <div key={`empty-${idx}`} className="bg-black/5 rounded-[0.5px] aspect-square" />
          }
          return <TinyIcon key={child.id} bookmark={child} />
        })}
      </div>
    )
  }
  
  let customIcon = ''
  if (bookmark.iconType === 'BASE64' && bookmark.iconData) {
    customIcon = bookmark.iconData
  } else if (bookmark.iconUrl) {
    customIcon = getIconUrl(bookmark.url, bookmark.iconUrl)
  }
  const hasCustomIcon = Boolean(customIcon)
  
  if (hasCustomIcon) {
    return (
      <img
        src={customIcon}
        className="w-full h-full object-cover rounded-[1px]"
        alt=""
        loading="lazy"
        decoding="async"
      />
    )
  }
  
  return (
    <Favicon
      url={bookmark.url || ''}
      size={8}
      className="w-full h-full object-cover rounded-[1px]"
    />
  )
}

// 文件夹预览组件（显示子项缩略图）
function FolderPreview({ items, allItems }: { items: Bookmark[]; allItems?: Bookmark[] }) {
  if (items.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <FolderIcon className="w-6 h-6 text-amber-500" />
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-0.5 w-full h-full content-start p-[8%]">
      {items.slice(0, 9).map((sub) => {
        // 如果是子文件夹，获取其子项
        const subFolderItems = sub.type === 'FOLDER' && allItems
          ? allItems.filter(x => x.parentId === sub.id).slice(0, 4)
          : undefined
        return (
          <FolderPreviewIcon key={sub.id} bookmark={sub} subFolderItems={subFolderItems} allItems={allItems} />
        )
      })}
    </div>
  )
}
