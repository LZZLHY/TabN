import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  
  if (!open) return null

  const content = (
    <div className={`fixed inset-0 z-[${zIndex}] flex items-center justify-center p-6`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm glass-modal rounded-[var(--start-radius)] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="font-semibold text-lg">{t('auth.loginRequired')}</h3>
        <p className="text-sm text-fg/70">
          {t('auth.loginRequiredDesc')}
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={onLogin}>{t('auth.goLogin')}</Button>
        </div>
      </div>
    </div>
  )

  if (usePortal) {
    return createPortal(content, document.body)
  }
  return content
}
