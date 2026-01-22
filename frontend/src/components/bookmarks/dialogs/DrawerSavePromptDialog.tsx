import { toast } from 'sonner'
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
  if (!open || !pendingOrder) return null

  const handleCancel = () => {
    onRestore()
    onClose()
  }

  const handleSave = () => {
    onSave()
    onClose()
    toast.success('已保存为自定义排序')
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCancel} />
      <div className="relative w-full max-w-sm glass-modal rounded-[var(--start-radius)] p-6 shadow-2xl modal-enter">
        <h3 className="font-semibold text-lg">保存排序</h3>
        <p className="text-sm text-fg/70 mt-2">
          当前使用的是自动排序模式，是否将拖拽后的顺序保存为自定义排序？
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={handleCancel}>不保存</Button>
          <Button variant="primary" onClick={handleSave}>保存</Button>
        </div>
      </div>
    </div>
  )
}
