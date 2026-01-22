import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react'
import { 
  X, History, Eye, EyeOff, Palette, Clock, Monitor, Search, User, 
  RotateCcw, Check, ChevronRight, ArrowLeft, AlertTriangle
} from 'lucide-react'
import { useIsMobile } from '../hooks/useIsMobile'
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

type TabKey = 'appearance' | 'clock' | 'desktop' | 'search' | 'account' | 'reset'

function isValidHex(v: string) {
  const s = v.trim()
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(s)
}

// 玻璃卡片组件 - 移动端使用华为风格圆角卡片
function Card({ id, title, description, children, highlighted }: { id?: string; title: string; description?: string; children: ReactNode; highlighted?: boolean }) {
  return (
    <div 
      id={id}
      className={cn(
        'rounded-2xl p-4 sm:p-5 transition-all duration-500',
        // 移动端：更突出的卡片效果（深色背景 + 边框 + 阴影）
        'bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20 backdrop-blur-sm',
        // 桌面端：原有的 glass-card 样式
        'sm:glass-card sm:rounded-[var(--start-radius)] sm:border-glass-border/20 sm:shadow-none sm:backdrop-blur-none',
        highlighted && 'border-primary/50 ring-2 ring-primary/30 bg-primary/5'
      )}
    >
      <div className="mb-3 sm:mb-4">
        <h3 className="text-sm sm:text-base font-semibold text-fg">{title}</h3>
        {description && <p className="text-xs text-fg/50 mt-0.5 sm:mt-1">{description}</p>}
      </div>
      <div className="border-t border-glass-border/15 pt-3 sm:pt-4">{children}</div>
    </div>
  )
}

// 设置项组件
function SettingItem({ label, hint, children, fullWidth = false }: { label: string; hint?: string; children: ReactNode; fullWidth?: boolean }) {
  return (
    <div className={cn('space-y-2', fullWidth && 'col-span-full')}>
      <div className="text-sm font-medium text-fg/80">{label}</div>
      {children}
      {hint && <p className="text-xs text-fg/50">{hint}</p>}
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

// 开关组件
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'h-9 px-3 rounded-lg text-sm font-medium transition-all duration-200 border inline-flex items-center gap-2',
        checked ? 'bg-primary/20 text-primary border-primary/30' : 'bg-glass/10 text-fg/70 border-glass-border/20 hover:bg-glass/20',
      )}
    >
      <span className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all', checked ? 'border-primary bg-primary' : 'border-fg/30')}>
        {checked && <Check className="w-2.5 h-2.5 text-primary-fg" />}
      </span>
      {label}
    </button>
  )
}

