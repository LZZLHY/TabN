import { toast } from 'sonner'
import { Button } from '../../ui/Button'
import { apiFetch } from '../../../services/api'
import { storageKey } from '../orderStorage'
import { updateOrderAfterDeleteFolder } from '../folderOperations'
import type { Bookmark } from '../types'

type DrawerDeleteDialogProps = {
  open: boolean
  isClosing: boolean
  item: Bookmark | null
  mode: 'release' | 'delete' // 释放：删除文件夹但保留子项；删除：删除文件夹及所有子项
  token: string | null
  userId: string | undefined
  activeFolderId: string | null
  allItems: Bookmark[]
  visibleIds: string[] // 当前显示顺序
  onClose: () => void
  onDeleted: (item: Bookmark, nextParentOrder: string[] | null) => void
  setActiveFolderId: (id: string | null) => void
  setOrder: (order: string[]) => void
  removeShortcut: (id: string) => void
  load: () => Promise<void>
}

/**
 * 书签页删除/释放确认对话框
 */
export function DrawerDeleteDialog({
  open,
  isClosing,
  item,
  mode,
  token,
  userId,
  activeFolderId,
  allItems,
  visibleIds,
  onClose,
  onDeleted,
  setActiveFolderId,
  setOrder,
  removeShortcut,
  load,
}: DrawerDeleteDialogProps) {
  if (!open || !item) return null

  const isFolder = item.type === 'FOLDER'
  const isRelease = mode === 'release'
  const childCount = isFolder ? allItems.filter((x) => x.parentId === item.id).length : 0

  const handleConfirm = async () => {
    onClose()
    if (!token || !item || !userId) return

    const folderId = item.id

    let nextParentOrder: string[] | null = null
    if (isFolder && isRelease) {
      // 释放模式：获取文件夹内的子项 ID，更新排序
      const childIds = allItems.filter((x) => x.parentId === folderId).map((x) => x.id)
      
      nextParentOrder = updateOrderAfterDeleteFolder({
        userId,
        context: 'drawer',
        parentId: item.parentId ?? null,
        folderId,
        childIds,
        currentVisibleIds: visibleIds,
      })
    }

    // 调用 API 删除
    // 释放模式：后端会将子项移动到父级
    // 删除模式：后端会级联删除所有子项
    const url = isRelease 
      ? `/api/bookmarks/${item.id}` 
      : `/api/bookmarks/${item.id}?cascade=true`
    const resp = await apiFetch(url, { method: 'DELETE', token })
    
    if (resp.ok) {
      toast.success(isRelease ? '已释放' : '已删除')
      removeShortcut(item.id)
      // 如果是删除模式，也要移除所有子项的快捷方式
      if (!isRelease && isFolder) {
        const childIds = allItems.filter((x) => x.parentId === folderId).map((x) => x.id)
        childIds.forEach(id => removeShortcut(id))
      }
      if (item.id === activeFolderId) setActiveFolderId(item.parentId ?? null)
      if (nextParentOrder) {
        if ((item.parentId ?? null) === activeFolderId) {
          setOrder(nextParentOrder)
        }
        try {
          localStorage.removeItem(storageKey(userId, item.id, 'drawer'))
        } catch {
          // ignore
        }
      }
      onDeleted(item, nextParentOrder)
      await load()
    } else {
      toast.error(resp.message)
    }
  }

  // 根据模式显示不同的标题和描述
  const title = isFolder && isRelease ? '确认释放' : '确认删除'
  const description = isFolder 
    ? (isRelease 
        ? `确定要释放收藏夹 "${item.name}" 吗？文件夹内的 ${childCount} 个书签将移动到上一级。`
        : `确定要删除收藏夹 "${item.name}" 吗？文件夹内的 ${childCount} 个书签将被一起删除，此操作不可恢复！`)
    : `确定要删除书签 "${item.name}" 吗？`
  const buttonText = isFolder && isRelease ? '释放' : '删除'
  const buttonClass = isRelease 
    ? 'bg-amber-600 border-amber-600 hover:bg-amber-700 text-white'
    : 'bg-red-600 border-red-600 hover:bg-red-700 text-white'

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
      <div 
        className={`absolute inset-0 bg-black/40 ${isClosing ? 'backdrop-exit' : 'backdrop-enter'}`} 
        onClick={onClose} 
      />
      <div className={`relative w-full max-w-sm glass-modal rounded-[var(--start-radius)] p-6 shadow-2xl ${isClosing ? 'modal-exit' : 'modal-enter'}`}>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-fg/70 mt-2">{description}</p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button 
            variant="primary" 
            className={buttonClass}
            onClick={handleConfirm}
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  )
}
