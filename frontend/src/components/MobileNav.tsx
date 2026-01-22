import { Bookmark, Home, LogIn, LogOut, Settings, Shield } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppearanceStore } from '../stores/appearance'
import { useAuthStore } from '../stores/auth'
import { useBookmarkDrawerStore } from '../stores/bookmarkDrawer'
import { cn } from '../utils/cn'

type Props = {
  onOpenSettings: () => void
  settingsOpen?: boolean
}

export function MobileNav({ onOpenSettings, settingsOpen }: Props) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const openBookmarkDrawer = useBookmarkDrawerStore((s) => s.setOpen)
  const bookmarkDrawerOpen = useBookmarkDrawerStore((s) => s.open)
  const hideText = useAppearanceStore((s) => s.mobileNavHideText)
  const isRoot = user?.role === 'ROOT'

  const itemBase = cn(
    'flex flex-col items-center justify-center rounded-xl',
    'text-fg/70 transition-all duration-200 select-none',
    'active:scale-95',
    hideText ? 'py-2.5 px-4' : 'gap-0.5 py-2 px-4'
  )
  const itemActive = 'text-primary'

  // 首页按钮
  const HomeButton = (
    <NavLink
      to="/"
      end
      className={({ isActive }) =>
        cn(itemBase, isActive && !settingsOpen && !bookmarkDrawerOpen && itemActive)
      }
    >
      <Home className={hideText ? 'h-6 w-6' : 'h-5 w-5'} />
      {!hideText && <span className="text-[10px] font-medium">首页</span>}
    </NavLink>
  )

  // 书签按钮
  const BookmarkButton = (
    <button
      type="button"
      className={cn(itemBase, bookmarkDrawerOpen && itemActive)}
      onClick={() => {
        navigate('/')
        setTimeout(() => openBookmarkDrawer(true), 50)
      }}
    >
      <Bookmark className={hideText ? 'h-6 w-6' : 'h-5 w-5'} />
      {!hideText && <span className="text-[10px] font-medium">书签</span>}
    </button>
  )

  // 设置按钮
  const SettingsButton = (
    <button
      type="button"
      className={cn(itemBase, settingsOpen && itemActive)}
      onClick={onOpenSettings}
    >
      <Settings className={hideText ? 'h-6 w-6' : 'h-5 w-5'} />
      {!hideText && <span className="text-[10px] font-medium">设置</span>}
    </button>
  )

  // 管理按钮
  const AdminButton = (
    <NavLink
      to="/admin"
      className={({ isActive }) => cn(itemBase, isActive && itemActive)}
    >
      <Shield className={hideText ? 'h-6 w-6' : 'h-5 w-5'} />
      {!hideText && <span className="text-[10px] font-medium">管理</span>}
    </NavLink>
  )

  // 登录/退出按钮
  const AuthButton = user ? (
    <button
      type="button"
      className={cn(itemBase)}
      onClick={() => {
        logout()
        toast.info('已退出登录')
      }}
    >
      <LogOut className={hideText ? 'h-6 w-6' : 'h-5 w-5'} />
      {!hideText && <span className="text-[10px] font-medium">退出</span>}
    </button>
  ) : (
    <NavLink
      to="/login"
      className={({ isActive }) => cn(itemBase, isActive && itemActive)}
    >
      <LogIn className={hideText ? 'h-6 w-6' : 'h-5 w-5'} />
      {!hideText && <span className="text-[10px] font-medium">登录</span>}
    </NavLink>
  )

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+8px)]">
      <nav
        className={cn(
          'mx-auto max-w-md',
          'glass-panel-strong rounded-2xl'
        )}
      >
        <div className="flex items-center justify-around py-1.5">
          {/* ROOT 用户: 首页 - 设置 - 书签 - 管理 - 退出 */}
          {/* 普通用户: 首页 - 书签 - 设置 - 登录/退出 */}
          {isRoot ? (
            <>
              {HomeButton}
              {SettingsButton}
              {BookmarkButton}
              {AdminButton}
              {AuthButton}
            </>
          ) : (
            <>
              {HomeButton}
              {BookmarkButton}
              {SettingsButton}
              {AuthButton}
            </>
          )}
        </div>
      </nav>
    </div>
  )
}