// 滑块组件
function Slider({ value, onChange, min, max, step = 1, unit = '', onReset, defaultValue, onDragStart, onDragEnd }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string; onReset?: () => void; defaultValue?: number; onDragStart?: () => void; onDragEnd?: () => void }) {
  const isDraggingRef = useRef(false)
  
  const handleDragStart = () => {
    if (!isDraggingRef.current) {
      isDraggingRef.current = true
      onDragStart?.()
    }
  }
  
  const handleDragEnd = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      onDragEnd?.()
    }
  }
  
  // 监听全局 mouseup/touchend 事件，确保拖动结束时触发
  useEffect(() => {
    if (!onDragEnd) return
    const handleGlobalEnd = () => handleDragEnd()
    window.addEventListener('mouseup', handleGlobalEnd)
    window.addEventListener('touchend', handleGlobalEnd)
    return () => {
      window.removeEventListener('mouseup', handleGlobalEnd)
      window.removeEventListener('touchend', handleGlobalEnd)
    }
  }, [onDragEnd])
  
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
const NAV_ICONS: Record<TabKey, typeof Palette> = { appearance: Palette, clock: Clock, desktop: Monitor, search: Search, account: User, reset: RotateCcw }
const NAV_LABELS: Record<TabKey, string> = { appearance: '外观', clock: '时钟', desktop: '桌面', search: '搜索', account: '账户', reset: '重置' }
const NAV_DESCRIPTIONS: Record<TabKey, string> = { appearance: '主题、颜色、背景', clock: '时间格式、显示内容', desktop: '书签排序、拖拽动画', search: '搜索引擎、历史记录', account: '个人资料、安全设置', reset: '恢复默认设置' }

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
  { id: 'corner-radius', label: '圆角', keywords: ['圆角', 'radius', '边角'], tab: 'appearance', group: '圆角' },
  { id: 'background', label: '背景', keywords: ['背景', '壁纸', '必应', 'bing', 'background'], tab: 'appearance', group: '背景' },
  { id: 'sidebar', label: '侧边栏', keywords: ['侧边栏', '自动隐藏', 'sidebar'], tab: 'appearance', group: '侧边栏' },
  { id: 'mobile-nav', label: '移动端导航栏', keywords: ['移动端', '导航栏', 'mobile', 'nav'], tab: 'appearance', group: '移动端导航栏' },
  // 时钟
  { id: 'hour-cycle', label: '小时制', keywords: ['时间', '24小时', '12小时', 'hour'], tab: 'clock', group: '时间格式' },
  { id: 'clock-seconds', label: '显示秒', keywords: ['秒', 'seconds'], tab: 'clock', group: '显示内容' },
  { id: 'clock-date', label: '显示日期', keywords: ['日期', 'date'], tab: 'clock', group: '显示内容' },
  { id: 'clock-color', label: '时钟颜色', keywords: ['时钟颜色', '跟随主题色'], tab: 'clock', group: '字体颜色' },
  // 桌面
  { id: 'home-layout', label: '首页布局', keywords: ['布局', '动态', '固定', 'layout'], tab: 'desktop', group: '首页布局' },
  { id: 'bookmark-sort', label: '书签排序', keywords: ['排序', '书签', 'sort', 'bookmark'], tab: 'desktop', group: '书签排序' },
  { id: 'dnd-animation', label: '拖拽动画', keywords: ['拖拽', '动画', 'drag', 'animation'], tab: 'desktop', group: '拖拽动画' },
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
  const mobileNavHideText = useAppearanceStore((s) => s.mobileNavHideText)
  const homeFixedPosition = useAppearanceStore((s) => s.homeFixedPosition)
  const bookmarkDrawerSortMode = useAppearanceStore((s) => s.bookmarkDrawerSortMode)
  const bookmarkSortLocked = useAppearanceStore((s) => s.bookmarkSortLocked)
  const dndPrePush = useBookmarkDndStore((s) => s.prePush)
  const dndPushAnim = useBookmarkDndStore((s) => s.pushAnimation)
  const dndDropAnim = useBookmarkDndStore((s) => s.dropAnimation)

  // Store setters
  const setMode = useAppearanceStore((s) => s.setMode)
  const setAccent = useAppearanceStore((s) => s.setAccent)
  const setBackgroundType = useAppearanceStore((s) => s.setBackgroundType)
  const setBackgroundCustomUrl = useAppearanceStore((s) => s.setBackgroundCustomUrl)
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
  const setMobileNavHideText = useAppearanceStore((s) => s.setMobileNavHideText)
  const setHomeFixedPosition = useAppearanceStore((s) => s.setHomeFixedPosition)
  const setBookmarkDrawerSortMode = useAppearanceStore((s) => s.setBookmarkDrawerSortMode)
  const setBookmarkSortLocked = useAppearanceStore((s) => s.setBookmarkSortLocked)
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
  const [nicknameInput, setNicknameInput] = useState(() => user?.nickname ?? '')
  const [customSearchUrlInput, setCustomSearchUrlInput] = useState(() => customSearchUrl)
  const [tab, setTab] = useState<TabKey | null>(null) // null = 显示列表（仅移动端）
  const isMobile = useIsMobile()
  
  // 移动端默认显示列表，桌面端默认显示第一个 tab
  useEffect(() => {
    if (!isMobile && tab === null) {
      setTab('appearance')
    }
  }, [isMobile, tab])
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
  
  // 带动画的关闭函数
  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, isMobile ? 250 : 150)
  }, [onClose, isMobile])

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
      // 移动端详情页：返回列表
      if (isMobile && tab !== null) {
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
  }, [open, onClose, isMobile, tab])

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

  const navItems: TabKey[] = ['appearance', 'clock', 'desktop', 'search', 'account', 'reset']

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
      
      <div 
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 lg:p-6',
          (isPreviewingPosition || isPreviewingClockScale) && 'pointer-events-none'
        )}
        style={(isPreviewingPosition || isPreviewingClockScale) ? { visibility: 'hidden' } : undefined}
      >
        {/* 背景遮罩 - 移动端无遮罩，桌面端有遮罩 */}
        <div 
          className={cn(
            'absolute inset-0 hidden sm:block bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-200',
            isClosing ? 'fade-out' : 'fade-in'
          )} 
          style={(isPreviewingPosition || isPreviewingClockScale) ? { opacity: 0, backdropFilter: 'none' } : undefined}
          onClick={handleClose} 
        />

        <div 
          role="dialog" 
          aria-modal="true" 
          className={cn(
            'relative w-full flex flex-col overflow-hidden',
            // 只在非预览时启用过渡动画
            !(isPreviewingPosition || isPreviewingClockScale) && 'transition-all duration-200',
            // 移动端：全屏无边框，纯色背景，从下往上滑入
            'h-full bg-bg',
            isMobile && !(isPreviewingPosition || isPreviewingClockScale) && (isClosing ? 'slide-down-out' : 'slide-up-in'),
            // 桌面端：居中弹窗，有边框和圆角，缩放动画
            'sm:max-w-5xl sm:h-[90vh] sm:max-h-[800px] sm:rounded-[var(--start-radius)] sm:glass-modal sm:shadow-2xl',
            !isMobile && !(isPreviewingPosition || isPreviewingClockScale) && (isClosing ? 'scale-out' : 'scale-in')
          )}
          style={(isPreviewingPosition || isPreviewingClockScale) ? { opacity: 0, transform: 'scale(0.95)', pointerEvents: 'none' } : undefined}
        >
        {/* Header */}
        <header className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-glass-border/20 bg-glass/30 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* 移动端详情页返回按钮 */}
              {isMobile && tab !== null && (
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="p-2 -ml-2 rounded-lg hover:bg-glass/20 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-fg/70" />
                </button>
              )}
              <div>
                <h1 className={cn('font-semibold text-fg', isMobile && tab === null ? 'text-2xl' : 'text-xl')}>
                  {isMobile && tab === null ? '设置' : tab ? NAV_LABELS[tab] : '设置'}
                </h1>
                {tab && !isMobile && (
                  <p className="text-sm text-fg/60 mt-0.5">{NAV_DESCRIPTIONS[tab]}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(!isMobile || tab !== null) && (
                <Button variant="primary" size="sm" onClick={closeAndToast}>保存</Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleClose} aria-label="关闭" className="h-9 w-9 p-0"><X className="h-4 w-4" /></Button>
            </div>
          </div>
          
          {/* 搜索栏 - 桌面端在 header 下方，移动端在列表页顶部 */}
          {(!isMobile || tab === null) && (
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
                  // 移动端：与分类卡片一样的背景样式
                  isMobile 
                    ? 'bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20 focus:border-primary/50'
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
          <nav className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r border-glass-border/20 bg-glass/5">
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

          {/* Mobile Nav - 列表视图（华为风格卡片布局） */}
          {isMobile && tab === null && (
            <div className="flex-1 overflow-y-auto slide-in-left">
              <div className="p-4 space-y-3">
                {/* 设置分组卡片 - 每个设置项有明显的边界 */}
                <div className="rounded-2xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20 overflow-hidden divide-y divide-white/10 dark:divide-white/5">
                  {navItems.map((key) => {
                    const Icon = NAV_ICONS[key]
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleOpenTab(key)}
                        className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/10 dark:hover:bg-white/5 active:bg-white/15 dark:active:bg-white/10 transition-colors"
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

          {/* Content - 详情视图（桌面端始终显示，移动端仅当 tab 不为 null 时显示） */}
          {(!isMobile || tab !== null) && (
            <div className={cn(
              'flex-1 overflow-y-auto bg-transparent lg:bg-glass/5',
              isMobile && 'slide-in-right'
            )}>
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-5 max-w-3xl pb-20 sm:pb-6">
              {/* Appearance */}
              {tab === 'appearance' && (
                <>
                  <Card id="settings-card-theme-mode" title="主题与颜色" description="自定义应用的视觉风格" highlighted={highlightedCardId === 'theme-mode' || highlightedCardId === 'accent-color'}>
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
                  <Card id="settings-card-corner-radius" title="圆角" description="调整界面元素的圆角大小" highlighted={highlightedCardId === 'corner-radius'}>
                    <SettingItem label={`当前圆角：${cornerRadius}px`}>
                      <Slider value={cornerRadius} onChange={setCornerRadius} min={0} max={48} unit="px" defaultValue={18} onReset={() => setCornerRadius(18)} />
                    </SettingItem>
                  </Card>
                  <Card id="settings-card-background" title="背景" description="设置首页背景图片" highlighted={highlightedCardId === 'background'}>
                    <div className="space-y-4">
                      <SettingItem label="背景来源">
                        <div className="flex flex-wrap gap-2">
                          <SegButton active={backgroundType === 'bing'} onClick={() => onChangeBgType('bing')}>必应每日一图</SegButton>
                          <SegButton active={backgroundType === 'custom'} onClick={() => onChangeBgType('custom')}>自定义</SegButton>
                        </div>
                      </SettingItem>
                      {backgroundType === 'custom' && (
                        <SettingItem label="自定义图片 URL" hint="粘贴可访问的图片链接">
                          <div className="flex gap-2">
                            <Input value={bgUrlInput} onChange={(e) => setBgUrlInput(e.target.value)} placeholder="https://..." className="flex-1" />
                            <Button size="sm" onClick={() => { setBackgroundCustomUrl(bgUrlInput.trim()); toast('背景已更新') }}>应用</Button>
                          </div>
                        </SettingItem>
                      )}
                    </div>
                  </Card>
                  <Card id="settings-card-sidebar" title="侧边栏" description="控制侧边栏的显示行为" highlighted={highlightedCardId === 'sidebar'}>
                    <div className="space-y-4">
                      <SettingItem label="点击后保持收起" hint="收起状态下点击图标后不自动展开侧边栏">
                        <Toggle checked={sidebarClickKeepCollapsed} onChange={setSidebarClickKeepCollapsed} label={sidebarClickKeepCollapsed ? '是' : '否'} />
                      </SettingItem>
                      <SettingItem label="自动隐藏" hint="鼠标离开后自动收起侧边栏"><Toggle checked={sidebarAutoHide} onChange={setSidebarAutoHide} label={sidebarAutoHide ? '已开启' : '已关闭'} /></SettingItem>
                      {sidebarAutoHide && (
                        <SettingItem label={`隐藏延迟：${sidebarAutoHideDelay}秒`} hint="鼠标离开后多久隐藏">
                          <Slider value={sidebarAutoHideDelay} onChange={setSidebarAutoHideDelay} min={1} max={10} unit="秒" defaultValue={3} onReset={() => setSidebarAutoHideDelay(3)} />
                        </SettingItem>
                      )}
                    </div>
                  </Card>
                  {isMobile && (
                    <Card id="settings-card-mobile-nav" title="移动端导航栏" description="仅在移动设备上生效" highlighted={highlightedCardId === 'mobile-nav'}>
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
                  <Card id="settings-card-hour-cycle" title="时间格式" description="选择时钟显示的小时制" highlighted={highlightedCardId === 'hour-cycle'}>
                    <SettingItem label="小时制">
                      <div className="flex flex-wrap gap-2">
                        <SegButton active={clockHourCycle === '24'} onClick={() => onChangeHourCycle('24')}>24 小时</SegButton>
                        <SegButton active={clockHourCycle === '12'} onClick={() => onChangeHourCycle('12')}>12 小时</SegButton>
                      </div>
                    </SettingItem>
                  </Card>
                  <Card id="settings-card-clock-seconds" title="显示内容" description="控制时钟显示的信息" highlighted={highlightedCardId === 'clock-seconds' || highlightedCardId === 'clock-date'}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <SettingItem label="显示秒"><Toggle checked={clockShowSeconds} onChange={setClockShowSeconds} label={clockShowSeconds ? '显示' : '隐藏'} /></SettingItem>
                      <SettingItem label="显示日期"><Toggle checked={clockShowDate} onChange={setClockShowDate} label={clockShowDate ? '显示' : '隐藏'} /></SettingItem>
                    </div>
                  </Card>
                  <Card id="settings-card-clock-color" title="字体颜色" description="时钟文字的颜色设置" highlighted={highlightedCardId === 'clock-color'}>
                    <SettingItem label="跟随主题色" hint="开启后时钟使用主题色显示"><Toggle checked={clockFollowAccent} onChange={setClockFollowAccent} label={clockFollowAccent ? '已开启' : '已关闭'} /></SettingItem>
                  </Card>
                  <Card id="settings-card-clock-size" title="时钟大小" description="调整时钟的显示大小" highlighted={highlightedCardId === 'clock-size'}>
                    <SettingItem label="缩放比例" hint="时钟大小（50-150%），拖动滑块时可实时预览">
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
                  <Card id="settings-card-home-layout" title="首页布局" description="时钟和搜索框的垂直位置" highlighted={highlightedCardId === 'home-layout'}>
                    <SettingItem label="垂直位置" hint="时钟和搜索框距离顶部的位置（15-50%），拖动滑块时可实时预览">
                      <div className="space-y-2" style={isPreviewingPosition ? { position: 'relative', zIndex: 100 } : undefined}>
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
                          onChange={(e) => setHomeFixedPosition(Number(e.target.value))} 
                          onMouseDown={handleStartPreview}
                          onTouchStart={handleStartPreview}
                          className="w-full accent-[rgb(var(--primary))] h-2 rounded-full cursor-pointer" 
                        />
                      </div>
                    </SettingItem>
                  </Card>
                  <Card id="settings-card-bookmark-sort" title="书签排序" description="设置书签页的排序方式" highlighted={highlightedCardId === 'bookmark-sort'}>
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
                  <Card id="settings-card-dnd-animation" title="拖拽动画" description="手机桌面风格的拖拽效果" highlighted={highlightedCardId === 'dnd-animation'}>
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
                  <Card id="settings-card-search-engine" title="搜索引擎" description="选择默认的搜索引擎" highlighted={highlightedCardId === 'search-engine'}>
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
                  <Card id="settings-card-search-glow" title="流光边框" description="搜索框聚焦时的特效" highlighted={highlightedCardId === 'search-glow'}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <SettingItem label="流光线条"><Toggle checked={searchGlowBorder} onChange={setSearchGlowBorder} label={searchGlowBorder ? '开' : '关'} /></SettingItem>
                      <SettingItem label="背后光效"><Toggle checked={searchGlowLight} onChange={setSearchGlowLight} label={searchGlowLight ? '开' : '关'} /></SettingItem>
                      {searchGlowLight && <SettingItem label="光效移动"><Toggle checked={searchGlowLightMove} onChange={setSearchGlowLightMove} label={searchGlowLightMove ? '开' : '关'} /></SettingItem>}
                    </div>
                  </Card>
                  <Card id="settings-card-search-history" title="搜索历史" description="控制搜索历史的显示" highlighted={highlightedCardId === 'search-history'}>
                    <SettingItem label={searchHistoryCount === 0 ? '已关闭' : `显示 ${searchHistoryCount} 条`}>
                      <Slider value={searchHistoryCount} onChange={setSearchHistoryCount} min={0} max={20} unit="条" defaultValue={10} onReset={() => setSearchHistoryCount(10)} />
                    </SettingItem>
                  </Card>
                  <Card id="settings-card-recent-bookmarks" title="最近打开" description="显示最近打开的书签" highlighted={highlightedCardId === 'recent-bookmarks'}>
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
                            <SettingItem label={`显示数量：${recentBookmarksCount} 个`}>
                              <Slider value={recentBookmarksCount} onChange={setRecentBookmarksCount} min={1} max={12} unit="个" defaultValue={8} onReset={() => setRecentBookmarksCount(8)} />
                            </SettingItem>
                          )}
                        </>
                      )}
                    </div>
                  </Card>
                  <Card id="settings-card-search-row-height" title="选项行高" description="搜索建议和历史记录的行高" highlighted={highlightedCardId === 'search-row-height'}>
                    <SettingItem label={`当前高度：${searchRowHeight}px`}>
                      <Slider value={searchRowHeight} onChange={setSearchRowHeight} min={32} max={56} step={2} unit="px" defaultValue={40} onReset={() => setSearchRowHeight(40)} />
                    </SettingItem>
                  </Card>
                </>
              )}

              {/* Account */}
              {tab === 'account' && (
                <>
                  <Card id="settings-card-login-status" title="登录状态" description="当前账户信息" highlighted={highlightedCardId === 'login-status'}>
                    {user ? (
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm font-medium text-fg">{user.nickname}</p><p className="text-xs text-fg/60">@{user.username}</p></div>
                        <Button variant="ghost" size="sm" onClick={() => { logout(); toast('已退出登录') }}>退出登录</Button>
                      </div>
                    ) : <p className="text-sm text-fg/60">当前未登录</p>}
                  </Card>
                  {user && (
                    <>
                      <Card id="settings-card-profile" title="个人资料" description="修改账户基本信息" highlighted={highlightedCardId === 'profile'}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <SettingItem label="账号名称" hint="3-32个字符"><Input value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} placeholder="账号名称" className={cn(!usernameValid && usernameInput && 'border-red-500/50')} /></SettingItem>
                          <SettingItem label="昵称" hint="2-32个字符，唯一"><Input value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} placeholder="昵称" className={cn(!nicknameValid && nicknameInput && 'border-red-500/50')} /></SettingItem>
                          <SettingItem label="邮箱（可选）"><Input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="example@email.com" className={cn(!emailValid && emailInput && 'border-red-500/50')} /></SettingItem>
                          <SettingItem label="手机号（可选）"><Input value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="手机号" className={cn(!phoneValid && phoneInput && 'border-red-500/50')} /></SettingItem>
                        </div>
                        <div className="mt-4 pt-4 border-t border-glass-border/10"><Button variant="primary" onClick={handleSaveProfile} disabled={!profileValid || profileLoading}>{profileLoading ? '保存中...' : '保存资料'}</Button></div>
                      </Card>
                      <Card id="settings-card-password" title="修改密码" description="更新账户密码" highlighted={highlightedCardId === 'password'}>
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
                      <Card id="settings-card-api-key" title="扩展 API" description="管理 API 密钥" highlighted={highlightedCardId === 'api-key'}><APIKeyManager /></Card>
                    </>
                  )}
                  <Card id="settings-card-import-export" title="设置导入 / 导出" description="备份或恢复你的设置" highlighted={highlightedCardId === 'import-export'}>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="primary" onClick={exportSettings}>导出设置</Button>
                      <label className="inline-flex">
                        <input type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (f) void importSettings(f) }} />
                        <Button variant="glass" type="button">导入设置</Button>
                      </label>
                    </div>
                  </Card>
                  <Card id="settings-card-about" title="关于" description="版本信息" highlighted={highlightedCardId === 'about'}>
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
                  <Card id="settings-card-reset-appearance" title="重置外观设置" description="将主题、颜色、背景等恢复为默认值">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-fg/70">包括深色模式、主题色、圆角、背景、侧边栏设置</p>
                      <Button variant="ghost" size="sm" onClick={() => setResetDialogType('appearance')}>
                        <RotateCcw className="w-4 h-4 mr-2" />重置
                      </Button>
                    </div>
                  </Card>
                  <Card id="settings-card-reset-dnd" title="重置拖拽设置" description="将拖拽动画效果恢复为默认值">
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
