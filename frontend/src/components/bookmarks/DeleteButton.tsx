import { cn } from '../../utils/cn'

interface DeleteButtonProps {
  onClick: (e: React.MouseEvent) => void
  className?: string
}

/**
 * 批量删除模式下显示在书签右上角的删除按钮
 * 红色圆形叉叉按钮，点击时删除对应书签
 * 
 * Requirements: 2.4 - THE Delete_Button SHALL be clearly visible with appropriate contrast against the bookmark icon
 */
export function DeleteButton({ onClick, className }: DeleteButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'absolute -top-1.5 -right-1.5 z-20',
        'w-5 h-5 rounded-full',
        'bg-red-500 hover:bg-red-600 active:bg-red-700',
        'flex items-center justify-center',
        'text-white text-xs font-bold',
        'shadow-md',
        'transition-transform hover:scale-110',
        className
      )}
      onClick={(e) => {
        // 阻止所有事件冒泡，防止触发书签点击
        e.stopPropagation()
        e.preventDefault()
        e.nativeEvent.stopImmediatePropagation()
        onClick(e)
      }}
      onPointerDown={(e) => {
        // 阻止 pointerdown 事件冒泡，防止触发拖拽
        e.stopPropagation()
      }}
      onMouseDown={(e) => {
        // 阻止 mousedown 事件冒泡
        e.stopPropagation()
      }}
      onTouchStart={(e) => {
        // 阻止 touchstart 事件冒泡
        e.stopPropagation()
      }}
      aria-label="删除书签"
    >
      ×
    </button>
  )
}
