import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
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
  /** 获取书签元素的函数（用于淡出动画） */
  getEl?: (id: string) => HTMLDivElement | undefined
  /** 保存位置快照的函数（用于补位动画） */
  savePositions?: () => void
  /** 触发补位动画的函数 */
  triggerFillAnimation?: () => void
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
  getEl,
  savePositions,
  triggerFillAnimation,
}: DrawerDeleteDialogProps) {
  const { t } = useTranslation()
  
  if (!open || !item) return null

  const isFolder = item.type === 'FOLDER'
  const isRelease = mode === 'release'
  const childCount = isFolder ? allItems.filter((x) => x.parentId === item.id).length : 0

  const handleConfirm = async () => {
    onClose()
    if (!token || !item || !userId) return

    const folderId = item.id

    // 0. 保存当前位置快照（用于补位动画）
    savePositions?.()
    
    // 1. 获取书签元素并添加淡出动画类
    const el = getEl?.(item.id)
    if (el) {
      el.classList.add('bookmark-fade-out')
    }
    
    // 2. 等待动画完成（200ms，与 CSS 动画时长一致）
    await new Promise(resolve => setTimeout(resolve, 200))

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
      toast.success(isRelease ? t('toast.released') : t('toast.deleted'))
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
      
      // 触发补位动画
      triggerFillAnimation?.()
    } else {
      // 删除失败，移除动画类恢复显示
      if (el) {
        el.classList.remove('bookmark-fade-out')
      }
      toast.error(resp.message)
    }
  }

  // 根据模式显示不同的标题和描述
  const title = isFolder && isRelease ? t('bookmarks.confirmRelease') : t('bookmarks.confirmDelete')
  const description = isFolder 
    ? (isRelease 
        ? t('bookmarks.releaseConfirmDesc', { name: item.name, count: childCount })
        : t('bookmarks.deleteConfirmDesc', { name: item.name, count: childCount }))
    : t('bookmarks.deleteConfirm', { name: item.name })
  const buttonText = isFolder && isRelease ? t('bookmarks.release') : t('bookmarks.delete')
  const buttonClass = isRelease 
    ? 'bg-amber-600 border-amber-600 hover:bg-amber-700 text-white'
    : 'bg-red-600 border-red-600 hover:bg-red-700 text-white'

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
      <div 
        className={`absolute inset-0 bg-black/40 ${isClosing ? 'backdrop-exit' : 'backdrop-enter'}`} 
        onClick={onClose} 
      />
      <div className={`relative w-full max-w-sm glass-modal rounded-[var(--start-radius)] p-6 shadow-2xl ${isClosing ? 'modal-exit' : 'modal-enter'}`}>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-fg/70 mt-2">{description}</p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button 
            variant="primary" 
            className={buttonClass}
            onClick={handleConfirm}
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
