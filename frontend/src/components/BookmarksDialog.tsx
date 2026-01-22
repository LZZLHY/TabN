import { useEffect } from 'react'
import { BookmarksPage } from '../pages/Bookmarks'
import { cn } from '../utils/cn'
import { Button } from './ui/Button'

type Props = {
  open: boolean
  onClose: () => void
}

export function BookmarksDialog({ open, onClose }: Props) {
  // Escape 键关闭
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/35 dark:bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
            'relative w-full max-w-4xl rounded-[var(--start-radius)] p-4 sm:p-5',
          'max-h-[84vh] overflow-hidden',
          'glass-modal animate-in fade-in zoom-in-95 duration-200',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold leading-none">我的书签</div>
            <div className="text-xs text-fg/60 mt-1 leading-none">
              在这里管理你的书签（不会跳转二级路由）
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0" title="关闭">
            ×
          </Button>
        </div>

        <div className="mt-5 overflow-y-auto pr-1">
          {/* 复用原页面内容（内部已有布局） */}
          <BookmarksPage />
        </div>
      </div>
    </div>
  )
}


