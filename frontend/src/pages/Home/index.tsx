import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Clock } from '../../components/Clock'
import { BookmarkGrid } from '../../components/BookmarkGrid'
import { SearchBox } from '../../components/SearchBox'
import { BookmarkDrawer } from '../../components/BookmarkDrawer'
import { useBookmarkDrawerStore } from '../../stores/bookmarkDrawer'
import { useBookmarkDndStore } from '../../stores/bookmarkDnd'
import { useSearchFocusStore } from '../../stores/searchFocus'
import { useAppearanceStore } from '../../stores/appearance'
import { useIsMobile } from '../../hooks/useIsMobile'
import { usePullGestures } from '../../hooks/usePullGestures'
import { cn } from '../../utils/cn'

export function HomePage() {
  const drawerOpen = useBookmarkDrawerStore((s) => s.open)
  const setDrawerOpen = useBookmarkDrawerStore((s) => s.setOpen)
  const searchFocused = useSearchFocusStore((s) => s.isFocused)
  const isDragging = useBookmarkDndStore((s) => s.isDragging)
  const homeLayoutMode = useAppearanceStore((s) => s.homeLayoutMode)
  const homeFixedPosition = useAppearanceStore((s) => s.homeFixedPosition)
  const isMobile = useIsMobile()
  const containerRef = useRef<HTMLDivElement>(null)
  const [keyboardOffset, setKeyboardOffset] = useState(0)

  // 移动端虚拟键盘适配：使用 visualViewport API 检测键盘高度
  // 只有首页搜索框聚焦时才触发上移，书签页/快捷栏输入框不触发
  // 不论固定模式还是动态模式，键盘弹出时都上移键盘高度的 40%（确保不被遮挡）
  useEffect(() => {
    // 首页搜索框未聚焦时不需要监听，重置偏移量
    if (!isMobile || !window.visualViewport || !searchFocused) {
      setKeyboardOffset(0) // eslint-disable-line
      return
    }

    const viewport = window.visualViewport
    const updateOffset = () => {
      // 键盘高度 = 窗口高度 - 可视视口高度
      const keyboardHeight = window.innerHeight - viewport.height
      // 只在键盘弹出时（高度 > 100）才移动，避免小幅抖动
      setKeyboardOffset(keyboardHeight > 100 ? keyboardHeight * 0.4 : 0)
    }

    viewport.addEventListener('resize', updateOffset)
    // 立即检测一次当前键盘状态
    updateOffset()
    return () => viewport.removeEventListener('resize', updateOffset)
  }, [isMobile, searchFocused])

  // 下拉刷新
  const handleRefresh = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    window.location.reload()
  }, [])

  // 上划打开书签
  const handleSwipeUp = useCallback(() => {
    if (!drawerOpen && !searchFocused) {
      setDrawerOpen(true)
    }
  }, [drawerOpen, searchFocused, setDrawerOpen])

  const { pullDistance, isRefreshing, isExiting, swipeUpProgress, isSwipeAnimating } = usePullGestures({
    onRefresh: handleRefresh,
    onSwipeUp: handleSwipeUp,
    enabled: isMobile && !drawerOpen && !searchFocused && !isDragging,
    containerRef,
  })

  // Tab 键打开书签抽屉
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Tab 键打开书签抽屉（仅在搜索框未聚焦且抽屉未打开时）
      if (e.key === 'Tab' && !searchFocused && !drawerOpen) {
        e.preventDefault()
        setDrawerOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [searchFocused, drawerOpen, setDrawerOpen])

  // 计算刷新图标的状态
  const showRefreshIndicator = isMobile && (pullDistance > 0 || isRefreshing)
  const isReady = pullDistance >= 80
  const iconRotation = pullDistance * 4.5

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center gap-2 sm:gap-3"
    >
      {/* 下拉刷新指示器 */}
      {showRefreshIndicator && (
        <div 
          className={cn(
            "fixed top-0 left-0 right-0 flex justify-center z-50 pointer-events-none",
            "transition-opacity duration-300",
            isExiting && "opacity-0"
          )}
          style={{ 
            transform: `translateY(${Math.min(pullDistance, 80) + 16}px)`,
          }}
        >
          <div className={cn(
            'w-11 h-11 rounded-full shadow-xl',
            'flex items-center justify-center',
            'bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl',
            'border border-glass-border/40',
            'transition-transform duration-100'
          )}>
            <RefreshCw 
              className={cn(
                'w-5 h-5 transition-colors duration-200',
                isReady || isRefreshing ? 'text-primary' : 'text-fg/50',
                isRefreshing && 'animate-spin'
              )}
              style={{
                transform: isRefreshing ? undefined : `rotate(${iconRotation}deg)`,
              }}
            />
          </div>
        </div>
      )}

      {/* 首页内容 */}
      {/* 时钟+搜索框区域 */}
      {homeLayoutMode === 'fixed' ? (
        // 固定位置模式：时钟+搜索框固定在指定位置
        <div 
          className="absolute left-0 right-0 flex flex-col items-center gap-2 sm:gap-3 w-full transition-transform duration-300 ease-out z-10"
          style={{ 
            top: `${homeFixedPosition}vh`,
            transform: `translateY(calc(-50% - ${keyboardOffset}px))` 
          }}
        >
          <div className="relative z-50">
            <Clock />
          </div>
          <div className="relative z-50 w-full flex justify-center">
            <SearchBox />
          </div>
        </div>
      ) : (
        // 动态挤压模式：时钟+搜索框+快捷栏垂直居中
        // 移动端：快捷栏在时钟搜索框下方，整体居中
        // 桌面端：只有时钟+搜索框居中，快捷栏在底部 Dock
        <div 
          className="flex flex-col items-center gap-2 sm:gap-3 w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateY(calc(-3rem - ${keyboardOffset}px))` }}
        >
          <div className="relative z-50">
            <Clock />
          </div>
          <div className="relative z-50 w-full flex justify-center">
            <SearchBox />
          </div>
          {/* 移动端：快捷栏在这里显示（居中布局） */}
          {isMobile && (
            <div
              className={cn(
                'transition-all duration-500 ease-out',
                searchFocused && 'blur-sm opacity-60 pointer-events-none',
              )}
            >
              <BookmarkGrid />
            </div>
          )}
        </div>
      )}

      {/* 桌面端：底部 Dock 栏 */}
      {!isMobile && (
        <div
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-out',
            searchFocused && 'blur-sm opacity-60 pointer-events-none',
          )}
        >
          <BookmarkGrid variant="dock" />
        </div>
      )}

      {/* 移动端固定模式：快捷栏居中显示 */}
      {isMobile && homeLayoutMode === 'fixed' && (
        <div
          className={cn(
            'transition-all duration-500 ease-out',
            searchFocused && 'blur-sm opacity-60 pointer-events-none',
          )}
        >
          <BookmarkGrid />
        </div>
      )}
      
      {/* 书签抽屉 - 传递上划进度实现拖出效果 */}
      <BookmarkDrawer 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        swipeUpProgress={isMobile ? swipeUpProgress : 0}
        isSwipeAnimating={isSwipeAnimating}
      />
    </div>
  )
}






