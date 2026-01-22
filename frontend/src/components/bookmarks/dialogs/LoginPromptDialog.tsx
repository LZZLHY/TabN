import { createPortal } from 'react-dom'
import { Button } from '../../ui/Button'

type LoginPromptDialogProps = {
  open: boolean
  onClose: () => void
  onLogin: () => void
  /** 使用 Portal 渲染 */
  usePortal?: boolean
  /** z-index 层级 */
  zIndex?: number
}

/**
 * 登录提示对话框
 */
export function LoginPromptDialog({
  open,
  onClose,
  onLogin,
  usePortal = true,
  zIndex = 70,
}: LoginPromptDialogProps) {
  if (!open) return null

  const content = (
    <div className={`fixed inset-0 z-[${zIndex}] flex items-center justify-center p-6`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm glass-modal rounded-[var(--start-radius)] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="font-semibold text-lg">需要登录</h3>
        <p className="text-sm text-fg/70">
          登录后即可添加和管理书签，数据将自动同步到云端。
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={onLogin}>去登录</Button>
        </div>
      </div>
    </div>
  )

  if (usePortal) {
    return createPortal(content, document.body)
  }
  return content
}
