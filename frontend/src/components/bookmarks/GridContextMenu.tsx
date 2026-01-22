import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { Button } from '../ui/Button'
import type { Bookmark, MenuState } from './types'

type GridContextMenuProps = {
  menu: MenuState
  menuClosing: boolean
  menuOpenTime: React.MutableRefObject<number>
  availableFolders: Bookmark[]
  onClose: () => void
  onOpenFolder: (id: string) => void
  onAddToFolder: (folderId: string) => void
  onEdit: (item: Bookmark) => void
  onDelete: (item: Bookmark, mode: 'release' | 'delete') => void
  onRemoveShortcut: (id: string) => void
  onMoveToFolder: (item: Bookmark, folderId: string) => Promise<void>
}

/**
 * 快捷栏右键菜单组件
 */
export function GridContextMenu({
  menu,
  menuClosing,
  menuOpenTime,
  availableFolders,
  onClose,
  onOpenFolder,
  onAddToFolder,
  onEdit,
  onDelete,
  onRemoveShortcut,
  onMoveToFolder,
}: GridContextMenuProps) {
  if (!menu.open) return null

  return createPortal(
    <div 
      className={`fixed inset-0 z-[60] ${menuClosing ? 'animate-[fadeOut_120ms_ease-in]' : 'animate-[fadeIn_150ms_ease-out]'}`}
      onClick={(e) => { 
        e.stopPropagation()
        // 如果菜单刚刚打开（< 400ms），忽略这次点击（防止触摸模拟的 click 立即关闭菜单）
        if (Date.now() - menuOpenTime.current < 400) return
        onClose()
      }} 
      onContextMenu={(e) => { e.preventDefault(); onClose() }}
    >
      <div 
        className={`fixed z-[61] glass-panel-strong rounded-[var(--start-radius)] p-2 w-48 border border-glass-border/25 shadow-xl ${menuClosing ? 'animate-[menuCollapse_120ms_ease-in]' : 'animate-[menuExpand_150ms_ease-out]'}`}
        style={{ 
          left: menu.x > window.innerWidth - 200 ? undefined : menu.x,
          right: menu.x > window.innerWidth - 200 ? (window.innerWidth - menu.x) : undefined,
          bottom: window.innerHeight - menu.y + 8,
          transformOrigin: menu.x > window.innerWidth - 200 ? 'bottom right' : 'bottom left'
        }}
      >
        <div className="px-2 py-2 text-xs text-fg/70 truncate border-b border-glass-border/10 mb-1">{menu.item.name}</div>
        {menu.item.type === 'FOLDER' ? (
          <>
            <Button variant="ghost" className="w-full justify-start h-8 text-sm" onClick={() => { onClose(); onOpenFolder(menu.item.id) }}>打开</Button>
            <Button variant="ghost" className="w-full justify-start h-8 text-sm" onClick={() => { onClose(); onAddToFolder(menu.item.id) }}>添加书签</Button>
            <Button variant="ghost" className="w-full justify-start h-8 text-sm" onClick={() => { onClose(); onEdit(menu.item) }}>重命名</Button>
            <Button variant="ghost" className="w-full justify-start h-8 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50/10" onClick={() => { onClose(); onRemoveShortcut(menu.item.id); toast.success('已从Dock栏移除') }}>从Dock栏移除</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" className="w-full justify-start h-8 text-sm" onClick={() => { onClose(); onEdit(menu.item) }}>编辑</Button>
            <Button variant="ghost" className="w-full justify-start h-8 text-sm" onClick={() => { onClose(); window.open(menu.item.url!, '_blank') }}>打开</Button>
            {/* 移除快捷方式（非破坏性操作） */}
            <Button variant="ghost" className="w-full justify-start h-8 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50/10" onClick={() => { onClose(); onRemoveShortcut(menu.item.id); toast.success('已从Dock栏移除') }}>从Dock栏移除</Button>
            {/* Move to Folder Options */}
            {availableFolders.length > 0 && (
              <div className="border-t border-glass-border/10 mt-1 pt-1">
                <div className="px-2 py-1 text-[10px] text-fg/50">移动到...</div>
                {availableFolders.map(folder => (
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
                ))}
              </div>
            )}
          </>
        )}
        {menu.item.type === 'FOLDER' ? (
          <>
            <Button variant="ghost" className="w-full justify-start h-8 text-sm text-amber-500 hover:text-amber-600 hover:bg-amber-50/10" onClick={() => { onClose(); onDelete(menu.item, 'release') }}>释放</Button>
            <Button variant="ghost" className="w-full justify-start h-8 text-sm text-red-500 hover:text-red-600 hover:bg-red-50/10" onClick={() => { onClose(); onDelete(menu.item, 'delete') }}>删除</Button>
          </>
        ) : (
          <Button variant="ghost" className="w-full justify-start h-8 text-sm text-red-500 hover:text-red-600 hover:bg-red-50/10" onClick={() => { onClose(); onDelete(menu.item, 'delete') }}>删除</Button>
        )}
        <Button variant="ghost" className="w-full justify-start h-8 text-sm" onClick={() => { onClose(); toast.info('直接拖拽即可整理/创建收藏夹') }}>移动/整理</Button>
      </div>
    </div>,
    document.body
  )
}
