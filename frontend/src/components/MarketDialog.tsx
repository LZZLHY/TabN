import { toast } from 'sonner'
import { Button } from './ui/Button'
import { cn } from '../utils/cn'

type Props = {
  open: boolean
  onClose: () => void
}

export function MarketDialog({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/35 dark:bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
            'relative w-full max-w-3xl rounded-[var(--start-radius)] p-4 sm:p-5',
          'max-h-[80vh] overflow-hidden',
          'glass-modal animate-in fade-in zoom-in-95 duration-200',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold leading-none">拓展商城</div>
            <div className="text-xs text-fg/60 mt-1 leading-none">
              施工中（后续：搜索/分类/评分/版本/安装与更新）
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0" title="关闭">
            ×
          </Button>
        </div>

        <div className="mt-5 overflow-y-auto pr-1">
          <div className="glass-panel rounded-[var(--start-radius)] p-5">
            <div className="text-sm text-fg/75 leading-relaxed">
              这里当前只提供一个占位页，确保入口交互完整。
            </div>
            <div className="mt-4">
              <Button
                variant="primary"
                onClick={() => toast.info('拓展商城：施工中～')}
              >
                来个 toast
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


