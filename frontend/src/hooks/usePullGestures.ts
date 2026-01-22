import { useEffect, useRef, useState } from 'react'

type PullGesturesOptions = {
  onRefresh?: () => Promise<void> | void
  onSwipeUp?: () => void
  pullThreshold?: number
  swipeUpThreshold?: number
  enabled?: boolean
  containerRef?: React.RefObject<HTMLElement | null>
}

type PullGesturesReturn = {
  isPulling: boolean
  pullDistance: number
  isRefreshing: boolean
  swipeUpProgress: number
  isExiting: boolean
  isSwipeAnimating: boolean // 是否正在执行返回动画
}

/**
 * 移动端手势 Hook
 * - 下拉刷新（使用原生事件监听器避免 passive 问题）
 * - 上划触发动作（如打开书签页）
 */
export function usePullGestures({
  onRefresh,
  onSwipeUp,
  pullThreshold = 80,
  swipeUpThreshold = 100,
  enabled = true,
  containerRef,
}: PullGesturesOptions): PullGesturesReturn {
  const startY = useRef(0)
  const startX = useRef(0)
  const currentY = useRef(0)
  const startTime = useRef(0) // 触摸开始时间，用于计算速度
  const isVerticalSwipe = useRef<boolean | null>(null)
  const isPullingRef = useRef(false)
  
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const pullDistanceRef = useRef(0) // 用 ref 跟踪，避免依赖数组问题
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [swipeUpProgress, setSwipeUpProgress] = useState(0)
  const [isSwipeAnimating, setIsSwipeAnimating] = useState(false) // 返回动画状态
  const swipeUpProgressRef = useRef(0) // 用 ref 跟踪最新值，避免闭包问题
  const shouldTriggerSwipeUp = useRef(false) // 是否已达到触发阈值
  const lastProgressUpdateTime = useRef(0) // 上次进度更新时间，用于限制增长速率
  
  // 使用 ref 存储回调，避免闭包问题
  const onSwipeUpRef = useRef(onSwipeUp)
  const onRefreshRef = useRef(onRefresh)
  onSwipeUpRef.current = onSwipeUp
  onRefreshRef.current = onRefresh
  
  // 跟踪是否有活跃的触摸（用于判断是否是新手势）
  const hasActiveTouch = useRef(false)
  
  // 当 enabled 重新变为 true 时（书签页关闭后），重置所有状态
  const prevEnabled = useRef(enabled)
  useEffect(() => {
    if (enabled && !prevEnabled.current) {
      // 重置所有状态和 ref
      setSwipeUpProgress(0)
      swipeUpProgressRef.current = 0
      shouldTriggerSwipeUp.current = false
      isPullingRef.current = false
      isVerticalSwipe.current = null
      setIsPulling(false)
      setPullDistance(0)
      pullDistanceRef.current = 0
      startY.current = 0
      startX.current = 0
      currentY.current = 0
      hasActiveTouch.current = false
    }
    prevEnabled.current = enabled
  }, [enabled])

  // 使用原生事件监听器，设置 passive: false 以允许 preventDefault
  useEffect(() => {
    const container = containerRef?.current ?? document.body
    if (!enabled || !container) return

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return
      
      // 标记新手势开始
      hasActiveTouch.current = true
      startTime.current = Date.now() // 记录开始时间
      
      const touch = e.touches[0]
      startY.current = touch.clientY
      startX.current = touch.clientX
      currentY.current = touch.clientY
      isVerticalSwipe.current = null
      isPullingRef.current = false
      // 重置上划进度（新手势开始时）
      setSwipeUpProgress(0)
      swipeUpProgressRef.current = 0
      shouldTriggerSwipeUp.current = false
      lastProgressUpdateTime.current = Date.now()
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing) return
      
      const touch = e.touches[0]
      const deltaY = touch.clientY - startY.current
      const deltaX = touch.clientX - startX.current
      currentY.current = touch.clientY

      // 判断是否为垂直滑动
      if (isVerticalSwipe.current === null) {
        if (Math.abs(deltaY) > 10 || Math.abs(deltaX) > 10) {
          isVerticalSwipe.current = Math.abs(deltaY) > Math.abs(deltaX)
        }
      }

      if (!isVerticalSwipe.current) return

      // 下拉刷新：仅当页面在顶部时
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
      const isAtTop = scrollTop <= 0
      
      if (deltaY > 0 && isAtTop && onRefreshRef.current) {
        if (e.cancelable) e.preventDefault()
        // 带阻尼的下拉距离，最大不超过阈值
        const distance = Math.min(deltaY * 0.5, pullThreshold)
        setPullDistance(distance)
        pullDistanceRef.current = distance
        setIsPulling(true)
        isPullingRef.current = true
      }
      
      // 上划进度 - 根据滑动速度动态调整所需距离
      // 快速滑动：需要的物理距离更短（更容易完成）
      // 慢速滑动：需要的物理距离更长（需要划更远）
      if (deltaY < 0 && onSwipeUpRef.current) {
        if (e.cancelable) e.preventDefault() // 防止浏览器默认行为干扰
        
        const absDeltaY = Math.abs(deltaY)
        const deltaTime = Date.now() - startTime.current
        // 计算当前滑动速度（像素/毫秒）
        const currentVelocity = deltaTime > 0 ? absDeltaY / deltaTime : 0
        
        // 根据速度动态调整阈值
        // 基础阈值 350px（慢速时需要滑动的距离）
        // 快速滑动（>0.8px/ms）时阈值降低到 150px
        // 速度越快，阈值越低，进度增长越快
        const baseThreshold = 600 // 慢速时的基础阈值
        const minThreshold = 120  // 快速时的最小阈值
        const velocityFactor = Math.min(currentVelocity / 0.8, 1) // 0-1，速度越快越接近1
        const dynamicThreshold = baseThreshold - (baseThreshold - minThreshold) * velocityFactor
        
        let progress = Math.min(absDeltaY / dynamicThreshold, 1)
        
        // 限制进度增长速率，防止快速滑动时遮罩层瞬间出现
        // 最大增长速率：每秒增长 2.5（即最快 400ms 从 0 到 1）
        const now = Date.now()
        const timeDelta = now - lastProgressUpdateTime.current
        const maxProgressDelta = (timeDelta / 1000) * 2.5 // 每秒最多增长 2.5
        const currentProgress = swipeUpProgressRef.current
        
        if (progress > currentProgress + maxProgressDelta) {
          progress = currentProgress + maxProgressDelta
        }
        
        lastProgressUpdateTime.current = now
        setSwipeUpProgress(progress)
        swipeUpProgressRef.current = progress
        // 一旦超过50%，标记为应该触发（即使后续进度变化也保持）
        if (progress > 0.5) {
          shouldTriggerSwipeUp.current = true
        }
      }
    }
    
    // 计算滑动速度（像素/毫秒）
    const getSwipeVelocity = () => {
      const deltaY = startY.current - currentY.current // 上划为正
      const deltaTime = Date.now() - startTime.current
      if (deltaTime === 0) return 0
      return deltaY / deltaTime
    }

    const handleTouchEnd = async () => {
      // 如果没有活跃的触摸（残留事件），直接返回
      if (!hasActiveTouch.current) {
        return
      }
      hasActiveTouch.current = false
      
      // 下拉刷新
      if (isPullingRef.current && pullDistanceRef.current >= pullThreshold && onRefreshRef.current) {
        setIsRefreshing(true)
        try {
          await onRefreshRef.current()
        } finally {
          // 刷新完成后淡出
          setIsExiting(true)
          await new Promise(r => setTimeout(r, 300))
          setIsRefreshing(false)
          setPullDistance(0)
          pullDistanceRef.current = 0
          setIsPulling(false)
          setIsExiting(false)
        }
        isPullingRef.current = false
        isVerticalSwipe.current = null
        return
      }

      // 上划打开书签 - 基于进度和速度判断
      // 速度阈值：0.5 像素/毫秒 = 快速滑动
      // 快速滑动时，只需 20% 进度即可触发；慢速滑动需要 50% 进度
      const velocity = getSwipeVelocity()
      const isHighVelocity = velocity > 0.5
      const progressThreshold = isHighVelocity ? 0.2 : 0.5
      const shouldTrigger = shouldTriggerSwipeUp.current || 
        (swipeUpProgressRef.current >= progressThreshold && velocity > 0)
      
      if (onSwipeUpRef.current && shouldTrigger) {
        onSwipeUpRef.current()
        // 不立即重置 swipeUpProgress，让 BookmarkDrawer 控制过渡
        isPullingRef.current = false
        isVerticalSwipe.current = null
        shouldTriggerSwipeUp.current = false
        return
      }

      // 未达到阈值，平滑返回
      setIsPulling(false)
      setPullDistance(0)
      pullDistanceRef.current = 0
      
      // 如果有上划进度，触发平滑返回动画
      if (swipeUpProgressRef.current > 0) {
        setIsSwipeAnimating(true)
        setSwipeUpProgress(0)
        swipeUpProgressRef.current = 0
        // 动画结束后重置标记
        setTimeout(() => setIsSwipeAnimating(false), 300)
      }
      
      shouldTriggerSwipeUp.current = false
      isPullingRef.current = false
      isVerticalSwipe.current = null
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, isRefreshing, pullThreshold, swipeUpThreshold, containerRef])

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    swipeUpProgress,
    isExiting,
    isSwipeAnimating,
  }
}
