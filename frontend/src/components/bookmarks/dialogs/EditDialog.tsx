import { createPortal } from 'react-dom'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { TagInput } from '../../ui/TagInput'
import type { Bookmark } from '../types'

type EditDialogProps = {
  open: boolean
  item: Bookmark | null
  name: string
  url: string
  note: string
  tags: string[]
  allTags: string[]
  /** 自定义图标 URL（仅书签页使用） */
  iconUrl?: string
  iconPreviewError?: boolean
  onClose: () => void
  onNameChange: (value: string) => void
  onUrlChange: (value: string) => void
  onNoteChange: (value: string) => void
  onTagsChange: (tags: string[]) => void
  onIconUrlChange?: (value: string) => void
  onIconPreviewError?: (error: boolean) => void
  onSubmit: () => Promise<void>
  /** 使用 Portal 渲染 */
  usePortal?: boolean
  /** z-index 层级 */
  zIndex?: number
}

/**
 * 编辑书签/文件夹对话框
 */
export function EditDialog({
  open,
  item,
  name,
  url,
  note,
  tags,
  allTags,
  iconUrl,
  iconPreviewError,
  onClose,
  onNameChange,
  onUrlChange,
  onNoteChange,
  onTagsChange,
  onIconUrlChange,
  onIconPreviewError,
  onSubmit,
  usePortal = true,
  zIndex = 70,
}: EditDialogProps) {
  if (!open || !item) return null

  const content = (
    <div className={`fixed inset-0 z-[${zIndex}] flex items-center justify-center p-6`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto glass-modal rounded-[var(--start-radius)] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="font-semibold text-lg">编辑{item.type === 'FOLDER' ? '文件夹' : '书签'}</h3>
        
        <div className="space-y-1">
          <label className="text-xs text-fg/60">名称</label>
          <Input value={name} onChange={e => onNameChange(e.target.value)} />
        </div>
        
        {item.type === 'LINK' && (
          <>
            <div className="space-y-1">
              <label className="text-xs text-fg/60">网址</label>
              <Input value={url} onChange={e => onUrlChange(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-fg/60">备注</label>
              <Input value={note} onChange={e => onNoteChange(e.target.value)} />
            </div>
            
            {/* 自定义图标（仅书签页使用） */}
            {onIconUrlChange && (
              <div className="space-y-1">
                <label className="text-xs text-fg/60">自定义图标 URL（可选）</label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={iconUrl || ''} 
                    onChange={e => {
                      onIconUrlChange(e.target.value)
                      onIconPreviewError?.(false)
                    }}
                    placeholder="https://example.com/icon.png"
                    className="flex-1"
                  />
                  {/* Icon preview */}
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-glass/20 border border-glass-border/20 flex-shrink-0 grid place-items-center">
                    {iconUrl?.trim() ? (
                      iconPreviewError ? (
                        <span className="text-xs text-fg/40">×</span>
                      ) : (
                        <img
                          src={iconUrl.trim()}
                          alt="icon preview"
                          className="w-full h-full object-cover"
                          onError={() => onIconPreviewError?.(true)}
                          onLoad={() => onIconPreviewError?.(false)}
                        />
                      )
                    ) : (
                      <span className="text-xs text-fg/40">预览</span>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-fg/40 mt-0.5">留空则使用默认图标</p>
              </div>
            )}
          </>
        )}
        
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
          <Button variant="primary" onClick={onSubmit}>保存</Button>
        </div>
      </div>
    </div>
  )

  if (usePortal) {
    return createPortal(content, document.body)
  }
  return content
}
