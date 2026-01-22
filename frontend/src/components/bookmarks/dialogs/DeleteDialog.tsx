import { createPortal } from 'react-dom'
import { Button } from '../../ui/Button'
import type { Bookmark } from '../types'

type DeleteDialogProps = {
  open: boolean
  item: Bookmark | null
  onClose: () => void
  onConfirm: () => Promise<void>
  /** 使用 Portal 渲染 */
  usePortal?: boolean
  /** z-index 层级 */
  zIndex?: number
}

/**
 * 删除确认对话框
 */
export function DeleteDialog({
  open,
  item,
  onClose,
  onConfirm,
  usePortal = true,
  zIndex = 70,
}: DeleteDialogProps) {
  if (!open || !item) return null

  const content = (
    <div className={`fixed inset-0 z-[${zIndex}] flex items-center justify-center p-6`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm glass-modal rounded-[var(--start-radius)] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="font-semibold text-lg">确认删除</h3>
        <p className="text-sm text-fg/70 mt-2">
          确定要删除 {item.type === 'FOLDER' ? '收藏夹' : '书签'} "{item.name}" 吗？
          {item.type === 'FOLDER' && <br/>}
          {item.type === 'FOLDER' && <span className="text-xs text-fg/50 block mt-1">文件夹内的书签将移动到上一级。</span>}
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button 
            variant="primary" 
            className="bg-red-600 border-red-600 hover:bg-red-700 text-white" 
            onClick={onConfirm}
          >
            删除
          </Button>
        </div>
      </div>
    </div>
  )

  if (usePortal) {
    return createPortal(content, document.body)
  }
  return content
}
