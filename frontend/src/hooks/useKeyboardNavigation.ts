import { useCallback, useState } from 'react'

export interface UseKeyboardNavigationOptions {
  /** 项目总数 */
  itemCount: number
  /** 是否启用 */
  enabled?: boolean
  /** 选择项目回调 */
  onSelect?: (index: number) => void
  /** 关闭回调 */
  onClose?: () => void
  /** 无选中时按 Enter 的回调 */
  onSubmit?: () => void
}

export interface UseKeyboardNavigationReturn {
  /** 当前高亮索引，-1 表示无选中 */
  highlightIndex: number
  /** 设置高亮索引 */
  setHighlightIndex: (index: number) => void
  /** 重置高亮索引 */
  resetHighlight: () => void
  /** 键盘事件处理器 */
  handleKeyDown: (e: React.KeyboardEvent) => void
}

/**
 * 计算下一个索引（向下导航，边界环绕）
 */
export function getNextIndex(current: number, total: number): number {
  if (total <= 0) return -1
  if (current < 0) return 0
  return (current + 1) % total
}

/**
 * 计算上一个索引（向上导航，边界环绕）
 */
export function getPrevIndex(current: number, total: number): number {
  if (total <= 0) return -1
  if (current < 0) return total - 1
  return (current - 1 + total) % total
}

/**
 * 键盘导航 Hook
 */
export function useKeyboardNavigation({
  itemCount,
  enabled = true,
  onSelect,
  onClose,
  onSubmit,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationReturn {
  const [highlightIndex, setHighlightIndex] = useState(-1)

  const resetHighlight = useCallback(() => {
    setHighlightIndex(-1)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (itemCount > 0) {
            setHighlightIndex((prev) => getNextIndex(prev, itemCount))
          }
          break

        case 'ArrowUp':
          e.preventDefault()
          if (itemCount > 0) {
            setHighlightIndex((prev) => getPrevIndex(prev, itemCount))
          }
          break

        case 'Enter':
          if (highlightIndex >= 0 && highlightIndex < itemCount) {
            e.preventDefault()
            onSelect?.(highlightIndex)
          } else {
            // 无选中时执行默认提交
            onSubmit?.()
          }
          break

        case 'Escape':
          e.preventDefault()
          onClose?.()
          break

        case 'Tab':
          // Tab 键关闭下拉框
          onClose?.()
          break
      }
    },
    [enabled, itemCount, highlightIndex, onSelect, onClose, onSubmit]
  )

  return {
    highlightIndex,
    setHighlightIndex,
    resetHighlight,
    handleKeyDown,
  }
}

// 导出纯函数用于测试
export const keyboardNavigationUtils = {
  getNextIndex,
  getPrevIndex,
}
