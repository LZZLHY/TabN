import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react'
import { 
  X, History, Eye, EyeOff, Palette, Clock, Monitor, Search, User, 
  RotateCcw, ChevronRight, ArrowLeft, AlertTriangle, Bookmark, Download
} from 'lucide-react'
import { useIsMobile, useIsDesktop } from '../hooks/useIsMobile'
import { useBackgroundImage } from '../hooks/useBackgroundImage'
import { toast } from 'sonner'
import {
  useAppearanceStore,
  type BackgroundType,
  type ClockHourCycle,
  type SearchEngine,
  type ThemeMode,
} from '../stores/appearance'
import { useAuthStore } from '../stores/auth'
import { useBookmarkDndStore } from '../stores/bookmarkDnd'
import { useBookmarkDrawerStore } from '../stores/bookmarkDrawer'
import { useSearchFocusStore } from '../stores/searchFocus'
import { cn } from '../utils/cn'
import { applySettingsFile, createSettingsFile } from '../utils/settingsFile'
import { isValidCustomSearchUrl } from '../utils/searchEngine'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { ChangelogDialog } from './ChangelogDialog'
import { APIKeyManager } from './settings/APIKeyManager'

type Props = {
  open: boolean
  onClose: () => void
}

type TabKey = 'appearance' | 'clock' | 'desktop' | 'bookmark' | 'search' | 'account' | 'reset'

function isValidHex(v: string) {
  const s = v.trim()
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(s)
}

// 卡片组件 - 移动端华为风格，桌面端毛玻璃效果
function Card({ id, title, description, children, highlighted, isMobileStyle }: { id?: string; title: string; description?: string; children: ReactNode; highlighted?: boolean; isMobileStyle?: boolean }) {
  return (
    <div 
      id={id}
      className={cn(
        'rounded-2xl p-4 sm:p-5 transition-all duration-500',
        isMobileStyle 
          ? 'bg-white dark:bg-zinc-900' 
          : 'bg-glass/35 backdrop-blur-lg border border-glass-border/25',
        'sm:rounded-[var(--start-radius)]',
        highlighted && 'border-primary/50 ring-2 ring-primary/30 bg-primary/15'
      )}
    >
      <div className="mb-3 sm:mb-4">
        <h3 className="text-sm sm:text-base font-semibold text-fg">{title}</h3>
        {description && <p className="text-xs text-fg/50 mt-0.5 sm:mt-1">{description}</p>}
      </div>
      <div className={cn(
        'border-t pt-3 sm:pt-4',
        isMobileStyle ? 'border-zinc-200 dark:border-zinc-800' : 'border-glass-border/15'
      )}>{children}</div>
    </div>
  )
}

// 设置项组件（标签与控件同一行，说明置于标签下方；fullWidth 时为垂直布局用于滑块）
function SettingItem({ label, hint, children, fullWidth = false }: { label: string; hint?: string; children: ReactNode; fullWidth?: boolean }) {
  // fullWidth 模式：垂直布局，用于滑块等需要全宽的控件
  if (fullWidth) {
    return (
      <div className="space-y-2 col-span-full">
        <div className="text-sm font-medium text-fg/80">{label}</div>
        {hint && <p className="text-xs text-fg/50">{hint}</p>}
        {children}
      </div>
    )
  }
  // 默认模式：水平布局
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-fg/80">{label}</div>
        {hint && <p className="text-xs text-fg/50 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0">
        {children}
      </div>
    </div>
  )
}

// 分段按钮
function SegButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-9 px-3 rounded-lg text-sm font-medium transition-all duration-200 border',
        active
          ? 'bg-primary text-primary-fg border-transparent shadow-sm'
          : 'bg-glass/10 text-fg/80 border-glass-border/20 hover:bg-glass/20 hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}

// 开关组件（左右滑动样式，适配主题色）
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2"
    >
      <span
        className={cn(
          'relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200',
          checked ? 'bg-[rgb(var(--primary))]' : 'bg-fg/20'
        )}
      >
        <span
          className={cn(
            'absolute w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
          )}
        />
      </span>
      <span className="text-sm text-fg/70">{label}</span>
    </button>
  )
}

// 滑块组件
function Slider({ value, onChange, min, max, step = 1, unit = '', onReset, defaultValue, onDragStart, onDragEnd }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string; onReset?: () => void; defaultValue?: number; onDragStart?: () => void; onDragEnd?: () => void }) {
  const isDraggingRef = useRef(false)
  
  const handleDragStart = () => {
    // 每次 mousedown/touchstart 都触发 onDragStart
    isDraggingRef.current = true
    onDragStart?.()
  }
  
  const handleDragEnd = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      onDragEnd?.()
    }
  }, [onDragEnd])
  
  // 监听全局 mouseup/touchend 事件，确保拖动结束时触发
  useEffect(() => {
    const handleGlobalEnd = () => handleDragEnd()
    window.addEventListener('mouseup', handleGlobalEnd)
    window.addEventListener('touchend', handleGlobalEnd)
    return () => {
      window.removeEventListener('mouseup', handleGlobalEnd)
      window.removeEventListener('touchend', handleGlobalEnd)
    }
  }, [handleDragEnd])
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-fg/80">{value}{unit}</span>
        {onReset && defaultValue !== undefined && value !== defaultValue && (
          <button type="button" onClick={onReset} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">重置</button>
        )}
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))} 
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        className="w-full accent-[rgb(var(--primary))] h-2 rounded-full cursor-pointer" 
      />
    </div>
  )
}

// 导航配置
const NAV_ICONS: Record<TabKey, typeof Palette> = { appearance: Palette, clock: Clock, desktop: Monitor, bookmark: Bookmark, search: Search, account: User, reset: RotateCcw }
const NAV_LABELS: Record<TabKey, string> = { appearance: '外观', clock: '时钟', desktop: '桌面', bookmark: '书签', search: '搜索', account: '账户', reset: '重置' }
const NAV_DESCRIPTIONS: Record<TabKey, string> = { appearance: '主题、颜色、背景', clock: '时间格式、显示内容', desktop: '首页布局、侧边栏', bookmark: '图标圆角、排序、拖拽', search: '搜索引擎、历史记录', account: '个人资料、安全设置', reset: '恢复默认设置' }

// 所有可搜索的设置项配置
interface SettingSearchItem {
  id: string
  label: string
  keywords: string[]
  tab: TabKey
  group: string
}

const SEARCHABLE_SETTINGS: SettingSearchItem[] = [
  // 外观
  { id: 'theme-mode', label: '深色模式', keywords: ['主题', '深色', '浅色', '跟随系统', 'dark', 'light', 'theme'], tab: 'appearance', group: '主题与颜色' },
  { id: 'accent-color', label: '主题色', keywords: ['颜色', '强调色', 'accent', 'color'], tab: 'appearance', group: '主题与颜色' },
  { id: 'background', label: '背景', keywords: ['背景', '壁纸', '必应', 'bing', 'background'], tab: 'appearance', group: '背景' },
  { id: 'mobile-nav', label: '移动端导航栏', keywords: ['移动端', '导航栏', 'mobile', 'nav'], tab: 'appearance', group: '移动端导航栏' },
  // 时钟
  { id: 'hour-cycle', label: '小时制', keywords: ['时间', '24小时', '12小时', 'hour'], tab: 'clock', group: '时间格式' },
  { id: 'clock-seconds', label: '显示秒', keywords: ['秒', 'seconds'], tab: 'clock', group: '显示内容' },
  { id: 'clock-date', label: '显示日期', keywords: ['日期', 'date'], tab: 'clock', group: '显示内容' },
  { id: 'clock-color', label: '时钟颜色', keywords: ['时钟颜色', '跟随主题色'], tab: 'clock', group: '字体颜色' },
  // 桌面
  { id: 'home-layout', label: '首页布局', keywords: ['布局', '动态', '固定', 'layout'], tab: 'desktop', group: '首页布局' },
  { id: 'sidebar', label: '侧边栏', keywords: ['侧边栏', '自动隐藏', 'sidebar'], tab: 'desktop', group: '侧边栏' },
  { id: 'dock', label: 'Dock栏', keywords: ['dock', '底部栏', '快捷栏', '书签入口', '设置入口'], tab: 'desktop', group: '底部 Dock 栏' },
  // 书签
  { id: 'icon-size', label: '图标大小', keywords: ['大小', 'size', '图标', '尺寸'], tab: 'bookmark', group: '图标大小' },
  { id: 'corner-radius', label: '图标圆角', keywords: ['圆角', 'radius', '边角', '图标'], tab: 'bookmark', group: '图标圆角' },
  { id: 'bookmark-sort', label: '书签排序', keywords: ['排序', '书签', 'sort', 'bookmark'], tab: 'bookmark', group: '书签排序' },
  { id: 'dnd-animation', label: '拖拽动画', keywords: ['拖拽', '动画', 'drag', 'animation'], tab: 'bookmark', group: '拖拽动画' },
  // 搜索
  { id: 'search-engine', label: '搜索引擎', keywords: ['搜索引擎', '百度', '必应', '谷歌', 'baidu', 'bing', 'google'], tab: 'search', group: '搜索引擎' },
  { id: 'search-glow', label: '流光边框', keywords: ['流光', '边框', 'glow', 'border'], tab: 'search', group: '流光边框' },
  { id: 'search-history', label: '搜索历史', keywords: ['历史', 'history'], tab: 'search', group: '搜索历史' },
  { id: 'recent-bookmarks', label: '最近打开', keywords: ['最近', '打开', 'recent'], tab: 'search', group: '最近打开' },
  { id: 'search-row-height', label: '选项行高', keywords: ['行高', 'row', 'height'], tab: 'search', group: '选项行高' },
  // 账户
  { id: 'login-status', label: '登录状态', keywords: ['登录', '账户', 'login', 'account'], tab: 'account', group: '登录状态' },
  { id: 'profile', label: '个人资料', keywords: ['资料', '昵称', '用户名', 'profile'], tab: 'account', group: '个人资料' },
  { id: 'password', label: '修改密码', keywords: ['密码', 'password'], tab: 'account', group: '修改密码' },
  { id: 'api-key', label: '扩展 API', keywords: ['API', '密钥', 'key'], tab: 'account', group: '扩展 API' },
  { id: 'import-export', label: '设置导入/导出', keywords: ['导入', '导出', 'import', 'export'], tab: 'account', group: '设置导入 / 导出' },
  { id: 'about', label: '关于', keywords: ['关于', '版本', 'about', 'version'], tab: 'account', group: '关于' },
]

