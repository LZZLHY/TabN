import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Folder as FolderIcon, X } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Favicon } from '../Favicon'
import { getSortedFolderChildren } from './folderOperations'
import type { Bookmark } from './types'
import type { BookmarkContext } from '../../types/bookmark'

type FolderModalProps = {
  open: boolean
  folder: Bookmark | null
  folderItems: Bookmark[]
  allItems: Bookmark[] // 用于子文件夹预览
  userId?: string
  context?: BookmarkContext
  originRect: DOMRect | null // 文件夹图标的原始位置（初始值）
  getElRef?: (id: string) => HTMLElement | null | undefined // 用于实时获取文件夹元素位置
  onClose: () => void
  onItemClick: (item: Bookmark) => void
  onSubFolderClick: (folder: Bookmark, rect: DOMRect) => void
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
  originRect,
  getElRef,
  onClose,
  onItemClick,
  onSubFolderClick,
}: FolderModalProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // 打开动画
  useEffect(() => {
    if (open && folder) {
      // 延迟一帧后开始动画，确保初始状态已渲染
      requestAnimationFrame(() => {
        setIsVisible(true)
      })
    }
  }, [open, folder])

  // 关闭动画
  const handleClose = () => {
    setIsClosing(true)
    setIsVisible(false)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 250)
  }

  if (!open && !isClosing) return null
  if (!folder) return null

  // 实时计算动画起点 - 优先使用 getElRef 获取最新位置
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  let originX = centerX
  let originY = centerY
  
  // 优先尝试通过 getElRef 获取文件夹元素的实时位置
  if (getElRef && folder) {
    const el = getElRef(folder.id)
    if (el) {
      const iconEl = el.querySelector('.bookmark-icon') || el
      const rect = iconEl.getBoundingClientRect()
      originX = rect.left + rect.width / 2
      originY = rect.top + rect.height / 2
    } else if (originRect) {
      originX = originRect.left + originRect.width / 2
      originY = originRect.top + originRect.height / 2
    }
  } else if (originRect) {
    originX = originRect.left + originRect.width / 2
    originY = originRect.top + originRect.height / 2
  }
  
  // 计算从中心到起点的偏移量
  const offsetX = originX - centerX
  const offsetY = originY - centerY

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className={cn(
          'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-250',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleClose}
      />
      
      {/* 模态框内容 */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full max-w-sm glass-modal rounded-[var(--start-radius)] shadow-2xl overflow-hidden',
          'transition-all duration-250 ease-out'
        )}
        style={{
          transformOrigin: 'center center',
          transform: isVisible 
            ? 'scale(1) translate(0, 0)' 
            : `scale(0.3) translate(${offsetX}px, ${offsetY}px)`,
          opacity: isVisible ? 1 : 0,
        } as React.CSSProperties}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-glass-border/30">
          <h3 className="font-semibold text-lg truncate">{folder.name}</h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-glass/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区域 */}
        <div 
          ref={contentRef}
          className="p-4 max-h-[60vh] overflow-y-auto"
        >
          {folderItems.length === 0 ? (
            <div className="text-center text-fg/50 py-8">
              文件夹为空
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {folderItems.map((item) => {
                const isSubFolder = item.type === 'FOLDER'
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-glass/30 transition-colors group"
                    onClick={(e) => {
                      if (isSubFolder) {
                        const rect = e.currentTarget.getBoundingClientRect()
                        onSubFolderClick(item, rect)
                      } else {
                        onItemClick(item)
                      }
                    }}
                  >
                    <div
                      className={cn(
                        'h-12 w-12 rounded-[var(--start-radius)] overflow-hidden grid place-items-center relative',
                        isSubFolder
                          ? 'bg-glass/20 border border-glass-border/20 p-[2px]'
                          : 'bg-primary/15 text-primary font-semibold'
                      )}
                    >
                      {isSubFolder ? (
                        <FolderPreview items={getSortedFolderChildren(allItems.filter(x => x.parentId === item.id), userId, item.id, context || 'drawer').slice(0, 9)} />
                      ) : (
                        <Favicon
                          url={item.url || ''}
                          name={item.name}
                          className="h-full w-full object-cover"
                          letterClassName="h-full w-full"
                        />
                      )}
                    </div>
                    <span className="text-[11px] text-fg/80 truncate w-full text-center">
                      {item.name}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// 文件夹预览组件（显示子项缩略图）
function FolderPreview({ items }: { items: Bookmark[] }) {
  if (items.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <FolderIcon className="w-6 h-6 text-amber-500" />
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-0.5 w-full h-full content-start">
      {items.slice(0, 9).map((sub) => (
        <div
          key={sub.id}
          className="w-full pt-[100%] relative bg-black/10 rounded-[2px] overflow-hidden"
        >
          {sub.url ? (
            <Favicon
              url={sub.url}
              name={sub.name}
              size={16}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <FolderIcon className="absolute inset-0 w-full h-full p-0.5 text-amber-500" />
          )}
        </div>
      ))}
    </div>
  )
}
