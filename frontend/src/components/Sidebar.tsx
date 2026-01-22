import { Bookmark, Home, LogIn, LogOut, Menu, Settings, Shield, Store, User } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppearanceStore } from '../stores/appearance'
import { useAuthStore } from '../stores/auth'
import { useBookmarkDrawerStore } from '../stores/bookmarkDrawer'
import { cn } from '../utils/cn'

type Props = {
  onOpenSettings: () => void
  onOpenMarket: () => void
  settingsOpen?: boolean
  marketOpen?: boolean
}

// Helper to render label with ABSOLUTE positioning to prevent layout shifts
const SidebarLabel = ({ children, expanded }: { children: React.ReactNode; expanded: boolean }) => (
  <span
    className={cn(
      'absolute left-14 whitespace-nowrap transition-all duration-300 ease-in-out',
      expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
    )}
  >
    {children}
  </span>
)

// Helper for Icon wrapper to ensure fixed width and centering
const IconWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="w-10 h-10 flex items-center justify-center shrink-0">
    {children}
  </div>
)

export function Sidebar({ onOpenSettings, onOpenMarket, settingsOpen, marketOpen }: Props) {
  const navigate = useNavigate()
  const expanded = useAppearanceStore((s) => s.sidebarExpanded)
  const toggle = useAppearanceStore((s) => s.toggleSidebar)
  const setSidebarExpanded = useAppearanceStore((s) => s.setSidebarExpanded)
  const autoHide = useAppearanceStore((s) => s.sidebarAutoHide)
  const autoHideDelay = useAppearanceStore((s) => s.sidebarAutoHideDelay)
  const clickKeepCollapsed = useAppearanceStore((s) => s.sidebarClickKeepCollapsed)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const openBookmarkDrawer = useBookmarkDrawerStore((s) => s.setOpen)

  // 书签抽屉状态
  const bookmarkDrawerOpen = useBookmarkDrawerStore((s) => s.open)

  // 路由位置
  const location = useLocation()

  // 导航项 refs 用于计算指示器位置
  const navRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map())
  const [indicatorStyle, setIndicatorStyle] = useState<{ top: number; height: number; opacity: number }>({ top: 0, height: 0, opacity: 0 })

  // 自动隐藏相关状态
  const [isHidden, setIsHidden] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 清除隐藏定时器
  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  // 启动隐藏定时器
  const startHideTimer = useCallback(() => {
    if (!autoHide) return
    clearHideTimer()
    hideTimerRef.current = setTimeout(() => {
      setIsHidden(true)
    }, autoHideDelay * 1000)
  }, [autoHide, autoHideDelay, clearHideTimer])

  // 鼠标进入处理
  const handleMouseEnter = useCallback(() => {
    if (!autoHide) return
    clearHideTimer()
    setIsHidden(false)
  }, [autoHide, clearHideTimer])

  // 鼠标离开处理
  const handleMouseLeave = useCallback(() => {
    if (!autoHide) return
    startHideTimer()
  }, [autoHide, startHideTimer])

  // autoHide 开启时启动定时器
  useEffect(() => {
    if (autoHide) {
      startHideTimer()
    } else {
      clearHideTimer()
    }
    return () => clearHideTimer()
  }, [autoHide, startHideTimer, clearHideTimer])

  // 实际隐藏状态：只有 autoHide 开启且 isHidden 为 true 时才隐藏
  const actuallyHidden = autoHide && isHidden

  // 计算当前激活项的 key
  const getActiveKey = useCallback(() => {
    if (settingsOpen) return 'settings'
    if (bookmarkDrawerOpen) return 'bookmarks'
    if (marketOpen) return 'market'
    if (location.pathname === '/') return 'home'
    if (location.pathname === '/login') return 'login'
    if (location.pathname.startsWith('/admin')) return 'admin'
    return null
  }, [settingsOpen, bookmarkDrawerOpen, marketOpen, location.pathname])

  // 更新指示器位置
  useEffect(() => {
    const activeKey = getActiveKey()
    if (!activeKey || !navRef.current) {
      setIndicatorStyle(prev => ({ ...prev, opacity: 0 }))
      return
    }
    const el = itemRefs.current.get(activeKey)
    if (!el) {
      setIndicatorStyle(prev => ({ ...prev, opacity: 0 }))
      return
    }
    const navRect = navRef.current.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    setIndicatorStyle({
      top: elRect.top - navRect.top,
      height: elRect.height,
      opacity: 1,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen, bookmarkDrawerOpen, marketOpen, location.pathname, user, expanded])

  const itemBase =
    'group relative flex items-center rounded-xl px-3 py-2 text-sm transition-colors duration-200 select-none overflow-hidden z-10'
  const itemIdle = 'text-fg/70 hover:text-fg hover:bg-glass/10 active:bg-glass/15'
  const itemActive = 'text-primary'

  return (
    <>
      {/* 悬浮触发区域：当侧边栏隐藏时，保持原来侧边栏收缩状态的位置可以触发显示 */}
      {actuallyHidden && (
        <div
          className="fixed left-0 top-0 h-full z-50"
          style={{ width: 'calc(4rem + 2rem)' }} // w-16 (64px) + m-4*2 (32px) = 96px
          onMouseEnter={handleMouseEnter}
        />
      )}
      <aside
        className={cn(
          'glass-panel-strong fixed left-4 top-1/2 -translate-y-1/2 rounded-2xl',
          'flex flex-col overflow-hidden transition-[width,transform] duration-300 ease-in-out will-change-[width,transform]',
          expanded ? 'w-64' : 'w-16',
          actuallyHidden && '-translate-x-[calc(100%+1rem)]',
        )}
        onClick={() => {
          // 关闭"点击后保持收起"时，点击空白区域展开侧边栏
          if (!clickKeepCollapsed && !expanded) setSidebarExpanded(true)
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
      <div className="flex items-center px-3 pt-2 relative h-14">
        <button
          type="button"
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 z-10', // z-10 to stay above text if overlap
            'hover:bg-glass/15 active:bg-glass/20',
          )}
          onClick={(e) => {
            e.stopPropagation()
            toggle()
          }}
          aria-label={expanded ? '收起侧边栏' : '展开侧边栏'}
          title={expanded ? '收起' : '展开'}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className={cn(
          "absolute left-14 top-1/2 -translate-y-1/2 flex flex-col justify-center min-w-0 transition-all duration-300 ease-in-out whitespace-nowrap",
          expanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"
        )}>
            <div className="text-sm font-semibold leading-none">TabN</div>
            <div className="text-xs text-fg/60 mt-1 leading-none">
              首页
            </div>
          </div>
      </div>

      <nav ref={navRef} className="mt-3 flex flex-col gap-1 relative">
        {/* 动态滑动指示器 */}
        <div
          className="absolute left-0 right-0 rounded-xl border border-primary/50 bg-primary/10 transition-all duration-300 ease-out pointer-events-none"
          style={{
            top: indicatorStyle.top,
            height: indicatorStyle.height,
            opacity: indicatorStyle.opacity,
          }}
        />
        <NavLink
          to="/"
          end
          ref={(el) => { if (el) itemRefs.current.set('home', el) }}
          className={({ isActive }) =>
            cn(itemBase, isActive && !settingsOpen && !bookmarkDrawerOpen && !marketOpen ? itemActive : itemIdle)
          }
          title="首页"
        >
          <IconWrapper>
            <Home className="h-5 w-5" />
          </IconWrapper>
          <SidebarLabel expanded={expanded}>首页</SidebarLabel>
        </NavLink>

        <button
          type="button"
          ref={(el) => { if (el) itemRefs.current.set('settings', el) }}
          className={cn(itemBase, settingsOpen ? itemActive : itemIdle, 'text-left')}
          onClick={() => {
            // 关闭"点击后保持收起"时，同时展开侧边栏
            if (!clickKeepCollapsed && !expanded) setSidebarExpanded(true)
            onOpenSettings()
          }}
          title="设置"
        >
          <IconWrapper>
            <Settings className="h-5 w-5" />
          </IconWrapper>
          <SidebarLabel expanded={expanded}>设置</SidebarLabel>
        </button>

        <button
          type="button"
          ref={(el) => { if (el) itemRefs.current.set('bookmarks', el) }}
          className={cn(itemBase, bookmarkDrawerOpen ? itemActive : itemIdle, 'text-left')}
          onClick={() => {
            // 关闭"点击后保持收起"时，同时展开侧边栏
            if (!clickKeepCollapsed && !expanded) setSidebarExpanded(true)
            navigate('/')
            // 延迟一点打开抽屉，确保已经在首页
            setTimeout(() => openBookmarkDrawer(true), 50)
          }}
          title="我的书签"
        >
          <IconWrapper>
            <Bookmark className="h-5 w-5" />
          </IconWrapper>
          <SidebarLabel expanded={expanded}>我的书签</SidebarLabel>
        </button>

        {/* 拓展商城入口 - 仅 ROOT 用户可见（功能开发中） */}
        {user?.role === 'ROOT' && (
          <button
            type="button"
            ref={(el) => { if (el) itemRefs.current.set('market', el) }}
            className={cn(itemBase, marketOpen ? itemActive : itemIdle, 'text-left')}
            onClick={() => {
              // 关闭"点击后保持收起"时，同时展开侧边栏
              if (!clickKeepCollapsed && !expanded) setSidebarExpanded(true)
              onOpenMarket()
            }}
            title="拓展商城"
          >
            <IconWrapper>
              <Store className="h-5 w-5" />
            </IconWrapper>
            <SidebarLabel expanded={expanded}>拓展商城</SidebarLabel>
          </button>
        )}

        {user?.role === 'ROOT' && (
          <NavLink
            to="/admin"
            ref={(el) => { if (el) itemRefs.current.set('admin', el) }}
            className={({ isActive }) =>
              cn(itemBase, isActive ? itemActive : itemIdle)
            }
            title="管理后台"
          >
            <IconWrapper>
              <Shield className="h-5 w-5" />
            </IconWrapper>
            <SidebarLabel expanded={expanded}>管理后台</SidebarLabel>
          </NavLink>
        )}

        {user ? (
          <>
            <button
              type="button"
              className={cn(itemBase, itemIdle, 'text-left')}
              onClick={() => {
                logout()
                toast.info('已退出登录')
              }}
              title="退出登录"
            >
              <IconWrapper>
                <LogOut className="h-5 w-5" />
              </IconWrapper>
              <SidebarLabel expanded={expanded}>退出登录</SidebarLabel>
            </button>
          </>
        ) : (
          <NavLink
            to="/login"
            ref={(el) => { if (el) itemRefs.current.set('login', el) }}
            className={({ isActive }) =>
              cn(itemBase, isActive ? itemActive : itemIdle)
            }
            title="登录"
          >
            <IconWrapper>
              <LogIn className="h-5 w-5" />
            </IconWrapper>
            <SidebarLabel expanded={expanded}>登录</SidebarLabel>
          </NavLink>
        )}
      </nav>

      <div className="p-3 text-xs text-fg/60 overflow-hidden relative h-10">
        <div className={cn(
           "absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out whitespace-nowrap",
           expanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"
        )}>
            {user ? (
              <div className="flex items-center gap-2">
              <User className="h-4 w-4 shrink-0" />
                <span className="truncate">已登录：{user.nickname}</span>
              </div>
            ) : (
            <div>登录后可同步数据</div>
            )}
          </div>
      </div>
      </aside>
    </>
  )
}