// 重置确认框组件
function ResetConfirmDialog({ 
  open, 
  onClose, 
  onConfirm, 
  title, 
  description 
}: { 
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm glass-modal rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-fg">{title}</h3>
            <p className="text-sm text-fg/60 mt-1">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button variant="primary" size="sm" onClick={() => { onConfirm(); onClose() }}>确认重置</Button>
        </div>
      </div>
    </div>
  )
}

export function SettingsDialog({ open, onClose }: Props) {
  // Store values
  const mode = useAppearanceStore((s) => s.mode)
  const accent = useAppearanceStore((s) => s.accent)
  const backgroundType = useAppearanceStore((s) => s.backgroundType)
  const backgroundCustomUrl = useAppearanceStore((s) => s.backgroundCustomUrl)
  const backgroundApiUrl = useAppearanceStore((s) => s.backgroundApiUrl)
  const backgroundDimming = useAppearanceStore((s) => s.backgroundDimming)
  const clockHourCycle = useAppearanceStore((s) => s.clockHourCycle)
  const clockShowSeconds = useAppearanceStore((s) => s.clockShowSeconds)
  const clockShowDate = useAppearanceStore((s) => s.clockShowDate)
  const clockFollowAccent = useAppearanceStore((s) => s.clockFollowAccent)
  const clockScale = useAppearanceStore((s) => s.clockScale)
  const cornerRadius = useAppearanceStore((s) => s.cornerRadius)
  const sidebarAutoHide = useAppearanceStore((s) => s.sidebarAutoHide)
  const sidebarAutoHideDelay = useAppearanceStore((s) => s.sidebarAutoHideDelay)
  const sidebarClickKeepCollapsed = useAppearanceStore((s) => s.sidebarClickKeepCollapsed)
  const searchEngine = useAppearanceStore((s) => s.searchEngine)
  const customSearchUrl = useAppearanceStore((s) => s.customSearchUrl)
  const searchHistoryCount = useAppearanceStore((s) => s.searchHistoryCount)
  const searchRowHeight = useAppearanceStore((s) => s.searchRowHeight)
  const recentBookmarksCount = useAppearanceStore((s) => s.recentBookmarksCount)
  const recentBookmarksEnabled = useAppearanceStore((s) => s.recentBookmarksEnabled)
  const recentBookmarksMode = useAppearanceStore((s) => s.recentBookmarksMode)
  const searchGlowBorder = useAppearanceStore((s) => s.searchGlowBorder)
  const searchGlowLight = useAppearanceStore((s) => s.searchGlowLight)
  const searchGlowLightMove = useAppearanceStore((s) => s.searchGlowLightMove)
  const searchDropdownOpacity = useAppearanceStore((s) => s.searchDropdownOpacity)
  const searchDropdownBlur = useAppearanceStore((s) => s.searchDropdownBlur)
  const mobileNavHideText = useAppearanceStore((s) => s.mobileNavHideText)
  const homeFixedPosition = useAppearanceStore((s) => s.homeFixedPosition)
  const bookmarkDrawerSortMode = useAppearanceStore((s) => s.bookmarkDrawerSortMode)
  const bookmarkSortLocked = useAppearanceStore((s) => s.bookmarkSortLocked)
  const bookmarkIconSize = useAppearanceStore((s) => s.bookmarkIconSize)
  const bookmarkIconGap = useAppearanceStore((s) => s.bookmarkIconGap)
  const dockVisible = useAppearanceStore((s) => s.dockVisible)
  const dockShowBookmarks = useAppearanceStore((s) => s.dockShowBookmarks)
  const dockShowSettings = useAppearanceStore((s) => s.dockShowSettings)
  const dockAddPosition = useAppearanceStore((s) => s.dockAddPosition)
  const dndPrePush = useBookmarkDndStore((s) => s.prePush)
  const dndPushAnim = useBookmarkDndStore((s) => s.pushAnimation)
  const dndDropAnim = useBookmarkDndStore((s) => s.dropAnimation)

  // Store setters
  const setMode = useAppearanceStore((s) => s.setMode)
  const setAccent = useAppearanceStore((s) => s.setAccent)
  const setBackgroundType = useAppearanceStore((s) => s.setBackgroundType)
  const setBackgroundCustomUrl = useAppearanceStore((s) => s.setBackgroundCustomUrl)
  const setBackgroundApiUrl = useAppearanceStore((s) => s.setBackgroundApiUrl)
  const setBackgroundDimming = useAppearanceStore((s) => s.setBackgroundDimming)
  const resetAppearance = useAppearanceStore((s) => s.resetAppearance)
  const setClockHourCycle = useAppearanceStore((s) => s.setClockHourCycle)
  const setClockShowSeconds = useAppearanceStore((s) => s.setClockShowSeconds)
  const setClockShowDate = useAppearanceStore((s) => s.setClockShowDate)
  const setClockFollowAccent = useAppearanceStore((s) => s.setClockFollowAccent)
  const setClockScale = useAppearanceStore((s) => s.setClockScale)
  const setCornerRadius = useAppearanceStore((s) => s.setCornerRadius)
  const setSidebarAutoHide = useAppearanceStore((s) => s.setSidebarAutoHide)
  const setSidebarAutoHideDelay = useAppearanceStore((s) => s.setSidebarAutoHideDelay)
  const setSidebarClickKeepCollapsed = useAppearanceStore((s) => s.setSidebarClickKeepCollapsed)
  const setSearchEngine = useAppearanceStore((s) => s.setSearchEngine)
  const setCustomSearchUrl = useAppearanceStore((s) => s.setCustomSearchUrl)
  const setSearchHistoryCount = useAppearanceStore((s) => s.setSearchHistoryCount)
  const setSearchRowHeight = useAppearanceStore((s) => s.setSearchRowHeight)
  const setRecentBookmarksCount = useAppearanceStore((s) => s.setRecentBookmarksCount)
  const setRecentBookmarksEnabled = useAppearanceStore((s) => s.setRecentBookmarksEnabled)
  const setRecentBookmarksMode = useAppearanceStore((s) => s.setRecentBookmarksMode)
  const setSearchGlowBorder = useAppearanceStore((s) => s.setSearchGlowBorder)
  const setSearchGlowLight = useAppearanceStore((s) => s.setSearchGlowLight)
  const setSearchGlowLightMove = useAppearanceStore((s) => s.setSearchGlowLightMove)
  const setSearchDropdownOpacity = useAppearanceStore((s) => s.setSearchDropdownOpacity)
  const setSearchDropdownBlur = useAppearanceStore((s) => s.setSearchDropdownBlur)
  const setMobileNavHideText = useAppearanceStore((s) => s.setMobileNavHideText)
  const setHomeFixedPosition = useAppearanceStore((s) => s.setHomeFixedPosition)
  const setBookmarkDrawerSortMode = useAppearanceStore((s) => s.setBookmarkDrawerSortMode)
  const setBookmarkSortLocked = useAppearanceStore((s) => s.setBookmarkSortLocked)
  const setBookmarkIconSize = useAppearanceStore((s) => s.setBookmarkIconSize)
  const setBookmarkIconGap = useAppearanceStore((s) => s.setBookmarkIconGap)
  const setDockVisible = useAppearanceStore((s) => s.setDockVisible)
  const setDockShowBookmarks = useAppearanceStore((s) => s.setDockShowBookmarks)
  const setDockShowSettings = useAppearanceStore((s) => s.setDockShowSettings)
  const setDockAddPosition = useAppearanceStore((s) => s.setDockAddPosition)
  const setDndPrePush = useBookmarkDndStore((s) => s.setPrePush)
  const setDndPushAnim = useBookmarkDndStore((s) => s.setPushAnimation)
  const setDndDropAnim = useBookmarkDndStore((s) => s.setDropAnimation)
  const resetBookmarkDnd = useBookmarkDndStore((s) => s.resetBookmarkDnd)

  // Auth
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const changePassword = useAuthStore((s) => s.changePassword)

  // Local state
  const [accentInput, setAccentInput] = useState(() => accent)
  const [bgUrlInput, setBgUrlInput] = useState(() => backgroundCustomUrl)
  const [apiUrlInput, setApiUrlInput] = useState(() => backgroundApiUrl)
  const [nicknameInput, setNicknameInput] = useState(() => user?.nickname ?? '')
  const [customSearchUrlInput, setCustomSearchUrlInput] = useState(() => customSearchUrl)
  const [tab, setTab] = useState<TabKey | null>(null) // null = 显示列表（仅移动端/平板）
  const isMobile = useIsMobile()
  const isDesktop = useIsDesktop() // >= 1024px，与 lg 断点一致
  const { backgroundUrl: currentBackgroundUrl } = useBackgroundImage()
  
  // 检测当前是否为深色模式
  const [isDark, setIsDark] = useState(() => {
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)')
    return mode === 'dark' || (mode === 'system' && (mql?.matches ?? false))
  })
  
  useEffect(() => {
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)')
    const update = () => {
      setIsDark(mode === 'dark' || (mode === 'system' && (mql?.matches ?? false)))
    }
    update()
    if (mode === 'system' && mql) {
      mql.addEventListener?.('change', update)
      return () => mql.removeEventListener?.('change', update)
    }
  }, [mode])
  
  // 明暗度默认值：浅色模式 100%，深色模式 70%
  const dimmingDefault = isDark ? 70 : 100
  
  // 响应式布局切换：桌面端显示第一个 tab，非桌面端显示列表
  const prevIsDesktop = useRef(isDesktop)
  useEffect(() => {
    // 桌面端且 tab 为空时，显示第一个 tab
    if (isDesktop && tab === null) {
      setTab('appearance')
    }
    // 从桌面端变为非桌面端时，重置 tab 以显示列表页
    if (prevIsDesktop.current && !isDesktop) {
      setTab(null)
    }
    prevIsDesktop.current = isDesktop
  }, [isDesktop, tab])
  const [usernameInput, setUsernameInput] = useState(() => user?.username ?? '')
  const [emailInput, setEmailInput] = useState(() => user?.email || '')
  const [phoneInput, setPhoneInput] = useState(() => user?.phone || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showCurrentPwd, setShowCurrentPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [changelogOpen, setChangelogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [resetDialogType, setResetDialogType] = useState<'appearance' | 'dnd' | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null)
  
  // 设置页面关闭动画状态
  const [isClosing, setIsClosing] = useState(false)
  
  // 垂直位置拖动时隐藏设置页面预览桌面
  const [isPreviewingPosition, setIsPreviewingPosition] = useState(false)
  const sliderRef = useRef<HTMLInputElement>(null)
  const [sliderRect, setSliderRect] = useState<DOMRect | null>(null)
  
  // 时钟大小拖动时隐藏设置页面预览
  const [isPreviewingClockScale, setIsPreviewingClockScale] = useState(false)
  const clockScaleSliderRef = useRef<HTMLInputElement>(null)
  const [clockScaleSliderRect, setClockScaleSliderRect] = useState<DOMRect | null>(null)
  
  // 图标大小拖动时打开书签页预览
  const [isPreviewingIconSize, setIsPreviewingIconSize] = useState(false)
  const iconSizeSliderRef = useRef<HTMLInputElement>(null)
  const [iconSizeSliderRect, setIconSizeSliderRect] = useState<DOMRect | null>(null)
  const setBookmarkDrawerOpenForPreview = useBookmarkDrawerStore((s) => s.setOpenForPreview)
  
  // 圆角拖动时打开书签页预览
  const [isPreviewingCornerRadius, setIsPreviewingCornerRadius] = useState(false)
  const cornerRadiusSliderRef = useRef<HTMLInputElement>(null)
  const [cornerRadiusSliderRect, setCornerRadiusSliderRect] = useState<DOMRect | null>(null)
  
  // 间距拖动时打开书签页预览
  const [isPreviewingIconGap, setIsPreviewingIconGap] = useState(false)
  const iconGapSliderRef = useRef<HTMLInputElement>(null)
  const [iconGapSliderRect, setIconGapSliderRect] = useState<DOMRect | null>(null)
  
  // 背景明暗度拖动时隐藏设置页面预览
  const [isPreviewingDimming, setIsPreviewingDimming] = useState(false)
  const dimmingSliderRef = useRef<HTMLInputElement>(null)
  const [dimmingSliderRect, setDimmingSliderRect] = useState<DOMRect | null>(null)
  
  // 搜索建议框样式拖动时隐藏设置页面预览
  const [isPreviewingDropdownStyle, setIsPreviewingDropdownStyle] = useState(false)
  const [dropdownStyleSliderRect, setDropdownStyleSliderRect] = useState<DOMRect | null>(null)
  const [activeDropdownSlider, setActiveDropdownSlider] = useState<'opacity' | 'blur'>('opacity')
  const dropdownOpacitySliderRef = useRef<HTMLInputElement>(null)
  const dropdownBlurSliderRef = useRef<HTMLInputElement>(null)
  const setSearchPreviewMode = useSearchFocusStore((s) => s.setPreviewMode)
  
  // 开始预览时记录滑块条位置
  const handleStartPreview = useCallback(() => {
    if (sliderRef.current) {
      setSliderRect(sliderRef.current.getBoundingClientRect())
    }
    setIsPreviewingPosition(true)
  }, [])
  
  // 开始时钟大小预览
  const handleStartClockScalePreview = useCallback(() => {
    if (clockScaleSliderRef.current) {
      setClockScaleSliderRect(clockScaleSliderRef.current.getBoundingClientRect())
    }
    setIsPreviewingClockScale(true)
  }, [])
  
  // 开始图标大小预览（打开书签页）
  const handleStartIconSizePreview = useCallback(() => {
    if (iconSizeSliderRef.current) {
      setIconSizeSliderRect(iconSizeSliderRef.current.getBoundingClientRect())
    }
    setIsPreviewingIconSize(true)
    setBookmarkDrawerOpenForPreview(true)
  }, [setBookmarkDrawerOpenForPreview])
  
  // 开始圆角预览（打开书签页）
  const handleStartCornerRadiusPreview = useCallback(() => {
    if (cornerRadiusSliderRef.current) {
      setCornerRadiusSliderRect(cornerRadiusSliderRef.current.getBoundingClientRect())
    }
    setIsPreviewingCornerRadius(true)
    setBookmarkDrawerOpenForPreview(true)
  }, [setBookmarkDrawerOpenForPreview])
  
  // 开始间距预览（打开书签页）
  const handleStartIconGapPreview = useCallback(() => {
    if (iconGapSliderRef.current) {
      setIconGapSliderRect(iconGapSliderRef.current.getBoundingClientRect())
    }
    setIsPreviewingIconGap(true)
    setBookmarkDrawerOpenForPreview(true)
  }, [setBookmarkDrawerOpenForPreview])
  
  // 开始背景明暗度预览（隐藏设置页面）
  const handleStartDimmingPreview = useCallback(() => {
    if (dimmingSliderRef.current) {
      setDimmingSliderRect(dimmingSliderRef.current.getBoundingClientRect())
    }
    setIsPreviewingDimming(true)
  }, [])
  
  // 开始搜索建议框不透明度预览（隐藏设置页面，显示搜索建议框）
  const handleStartDropdownOpacityPreview = useCallback(() => {
    if (dropdownOpacitySliderRef.current) {
      setDropdownStyleSliderRect(dropdownOpacitySliderRef.current.getBoundingClientRect())
    }
    setActiveDropdownSlider('opacity')
    setIsPreviewingDropdownStyle(true)
    setSearchPreviewMode(true)
  }, [setSearchPreviewMode])
  
  // 开始搜索建议框模糊度预览（隐藏设置页面，显示搜索建议框）
  const handleStartDropdownBlurPreview = useCallback(() => {
    if (dropdownBlurSliderRef.current) {
      setDropdownStyleSliderRect(dropdownBlurSliderRef.current.getBoundingClientRect())
    }
    setActiveDropdownSlider('blur')
    setIsPreviewingDropdownStyle(true)
    setSearchPreviewMode(true)
  }, [setSearchPreviewMode])
  
  // 监听全局 mouseup/touchend 事件，拖动结束时恢复设置页面
  useEffect(() => {
    if (!isPreviewingPosition) return
    const handleEnd = () => setIsPreviewingPosition(false)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchend', handleEnd)
    return () => {
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isPreviewingPosition])
  
  // 监听全局 mouseup/touchend 事件，时钟大小拖动结束时恢复设置页面
  useEffect(() => {
    if (!isPreviewingClockScale) return
    const handleEnd = () => setIsPreviewingClockScale(false)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchend', handleEnd)
    return () => {
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isPreviewingClockScale])
  
  // 监听全局 mouseup/touchend 事件，图标大小拖动结束时关闭书签页
  useEffect(() => {
    if (!isPreviewingIconSize) return
    const handleEnd = () => {
      setIsPreviewingIconSize(false)
      setBookmarkDrawerOpenForPreview(false)
    }
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchend', handleEnd)
    return () => {
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isPreviewingIconSize, setBookmarkDrawerOpenForPreview])
  
  // 监听全局 mouseup/touchend 事件，圆角拖动结束时关闭书签页
  useEffect(() => {
    if (!isPreviewingCornerRadius) return
    const handleEnd = () => {
      setIsPreviewingCornerRadius(false)
      setBookmarkDrawerOpenForPreview(false)
    }
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchend', handleEnd)
    return () => {
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isPreviewingCornerRadius, setBookmarkDrawerOpenForPreview])
  
  // 监听全局 mouseup/touchend 事件，间距拖动结束时关闭书签页
  useEffect(() => {
    if (!isPreviewingIconGap) return
    const handleEnd = () => {
      setIsPreviewingIconGap(false)
      setBookmarkDrawerOpenForPreview(false)
    }
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchend', handleEnd)
    return () => {
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isPreviewingIconGap, setBookmarkDrawerOpenForPreview])
  
  // 监听全局 mouseup/touchend 事件，背景明暗度拖动结束时恢复设置页面
  useEffect(() => {
    if (!isPreviewingDimming) return
    const handleEnd = () => setIsPreviewingDimming(false)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchend', handleEnd)
    return () => {
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isPreviewingDimming])
  
  // 监听全局 mouseup/touchend 事件，搜索建议框样式拖动结束时恢复设置页面
  useEffect(() => {
    if (!isPreviewingDropdownStyle) return
    const handleEnd = () => {
      setIsPreviewingDropdownStyle(false)
      setSearchPreviewMode(false)
    }
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchend', handleEnd)
    return () => {
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isPreviewingDropdownStyle, setSearchPreviewMode])
  
  // 带动画的关闭函数
  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, !isDesktop ? 250 : 150)
  }, [onClose, isDesktop])

  // 搜索过滤结果
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const query = searchQuery.toLowerCase()
    return SEARCHABLE_SETTINGS.filter(item => 
      item.label.toLowerCase().includes(query) ||
      item.keywords.some(kw => kw.toLowerCase().includes(query))
    )
  }, [searchQuery])

  // 移动端打开设置详情页
  const handleOpenTab = useCallback((key: TabKey) => {
    setTab(key)
  }, [])

  // 移动端返回列表页
  const handleBackToList = useCallback(() => {
    setTab(null)
  }, [])

  // 跳转到搜索结果并滚动到具体卡片
  const handleSearchResultClick = useCallback((item: SettingSearchItem) => {
    handleOpenTab(item.tab)
    setSearchQuery('')
    // 延迟滚动到对应卡片
    setTimeout(() => {
      const cardElement = document.getElementById(`settings-card-${item.id}`)
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // 高亮卡片
        setHighlightedCardId(item.id)
        setTimeout(() => setHighlightedCardId(null), 2000)
      }
    }, 100)
  }, [handleOpenTab])

  // 安卓返回键/手势拦截
  const historyPushedRef = useRef(false)
  
  useEffect(() => {
    if (!open) {
      historyPushedRef.current = false
      return
    }

    // 只在首次打开时 push
    if (!historyPushedRef.current) {
      window.history.pushState({ settingsDialogOpen: true }, '')
      historyPushedRef.current = true
    }

    const handlePopState = () => {
      // 非桌面端详情页：返回列表
      if (!isDesktop && tab !== null) {
        setTab(null)
        // 重新 push 保持拦截
        window.history.pushState({ settingsDialogOpen: true }, '')
      } else {
        historyPushedRef.current = false
        onClose()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [open, onClose, isDesktop, tab])

  // Effects
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  useEffect(() => {
    if (!open) return
    setNicknameInput(user?.nickname ?? '')
    setUsernameInput(user?.username ?? '')
    setEmailInput(user?.email || '')
    setPhoneInput(user?.phone || '')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }, [open, user?.nickname, user?.username, user?.email, user?.phone])

  useEffect(() => {
    if (!open) return
    setCustomSearchUrlInput(customSearchUrl)
  }, [open, customSearchUrl])

  // Computed
  const accentHint = useMemo(() => {
    if (!accentInput.trim()) return '例如：#3b82f6'
    if (isValidHex(accentInput)) return '看起来没问题'
    return '格式不对，应该是 #RRGGBB 或 #RGB'
  }, [accentInput])

  const usernameValid = usernameInput.trim().length >= 3 && usernameInput.trim().length <= 32
  const nicknameValid = nicknameInput.trim().length >= 2 && nicknameInput.trim().length <= 32
  const emailValid = !emailInput.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())
  const phoneValid = !phoneInput.trim() || (phoneInput.trim().length >= 6 && phoneInput.trim().length <= 32)
  const profileValid = usernameValid && nicknameValid && emailValid && phoneValid
  const newPasswordValid = newPassword.length >= 6 && newPassword.length <= 200
  const confirmPasswordValid = newPassword === confirmPassword
  const passwordFormValid = currentPassword.length > 0 && newPasswordValid && confirmPasswordValid

  // Handlers
  const handleSaveProfile = async () => {
    if (!profileValid || !user) return
    setProfileLoading(true)
    try {
      const result = await updateProfile({ username: usernameInput.trim(), nickname: nicknameInput.trim(), email: emailInput.trim() || null, phone: phoneInput.trim() || null })
      if (result.ok) toast.success('资料已更新')
      else toast.error(result.message)
    } finally { setProfileLoading(false) }
  }

  const handleChangePassword = async () => {
    if (!passwordFormValid || !user) return
    setPasswordLoading(true)
    try {
      const result = await changePassword(currentPassword, newPassword)
      if (result.ok) { toast.success('密码已修改'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }
      else toast.error(result.message)
    } finally { setPasswordLoading(false) }
  }

  if (!open) return null

  const closeAndToast = () => { toast.success('设置已保存'); onClose() }
  const onChangeMode = (m: ThemeMode) => setMode(m)
  const onChangeBgType = (t: BackgroundType) => setBackgroundType(t)
  const onChangeHourCycle = (v: ClockHourCycle) => setClockHourCycle(v)
  const onChangeSearchEngine = (v: SearchEngine) => setSearchEngine(v)

  const exportSettings = () => {
    const data = createSettingsFile()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'start-settings.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('设置已导出')
  }

  const importSettings = async (file: File) => {
    try {
      const text = await file.text()
      const json = JSON.parse(text) as unknown
      const resp = applySettingsFile(json)
      if (!resp.ok) { toast.error(resp.message); return }
      if (resp.partial) toast.warning(resp.message)
      else toast.success(resp.message)
    } catch { toast.error('导入失败：文件不是合法 JSON') }
  }

  const navItems: TabKey[] = ['appearance', 'clock', 'desktop', 'bookmark', 'search', 'account', 'reset']

  return (
    <>
      {/* 预览时显示固定位置的滑块条 - 垂直位置 */}
      {isPreviewingPosition && sliderRect && (
        <>
          <span 
            className="text-sm font-medium text-fg/80"
            style={{
              position: 'fixed',
              top: sliderRect.top - 24,
              left: sliderRect.left,
              zIndex: 9999,
            }}
          >
            {homeFixedPosition}%
          </span>
          <input 
            type="range" 
            min={15} 
            max={50} 
            step={1} 
            value={homeFixedPosition} 
            onChange={(e) => setHomeFixedPosition(Number(e.target.value))} 
            style={{
              position: 'fixed',
              top: sliderRect.top,
              left: sliderRect.left,
              width: sliderRect.width,
              height: sliderRect.height,
              zIndex: 9999,
            }}
            className="accent-[rgb(var(--primary))] rounded-full cursor-pointer" 
          />
        </>
      )}
      
      {/* 预览时显示固定位置的滑块条 - 时钟大小 */}
      {isPreviewingClockScale && clockScaleSliderRect && (
        <>
          <span 
            className="text-sm font-medium text-fg/80"
            style={{
              position: 'fixed',
              top: clockScaleSliderRect.top - 24,
              left: clockScaleSliderRect.left,
              zIndex: 9999,
            }}
          >
            {clockScale}%
          </span>
          <input 
            type="range" 
            min={50} 
            max={150} 
            step={5} 
            value={clockScale} 
            onChange={(e) => setClockScale(Number(e.target.value))} 
            style={{
              position: 'fixed',
              top: clockScaleSliderRect.top,
              left: clockScaleSliderRect.left,
              width: clockScaleSliderRect.width,
              height: clockScaleSliderRect.height,
              zIndex: 9999,
            }}
            className="accent-[rgb(var(--primary))] rounded-full cursor-pointer" 
          />
        </>
      )}
      
      {/* 预览时显示固定位置的滑块条 - 图标大小 */}
      {isPreviewingIconSize && iconSizeSliderRect && (
        <>
          <span 
            className="text-sm font-medium text-fg/80"
            style={{
              position: 'fixed',
              top: iconSizeSliderRect.top - 24,
              left: iconSizeSliderRect.left,
              zIndex: 9999,
            }}
          >
            {bookmarkIconSize}px
          </span>
          <input 
            type="range" 
            min={48} 
            max={96} 
            step={4} 
            value={bookmarkIconSize} 
            onChange={(e) => setBookmarkIconSize(Number(e.target.value))} 
            style={{
              position: 'fixed',
              top: iconSizeSliderRect.top,
              left: iconSizeSliderRect.left,
              width: iconSizeSliderRect.width,
              height: iconSizeSliderRect.height,
              zIndex: 9999,
            }}
            className="accent-[rgb(var(--primary))] rounded-full cursor-pointer" 
          />
        </>
      )}
      
      {/* 预览时显示固定位置的滑块条 - 圆角 */}
      {isPreviewingCornerRadius && cornerRadiusSliderRect && (
        <>
          <span 
            className="text-sm font-medium text-fg/80"
            style={{
              position: 'fixed',
              top: cornerRadiusSliderRect.top - 24,
              left: cornerRadiusSliderRect.left,
              zIndex: 9999,
            }}
          >
            {cornerRadius}px
          </span>
          <input 
            type="range" 
            min={0} 
            max={48} 
            step={1} 
            value={cornerRadius} 
            onChange={(e) => setCornerRadius(Number(e.target.value))} 
            style={{
              position: 'fixed',
              top: cornerRadiusSliderRect.top,
              left: cornerRadiusSliderRect.left,
              width: cornerRadiusSliderRect.width,
              height: cornerRadiusSliderRect.height,
              zIndex: 9999,
            }}
            className="accent-[rgb(var(--primary))] rounded-full cursor-pointer" 
          />
        </>
      )}
      
      {/* 预览时显示固定位置的滑块条 - 背景明暗度 */}
      {isPreviewingDimming && dimmingSliderRect && (
        <>
          <span 
            className="text-sm font-medium text-fg/80"
            style={{
              position: 'fixed',
              top: dimmingSliderRect.top - 24,
              left: dimmingSliderRect.left,
              zIndex: 9999,
            }}
          >
            {backgroundDimming}%
          </span>
          <input 
            type="range" 
            min={0} 
            max={100} 
            step={5} 
            value={backgroundDimming} 
            onChange={(e) => setBackgroundDimming(Number(e.target.value))} 
            style={{
              position: 'fixed',
              top: dimmingSliderRect.top,
              left: dimmingSliderRect.left,
              width: dimmingSliderRect.width,
              height: dimmingSliderRect.height,
              zIndex: 9999,
            }}
            className="accent-[rgb(var(--primary))] rounded-full cursor-pointer" 
          />
        </>
      )}
      
      {/* 预览时显示固定位置的滑块条 - 间距 */}
      {isPreviewingIconGap && iconGapSliderRect && (
        <>
          <span 
            className="text-sm font-medium text-fg/80"
            style={{
              position: 'fixed',
              top: iconGapSliderRect.top - 24,
              left: iconGapSliderRect.left,
              zIndex: 9999,
            }}
          >
            {bookmarkIconGap}px
          </span>
          <input 
            type="range" 
            min={20} 
            max={100} 
            step={2} 
            value={bookmarkIconGap} 
            onChange={(e) => setBookmarkIconGap(Number(e.target.value))} 
            style={{
              position: 'fixed',
              top: iconGapSliderRect.top,
              left: iconGapSliderRect.left,
              width: iconGapSliderRect.width,
              height: iconGapSliderRect.height,
              zIndex: 9999,
            }}
            className="accent-[rgb(var(--primary))] rounded-full cursor-pointer" 
          />
        </>
      )}
      
      {/* 预览时显示固定位置的滑块条 - 搜索建议框样式 */}
      {isPreviewingDropdownStyle && dropdownStyleSliderRect && (
        <>
          <span 
            className="text-sm font-medium text-fg/80"
            style={{
              position: 'fixed',
              top: dropdownStyleSliderRect.top - 24,
              left: dropdownStyleSliderRect.left,
              zIndex: 99999,
            }}
          >
            {activeDropdownSlider === 'opacity' ? `${searchDropdownOpacity}%` : `${searchDropdownBlur}px`}
          </span>
          <input 
            type="range" 
            min={0} 
            max={activeDropdownSlider === 'opacity' ? 100 : 128} 
            step={1} 
            value={activeDropdownSlider === 'opacity' ? searchDropdownOpacity : searchDropdownBlur} 
            onChange={(e) => {
              if (activeDropdownSlider === 'opacity') {
                setSearchDropdownOpacity(Number(e.target.value))
              } else {
                setSearchDropdownBlur(Number(e.target.value))
              }
            }} 
            style={{
              position: 'fixed',
              top: dropdownStyleSliderRect.top,
              left: dropdownStyleSliderRect.left,
              width: dropdownStyleSliderRect.width,
              height: dropdownStyleSliderRect.height,
              zIndex: 99999,
            }}
            className="accent-[rgb(var(--primary))] rounded-full cursor-pointer" 
          />
        </>
      )}
      
      <div 
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 lg:p-6',
          (isPreviewingPosition || isPreviewingClockScale || isPreviewingDimming || isPreviewingDropdownStyle) && 'pointer-events-none opacity-0'
        )}
      >
        {/* 背景遮罩 - 移动端无遮罩，桌面端有遮罩 */}
        <div 
          className={cn(
            'absolute inset-0 hidden sm:block bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-200',
            isClosing ? 'fade-out' : 'fade-in'
          )} 
          onClick={handleClose} 
        />

        <div 
          role="dialog" 
          aria-modal="true" 
          className={cn(
            'relative w-full flex flex-col overflow-hidden',
            // 只在非预览时启用过渡动画
            !(isPreviewingPosition || isPreviewingClockScale || isPreviewingDimming) && 'transition-all duration-200',
            // 移动端：全屏无边框
            'h-full bg-bg',
            !isDesktop && !(isPreviewingPosition || isPreviewingClockScale || isPreviewingDimming) && (isClosing ? 'slide-down-out' : 'slide-up-in'),
            // 桌面端：居中弹窗，有边框和圆角，缩放动画
            'sm:max-w-5xl sm:h-[90vh] sm:max-h-[800px] sm:rounded-[var(--start-radius)] sm:bg-glass/15 sm:backdrop-blur-md sm:border sm:border-glass-border/20',
            isDesktop && !(isPreviewingPosition || isPreviewingClockScale || isPreviewingDimming) && (isClosing ? 'scale-out' : 'scale-in')
          )}
        >
        {/* Header */}
        <header className={cn(
          'flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b',
          isMobile 
            ? 'bg-zinc-100 dark:bg-black border-zinc-200 dark:border-zinc-800' 
            : 'bg-glass/15 backdrop-blur-md border-glass-border/20'
        )}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* 非桌面端详情页返回按钮 */}
              {!isDesktop && tab !== null && (
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="p-2 -ml-2 rounded-lg hover:bg-glass/20 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-fg/70" />
                </button>
              )}
              <div>
                <h1 className={cn('font-semibold text-fg', !isDesktop && tab === null ? 'text-2xl' : 'text-xl')}>
                  {!isDesktop && tab === null ? '设置' : tab ? NAV_LABELS[tab] : '设置'}
                </h1>
                {tab && isDesktop && (
                  <p className="text-sm text-fg/60 mt-0.5">{NAV_DESCRIPTIONS[tab]}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(isDesktop || tab !== null) && (
                <Button variant="primary" size="sm" onClick={closeAndToast}>保存</Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleClose} aria-label="关闭" className="h-9 w-9 p-0"><X className="h-4 w-4" /></Button>
            </div>
          </div>
          
          {/* 搜索栏 - 桌面端在 header 下方，非桌面端在列表页顶部 */}
          {(isDesktop || tab === null) && (
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/40" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => setTimeout(() => setSearchQuery(''), 150)}
                placeholder="搜索设置项..."
                className={cn(
                  'w-full h-10 pl-10 pr-4 rounded-xl text-sm text-fg placeholder:text-fg/40 focus:outline-none transition-all',
                  // 移动端：华为风格卡片背景
                  isMobile 
                    ? 'bg-white dark:bg-zinc-900 border-0 focus:ring-2 focus:ring-primary/30'
                    : 'bg-glass/20 border border-glass-border/20 focus:border-primary/50 focus:bg-glass/30'
                )}
              />
              {/* 搜索结果下拉 - 采用搜索框建议样式 */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 py-2 rounded-2xl bg-glass/75 backdrop-blur-xl border border-glass-border/20 shadow-glass z-10 max-h-72 overflow-y-auto">
                  <div className="text-[10px] text-fg/50 px-4 pb-1.5">搜索结果</div>
                  <div className="px-2 space-y-0.5">
                    {searchResults.map((item) => {
                      const Icon = NAV_ICONS[item.tab]
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSearchResultClick(item)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent text-fg/80 hover:bg-primary/10 hover:border-primary/20 hover:text-fg transition-all duration-150 text-left"
                        >
                          <Icon className="w-4 h-4 text-fg/40 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm truncate">{item.label}</span>
                            <span className="text-xs text-fg/40 ml-2">{item.group}</span>
                          </div>
                          <span className="text-[10px] text-fg/40 px-1.5 py-0.5 rounded bg-glass/30">{NAV_LABELS[item.tab]}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </header>

        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Nav - Desktop (Windows 风格) */}
          <nav className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r border-glass-border/20 bg-glass/15 backdrop-blur-md">
            <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {navItems.map((key) => {
                const Icon = NAV_ICONS[key]
                const isActive = tab === key
                return (
                  <button 
                    key={key} 
                    type="button" 
                    onClick={() => setTab(key)} 
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-200',
                      isActive 
                        ? 'bg-primary/15 text-primary font-medium' 
                        : 'text-fg/70 hover:bg-glass/15 hover:text-fg'
                    )}
                  >
                    <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-primary')} />
                    <div className="flex-1 text-left">
                      <div className={cn('leading-tight', isActive && 'font-medium')}>{NAV_LABELS[key]}</div>
                      <div className="text-xs text-fg/50 mt-0.5">{NAV_DESCRIPTIONS[key]}</div>
                    </div>
                    <ChevronRight className={cn('w-4 h-4 opacity-0 transition-opacity', isActive && 'opacity-60')} />
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Mobile/Tablet Nav - 列表视图（小于 lg 断点时显示） */}
          {!isDesktop && tab === null && (
            <div className={cn(
              'flex-1 overflow-y-auto slide-in-left',
              isMobile ? 'bg-zinc-100 dark:bg-black' : 'bg-glass/15 backdrop-blur-md'
            )}>
              <div className="p-4 space-y-3">
                {/* 设置分组卡片 */}
                <div className={cn(
                  'rounded-2xl overflow-hidden',
                  isMobile 
                    ? 'bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800' 
                    : 'bg-glass/35 backdrop-blur-lg border border-glass-border/25 divide-y divide-glass-border/20'
                )}>
                  {navItems.map((key) => {
                    const Icon = NAV_ICONS[key]
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleOpenTab(key)}
                        className="w-full flex items-center gap-4 px-4 py-4 hover:bg-glass/20 active:bg-glass/30 transition-colors"
                      >
                        <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-fg">{NAV_LABELS[key]}</div>
                          <div className="text-xs text-fg/50 mt-0.5">{NAV_DESCRIPTIONS[key]}</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-fg/30 flex-shrink-0" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Content - 详情视图（桌面端始终显示，非桌面端仅当 tab 不为 null 时显示） */}
          {(isDesktop || tab !== null) && (
            <div className={cn(
              'flex-1 overflow-y-auto',
              isMobile ? 'bg-zinc-100 dark:bg-black' : 'bg-glass/15 backdrop-blur-md',
              !isDesktop && 'slide-in-right'
            )}>
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-5 max-w-3xl mx-auto pb-20 sm:pb-6">
              {/* Appearance */}
              {tab === 'appearance' && (
                <>
                  <Card id="settings-card-theme-mode" title="主题与颜色" description="自定义应用的视觉风格" highlighted={highlightedCardId === 'theme-mode' || highlightedCardId === 'accent-color'} isMobileStyle={isMobile}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <SettingItem label="深色模式">
                        <div className="flex flex-wrap gap-2">
                          <SegButton active={mode === 'system'} onClick={() => onChangeMode('system')}>跟随系统</SegButton>
                          <SegButton active={mode === 'light'} onClick={() => onChangeMode('light')}>浅色</SegButton>
                          <SegButton active={mode === 'dark'} onClick={() => onChangeMode('dark')}>深色</SegButton>
                        </div>
                      </SettingItem>
                      <SettingItem label="主题色">
                        <div className="flex items-center gap-3">
                          <input type="color" value={accent} onChange={(e) => { setAccent(e.target.value); setAccentInput(e.target.value) }} className="h-9 w-12 rounded-lg border border-glass-border/25 bg-glass/10 p-1 cursor-pointer" title="选择主题色" />
                          <div className="flex-1"><Input value={accentInput} onChange={(e) => { const v = e.target.value; setAccentInput(v); if (isValidHex(v)) setAccent(v.trim()) }} placeholder="#3b82f6" className="h-9" /></div>
                        </div>
                        <p className={cn('text-xs', isValidHex(accentInput) ? 'text-fg/50' : 'text-red-400')}>{accentHint}</p>
                      </SettingItem>
                    </div>
                  </Card>
                  <Card id="settings-card-background" title="背景" description="设置首页背景图片" highlighted={highlightedCardId === 'background'} isMobileStyle={isMobile}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {/* 必应每日一图预览 */}
                      <button
                        type="button"
                        onClick={() => onChangeBgType('bing')}
                        className={cn(
                          'relative aspect-video rounded-xl overflow-hidden border-2 transition-all',
                          backgroundType === 'bing' 
                            ? 'border-[rgb(var(--primary))] ring-2 ring-[rgb(var(--primary))]/30' 
                            : 'border-glass-border/30 hover:border-glass-border/50'
                        )}
                      >
                        <img 
                          src="https://bing.img.run/1920x1080.php" 
                          alt="必应每日一图" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <span className="absolute bottom-2 left-2 text-xs text-white font-medium">必应每日</span>
                        {backgroundType === 'bing' && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[rgb(var(--primary))] flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </button>
                      {/* Picsum 随机壁纸 */}
                      <button
                        type="button"
                        onClick={() => onChangeBgType('picsum')}
                        className={cn(
                          'relative aspect-video rounded-xl overflow-hidden border-2 transition-all',
                          backgroundType === 'picsum' 
                            ? 'border-[rgb(var(--primary))] ring-2 ring-[rgb(var(--primary))]/30' 
                            : 'border-glass-border/30 hover:border-glass-border/50'
                        )}
                      >
                        <img 
                          src="https://picsum.photos/400/225" 
                          alt="Picsum" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <span className="absolute bottom-2 left-2 text-xs text-white font-medium">Picsum</span>
                        {backgroundType === 'picsum' && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[rgb(var(--primary))] flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </button>
                      {/* 自定义壁纸预览/添加 */}
                      <button
                        type="button"
                        onClick={() => onChangeBgType('custom')}
                        className={cn(
                          'relative aspect-video rounded-xl overflow-hidden border-2 transition-all',
                          backgroundType === 'custom' 
                            ? 'border-[rgb(var(--primary))] ring-2 ring-[rgb(var(--primary))]/30' 
                            : 'border-glass-border/30 hover:border-glass-border/50'
                        )}
                      >
                        {backgroundCustomUrl ? (
                          <>
                            <img 
                              src={backgroundCustomUrl} 
                              alt="自定义壁纸" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className="absolute bottom-2 left-2 text-xs text-white font-medium">自定义</span>
                          </>
                        ) : (
                          <div className="w-full h-full bg-glass/20 flex flex-col items-center justify-center gap-1">
                            <span className="text-2xl text-fg/40">+</span>
                            <span className="text-xs text-fg/50">自定义</span>
                          </div>
                        )}
                        {backgroundType === 'custom' && backgroundCustomUrl && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[rgb(var(--primary))] flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </button>
                      {/* 自定义 API */}
                      <button
                        type="button"
                        onClick={() => onChangeBgType('api')}
                        className={cn(
                          'relative aspect-video rounded-xl overflow-hidden border-2 transition-all',
                          backgroundType === 'api' 
                            ? 'border-[rgb(var(--primary))] ring-2 ring-[rgb(var(--primary))]/30' 
                            : 'border-glass-border/30 hover:border-glass-border/50'
                        )}
                      >
                        {backgroundApiUrl ? (
                          <>
                            <img 
                              src={backgroundApiUrl} 
                              alt="自定义 API" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className="absolute bottom-2 left-2 text-xs text-white font-medium">自定义API</span>
                          </>
                        ) : (
                          <div className="w-full h-full bg-glass/20 flex flex-col items-center justify-center gap-1">
                            <span className="text-2xl text-fg/40">+</span>
                            <span className="text-xs text-fg/50">自定义API</span>
                          </div>
                        )}
                        {backgroundType === 'api' && backgroundApiUrl && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[rgb(var(--primary))] flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </button>
                    </div>
                    {backgroundType === 'custom' && (
                      <div className="mt-4">
                        <SettingItem label="自定义图片 URL" hint="粘贴可访问的图片链接" fullWidth>
                          <div className="flex gap-2">
                            <Input value={bgUrlInput} onChange={(e) => setBgUrlInput(e.target.value)} placeholder="https://..." className="flex-1" />
                            <Button size="sm" onClick={() => { setBackgroundCustomUrl(bgUrlInput.trim()); toast('背景已更新') }}>应用</Button>
                          </div>
                        </SettingItem>
                      </div>
                    )}
                    {backgroundType === 'api' && (
                      <div className="mt-4">
                        <SettingItem label="壁纸 API 地址" hint="输入返回图片的 API 接口地址（每次刷新获取新图片）" fullWidth>
                          <div className="flex gap-2">
                            <Input value={apiUrlInput} onChange={(e) => setApiUrlInput(e.target.value)} placeholder="https://api.example.com/wallpaper" className="flex-1" />
                            <Button size="sm" onClick={() => { setBackgroundApiUrl(apiUrlInput.trim()); toast('API 已设置') }}>应用</Button>
                          </div>
                        </SettingItem>
                      </div>
                    )}
                    <div className="mt-4 flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={async () => {
                          try {
                            toast('正在下载壁纸...')
                            const response = await fetch(currentBackgroundUrl)
                            const blob = await response.blob()
                            const url = URL.createObjectURL(blob)
                            const link = document.createElement('a')
                            link.href = url
                            link.download = `wallpaper-${Date.now()}.jpg`
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                            URL.revokeObjectURL(url)
                            toast.success('壁纸下载完成')
                          } catch {
                            toast.error('下载失败，请右键图片另存为')
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        下载当前壁纸
                      </Button>
                    </div>
                  </Card>
                  {isMobile && (
                    <Card id="settings-card-mobile-nav" title="移动端导航栏" description="仅在移动设备上生效" highlighted={highlightedCardId === 'mobile-nav'} isMobileStyle={isMobile}>
                      <SettingItem label="隐藏导航栏文字" hint="只显示图标，不显示文字标签">
                        <Toggle checked={mobileNavHideText} onChange={setMobileNavHideText} label={mobileNavHideText ? '已隐藏' : '已显示'} />
                      </SettingItem>
                    </Card>
                  )}
                </>
              )}

              {/* Clock */}
              {tab === 'clock' && (
                <>
                  <Card id="settings-card-hour-cycle" title="时间格式" description="选择时钟显示的小时制" highlighted={highlightedCardId === 'hour-cycle'} isMobileStyle={isMobile}>
                    <SettingItem label="小时制">
                      <div className="flex flex-wrap gap-2">
                        <SegButton active={clockHourCycle === '24'} onClick={() => onChangeHourCycle('24')}>24 小时</SegButton>
                        <SegButton active={clockHourCycle === '12'} onClick={() => onChangeHourCycle('12')}>12 小时</SegButton>
                      </div>
                    </SettingItem>
                  </Card>
                  <Card id="settings-card-clock-seconds" title="显示内容" description="控制时钟显示的信息" highlighted={highlightedCardId === 'clock-seconds' || highlightedCardId === 'clock-date'} isMobileStyle={isMobile}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <SettingItem label="显示秒"><Toggle checked={clockShowSeconds} onChange={setClockShowSeconds} label={clockShowSeconds ? '显示' : '隐藏'} /></SettingItem>
                      <SettingItem label="显示日期"><Toggle checked={clockShowDate} onChange={setClockShowDate} label={clockShowDate ? '显示' : '隐藏'} /></SettingItem>
                    </div>
                  </Card>
                  <Card id="settings-card-clock-color" title="字体颜色" description="时钟文字的颜色设置" highlighted={highlightedCardId === 'clock-color'} isMobileStyle={isMobile}>
                    <SettingItem label="跟随主题色" hint="开启后时钟使用主题色显示"><Toggle checked={clockFollowAccent} onChange={setClockFollowAccent} label={clockFollowAccent ? '已开启' : '已关闭'} /></SettingItem>
                  </Card>
                  <Card id="settings-card-clock-size" title="时钟大小" description="调整时钟的显示大小" highlighted={highlightedCardId === 'clock-size'} isMobileStyle={isMobile}>
                    <SettingItem label="缩放比例" hint="时钟大小（50-150%），拖动滑块时可实时预览" fullWidth>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-fg/80">{clockScale}%</span>
                          {clockScale !== 100 && (
                            <button type="button" onClick={() => setClockScale(100)} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">重置</button>
                          )}
                        </div>
                        <input 
                          ref={clockScaleSliderRef}
                          type="range" 
                          min={50} 
                          max={150} 
                          step={5} 
                          value={clockScale} 
                          onChange={(e) => setClockScale(Number(e.target.value))} 
                          onMouseDown={handleStartClockScalePreview}
                          onTouchStart={handleStartClockScalePreview}
                          className="w-full accent-[rgb(var(--primary))] h-2 rounded-full cursor-pointer" 
                        />
                      </div>
                    </SettingItem>
                  </Card>
                </>
              )}

              {/* Desktop */}
              {tab === 'desktop' && (
                <>
                  <Card id="settings-card-home-layout" title="首页布局" description="时钟和搜索框的垂直位置" highlighted={highlightedCardId === 'home-layout'} isMobileStyle={isMobile}>
                    <SettingItem label="垂直位置" hint="时钟和搜索框距离顶部的位置（15-50%），拖动滑块时可实时预览" fullWidth>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-fg/80">{homeFixedPosition}%</span>
                          {homeFixedPosition !== 30 && (
                            <button type="button" onClick={() => setHomeFixedPosition(30)} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">重置</button>
                          )}
                        </div>
                        <input 
                          ref={sliderRef}
                          type="range" 
                          min={15} 
                          max={50} 
                          step={1} 
                          value={homeFixedPosition} 
                          onInput={(e) => setHomeFixedPosition(Number((e.target as HTMLInputElement).value))}
                          onChange={(e) => setHomeFixedPosition(Number(e.target.value))} 
                          onMouseDown={handleStartPreview}
                          onTouchStart={handleStartPreview}
                          className="w-full accent-[rgb(var(--primary))] h-2 rounded-full cursor-pointer" 
                        />
                      </div>
                    </SettingItem>
                  </Card>
                  <Card id="settings-card-background-dimming" title="背景明暗" description="调整背景图片的明暗度，拖动时可预览" highlighted={highlightedCardId === 'background-dimming'} isMobileStyle={isMobile}>
                    <SettingItem label="明暗度" hint={`0为全黑，100为原图亮度（当前模式默认${dimmingDefault}%）`} fullWidth>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-fg/80">{backgroundDimming}%</span>
                          {backgroundDimming !== dimmingDefault && (
                            <button type="button" onClick={() => setBackgroundDimming(dimmingDefault)} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">重置</button>
                          )}
                        </div>
                        <input 
                          ref={dimmingSliderRef}
                          type="range" 
                          min={0} 
                          max={100} 
                          step={5} 
                          value={backgroundDimming} 
                          onChange={(e) => setBackgroundDimming(Number(e.target.value))} 
                          onMouseDown={handleStartDimmingPreview}
                          onTouchStart={handleStartDimmingPreview}
                          className="w-full accent-[rgb(var(--primary))] h-2 rounded-full cursor-pointer" 
                        />
                      </div>
                    </SettingItem>
                  </Card>
                  <Card id="settings-card-sidebar" title="侧边栏" description="控制侧边栏的显示行为" highlighted={highlightedCardId === 'sidebar'} isMobileStyle={isMobile}>
                    <div className="space-y-4">
                      <SettingItem label="点击后保持收起" hint="收起状态下点击图标后不自动展开侧边栏">
                        <Toggle checked={sidebarClickKeepCollapsed} onChange={setSidebarClickKeepCollapsed} label={sidebarClickKeepCollapsed ? '是' : '否'} />
                      </SettingItem>
                      <SettingItem label="自动隐藏" hint="鼠标离开后自动收起侧边栏"><Toggle checked={sidebarAutoHide} onChange={setSidebarAutoHide} label={sidebarAutoHide ? '已开启' : '已关闭'} /></SettingItem>
                      {sidebarAutoHide && (
                        <SettingItem label={`隐藏延迟：${sidebarAutoHideDelay}秒`} hint="鼠标离开后多久隐藏" fullWidth>
                          <Slider value={sidebarAutoHideDelay} onChange={setSidebarAutoHideDelay} min={1} max={10} unit="秒" defaultValue={3} onReset={() => setSidebarAutoHideDelay(3)} />
                        </SettingItem>
                      )}
                    </div>
                  </Card>
                  <Card id="settings-card-dock" title="底部 Dock 栏" description="控制底部快捷栏的显示" highlighted={highlightedCardId === 'dock'} isMobileStyle={isMobile}>
                    <div className="space-y-4">
                      <SettingItem label="显示 Dock 栏" hint="关闭后将隐藏整个底部快捷栏"><Toggle checked={dockVisible} onChange={setDockVisible} label={dockVisible ? '显示' : '隐藏'} /></SettingItem>
                      {dockVisible && (
                        <>
                          <SettingItem label="书签页入口" hint="显示打开书签页的图标"><Toggle checked={dockShowBookmarks} onChange={setDockShowBookmarks} label={dockShowBookmarks ? '显示' : '隐藏'} /></SettingItem>
                          <SettingItem label="设置入口" hint="显示打开设置页的图标"><Toggle checked={dockShowSettings} onChange={setDockShowSettings} label={dockShowSettings ? '显示' : '隐藏'} /></SettingItem>
                          <SettingItem label="新书签位置" hint="新添加的书签显示在 Dock 栏的位置">
                            <div className="flex flex-wrap gap-2">
                              <SegButton active={dockAddPosition === 'left'} onClick={() => setDockAddPosition('left')}>最左边</SegButton>
                              <SegButton active={dockAddPosition === 'right'} onClick={() => setDockAddPosition('right')}>最右边</SegButton>
                            </div>
                          </SettingItem>
                        </>
                      )}
                    </div>
                  </Card>
                </>
              )}

              {/* Bookmark */}
              {tab === 'bookmark' && (
                <>
                  <Card id="settings-card-icon-size" title="图标大小" description="调整书签图标的显示大小，拖动时可预览" highlighted={highlightedCardId === 'icon-size'} isMobileStyle={isMobile}>
                    <SettingItem label={`当前大小：${bookmarkIconSize}px`} fullWidth>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-fg/80">{bookmarkIconSize}px</span>
                          {bookmarkIconSize !== 64 && (
                            <button type="button" onClick={() => setBookmarkIconSize(64)} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">重置</button>
                          )}
                        </div>
                        <input 
                          ref={iconSizeSliderRef}
                          type="range" 
                          min={48} 
                          max={96} 
                          step={4} 
                          value={bookmarkIconSize} 
                          onChange={(e) => setBookmarkIconSize(Number(e.target.value))} 
                          onMouseDown={handleStartIconSizePreview}
                          onTouchStart={handleStartIconSizePreview}
                          className="w-full accent-[rgb(var(--primary))] h-2 rounded-full cursor-pointer" 
                        />
                      </div>
                    </SettingItem>
                  </Card>
                  <Card id="settings-card-icon-gap" title="图标间距" description="调整书签图标之间的间距，拖动时可预览" highlighted={highlightedCardId === 'icon-gap'} isMobileStyle={isMobile}>
                    <SettingItem label={`当前间距：${bookmarkIconGap}px`} hint="调整图标之间的距离" fullWidth>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-fg/80">{bookmarkIconGap}px</span>
                          {bookmarkIconGap !== (isMobile ? 36 : 52) && (
                            <button type="button" onClick={() => setBookmarkIconGap(isMobile ? 36 : 52)} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">重置</button>
                          )}
                        </div>
                        <input 
                          ref={iconGapSliderRef}
                          type="range" 
                          min={20} 
                          max={100} 
                          step={2} 
                          value={bookmarkIconGap} 
                          onChange={(e) => setBookmarkIconGap(Number(e.target.value))} 
                          onMouseDown={handleStartIconGapPreview}
                          onTouchStart={handleStartIconGapPreview}
                          className="w-full accent-[rgb(var(--primary))] h-2 rounded-full cursor-pointer" 
                        />
                      </div>
                    </SettingItem>
                  </Card>
                  <Card id="settings-card-corner-radius" title="图标圆角" description="调整书签图标的圆角大小，拖动时可预览" highlighted={highlightedCardId === 'corner-radius'} isMobileStyle={isMobile}>
                    <SettingItem label={`当前圆角：${cornerRadius}px`} fullWidth>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-fg/80">{cornerRadius}px</span>
                          {cornerRadius !== 18 && (
                            <button type="button" onClick={() => setCornerRadius(18)} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">重置</button>
                          )}
                        </div>
                        <input 
                          ref={cornerRadiusSliderRef}
                          type="range" 
                          min={0} 
                          max={48} 
                          step={1} 
                          value={cornerRadius} 
                          onChange={(e) => setCornerRadius(Number(e.target.value))} 
                          onMouseDown={handleStartCornerRadiusPreview}
                          onTouchStart={handleStartCornerRadiusPreview}
                          className="w-full accent-[rgb(var(--primary))] h-2 rounded-full cursor-pointer"
                        />
                      </div>
                    </SettingItem>
                  </Card>
                  <Card id="settings-card-bookmark-sort" title="书签排序" description="设置书签页的排序方式" highlighted={highlightedCardId === 'bookmark-sort'} isMobileStyle={isMobile}>
                    <div className="space-y-4">
                      <SettingItem label="排序模式">
                        <div className="flex flex-wrap gap-2">
                          <SegButton active={bookmarkDrawerSortMode === 'custom'} onClick={() => setBookmarkDrawerSortMode('custom')}>自定义</SegButton>
                          <SegButton active={bookmarkDrawerSortMode === 'folders-first'} onClick={() => setBookmarkDrawerSortMode('folders-first')}>文件夹优先</SegButton>
                          <SegButton active={bookmarkDrawerSortMode === 'links-first'} onClick={() => setBookmarkDrawerSortMode('links-first')}>链接优先</SegButton>
                          <SegButton active={bookmarkDrawerSortMode === 'alphabetical'} onClick={() => setBookmarkDrawerSortMode('alphabetical')}>字母排序</SegButton>
                        </div>
                      </SettingItem>
                      <SettingItem label="锁定排序" hint="开启后禁止拖拽排序，防止误操作"><Toggle checked={bookmarkSortLocked} onChange={setBookmarkSortLocked} label={bookmarkSortLocked ? '已锁定' : '未锁定'} /></SettingItem>
                    </div>
                  </Card>
                  <Card id="settings-card-dnd-animation" title="拖拽动画" description="手机桌面风格的拖拽效果" highlighted={highlightedCardId === 'dnd-animation'} isMobileStyle={isMobile}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <SettingItem label="预挤压" hint="拖拽时图标实时挤开"><Toggle checked={dndPrePush} onChange={setDndPrePush} label={dndPrePush ? '开' : '关'} /></SettingItem>
                      <SettingItem label="挤压动画" hint="挤开过程更顺滑"><Toggle checked={dndPushAnim} onChange={setDndPushAnim} label={dndPushAnim ? '开' : '关'} /></SettingItem>
                      <SettingItem label="归位动画" hint="松手后落位更自然"><Toggle checked={dndDropAnim} onChange={setDndDropAnim} label={dndDropAnim ? '开' : '关'} /></SettingItem>
                    </div>
                  </Card>
                </>
              )}

              {/* Search */}
              {tab === 'search' && (
                <>
                  <Card id="settings-card-search-engine" title="搜索引擎" description="选择默认的搜索引擎" highlighted={highlightedCardId === 'search-engine'} isMobileStyle={isMobile}>
                    <div className="space-y-4">
                      <SettingItem label="引擎">
                        <div className="flex flex-wrap gap-2">
                          <SegButton active={searchEngine === 'baidu'} onClick={() => onChangeSearchEngine('baidu')}>百度</SegButton>
                          <SegButton active={searchEngine === 'bing'} onClick={() => onChangeSearchEngine('bing')}>必应</SegButton>
                          <SegButton active={searchEngine === 'google'} onClick={() => onChangeSearchEngine('google')}>谷歌</SegButton>
                          <SegButton active={searchEngine === 'custom'} onClick={() => onChangeSearchEngine('custom')}>自定义</SegButton>
                        </div>
                      </SettingItem>
                      {searchEngine === 'custom' && (
                        <SettingItem label="自定义 URL" hint="使用 {query} 作为搜索词占位符">
                          <div className="flex gap-2">
                            <Input value={customSearchUrlInput} onChange={(e) => setCustomSearchUrlInput(e.target.value)} placeholder="https://example.com/search?q={'{query}'}" className="flex-1" />
                            <Button size="sm" disabled={!isValidCustomSearchUrl(customSearchUrlInput)} onClick={() => { setCustomSearchUrl(customSearchUrlInput.trim()); toast('自定义搜索引擎已保存') }}>应用</Button>
                          </div>
                          {customSearchUrlInput && !isValidCustomSearchUrl(customSearchUrlInput) && <p className="text-xs text-red-400">格式错误，需包含 {'{query}'} 且是有效 URL</p>}
                        </SettingItem>
                      )}
                    </div>
                  </Card>
                  <Card id="settings-card-search-glow" title="流光边框" description="搜索框聚焦时的特效" highlighted={highlightedCardId === 'search-glow'} isMobileStyle={isMobile}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <SettingItem label="流光线条"><Toggle checked={searchGlowBorder} onChange={setSearchGlowBorder} label={searchGlowBorder ? '开' : '关'} /></SettingItem>
                      <SettingItem label="背后光效"><Toggle checked={searchGlowLight} onChange={setSearchGlowLight} label={searchGlowLight ? '开' : '关'} /></SettingItem>
                      {searchGlowLight && <SettingItem label="光效移动"><Toggle checked={searchGlowLightMove} onChange={setSearchGlowLightMove} label={searchGlowLightMove ? '开' : '关'} /></SettingItem>}
                    </div>
                  </Card>
                  <Card id="settings-card-dropdown-style" title="建议框样式" description="调整搜索建议下拉框的外观" highlighted={highlightedCardId === 'dropdown-style'} isMobileStyle={isMobile}>
                    <div className="space-y-4">
                      <SettingItem label={`不透明度：${searchDropdownOpacity}%`} fullWidth>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-fg/80">{searchDropdownOpacity}%</span>
                            {searchDropdownOpacity !== 50 && (
                              <button type="button" onClick={() => setSearchDropdownOpacity(50)} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">重置</button>
                            )}
                          </div>
                          <input 
                            ref={dropdownOpacitySliderRef}
                            type="range" 
                            min={0} 
                            max={100} 
                            step={1} 
                            value={searchDropdownOpacity} 
                            onChange={(e) => setSearchDropdownOpacity(Number(e.target.value))} 
                            onMouseDown={handleStartDropdownOpacityPreview}
                            onTouchStart={handleStartDropdownOpacityPreview}
                            className="w-full accent-[rgb(var(--primary))] h-2 rounded-full cursor-pointer" 
                          />
                        </div>
                      </SettingItem>
                      <SettingItem label={`模糊度：${searchDropdownBlur}px`} fullWidth>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-fg/80">{searchDropdownBlur}px</span>
                            {searchDropdownBlur !== 24 && (
                              <button type="button" onClick={() => setSearchDropdownBlur(24)} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">重置</button>
                            )}
                          </div>
                          <input 
                            ref={dropdownBlurSliderRef}
                            type="range" 
                            min={0} 
                            max={128} 
                            step={1} 
                            value={searchDropdownBlur} 
                            onChange={(e) => setSearchDropdownBlur(Number(e.target.value))} 
                            onMouseDown={handleStartDropdownBlurPreview}
                            onTouchStart={handleStartDropdownBlurPreview}
                            className="w-full accent-[rgb(var(--primary))] h-2 rounded-full cursor-pointer" 
                          />
                        </div>
                      </SettingItem>
                    </div>
                  </Card>
                  <Card id="settings-card-search-history" title="搜索历史" description="控制搜索历史的显示" highlighted={highlightedCardId === 'search-history'} isMobileStyle={isMobile}>
                    <SettingItem label={searchHistoryCount === 0 ? '已关闭' : `显示 ${searchHistoryCount} 条`} fullWidth>
                      <Slider value={searchHistoryCount} onChange={setSearchHistoryCount} min={0} max={20} unit="条" defaultValue={10} onReset={() => setSearchHistoryCount(10)} />
                    </SettingItem>
                  </Card>
                  <Card id="settings-card-recent-bookmarks" title="最近打开" description="显示最近打开的书签" highlighted={highlightedCardId === 'recent-bookmarks'} isMobileStyle={isMobile}>
                    <div className="space-y-4">
                      <SettingItem label="启用"><Toggle checked={recentBookmarksEnabled} onChange={setRecentBookmarksEnabled} label={recentBookmarksEnabled ? '已开启' : '已关闭'} /></SettingItem>
                      {recentBookmarksEnabled && (
                        <>
                          <SettingItem label="显示模式">
                            <div className="flex flex-wrap gap-2">
                              <SegButton active={recentBookmarksMode === 'dynamic'} onClick={() => setRecentBookmarksMode('dynamic')}>动态一行</SegButton>
                              <SegButton active={recentBookmarksMode === 'fixed'} onClick={() => setRecentBookmarksMode('fixed')}>固定数量</SegButton>
                            </div>
                          </SettingItem>
                          {recentBookmarksMode === 'fixed' && (
                            <SettingItem label={`显示数量：${recentBookmarksCount} 个`} fullWidth>
                              <Slider value={recentBookmarksCount} onChange={setRecentBookmarksCount} min={1} max={12} unit="个" defaultValue={8} onReset={() => setRecentBookmarksCount(8)} />
                            </SettingItem>
                          )}
                        </>
                      )}
                    </div>
                  </Card>
                  <Card id="settings-card-search-row-height" title="选项行高" description="搜索建议和历史记录的行高" highlighted={highlightedCardId === 'search-row-height'} isMobileStyle={isMobile}>
                    <SettingItem label={`当前高度：${searchRowHeight}px`} fullWidth>
                      <Slider value={searchRowHeight} onChange={setSearchRowHeight} min={16} max={36} step={2} unit="px" defaultValue={32} onReset={() => setSearchRowHeight(32)} />
                    </SettingItem>
                  </Card>
                </>
              )}

              {/* Account */}
              {tab === 'account' && (
                <>
                  <Card id="settings-card-login-status" title="登录状态" description="当前账户信息" highlighted={highlightedCardId === 'login-status'} isMobileStyle={isMobile}>
                    {user ? (
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm font-medium text-fg">{user.nickname}</p><p className="text-xs text-fg/60">@{user.username}</p></div>
                        <Button variant="ghost" size="sm" onClick={() => { logout(); toast('已退出登录') }}>退出登录</Button>
                      </div>
                    ) : <p className="text-sm text-fg/60">当前未登录</p>}
                  </Card>
                  {user && (
                    <>
                      <Card id="settings-card-profile" title="个人资料" description="修改账户基本信息" highlighted={highlightedCardId === 'profile'} isMobileStyle={isMobile}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <SettingItem label="账号名称" hint="3-32个字符"><Input value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} placeholder="账号名称" className={cn(!usernameValid && usernameInput && 'border-red-500/50')} /></SettingItem>
                          <SettingItem label="昵称" hint="2-32个字符，唯一"><Input value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} placeholder="昵称" className={cn(!nicknameValid && nicknameInput && 'border-red-500/50')} /></SettingItem>
                          <SettingItem label="邮箱（可选）"><Input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="example@email.com" className={cn(!emailValid && emailInput && 'border-red-500/50')} /></SettingItem>
                          <SettingItem label="手机号（可选）"><Input value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="手机号" className={cn(!phoneValid && phoneInput && 'border-red-500/50')} /></SettingItem>
                        </div>
                        <div className="mt-4 pt-4 border-t border-glass-border/10"><Button variant="primary" onClick={handleSaveProfile} disabled={!profileValid || profileLoading}>{profileLoading ? '保存中...' : '保存资料'}</Button></div>
                      </Card>
                      <Card id="settings-card-password" title="修改密码" description="更新账户密码" highlighted={highlightedCardId === 'password'} isMobileStyle={isMobile}>
                        <div className="space-y-4 max-w-md">
                          <SettingItem label="当前密码">
                            <div className="relative">
                              <Input type={showCurrentPwd ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="请输入当前密码" />
                              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-fg/40 hover:text-fg/60" onClick={() => setShowCurrentPwd(!showCurrentPwd)}>{showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            </div>
                          </SettingItem>
                          <SettingItem label="新密码" hint="6-200个字符">
                            <div className="relative">
                              <Input type={showNewPwd ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="请输入新密码" className={cn(!newPasswordValid && newPassword && 'border-red-500/50')} />
                              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-fg/40 hover:text-fg/60" onClick={() => setShowNewPwd(!showNewPwd)}>{showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            </div>
                          </SettingItem>
                          <SettingItem label="确认新密码">
                            <div className="relative">
                              <Input type={showConfirmPwd ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再次输入新密码" className={cn(!confirmPasswordValid && confirmPassword && 'border-red-500/50')} />
                              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-fg/40 hover:text-fg/60" onClick={() => setShowConfirmPwd(!showConfirmPwd)}>{showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            </div>
                            {!confirmPasswordValid && confirmPassword && <p className="text-xs text-red-400">两次输入的密码不一致</p>}
                          </SettingItem>
                          <Button variant="primary" onClick={handleChangePassword} disabled={!passwordFormValid || passwordLoading}>{passwordLoading ? '修改中...' : '修改密码'}</Button>
                        </div>
                      </Card>
                      <Card id="settings-card-api-key" title="扩展 API" description="管理 API 密钥" highlighted={highlightedCardId === 'api-key'} isMobileStyle={isMobile}><APIKeyManager /></Card>
                    </>
                  )}
                  <Card id="settings-card-import-export" title="设置导入 / 导出" description="备份或恢复你的设置" highlighted={highlightedCardId === 'import-export'} isMobileStyle={isMobile}>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="primary" onClick={exportSettings}>导出设置</Button>
                      <label className="inline-flex">
                        <input type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (f) void importSettings(f) }} />
                        <Button variant="glass" type="button">导入设置</Button>
                      </label>
                    </div>
                  </Card>
                  <Card id="settings-card-about" title="关于" description="版本信息" highlighted={highlightedCardId === 'about'} isMobileStyle={isMobile}>
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium text-fg">Start</p><p className="text-xs text-fg/60">版本 v{__APP_VERSION__}</p></div>
                      <Button variant="ghost" size="sm" onClick={() => setChangelogOpen(true)}><History className="w-4 h-4 mr-2" />更新日志</Button>
                    </div>
                  </Card>
                </>
              )}

              {/* Reset */}
              {tab === 'reset' && (
                <>
                  <Card id="settings-card-reset-appearance" title="重置外观设置" description="将主题、颜色、背景等恢复为默认值" isMobileStyle={isMobile}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-fg/70">包括深色模式、主题色、圆角、背景、侧边栏设置</p>
                      <Button variant="ghost" size="sm" onClick={() => setResetDialogType('appearance')}>
                        <RotateCcw className="w-4 h-4 mr-2" />重置
                      </Button>
                    </div>
                  </Card>
                  <Card id="settings-card-reset-dnd" title="重置拖拽设置" description="将拖拽动画效果恢复为默认值" isMobileStyle={isMobile}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-fg/70">包括预挤压、挤压动画、归位动画</p>
                      <Button variant="ghost" size="sm" onClick={() => setResetDialogType('dnd')}>
                        <RotateCcw className="w-4 h-4 mr-2" />重置
                      </Button>
                    </div>
                  </Card>
                </>
              )}
            </div>
            </div>
          )}
        </div>
      </div>
      <ChangelogDialog open={changelogOpen} onClose={() => setChangelogOpen(false)} />
      
      {/* 重置确认框 */}
      <ResetConfirmDialog
        open={resetDialogType === 'appearance'}
        onClose={() => setResetDialogType(null)}
        onConfirm={() => { resetAppearance(); toast.success('已重置外观设置') }}
        title="重置外观设置"
        description="确定要将所有外观设置恢复为默认值吗？此操作无法撤销。"
      />
      <ResetConfirmDialog
        open={resetDialogType === 'dnd'}
        onClose={() => setResetDialogType(null)}
        onConfirm={() => { resetBookmarkDnd(); toast.success('已重置拖拽设置') }}
        title="重置拖拽设置"
        description="确定要将所有拖拽动画设置恢复为默认值吗？此操作无法撤销。"
      />
      </div>
    </>
  )
}
