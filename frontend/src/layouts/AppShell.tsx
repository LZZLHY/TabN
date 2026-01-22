import { useEffect, useMemo, useState } from 'react'
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

  const { backgroundUrl, bingCopyright } = useBackgroundImage()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [marketOpen, setMarketOpen] = useState(false)
  const sidebarExpanded = useAppearanceStore((s) => s.sidebarExpanded)
  const setSidebarExpanded = useAppearanceStore((s) => s.setSidebarExpanded)
  const searchFocused = useSearchFocusStore((s) => s.isFocused)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (token) void refreshMe()
  }, [refreshMe, token])

  const backgroundStyle = useMemo(
    () => ({
      backgroundImage: `url("${backgroundUrl}")`,
    }),
    [backgroundUrl],
  )

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* 背景图 - 搜索聚焦时轻微放大并模糊 */}
      <div
        className={cn(
          'absolute inset-0 bg-center bg-cover transition-all duration-500 ease-out',
          searchFocused ? 'scale-[1.05] blur-sm' : 'scale-[1.02]',
        )}
        style={backgroundStyle}
      />

      {/* 统一遮罩：让文字更稳、更耐看 */}
      <div className="absolute inset-0 bg-white/35 dark:bg-black/60" />

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
                'absolute inset-y-0 left-0 z-20 transition-all duration-500 ease-out',
                searchFocused && 'blur-sm opacity-60 pointer-events-none',
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

      {/* 背景图署名（先放这里，后续可以做成可开关） */}
      <div className={cn(
        'absolute right-4 z-20 text-xs text-fg/60 select-none',
        isMobile ? 'bottom-16' : 'bottom-3' // 移动端避开底部导航
      )}>
        {bingCopyright ? `背景：${bingCopyright}` : ''}
      </div>

      {settingsOpen ? (
        <SettingsDialog open onClose={() => setSettingsOpen(false)} />
      ) : null}
      {marketOpen ? <MarketDialog open onClose={() => setMarketOpen(false)} /> : null}
      <GlobalToaster />
      <ServerStatus />
    </div>
  )
}


