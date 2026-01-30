import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { TagInput } from '../../ui/TagInput'
import { apiFetch } from '../../../services/api'
import { normalizeUrl } from '../../../utils/url'
import { useBookmarkRefreshStore } from '../../../stores/bookmarkRefresh'
import type { Bookmark } from '../types'

type DrawerEditDialogProps = {
  open: boolean
  isClosing: boolean
  item: Bookmark | null
  token: string | null
  // Form state
  editName: string
  setEditName: (name: string) => void
  editUrl: string
  setEditUrl: (url: string) => void
  editNote: string
  setEditNote: (note: string) => void
  editTags: string[]
  setEditTags: (tags: string[]) => void
  // Helpers
  allTags: string[]
  // Callbacks
  onClose: () => void
  onSaved: (itemId: string) => void
  load: (forceRefresh?: boolean) => Promise<void>
  loadTags: () => Promise<void>
}

/**
 * 书签页编辑对话框
 */
export function DrawerEditDialog({
  open,
  isClosing,
  item,
  token,
  editName,
  setEditName,
  editUrl,
  setEditUrl,
  editNote,
  setEditNote,
  editTags,
  setEditTags,
  allTags,
  onClose,
  onSaved,
  load,
  loadTags,
}: DrawerEditDialogProps) {
  const { t } = useTranslation()
  
  if (!open || !item) return null

  const handleSave = async () => {
    if (!token || !item) return
    
    const body: { name: string; url?: string; note?: string; tags?: string[] } = { 
      name: editName, 
      tags: editTags 
    }
    
    if (item.type === 'LINK') {
      body.url = normalizeUrl(editUrl)
      body.note = editNote
    }
    
    const resp = await apiFetch(`/api/bookmarks/${item.id}`, { 
      method: 'PATCH', 
      token, 
      body: JSON.stringify(body) 
    })
    
    if (resp.ok) {
      toast.success(t('toast.updateSuccess'))
      onClose()
      onSaved(item.id)
      // 触发全局刷新，通知其他组件（如 Dock）更新数据
      useBookmarkRefreshStore.getState().triggerRefresh()
      await Promise.all([load(true), loadTags()])
    } else {
      toast.error(resp.message)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
      <div 
        className={`absolute inset-0 bg-black/40 ${isClosing ? 'backdrop-exit' : 'backdrop-enter'}`} 
        onClick={onClose} 
      />
      <div className={`relative w-full max-w-sm max-h-[90vh] overflow-y-auto glass-modal rounded-[var(--start-radius)] p-6 shadow-2xl space-y-4 ${isClosing ? 'modal-exit' : 'modal-enter'}`}>
        <h3 className="font-semibold text-lg">{item.type === 'FOLDER' ? t('bookmarks.editFolder') : t('bookmarks.editBookmark')}</h3>
        
        <div className="space-y-1">
          <label className="text-xs text-fg/60">{t('bookmarks.name')}</label>
          <Input value={editName} onChange={e => setEditName(e.target.value)} />
        </div>
        
        {item.type === 'LINK' && (
          <>
            <div className="space-y-1">
              <label className="text-xs text-fg/60">{t('bookmarks.url')}</label>
              <Input value={editUrl} onChange={e => setEditUrl(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-fg/60">{t('bookmarks.note')}</label>
              <Input value={editNote} onChange={e => setEditNote(e.target.value)} />
            </div>
          </>
        )}
        
        <div className="space-y-1">
          <label className="text-xs text-fg/60">{t('bookmarks.tags')}</label>
          <TagInput
            value={editTags}
            onChange={setEditTags}
            suggestions={allTags}
            placeholder={t('bookmarks.tagsPlaceholder')}
          />
        </div>
        
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={handleSave}>{t('common.save')}</Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
