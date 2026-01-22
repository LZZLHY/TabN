import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { TagInput } from '../../ui/TagInput'
import { cn } from '../../../utils/cn'
import type { BookmarkType } from '../types'

type CreateDialogProps = {
  open: boolean
  parentId: string | null
  type: BookmarkType
  name: string
  url: string
  note: string
  tags: string[]
  allTags: string[]
  titleLoading: boolean
  titleFallback: string
  onClose: () => void
  onTypeChange: (type: BookmarkType) => void
  onNameChange: (value: string) => void
  onUrlChange: (value: string) => void
  onUrlBlur: () => void
  onNoteChange: (value: string) => void
  onTagsChange: (tags: string[]) => void
  onSubmit: () => Promise<void>
  /** 使用 Portal 渲染 */
  usePortal?: boolean
  /** z-index 层级 */
  zIndex?: number
}

/**
 * 创建书签/文件夹对话框
 */
export function CreateDialog({
  open,
  parentId,
  type,
  name,
  url,
  note,
  tags,
  allTags,
  titleLoading,
  titleFallback,
  onClose,
  onTypeChange,
  onNameChange,
  onUrlChange,
  onUrlBlur,
  onNoteChange,
  onTagsChange,
  onSubmit,
  usePortal = true,
  zIndex = 70,
}: CreateDialogProps) {
  if (!open) return null

  const content = (
    <div className={`fixed inset-0 z-[${zIndex}] flex items-center justify-center p-6`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm glass-modal rounded-[var(--start-radius)] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="font-semibold text-lg">{parentId ? '添加到文件夹' : '新增书签/文件夹'}</h3>
        
        <div className="flex gap-2 bg-glass/5 p-1 rounded-xl">
          <button 
            className={cn("flex-1 py-1.5 text-xs font-medium rounded-lg transition-all", type === 'LINK' ? "bg-white/20 shadow-sm text-fg" : "text-fg/50")} 
            onClick={() => onTypeChange('LINK')}
          >
            网址
          </button>
          <button 
            className={cn("flex-1 py-1.5 text-xs font-medium rounded-lg transition-all", type === 'FOLDER' ? "bg-white/20 shadow-sm text-fg" : "text-fg/50")} 
            onClick={() => onTypeChange('FOLDER')}
          >
            文件夹
          </button>
        </div>

        {type === 'LINK' && (
          <div className="space-y-1">
            <label className="text-xs text-fg/60">网址</label>
            <Input 
              value={url} 
              onChange={e => onUrlChange(e.target.value)}
              onBlur={onUrlBlur}
              placeholder="example.com" 
              autoFocus
            />
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <label className="text-xs text-fg/60">{type === 'FOLDER' ? '名称' : '名称（可选）'}</label>
            {titleLoading && type === 'LINK' && (
              <Loader2 className="w-3 h-3 animate-spin text-fg/40" />
            )}
          </div>
          <Input 
            value={name} 
            onChange={e => onNameChange(e.target.value)}
            placeholder={type === 'LINK' ? (titleFallback || '自动获取或手动输入') : ''}
            autoFocus={type === 'FOLDER'}
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-xs text-fg/60">备注</label>
          <Input value={note} onChange={e => onNoteChange(e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-fg/60">标签</label>
          <TagInput
            value={tags}
            onChange={onTagsChange}
            suggestions={allTags}
            placeholder="输入标签后按回车添加"
          />
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={onSubmit}>创建</Button>
        </div>
      </div>
    </div>
  )

  if (usePortal) {
    return createPortal(content, document.body)
  }
  return content
}
