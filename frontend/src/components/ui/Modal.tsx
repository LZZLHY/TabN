import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../utils/cn'

type ModalProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** 模态框最大宽度，默认 max-w-sm */
  maxWidth?: string
  /** z-index 层级，默认 70 */
  zIndex?: number
  /** 额外的 className */
  className?: string
}

/**
 * 通用模态框组件
 * - 带主题色边框
 * - 带打开/关闭动画
 * - 点击背景关闭
 * - ESC 键关闭
 */
export function Modal({
  open,
  onClose,
  children,
  maxWidth = 'max-w-sm',
  zIndex = 70,
  className,
}: ModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  // 处理进入/退出动画
  useEffect(() => {
    if (open) {
      setShouldRender(true)
      // 使用 requestAnimationFrame 确保 DOM 已渲染后再触发动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true)
        })
      })
    } else {
      setIsVisible(false)
      // 等待退出动画完成后再卸载组件
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 150) // 退出动画时长
      return () => clearTimeout(timer)
    }
  }, [open])

  // ESC 键关闭
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!shouldRender) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{ zIndex }}
    >
      {/* 背景遮罩 - 带动画 */}
      <div
        className={cn(
          'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity',
          isVisible ? 'opacity-100 duration-200' : 'opacity-0 duration-150'
        )}
        onClick={onClose}
      />

      {/* 模态框内容 - 带动画和主题色边框 */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full rounded-[var(--start-radius)] p-6 shadow-2xl',
          'glass-modal',
          // 动画
          'transition-all',
          isVisible
            ? 'opacity-100 scale-100 translate-y-0 duration-200'
            : 'opacity-0 scale-95 translate-y-2 duration-150',
          maxWidth,
          className
        )}
        style={{
          transitionTimingFunction: isVisible
            ? 'cubic-bezier(0.16, 1, 0.3, 1)' // 弹性进入
            : 'cubic-bezier(0.4, 0, 1, 1)', // 快速退出
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
