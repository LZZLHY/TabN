import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '../../ui/Button'

type DrawerSavePromptDialogProps = {
  open: boolean
  pendingOrder: string[] | null
  onClose: () => void
  onRestore: () => void
  onSave: () => void
}

/**
 * 书签页保存排序提示对话框
 */
export function DrawerSavePromptDialog({
  open,
  pendingOrder,
  onClose,
  onRestore,
  onSave,
}: DrawerSavePromptDialogProps) {
  const { t } = useTranslation()
  
  if (!open || !pendingOrder) return null

  const handleCancel = () => {
    onRestore()
    onClose()
  }

  const handleSave = () => {
    onSave()
    onClose()
    toast.success(t('toast.savedAsCustomSort'))
  }

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCancel} />
      <div className="relative w-full max-w-sm glass-modal rounded-[var(--start-radius)] p-6 shadow-2xl modal-enter">
        <h3 className="font-semibold text-lg">{t('bookmarks.saveSort')}</h3>
        <p className="text-sm text-fg/70 mt-2">
          {t('bookmarks.saveSortDesc')}
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={handleCancel}>{t('common.dontSave')}</Button>
          <Button variant="primary" onClick={handleSave}>{t('common.save')}</Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
