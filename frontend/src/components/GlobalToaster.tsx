import { Toaster } from 'sonner'
import { useIsMobile } from '../hooks/useIsMobile'

export function GlobalToaster() {
  const isMobile = useIsMobile()
  
  return (
    <Toaster
      position={isMobile ? 'top-center' : 'top-right'}
      visibleToasts={isMobile ? 3 : 6}
      closeButton
      offset={isMobile ? 56 : 24}
      gap={8}
      expand={!isMobile}
      toastOptions={{
        // 全局通用样式 (布局、动画、基础字体)
        className: `group flex items-start w-auto p-3 rounded-xl border-2 shadow-lg transition-all duration-300 font-sans backdrop-blur-xl ${isMobile ? 'max-w-[calc(100vw-2rem)]' : 'max-w-[260px]'}`,
        classNames: {
          // 标题与描述
          title: 'font-semibold text-sm tracking-tight leading-snug',
          description: 'text-xs mt-1 leading-relaxed opacity-90',
          
          // 关闭按钮
          closeButton:
            'absolute right-2 top-2 bg-transparent border-0 p-1.5 rounded-lg ' +
            'text-current opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all',
          
          // --- 颜色分级 (背景 + 边框 + 文字) ---
          // 必须分别指定，因为 unstyled 模式下 default 样式不会自动应用
          
          // 默认 (Default): 白/黑背景
          toast: 
            'bg-white/95 dark:bg-zinc-900/95 ' +
            'border-zinc-200 dark:border-zinc-800 ' +
            'text-zinc-800 dark:text-zinc-100',

          // 成功 (Success): 绿背景
          success: 
            '!bg-emerald-50/95 dark:!bg-emerald-950/90 ' +
            '!border-emerald-200 dark:!border-emerald-800 ' +
            '!text-emerald-800 dark:!text-emerald-100',

          // 错误 (Error): 红背景
          error: 
            '!bg-rose-50/95 dark:!bg-rose-950/90 ' +
            '!border-rose-200 dark:!border-rose-800 ' +
            '!text-rose-800 dark:!text-rose-100',

          // 警告 (Warning): 黄背景
          warning: 
            '!bg-amber-50/95 dark:!bg-amber-950/90 ' +
            '!border-amber-200 dark:!border-amber-800 ' +
            '!text-amber-800 dark:!text-amber-100',

          // 信息 (Info): 蓝背景
          info: 
            '!bg-blue-50/95 dark:!bg-blue-950/90 ' +
            '!border-blue-200 dark:!border-blue-800 ' +
            '!text-blue-800 dark:!text-blue-100',

          // 按钮样式
          actionButton: 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-3 py-1.5 rounded-lg text-xs font-medium',
          cancelButton: 'bg-transparent border border-current text-current px-3 py-1.5 rounded-lg text-xs font-medium opacity-80 hover:opacity-100',
        },
      }}
    />
  )
}

