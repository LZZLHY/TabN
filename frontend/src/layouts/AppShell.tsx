import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { GlobalToaster } from '../components/GlobalToaster'
import { ServerStatus } from '../components/ServerStatus'
import { Sidebar } from '../components/Sidebar'
import { MobileNav } from '../components/MobileNav'
import { SettingsDialog } from '../components/SettingsDialog'
import { MarketDialog } from '../components/MarketDialog'
import { useApplyAppearance } from '../hooks/useApplyAppearance'
import { useBackgroundImage } from '../hooks/useBackgroundImage'
import { useCloudSettingsSync } from '../hooks/useCloudSettingsSync'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAppearanceStore } from '../stores/appearance'
import { useAuthStore } from '../stores/auth'
import { useSearchFocusStore } from '../stores/searchFocus'
import { useSettingsDialogStore } from '../stores/settingsDialog'
import { usePageLoadStore } from '../stores/pageLoad'
import { cn } from '../utils/cn'

export function AppShell() {
  useApplyAppearance()
  useCloudSettingsSync()
  // 登录态恢复（token 持久化后拉一次 /me，避免刷新后 user 为空）
  const refreshMe = useAuthStore((s) => s.refreshMe)
  const token = useAuthStore((s) => s.token)

  // 首次加载时，如果没有 token，重置外观设置（避免关机重启后显示上一个用户的设置）
  useEffect(() => {
    if (!token) {
      useAppearanceStore.getState().resetAppearance()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run on mount
  }, [])

  const { backgroundUrl } = useBackgroundImage()
  const settingsOpen = useSettingsDialogStore((s) => s.open)
  const setSettingsOpen = useSettingsDialogStore((s) => s.setOpen)
  const [marketOpen, setMarketOpen] = useState(false)
  const sidebarExpanded = useAppearanceStore((s) => s.sidebarExpanded)
  const setSidebarExpanded = useAppearanceStore((s) => s.setSidebarExpanded)
  const backgroundDimming = useAppearanceStore((s) => s.backgroundDimming)
  const searchFocused = useSearchFocusStore((s) => s.isFocused)
  const isMobile = useIsMobile()

  // 页面加载动画状态（使用全局 store 共享给其他组件）
  const setPageLoaded = usePageLoadStore((s) => s.setLoaded)
  const isPageLoaded = usePageLoadStore((s) => s.isLoaded)

  // 直接使用 backgroundUrl，不做预加载切换（避免闪屏）
  // Base64 数据可以直接渲染，不需要预加载
  const displayedUrl = backgroundUrl

  // 将背景图同步到 HTML 元素（避免 React 背景图层导致的闪黑）
  useEffect(() => {
    if (displayedUrl) {
      document.documentElement.style.backgroundImage = `url("${displayedUrl}")`
    }
  }, [displayedUrl])

  // 页面首次加载动画 - 立即触发
  useEffect(() => {
    setPageLoaded(true)
  }, [setPageLoaded])

  // refreshMe 只在首次加载时执行，不在每次刷新时执行
  // 使用 sessionStorage 标记本次会话是否已刷新过
  useEffect(() => {
    if (!token) return
    const sessionKey = 'start:refreshed'
    if (sessionStorage.getItem(sessionKey)) return
    sessionStorage.setItem(sessionKey, '1')
    void refreshMe()
  }, [refreshMe, token])

  // 计算遮罩透明度（只有在明暗度小于100时才显示遮罩）
  const dimmingOpacity = (100 - backgroundDimming) / 100

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      {/* 背景图效果层 - 只处理搜索聚焦时的模糊效果，背景图在 HTML 元素上 */}
      {searchFocused && (
        <div
          className="absolute inset-0 backdrop-blur-sm transition-all duration-300"
        />
      )}

      {/* 明暗度遮罩：只有在需要时才显示 */}
      {dimmingOpacity > 0 && (
        <div 
          className="absolute inset-0 bg-black pointer-events-none" 
          style={{ opacity: dimmingOpacity }}
        />
      )}


      {/* 布局：桌面端侧边栏覆盖式，移动端底部导航 */}
      <div className="relative z-10 h-full w-full">
        {/* 桌面端：侧边栏 */}
        {!isMobile && (
          <>
            {/* 侧边栏展开时：点击空白处收起 */}
            {sidebarExpanded ? (
              <div
                className="absolute inset-0 z-10"
                onClick={() => setSidebarExpanded(false)}
              />
            ) : null}
            <div
              className={cn(
                'absolute inset-y-0 left-0 z-20 transition-transform duration-500 ease-out',
                searchFocused && 'blur-sm opacity-60 pointer-events-none',
                // 页面加载动画：从左侧弹出（不使用 opacity 避免毛玻璃变透明）
                isPageLoaded ? 'translate-x-0' : '-translate-x-8',
              )}
            >
              <Sidebar
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenMarket={() => setMarketOpen(true)}
                settingsOpen={settingsOpen}
                marketOpen={marketOpen}
              />
            </div>
          </>
        )}

        <main
          className="relative z-0 h-full w-full overflow-hidden transition-none"
        >
          <div className={cn(
            'h-full w-full flex items-center justify-center p-4 md:p-6',
            isMobile && 'pb-20' // 为底部导航留出空间
          )}>
            <Outlet />
          </div>
        </main>

        {/* 移动端：底部导航 */}
        {isMobile && (
          <MobileNav
            onOpenSettings={() => setSettingsOpen(true)}
            settingsOpen={settingsOpen}
          />
        )}
      </div>

{/* 背景图署名已移除 */}

      {settingsOpen ? (
        <SettingsDialog open onClose={() => setSettingsOpen(false)} />
      ) : null}
      {marketOpen ? <MarketDialog open onClose={() => setMarketOpen(false)} /> : null}
      <GlobalToaster />
      <ServerStatus />
    </div>
  )
}


