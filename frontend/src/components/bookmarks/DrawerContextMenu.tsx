import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '../ui/Button'
import type { Bookmark, MenuState } from './types'

type DrawerContextMenuProps = {
  menu: MenuState
  menuClosing: boolean
  menuOpenTime: React.MutableRefObject<number>
  availableFolders: Bookmark[]
  isShortcut: (id: string) => boolean
  isShortcutFull: () => boolean
  /** 当前打开的文件夹 ID（如果在文件夹内） */
  activeFolderId?: string | null
  onClose: () => void
  onOpenFolder: (id: string) => void
  onAddToFolder: (folderId: string) => void
  onEdit: (item: Bookmark) => void
  /** 编辑图标回调 */
  onEditIcon?: (item: Bookmark) => void
  onDelete: (item: Bookmark, mode: 'release' | 'delete') => void
  onAddShortcut: (id: string) => void
  onRemoveShortcut: (id: string) => void
  onMoveToFolder: (item: Bookmark, folderId: string) => Promise<void>
  /** 移出当前文件夹（移动到上一级） */
  onRemoveFromFolder?: (item: Bookmark) => Promise<void>
  /** 进入批量删除模式的回调 */
  onBatchDelete?: () => void
}

/**
 * 书签页右键菜单组件
 */
export function DrawerContextMenu({
  menu,
  menuClosing,
  menuOpenTime,
  availableFolders,
  isShortcut,
  isShortcutFull,
  activeFolderId,
  onClose,
  onOpenFolder,
  onAddToFolder,
  onEdit,
  onEditIcon,
  onDelete,
  onAddShortcut,
  onRemoveShortcut,
  onMoveToFolder,
  onRemoveFromFolder,
  onBatchDelete,
}: DrawerContextMenuProps) {
  const { t } = useTranslation()
  const [showFolderSubmenu, setShowFolderSubmenu] = useState(false)
  const [showEditSubmenu, setShowEditSubmenu] = useState(false)
  const [folderSearch, setFolderSearch] = useState('')
  const folderSearchRef = useRef<HTMLInputElement | null>(null)

  // “添加到”二级菜单打开时延迟聚焦，避免 autoFocus 抢焦点导致滑入动画首帧被吞
  useEffect(() => {
    if (!menu.open) return
    if (!showFolderSubmenu) return
    const tmr = window.setTimeout(() => {
      folderSearchRef.current?.focus()
    }, 160)
    return () => window.clearTimeout(tmr)
  }, [menu.open, showFolderSubmenu])
  
  // 菜单关闭时重置二级菜单状态
  if (!menu.open) {
    if (showFolderSubmenu || showEditSubmenu || folderSearch) {
      // 使用 setTimeout 避免在渲染期间调用 setState
      setTimeout(() => {
        setShowFolderSubmenu(false)
        setShowEditSubmenu(false)
        setFolderSearch('')
      }, 0)
    }
    return null
  }
  
  // 当前显示的二级菜单类型
  const activeSubmenu = showFolderSubmenu ? 'folder' : showEditSubmenu ? 'edit' : null
  
  // 过滤文件夹
  const filteredFolders = folderSearch
    ? availableFolders.filter(f => f.name.toLowerCase().includes(folderSearch.toLowerCase()))
    : availableFolders

  const itemIsShortcut = isShortcut(menu.item.id)
  const shortcutFull = isShortcutFull()

  return createPortal(
    <div 
      className={`fixed inset-0 z-[140] ${menuClosing ? 'animate-[fadeOut_120ms_ease-in]' : 'animate-[fadeIn_150ms_ease-out]'}`}
      onClick={(e) => { 
        e.stopPropagation()
        // 如果菜单刚刚打开（< 400ms），忽略这次点击（防止触摸模拟的 click 立即关闭菜单）
        if (Date.now() - menuOpenTime.current < 400) return
        onClose()
      }} 
      onContextMenu={(e) => { e.preventDefault(); onClose() }}
      onTouchStart={(e) => {
        // 如果触摸发生在菜单内部，不关闭
        const target = e.target as HTMLElement
        if (target.closest('[data-menu-content]')) return
        onClose()
      }}
    >
      <div 
        data-menu-content
        className={`fixed z-[141] glass-panel-strong rounded-[var(--start-radius)] p-2 w-fit min-w-36 max-w-52 border border-glass-border/25 shadow-xl ${menuClosing ? 'animate-[menuCollapse_120ms_ease-in]' : 'animate-[menuExpand_150ms_ease-out]'}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        style={{ 
          left: menu.x > window.innerWidth - 240 ? undefined : menu.x,
          right: menu.x > window.innerWidth - 240 ? (window.innerWidth - menu.x) : undefined,
          top: Math.min(menu.y, window.innerHeight - 300),
          transformOrigin: menu.x > window.innerWidth - 240 ? 'top right' : 'top left'
        }}
      >
        {/* 翻页容器 */}
        <div className="overflow-hidden">
          {/* 一级菜单 */}
          {!activeSubmenu ? (
            <div className="animate-[slideInFromLeft_150ms_ease-out_both]">
              <div className="px-2 py-2 text-xs text-fg/70 truncate border-b border-glass-border/10 mb-1">{menu.item.name}</div>
            {menu.item.type === 'FOLDER' ? (
              <>
                <Button variant="ghost" className="w-full justify-start h-8 text-sm" onClick={() => { onClose(); onOpenFolder(menu.item.id) }}>{t('bookmarks.open')}</Button>
                <Button variant="ghost" className="w-full justify-start h-8 text-sm" onClick={() => { onClose(); onAddToFolder(menu.item.id) }}>{t('bookmarks.addBookmark')}</Button>
                <Button variant="ghost" className="w-full justify-start h-8 text-sm" onClick={() => { onClose(); onEdit(menu.item) }}>{t('bookmarks.rename')}</Button>
                {/* 快捷方式操作 - 文件夹也支持 */}
                {itemIsShortcut ? (
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start h-8 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50/10" 
                    onClick={() => { onClose(); onRemoveShortcut(menu.item.id); toast.success(t('bookmarks.removedFromDock')) }}
                  >
                    {t('bookmarks.removeFromDock')}
                  </Button>
                ) : (
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start h-8 text-sm ${shortcutFull ? 'text-fg/40 cursor-not-allowed' : 'text-primary hover:text-primary/80'}`}
                    disabled={shortcutFull}
                    onClick={() => { 
                      if (shortcutFull) return
                      onClose()
                      onAddShortcut(menu.item.id)
                      toast.success(t('bookmarks.addedToDock'))
                    }}
                  >
                    {shortcutFull ? t('bookmarks.dockFull') : t('bookmarks.addToDock')}
                  </Button>
                )}
                {/* 批量删除按钮 */}
                {onBatchDelete && (
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start h-8 text-sm" 
                    onClick={() => { onClose(); onBatchDelete() }}
                  >
                    {t('bookmarks.batchDelete')}
                  </Button>
                )}
                <Button variant="ghost" className="w-full justify-start h-8 text-sm text-amber-500 hover:text-amber-600 hover:bg-amber-50/10" onClick={() => { onClose(); onDelete(menu.item, 'release') }}>{t('bookmarks.release')}</Button>
                <Button variant="ghost" className="w-full justify-start h-8 text-sm text-red-500 hover:text-red-600 hover:bg-red-50/10" onClick={() => { onClose(); onDelete(menu.item, 'delete') }}>{t('bookmarks.delete')}</Button>
              </>
            ) : (
              <>
                {/* 编辑 - 二级菜单 */}
                <Button 
                  variant="ghost" 
                  className="w-full justify-between h-8 text-sm" 
                  onClick={() => setShowEditSubmenu(true)}
                >
                  <span>{t('bookmarks.edit')}</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="ghost" className="w-full justify-start h-8 text-sm" onClick={() => { onClose(); window.open(menu.item.url!, '_blank') }}>{t('bookmarks.open')}</Button>
                
                {/* 快捷方式操作 */}
                {itemIsShortcut ? (
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start h-8 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50/10" 
                    onClick={() => { onClose(); onRemoveShortcut(menu.item.id); toast.success(t('bookmarks.removedFromDock')) }}
                  >
                    {t('bookmarks.removeFromDock')}
                  </Button>
                ) : (
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start h-8 text-sm ${shortcutFull ? 'text-fg/40 cursor-not-allowed' : 'text-primary hover:text-primary/80'}`}
                    disabled={shortcutFull}
                    onClick={() => { 
                      if (shortcutFull) return
                      onClose()
                      onAddShortcut(menu.item.id)
                      toast.success(t('bookmarks.addedToDock'))
                    }}
                  >
                    {shortcutFull ? t('bookmarks.dockFull') : t('bookmarks.addToDock')}
                  </Button>
                )}
                
                {/* 移除当前文件夹（移动到上一级） */}
                {activeFolderId && onRemoveFromFolder && (
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start h-8 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50/10" 
                    onClick={async () => { 
                      onClose()
                      await onRemoveFromFolder(menu.item)
                    }}
                  >
                    {t('bookmarks.moveOutFolder')}
                  </Button>
                )}
                
                {/* 添加到文件夹 - 翻页按钮 */}
                {availableFolders.length > 0 && (
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between h-8 text-sm" 
                    onClick={() => setShowFolderSubmenu(true)}
                  >
                    <span>{t('bookmarks.addTo')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
                
                {/* 批量删除按钮 */}
                {onBatchDelete && (
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start h-8 text-sm" 
                    onClick={() => { onClose(); onBatchDelete() }}
                  >
                    {t('bookmarks.batchDelete')}
                  </Button>
                )}
                
                <Button variant="ghost" className="w-full justify-start h-8 text-sm text-red-500 hover:text-red-600 hover:bg-red-50/10" onClick={() => { onClose(); onDelete(menu.item, 'delete') }}>{t('bookmarks.delete')}</Button>
              </>
            )}
            <Button variant="ghost" className="w-full justify-start h-8 text-sm" onClick={() => { onClose(); toast.info(t('bookmarks.dragToOrganize')) }}>{t('bookmarks.moveOrganize')}</Button>
            </div>
          ) : activeSubmenu === 'folder' ? (
            <div className="flex flex-col max-h-64 animate-[slideInFromRight_150ms_ease-out_both]">
              <div className="flex items-center gap-1 px-1 py-1 border-b border-glass-border/10">
                <Button 
                  variant="ghost" 
                  className="h-6 w-6 p-0 flex-shrink-0" 
                  onClick={() => setShowFolderSubmenu(false)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <input
                  ref={folderSearchRef}
                  type="text"
                  placeholder={t('bookmarks.searchFolder')}
                  value={folderSearch}
                  onChange={(e) => setFolderSearch(e.target.value)}
                  className="flex-1 h-6 px-2 text-xs bg-transparent border-none outline-none placeholder:text-fg/40"
                />
              </div>
              <div className="overflow-y-auto flex-1" onTouchMove={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
                {filteredFolders.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-fg/50 text-center">{t('bookmarks.noMatchingFolder')}</div>
                ) : (
                  filteredFolders.map(folder => (
                    <Button 
                      key={folder.id} 
                      variant="ghost" 
                      className="w-full justify-start h-8 text-sm truncate" 
                      onClick={async () => { 
                        onClose()
                        await onMoveToFolder(menu.item, folder.id)
                      }}
                    >
                      📂 {folder.name}
                    </Button>
                  ))
                )}
              </div>
            </div>
          ) : activeSubmenu === 'edit' ? (
            <div className="animate-[slideInFromRight_150ms_ease-out_both]">
              <div className="flex items-center gap-1 px-1 py-1 border-b border-glass-border/10 mb-1">
                <Button 
                  variant="ghost" 
                  className="h-6 w-6 p-0 flex-shrink-0" 
                  onClick={() => setShowEditSubmenu(false)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-fg/70">{t('bookmarks.edit')}</span>
              </div>
              <Button 
                variant="ghost" 
                className="w-full justify-start h-8 text-sm" 
                onClick={() => { onClose(); onEdit(menu.item) }}
              >
                {t('bookmarks.changeInfo')}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start h-8 text-sm" 
                onClick={() => { onClose(); onEditIcon?.(menu.item) }}
              >
                {t('bookmarks.changeIcon')}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  )
}
