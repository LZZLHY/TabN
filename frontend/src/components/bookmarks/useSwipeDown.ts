import { useCallback, useEffect, useRef, useState } from 'react'
import { useBookmarkDndStore } from '../../stores/bookmarkDnd'

type UseSwipeDownOptions = {
  /** 下滑关闭的阈值（像素） */
  threshold?: number
  /** 关闭回调 */
  onClose: () => void
  /** 最后拖拽结束时间的引用，用于防止拖拽后误触发关闭 */
  lastDragEndTimeRef: React.MutableRefObject<number>
  /** 通过下滑关闭的标记引用 */
  closedViaSwipeRef: React.MutableRefObject<boolean>
}

type UseSwipeDownReturn = {
  /** 下滑进度 (0-1) */
  swipeDownProgress: number
  /** 是否正在播放下滑动画 */
  isSwipeDownAnimating: boolean
  /** 设置下滑进度 */
  setSwipeDownProgress: (progress: number) => void
  /** 设置是否正在播放动画 */
  setIsSwipeDownAnimating: (animating: boolean) => void
  /** 滚动容器的 ref */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  /** 内容区域的 ref，用于绑定触摸事件 */
  contentRef: React.RefObject<HTMLDivElement | null>
  /** 拖拽状态 ref */
  isDraggingRef: React.MutableRefObject<boolean>
  /** 触摸结束处理函数 */
  handleSwipeEnd: () => void
}

/**
 * 下滑关闭手势 Hook
 * 用于 BookmarkDrawer 的移动端下滑关闭功能
 */
export function useSwipeDown({
  threshold = 120,
  onClose,
  lastDragEndTimeRef,
  closedViaSwipeRef,
}: UseSwipeDownOptions): UseSwipeDownReturn {
  const swipeStartY = useRef(0)
  const swipeCurrentY = useRef(0)
  const swipeStartTime = useRef(0)
  const [swipeDownProgress, setSwipeDownProgress] = useState(0)
  const [isSwipeDownAnimating, setIsSwipeDownAnimating] = useState(false)
  const isDraggingRef = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const canSwipeCloseRef = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // 使用原生事件监听器，设置 passive: false 以便调用 preventDefault 阻止浏览器下拉刷新
  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      const isOnIcon = target.closest('.bookmark-icon') !== null

      if (isOnIcon) {
        isDraggingRef.current = true
        canSwipeCloseRef.current = false
        return
      }

      const scrollContainer = scrollContainerRef.current
      const isAtTop = !scrollContainer || scrollContainer.scrollTop <= 0
      canSwipeCloseRef.current = isAtTop

      isDraggingRef.current = false
      swipeStartY.current = e.touches[0].clientY
      swipeCurrentY.current = e.touches[0].clientY
      swipeStartTime.current = Date.now()
      setSwipeDownProgress(0)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current || useBookmarkDndStore.getState().isDragging) return
      if (!canSwipeCloseRef.current) return

      const touch = e.touches[0]
      swipeCurrentY.current = touch.clientY
      const deltaY = touch.clientY - swipeStartY.current

      // 只有向下滑动时才阻止默认行为并更新进度
      if (deltaY > 0) {
        e.preventDefault() // 阻止浏览器下拉刷新
        setSwipeDownProgress(Math.min(deltaY / threshold, 1))
      }
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
    }
  }, [threshold])

  const handleSwipeEnd = useCallback(() => {
    // 检查本地和全局拖拽状态
    const globalDragging = useBookmarkDndStore.getState().isDragging
    const localDragging = isDraggingRef.current

    // 如果正在拖拽书签，跳过
    if (localDragging || globalDragging) {
      isDraggingRef.current = false
      return
    }

    isDraggingRef.current = false

    // 如果刚刚结束拖拽（300ms 内），跳过关闭逻辑
    if (Date.now() - lastDragEndTimeRef.current < 300) {
      return
    }

    // 如果没有下滑进度，直接返回（防止误触发）
    if (swipeDownProgress === 0) {
      return
    }

    // 额外检查：如果 swipeStartTime 为 0，说明 handleSwipeStart 没有正确初始化
    if (swipeStartTime.current === 0) {
      return
    }

    const deltaY = swipeCurrentY.current - swipeStartY.current
    const deltaTime = Date.now() - swipeStartTime.current
    const velocity = deltaTime > 0 ? deltaY / deltaTime : 0

    const isHighVelocity = velocity > 0.5
    const progressThreshold = isHighVelocity ? 0.2 : 0.5
    const shouldClose = swipeDownProgress >= progressThreshold && velocity > 0

    if (shouldClose) {
      setIsSwipeDownAnimating(true)
      setSwipeDownProgress(1)
      setTimeout(() => {
        closedViaSwipeRef.current = true
        setIsSwipeDownAnimating(false)
        onClose()
      }, 300)
      return
    }

    if (swipeDownProgress > 0) {
      setIsSwipeDownAnimating(true)
      setSwipeDownProgress(0)
      setTimeout(() => setIsSwipeDownAnimating(false), 300)
    }
  }, [onClose, swipeDownProgress, lastDragEndTimeRef, closedViaSwipeRef])

  return {
    swipeDownProgress,
    isSwipeDownAnimating,
    setSwipeDownProgress,
    setIsSwipeDownAnimating,
    scrollContainerRef,
    contentRef,
    isDraggingRef,
    handleSwipeEnd,
  }
}
