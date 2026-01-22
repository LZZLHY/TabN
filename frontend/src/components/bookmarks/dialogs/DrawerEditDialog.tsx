import { toast } from 'sonner'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { TagInput } from '../../ui/TagInput'
import { apiFetch } from '../../../services/api'
import { normalizeUrl } from '../../../utils/url'
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
  editIconUrl: string
  setEditIconUrl: (url: string) => void
  editIconPreviewError: boolean
  setEditIconPreviewError: (error: boolean) => void
  // Helpers
  allTags: string[]
  // Callbacks
  onClose: () => void
  onSaved: (itemId: string) => void
  load: () => Promise<void>
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
  editIconUrl,
  setEditIconUrl,
  editIconPreviewError,
  setEditIconPreviewError,
  allTags,
  onClose,
  onSaved,
  load,
  loadTags,
}: DrawerEditDialogProps) {
  if (!open || !item) return null

  const handleSave = async () => {
    if (!token || !item) return
    
    const body: { name: string; url?: string; note?: string; tags?: string[]; iconUrl?: string | null } = { 
      name: editName, 
      tags: editTags 
    }
    
    if (item.type === 'LINK') {
      body.url = normalizeUrl(editUrl)
      body.note = editNote
      body.iconUrl = editIconUrl.trim() || null
    }
    
    const resp = await apiFetch(`/api/bookmarks/${item.id}`, { 
      method: 'PATCH', 
      token, 
      body: JSON.stringify(body) 
    })
    
    if (resp.ok) {
      toast.success('已更新')
      onClose()
      onSaved(item.id)
      await Promise.all([load(), loadTags()])
    } else {
      toast.error(resp.message)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
      <div 
        className={`absolute inset-0 bg-black/40 ${isClosing ? 'backdrop-exit' : 'backdrop-enter'}`} 
        onClick={onClose} 
      />
      <div className={`relative w-full max-w-sm max-h-[90vh] overflow-y-auto glass-modal rounded-[var(--start-radius)] p-6 shadow-2xl space-y-4 ${isClosing ? 'modal-exit' : 'modal-enter'}`}>
        <h3 className="font-semibold text-lg">编辑{item.type === 'FOLDER' ? '文件夹' : '书签'}</h3>
        
        <div className="space-y-1">
          <label className="text-xs text-fg/60">名称</label>
          <Input value={editName} onChange={e => setEditName(e.target.value)} />
        </div>
        
        {item.type === 'LINK' && (
          <>
            <div className="space-y-1">
              <label className="text-xs text-fg/60">网址</label>
              <Input value={editUrl} onChange={e => setEditUrl(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-fg/60">备注</label>
              <Input value={editNote} onChange={e => setEditNote(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-fg/60">自定义图标 URL（可选）</label>
              <div className="flex items-center gap-2">
                <Input 
                  value={editIconUrl} 
                  onChange={e => {
                    setEditIconUrl(e.target.value)
                    setEditIconPreviewError(false)
                  }}
                  placeholder="https://example.com/icon.png"
                  className="flex-1"
                />
                {/* Icon preview */}
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-glass/20 border border-glass-border/20 flex-shrink-0 grid place-items-center">
                  {editIconUrl.trim() ? (
                    editIconPreviewError ? (
                      <span className="text-xs text-fg/40">×</span>
                    ) : (
                      <img
                        src={editIconUrl.trim()}
                        alt="icon preview"
                        className="w-full h-full object-cover"
                        onError={() => setEditIconPreviewError(true)}
                        onLoad={() => setEditIconPreviewError(false)}
                      />
                    )
                  ) : (
                    <span className="text-xs text-fg/40">预览</span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-fg/40 mt-0.5">留空则使用默认图标</p>
            </div>
          </>
        )}
        
        <div className="space-y-1">
          <label className="text-xs text-fg/60">标签</label>
          <TagInput
            value={editTags}
            onChange={setEditTags}
            suggestions={allTags}
            placeholder="输入标签后按回车添加"
          />
        </div>
        
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={handleSave}>保存</Button>
        </div>
      </div>
    </div>
  )
}
