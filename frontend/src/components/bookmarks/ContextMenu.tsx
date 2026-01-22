import { createPortal } from 'react-dom'
import { Button } from '../ui/Button'
import type { Bookmark } from './types'

type ContextMenuProps = {
  menu: { open: true; x: number; y: number; item: Bookmark } | { open: false }
  menuClosing: boolean
  menuRef: React.RefObject<HTMLDivElement>
  menuOpenTime: React.MutableRefObject<number>
  closeMenu: () => void
  availableFolders: Bookmark[]
  onOpen: (item: Bookmark) => void
  onEdit: (item: Bookmark) => void
  onDelete: (item: Bookmark) => void
  onAddToFolder?: (item: Bookmark) => void
  onMoveToFolder: (item: Bookmark, folderId: string) => Promise<void>
  /** 快捷栏专用：移除快捷方式 */
  onRemoveShortcut?: (item: Bookmark) => void
  /** 书签页专用：添加/移除快捷方式 */
  isShortcut?: (id: string) => boolean
  onAddShortcut?: (item: Bookmark) => void
  isShortcutFull?: () => boolean
  /** 使用 Portal 渲染（书签页不需要，因为已经在 Portal 中） */
  usePortal?: boolean
  /** z-index 层级 */
  zIndex?: number
}

/**
 * 书签右键菜单组件
 */
export function ContextMenu({
  menu,
  menuClosing,
  menuRef,
  menuOpenTime,
  closeMenu,
  availableFolders,
  onOpen,
  onEdit,
  onDelete,
  onAddToFolder,
  onMoveToFolder,
  onRemoveShortcut,
  isShortcut,
  onAddShortcut,
  isShortcutFull,
  usePortal = true,
  zIndex = 60,
}: ContextMenuProps) {
  if (!menu.open) return null

  const content = (
    <div 
      className={`fixed inset-0 z-[${zIndex}] ${menuClosing ? 'animate-[fadeOut_120ms_ease-in]' : 'animate-[fadeIn_150ms_ease-out]'}`}
      onClick={(e) => { 
        e.stopPropagation()
        // 如果菜单刚刚打开（< 400ms），忽略这次点击（防止触摸模拟的 click 立即关闭菜单）
        if (Date.now() - menuOpenTime.current < 400) return
        closeMenu()
      }} 
      onContextMenu={(e) => { e.preventDefault(); closeMenu() }}
    >
      <div 
        ref={menuRef}
        className={`fixed z-[${zIndex + 1}] glass-panel-strong rounded-[var(--start-radius)] p-2 w-48 border border-glass-border/25 shadow-xl ${menuClosing ? 'animate-[menuCollapse_120ms_ease-in]' : 'animate-[menuExpand_150ms_ease-out]'}`}
        style={{ 
          left: menu.x > window.innerWidth - 200 ? undefined : menu.x,
          right: menu.x > window.innerWidth - 200 ? (window.innerWidth - menu.x) : undefined,
          top: Math.min(menu.y, window.innerHeight - 300),
          transformOrigin: menu.x > window.innerWidth - 200 ? 'top right' : 'top left'
        }}
      >
        <div className="px-2 py-2 text-xs text-fg/70 truncate border-b border-glass-border/10 mb-1">{menu.item.name}</div>
        
        {menu.item.type === 'FOLDER' ? (
          <>
            <Button variant="ghost" className="w-full justify-start h-8 text-sm" onClick={() => { closeMenu(); onOpen(menu.item) }}>打开</Button>
            {onAddToFolder && (
              <Button variant="ghost" className="w-full justify-start h-8 text-sm" onClick={() => { closeMenu(); onAddToFolder(menu.item) }}>添加书签</Button>
            )}
            <Button variant="ghost" className="w-full justify-start h-8 text-sm" onClick={() => { closeMenu(); onEdit(menu.item) }}>重命名</Button>
            
            {/* 书签页：添加/移除快捷方式 - 文件夹也支持 */}
            {isShortcut && onAddShortcut && (
              isShortcut(menu.item.id) ? (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-8 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50/10" 
                  onClick={() => { closeMenu(); onRemoveShortcut?.(menu.item) }}
                >
                  从Dock栏移除
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start h-8 text-sm ${isShortcutFull?.() ? 'text-fg/40 cursor-not-allowed' : 'text-primary hover:text-primary/80'}`}
                  disabled={isShortcutFull?.()}
                  onClick={() => { 
                    if (isShortcutFull?.()) return
                    closeMenu()
                    onAddShortcut(menu.item)
                  }}
                >
                  {isShortcutFull?.() ? 'Dock栏已满' : '添加至Dock栏'}
                </Button>
              )
            )}
          </>
        ) : (
          <>
            <Button variant="ghost" className="w-full justify-start h-8 text-sm" onClick={() => { closeMenu(); onEdit(menu.item) }}>编辑</Button>
            <Button variant="ghost" className="w-full justify-start h-8 text-sm" onClick={() => { closeMenu(); window.open(menu.item.url!, '_blank') }}>打开</Button>
            
            {/* 快捷栏：移除快捷方式 */}
            {onRemoveShortcut && (
              <Button 
                variant="ghost" 
                className="w-full justify-start h-8 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50/10" 
                onClick={() => { closeMenu(); onRemoveShortcut(menu.item) }}
              >
                从Dock栏移除
              </Button>
            )}
            
            {/* 书签页：添加/移除快捷方式 */}
            {isShortcut && onAddShortcut && (
              isShortcut(menu.item.id) ? (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-8 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50/10" 
                  onClick={() => { closeMenu(); onRemoveShortcut?.(menu.item) }}
                >
                  从Dock栏移除
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start h-8 text-sm ${isShortcutFull?.() ? 'text-fg/40 cursor-not-allowed' : 'text-primary hover:text-primary/80'}`}
                  disabled={isShortcutFull?.()}
                  onClick={() => { 
                    if (isShortcutFull?.()) return
                    closeMenu()
                    onAddShortcut(menu.item)
                  }}
                >
                  {isShortcutFull?.() ? 'Dock栏已满' : '添加至Dock栏'}
                </Button>
              )
            )}
            
            {/* 移动到文件夹 */}
            {availableFolders.length > 0 && (
              <div className="border-t border-glass-border/10 mt-1 pt-1">
                <div className="px-2 py-1 text-[10px] text-fg/50">移动到...</div>
                {availableFolders.map(folder => (
                  <Button 
                    key={folder.id} 
                    variant="ghost" 
                    className="w-full justify-start h-8 text-sm truncate" 
                    onClick={async () => { 
                      closeMenu()
                      await onMoveToFolder(menu.item, folder.id)
                    }}
                  >
                    📂 {folder.name}
                  </Button>
                ))}
              </div>
            )}
          </>
        )}
        
        <Button 
          variant="ghost" 
          className="w-full justify-start h-8 text-sm text-red-500 hover:text-red-600 hover:bg-red-50/10" 
          onClick={() => { closeMenu(); onDelete(menu.item) }}
        >
          删除
        </Button>
      </div>
    </div>
  )

  if (usePortal) {
    return createPortal(content, document.body)
  }
  return content
}
