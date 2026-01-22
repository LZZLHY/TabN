import { Button } from '../../ui/Button'

type DrawerLoginPromptProps = {
  open: boolean
  onClose: () => void
  onLogin: () => void
}

/**
 * 书签页登录提示对话框
 */
export function DrawerLoginPrompt({
  open,
  onClose,
  onLogin,
}: DrawerLoginPromptProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm glass-modal rounded-[var(--start-radius)] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="font-semibold text-lg">需要登录</h3>
        <p className="text-sm text-fg/70">
          登录后即可添加和管理书签，数据将自动同步到云端。
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={() => { onClose(); onLogin() }}>去登录</Button>
        </div>
      </div>
    </div>
  )
}
