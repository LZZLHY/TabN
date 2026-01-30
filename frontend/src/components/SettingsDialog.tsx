import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { 
  X, History, Eye, EyeOff, Palette, Clock, Monitor, Search, User, 
  RotateCcw, ChevronRight, ArrowLeft, AlertTriangle, Bookmark, Download, Trash2, Globe, Check,
  ChevronDown, ChevronUp
} from 'lucide-react'
import { useIsMobile, useIsDesktop } from '../hooks/useIsMobile'
import { changeLanguage, getCurrentLanguage, supportedLanguages, type LanguageCode } from '../i18n'
import { useBackgroundImage } from '../hooks/useBackgroundImage'
import { toast } from 'sonner'
import {
  useAppearanceStore,
  type BackgroundType,
  type ClockHourCycle,
  type ThemeMode,
} from '../stores/appearance'
import { useAuthStore } from '../stores/auth'
import { useBookmarkDndStore } from '../stores/bookmarkDnd'
import { useBookmarkDrawerStore } from '../stores/bookmarkDrawer'
import { useBookmarkCacheStore } from '../stores/bookmarkCache'
import { useSearchFocusStore } from '../stores/searchFocus'
import { cn } from '../utils/cn'
import { applySettingsFile, createSettingsFile } from '../utils/settingsFile'
import { PRESET_SEARCH_ENGINES, type SearchEngineConfig } from '../utils/searchEngine'
import { Button } from './ui/Button'
import { Select, type SelectOption } from './ui/Select'
import { 
  findMatchingBookmarkIcon, 
  getGlobalIconBackground,
  parseIconBgStyle,
  type SyncedIconInfo,
} from '../services/iconSyncService'
import { getIconUrl } from '../utils/iconSource'
import { Input } from './ui/Input'
import { ChangelogDialog } from './ChangelogDialog'
import { APIKeyManager } from './settings/APIKeyManager'
import { getFaviconSources } from '../utils/url'

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
          <button type="button" onClick={onReset} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">Reset</button>
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

// 所有可搜索的设置项配置
interface SettingSearchItem {
  id: string
  label: string
  keywords: string[]
  tab: TabKey
  group: string
}

function useSearchableSettings(): SettingSearchItem[] {
  const { t } = useTranslation()
  return [
    { id: 'theme-mode', label: t('settings.searchItems.themeMode'), keywords: ['theme', 'dark', 'light'], tab: 'appearance', group: t('settings.searchGroups.themeColor') },
    { id: 'accent-color', label: t('settings.searchItems.themeColor'), keywords: ['accent', 'color'], tab: 'appearance', group: t('settings.searchGroups.themeColor') },
    { id: 'background', label: t('settings.searchItems.background'), keywords: ['bing', 'background', 'wallpaper'], tab: 'appearance', group: t('settings.searchGroups.background') },
    { id: 'mobile-nav', label: t('settings.mobileNav.title'), keywords: ['mobile', 'nav'], tab: 'appearance', group: t('settings.mobileNav.title') },

    { id: 'hour-cycle', label: t('settings.searchItems.hourCycle'), keywords: ['12', '24', 'hour'], tab: 'clock', group: t('settings.searchGroups.timeFormat') },
    { id: 'clock-seconds', label: t('settings.searchItems.showSeconds'), keywords: ['seconds'], tab: 'clock', group: t('settings.searchGroups.clockContent') },
    { id: 'clock-date', label: t('settings.searchItems.showDate'), keywords: ['date'], tab: 'clock', group: t('settings.searchGroups.clockContent') },
    { id: 'clock-color', label: t('settings.searchItems.clockColor'), keywords: ['color'], tab: 'clock', group: t('settings.searchGroups.fontColor') },

    { id: 'home-layout', label: t('settings.searchItems.homeLayout'), keywords: ['layout'], tab: 'desktop', group: t('settings.searchItems.homeLayout') },
    { id: 'sidebar', label: t('settings.sidebar.title'), keywords: ['sidebar'], tab: 'desktop', group: t('settings.sidebar.title') },
    { id: 'dock', label: t('settings.dock.title'), keywords: ['dock'], tab: 'desktop', group: t('settings.dock.title') },

    { id: 'icon-size', label: t('settings.iconSize.title'), keywords: ['size', 'icon'], tab: 'bookmark', group: t('settings.iconSize.title') },
    { id: 'icon-radius-ratio', label: t('settings.iconRadiusRatio.title'), keywords: ['radius', 'ratio'], tab: 'bookmark', group: t('settings.iconRadiusRatio.title') },
    { id: 'bookmark-sort', label: t('settings.searchItems.bookmarkSort'), keywords: ['sort', 'bookmark'], tab: 'bookmark', group: t('settings.searchItems.bookmarkSort') },
    { id: 'dnd-animation', label: t('settings.searchItems.dndAnimation'), keywords: ['drag', 'animation'], tab: 'bookmark', group: t('settings.searchItems.dndAnimation') },

    { id: 'search-engine', label: t('settings.searchEngine.title'), keywords: ['baidu', 'bing', 'google'], tab: 'search', group: t('settings.searchEngine.title') },
    { id: 'search-glow', label: t('settings.searchGlow.title'), keywords: ['glow', 'border'], tab: 'search', group: t('settings.searchGlow.title') },
    { id: 'search-history', label: t('settings.searchHistory.title'), keywords: ['history'], tab: 'search', group: t('settings.searchHistory.title') },
    { id: 'recent-bookmarks', label: t('settings.recentBookmarks.title'), keywords: ['recent'], tab: 'search', group: t('settings.recentBookmarks.title') },
    { id: 'search-row-height', label: t('settings.searchRowHeight.title'), keywords: ['row', 'height'], tab: 'search', group: t('settings.searchRowHeight.title') },

    { id: 'login-status', label: t('settings.loginStatus.title'), keywords: ['login', 'account'], tab: 'account', group: t('settings.loginStatus.title') },
    { id: 'profile', label: t('settings.profile.title'), keywords: ['profile'], tab: 'account', group: t('settings.profile.title') },
    { id: 'password', label: t('settings.changePassword.title'), keywords: ['password'], tab: 'account', group: t('settings.changePassword.title') },
    { id: 'api-key', label: t('settings.apiKey.title'), keywords: ['api', 'key'], tab: 'account', group: t('settings.apiKey.title') },
    { id: 'import-export', label: t('settings.importExport.title'), keywords: ['import', 'export'], tab: 'account', group: t('settings.importExport.title') },
    { id: 'about', label: t('settings.about.title'), keywords: ['about', 'version'], tab: 'account', group: t('settings.about.title') },
  ]
}

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
  const { t } = useTranslation()
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
          <Button variant="ghost" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" onClick={() => { onConfirm(); onClose() }}>{t('common.confirm')}</Button>
        </div>
      </div>
    </div>
  )
}

// 搜索引擎卡片组件
function SearchEngineCard({
  engine,
  isSelected,
  accent,
  onClick,
  syncedIcon,
  globalBg,
}: {
  engine: SearchEngineConfig
  isSelected: boolean
  accent: string
  onClick: () => void
  syncedIcon: SyncedIconInfo | null
  globalBg: string | null
}) {
  const [iconSrc, setIconSrc] = useState<string | null>(null)
  const [iconLoading, setIconLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    setIconLoading(true)
    setIconSrc(null)

    // 优先使用同步图标
    if (syncedIcon) {
      if (syncedIcon.iconType === 'BASE64' && syncedIcon.iconData) {
        setIconSrc(syncedIcon.iconData)
        setIconLoading(false)
        return
      }
      if (syncedIcon.iconUrl) {
        const url = getIconUrl(`https://${engine.domain}`, syncedIcon.iconUrl)
        setIconSrc(url)
        setIconLoading(false)
        return
      }
    }

    const sources = getFaviconSources(engine.domain, 64)
    if (engine.iconUrl) {
      sources.unshift(engine.iconUrl)
    }

    if (sources.length === 0) {
      setIconLoading(false)
      return
    }

    let successFound = false
    let failedCount = 0

    sources.forEach((src) => {
      const img = new Image()
      img.onload = () => {
        if (!mountedRef.current || successFound) return
        successFound = true
        setIconSrc(src)
        setIconLoading(false)
      }
      img.onerror = () => {
        if (!mountedRef.current || successFound) return
        failedCount++
        if (failedCount >= sources.length) {
          setIconLoading(false)
        }
      }
      img.src = src
    })

    return () => {
      mountedRef.current = false
    }
  }, [engine.domain, engine.iconUrl, syncedIcon])

  const letter = (engine.name?.[0] || '?').toUpperCase()

  // 计算图标背景样式
  const getIconBgStyle = (): React.CSSProperties => {
    if (syncedIcon?.iconBg) {
      return parseIconBgStyle(syncedIcon.iconBg)
    }
    if (globalBg) {
      return parseIconBgStyle(globalBg)
    }
    return parseIconBgStyle(null)
  }

  const bgStyle = getIconBgStyle()
  const hasIcon = Boolean(iconSrc)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
        'bg-white/5 backdrop-blur-sm border-2',
        isSelected
          ? 'hover:bg-white/10'
          : 'border-transparent hover:bg-white/10 hover:border-white/20',
      )}
      style={isSelected ? { borderColor: accent } : undefined}
    >
      {/* 图标 */}
      <div 
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0',
          !hasIcon && !syncedIcon?.iconBg && !globalBg && 'bg-primary/15 text-primary font-semibold',
        )}
        style={bgStyle}
      >
        {iconSrc ? (
          <img src={iconSrc} alt={engine.name} className="w-full h-full object-cover" />
        ) : iconLoading ? (
          <span className="text-sm font-semibold">{letter}</span>
        ) : (
          <span className="text-sm font-semibold">{letter}</span>
        )}
      </div>

      {/* 名称和描述 */}
      <div className="flex-1 min-w-0 text-left">
        <div className={cn('text-sm font-medium truncate', isSelected ? 'text-fg' : 'text-fg/70')}>
          {engine.name}
        </div>
        <div className="text-xs text-fg/40 truncate">{engine.urlTemplate.replace('{query}', '')}</div>
      </div>

      {/* 复选框 */}
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0',
          isSelected ? 'text-white' : 'border-2 border-white/30',
        )}
        style={isSelected ? { backgroundColor: accent } : undefined}
      >
        {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
      </div>
    </button>
  )
}

export function SettingsDialog({ open, onClose }: Props) {
  const { t, i18n } = useTranslation()
  const SEARCHABLE_SETTINGS = useSearchableSettings()
  
  // 语言切换
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(() => getCurrentLanguage())
  const handleLanguageChange = useCallback((lang: LanguageCode) => {
    setCurrentLanguage(lang)
    void changeLanguage(lang)
  }, [])
  
  // 监听语言变化（其他地方切换时同步）
  useEffect(() => {
    setCurrentLanguage(i18n.language as LanguageCode)
  }, [i18n.language])
  
  // 翻译后的导航标签和描述
  const NAV_LABELS = useMemo(() => ({
    appearance: t('settings.appearance'),
    clock: t('settings.clock'),
    desktop: t('nav.home'),
    bookmark: t('nav.bookmarks'),
    search: t('settings.search'),
    account: t('settings.account'),
    reset: t('settings.reset')
  }), [t])
  
  const NAV_DESCRIPTIONS = useMemo(() => ({
    appearance: t('settings.theme.description'),
    clock: t('settings.clockFormat.description'),
    desktop: t('settings.sidebar.description'),
    bookmark: t('bookmarks.sortMode'),
    search: t('settings.searchEngine.description'),
    account: t('settings.profile.description'),
    reset: t('settings.resetAppearance.description')
  }), [t])
  
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
  const sidebarAutoHide = useAppearanceStore((s) => s.sidebarAutoHide)
  const sidebarAutoHideDelay = useAppearanceStore((s) => s.sidebarAutoHideDelay)
  const sidebarClickKeepCollapsed = useAppearanceStore((s) => s.sidebarClickKeepCollapsed)
  const selectedEngineId = useAppearanceStore((s) => s.selectedEngineId)
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
  const iconRadiusRatio = useAppearanceStore((s) => s.iconRadiusRatio)
  const dockVisible = useAppearanceStore((s) => s.dockVisible)
  const dockShowBookmarks = useAppearanceStore((s) => s.dockShowBookmarks)
  const dockShowSettings = useAppearanceStore((s) => s.dockShowSettings)
  const dockAddPosition = useAppearanceStore((s) => s.dockAddPosition)
  const dndPrePush = useBookmarkDndStore((s) => s.prePush)
  const dndPushAnim = useBookmarkDndStore((s) => s.pushAnimation)
  const dndDropAnim = useBookmarkDndStore((s) => s.dropAnimation)
  // 书签缓存 - 用于同步搜索引擎图标
  const bookmarks = useBookmarkCacheStore((s) => s.items)
  // 获取引擎的同步图标信息
  const getSyncedIcon = useCallback((engineDomain: string): SyncedIconInfo | null => {
    return findMatchingBookmarkIcon(engineDomain, bookmarks)
  }, [bookmarks])
  // 获取全局背景设置
  const globalIconBg = useMemo(() => getGlobalIconBackground(bookmarks), [bookmarks])

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
  const setSidebarAutoHide = useAppearanceStore((s) => s.setSidebarAutoHide)
  const setSidebarAutoHideDelay = useAppearanceStore((s) => s.setSidebarAutoHideDelay)
  const setSidebarClickKeepCollapsed = useAppearanceStore((s) => s.setSidebarClickKeepCollapsed)
  const setSelectedEngineId = useAppearanceStore((s) => s.setSelectedEngineId)
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
  const setIconRadiusRatio = useAppearanceStore((s) => s.setIconRadiusRatio)
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
  
  // 引擎选择器展开/收起状态
  const COLLAPSED_ENGINE_COUNT = 4
  const [engineSelectorExpanded, setEngineSelectorExpanded] = useState(() => {
    // 如果选中的引擎不在前 4 个，默认展开
    const selectedIndex = PRESET_SEARCH_ENGINES.findIndex(e => e.id === selectedEngineId)
    return selectedIndex >= COLLAPSED_ENGINE_COUNT
  })

  // 当选中的引擎变化时，如果不在前 4 个则自动展开
  useEffect(() => {
    const selectedIndex = PRESET_SEARCH_ENGINES.findIndex(e => e.id === selectedEngineId)
    if (selectedIndex >= COLLAPSED_ENGINE_COUNT && !engineSelectorExpanded) {
      setEngineSelectorExpanded(true)
    }
  }, [selectedEngineId, engineSelectorExpanded])

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
  const [resetDialogType, setResetDialogType] = useState<'appearance' | 'dnd' | 'cache' | null>(null)
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
  
  // 间距拖动时打开书签页预览
  const [isPreviewingIconGap, setIsPreviewingIconGap] = useState(false)
  const iconGapSliderRef = useRef<HTMLInputElement>(null)
  const [iconGapSliderRect, setIconGapSliderRect] = useState<DOMRect | null>(null)
  
  // 圆角比例拖动时打开书签页预览
  const [isPreviewingIconRadius, setIsPreviewingIconRadius] = useState(false)
  const iconRadiusSliderRef = useRef<HTMLInputElement>(null)
  const [iconRadiusSliderRect, setIconRadiusSliderRect] = useState<DOMRect | null>(null)
  
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
  
  // 开始间距预览（打开书签页）
  const handleStartIconGapPreview = useCallback(() => {
    if (iconGapSliderRef.current) {
      setIconGapSliderRect(iconGapSliderRef.current.getBoundingClientRect())
    }
    setIsPreviewingIconGap(true)
    setBookmarkDrawerOpenForPreview(true)
  }, [setBookmarkDrawerOpenForPreview])
  
  // 开始圆角比例预览（打开书签页）
  const handleStartIconRadiusPreview = useCallback(() => {
    if (iconRadiusSliderRef.current) {
      setIconRadiusSliderRect(iconRadiusSliderRef.current.getBoundingClientRect())
    }
    setIsPreviewingIconRadius(true)
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
  
  // 监听全局 mouseup/touchend 事件，圆角比例拖动结束时关闭书签页
  useEffect(() => {
    if (!isPreviewingIconRadius) return
    const handleEnd = () => {
      setIsPreviewingIconRadius(false)
      setBookmarkDrawerOpenForPreview(false)
    }
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchend', handleEnd)
    return () => {
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isPreviewingIconRadius, setBookmarkDrawerOpenForPreview])
  
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
    return SEARCHABLE_SETTINGS.filter((item: SettingSearchItem) => 
      item.label.toLowerCase().includes(query) ||
      item.keywords.some((kw: string) => kw.toLowerCase().includes(query))
    )
  }, [searchQuery, SEARCHABLE_SETTINGS])

  // 移动端打开设置详情页
  const handleOpenTab: (key: TabKey) => void = useCallback((key: TabKey) => {
    setTab(key)
  }, [setTab])

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

  // Computed
  const accentHint = useMemo(() => {
    if (!accentInput.trim()) return t('settings.themeColor.example')
    if (isValidHex(accentInput)) return t('settings.themeColor.valid')
    return t('settings.themeColor.invalid')
  }, [accentInput, t])

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
      if (result.ok) toast.success(t('toast.saved'))
      else toast.error(result.message)
    } finally { setProfileLoading(false) }
  }

  const handleChangePassword = async () => {
    if (!passwordFormValid || !user) return
    setPasswordLoading(true)
    try {
      const result = await changePassword(currentPassword, newPassword)
      if (result.ok) { toast.success(t('settings.profile.passwordChanged')); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }
      else toast.error(result.message)
    } finally { setPasswordLoading(false) }
  }

  if (!open) return null

  const closeAndToast = () => { toast.success(t('settings.saved')); onClose() }
  const onChangeMode = (m: ThemeMode) => setMode(m)
  const onChangeBgType = (t: BackgroundType) => setBackgroundType(t)
  const onChangeHourCycle = (v: ClockHourCycle) => setClockHourCycle(v)

  const exportSettings = () => {
    const data = createSettingsFile()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'start-settings.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t('settings.importExport.exportSuccess'))
  }

  const importSettings = async (file: File) => {
    try {
      const text = await file.text()
      const json = JSON.parse(text) as unknown
      const resp = applySettingsFile(json)
      if (!resp.ok) { toast.error(resp.message); return }
      if (resp.partial) toast.warning(resp.message)
      else toast.success(resp.message)
    } catch { toast.error(t('settings.importExport.importError')) }
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
      
      {/* 预览时显示固定位置的滑块条 - 圆角比例 */}
      {isPreviewingIconRadius && iconRadiusSliderRect && (
        <>
          <span 
            className="text-sm font-medium text-fg/80"
            style={{
              position: 'fixed',
              top: iconRadiusSliderRect.top - 24,
              left: iconRadiusSliderRect.left,
              zIndex: 9999,
            }}
          >
            {Math.round(iconRadiusRatio * 100)}%
            <span className="text-fg/50 ml-2">
              ({Math.round(bookmarkIconSize * iconRadiusRatio * 2) / 2}px)
            </span>
          </span>
          <input 
            type="range" 
            min={0} 
            max={50} 
            step={1} 
            value={Math.round(iconRadiusRatio * 100)} 
            onChange={(e) => setIconRadiusRatio(Number(e.target.value) / 100)} 
            style={{
              position: 'fixed',
              top: iconRadiusSliderRect.top,
              left: iconRadiusSliderRect.left,
              width: iconRadiusSliderRect.width,
              height: iconRadiusSliderRect.height,
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
          'relative z-10 flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b',
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
                  {!isDesktop && tab === null ? t('settings.title') : tab ? NAV_LABELS[tab] : t('settings.title')}
                </h1>
                {tab && isDesktop && (
                  <p className="text-sm text-fg/60 mt-0.5">{NAV_DESCRIPTIONS[tab]}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(isDesktop || tab !== null) && (
                <Button variant="primary" size="sm" onClick={closeAndToast}>{t('common.save')}</Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleClose} aria-label={t('common.close')} className="h-9 w-9 p-0"><X className="h-4 w-4" /></Button>
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
                placeholder={t('settings.searchPlaceholder')}
                className={cn(
                  'w-full h-10 pl-10 pr-4 rounded-xl text-sm text-fg placeholder:text-fg/40 focus:outline-none transition-all',
                  // 移动端：华为风格卡片背景
                  isMobile 
                    ? 'bg-white dark:bg-zinc-900 border-0 focus:ring-2 focus:ring-primary/30'
                    : 'bg-glass/20 border border-glass-border/20 focus:border-primary/50 focus:bg-glass/30'
                )}
              />
              {/* 搜索结果下拉 - 使用 portal 渲染到 body 确保在最上层 */}
              {searchResults.length > 0 && searchInputRef.current && createPortal(
                <div 
                  className={cn(
                    'fixed rounded-2xl overflow-hidden z-[9999] max-h-80 overflow-y-auto',
                    isMobile 
                      ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl'
                      : 'bg-glass/40 backdrop-blur-xl border border-glass-border/25 shadow-2xl'
                  )}
                  style={{
                    top: searchInputRef.current.getBoundingClientRect().bottom + 8,
                    left: searchInputRef.current.getBoundingClientRect().left,
                    width: searchInputRef.current.getBoundingClientRect().width,
                  }}
                >
                  <div className="text-[10px] text-fg/50 px-4 py-1.5">{t('settings.searchResults')}</div>
                  <div className="px-2 pb-2 space-y-0.5">
                    {searchResults.map((item: SettingSearchItem) => {
                      const tabKey: TabKey = item.tab
                      const Icon = NAV_ICONS[tabKey]
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
                          <span className="text-[10px] text-fg/40 px-1.5 py-0.5 rounded bg-glass/30">{NAV_LABELS[tabKey]}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>,
                document.body
              )}
            </div>
          )}
        </header>

        <div className="relative z-0 flex-1 flex overflow-hidden min-h-0">
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
                  <Card id="settings-card-theme-mode" title={t('settings.theme.title')} description={t('settings.theme.description')} highlighted={highlightedCardId === 'theme-mode' || highlightedCardId === 'accent-color'} isMobileStyle={isMobile}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <SettingItem label={t('settings.theme.title')}>
                        <div className="flex flex-wrap gap-2">
                          <SegButton active={mode === 'system'} onClick={() => onChangeMode('system')}>{t('settings.theme.system')}</SegButton>
                          <SegButton active={mode === 'light'} onClick={() => onChangeMode('light')}>{t('settings.theme.light')}</SegButton>
                          <SegButton active={mode === 'dark'} onClick={() => onChangeMode('dark')}>{t('settings.theme.dark')}</SegButton>
                        </div>
                      </SettingItem>
                      <SettingItem label={t('settings.themeColor.title')}>
                        <div className="flex items-center gap-3">
                          <input type="color" value={accent} onChange={(e) => { setAccent(e.target.value); setAccentInput(e.target.value) }} className="h-9 w-12 rounded-lg border border-glass-border/25 bg-glass/10 p-1 cursor-pointer" title={t('settings.themeColor.pick')} />
                          <div className="flex-1"><Input value={accentInput} onChange={(e) => { const v = e.target.value; setAccentInput(v); if (isValidHex(v)) setAccent(v.trim()) }} placeholder={t('settings.themeColor.exampleValue')} className="h-9" /></div>
                        </div>
                        <p className={cn('text-xs', isValidHex(accentInput) ? 'text-fg/50' : 'text-red-400')}>{accentHint}</p>
                      </SettingItem>
                    </div>
                  </Card>
                  <Card id="settings-card-background" title={t('settings.background.title')} description={t('settings.background.description')} highlighted={highlightedCardId === 'background'} isMobileStyle={isMobile}>
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
                          alt={t('settings.background.bing')} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <span className="absolute bottom-2 left-2 text-xs text-white font-medium">{t('settings.background.bing')}</span>
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
                        <span className="absolute bottom-2 left-2 text-xs text-white font-medium">{t('settings.background.picsum')}</span>
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
                              alt={t('settings.background.custom')} 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className="absolute bottom-2 left-2 text-xs text-white font-medium">{t('settings.background.custom')}</span>
                          </>
                        ) : (
                          <div className="w-full h-full bg-glass/20 flex flex-col items-center justify-center gap-1">
                            <span className="text-2xl text-fg/40">+</span>
                            <span className="text-xs text-fg/50">{t('settings.background.custom')}</span>
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
                              alt={t('settings.background.api')} 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className="absolute bottom-2 left-2 text-xs text-white font-medium">{t('settings.background.api')}</span>
                          </>
                        ) : (
                          <div className="w-full h-full bg-glass/20 flex flex-col items-center justify-center gap-1">
                            <span className="text-2xl text-fg/40">+</span>
                            <span className="text-xs text-fg/50">{t('settings.background.api')}</span>
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
                        <SettingItem label={t('settings.background.custom')} hint={t('settings.background.customUrlPlaceholder')} fullWidth>
                          <div className="flex gap-2">
                            <Input value={bgUrlInput} onChange={(e) => setBgUrlInput(e.target.value)} placeholder={t('common.urlPlaceholder')} className="flex-1" />
                            <Button size="sm" onClick={() => { setBackgroundCustomUrl(bgUrlInput.trim()); toast(t('toast.updateSuccess')) }}>{t('common.apply')}</Button>
                          </div>
                        </SettingItem>
                      </div>
                    )}
                    {backgroundType === 'api' && (
                      <div className="mt-4">
                        <SettingItem label={t('settings.background.api')} hint={t('settings.background.apiUrlPlaceholder')} fullWidth>
                          <div className="flex gap-2">
                            <Input value={apiUrlInput} onChange={(e) => setApiUrlInput(e.target.value)} placeholder={t('settings.background.apiUrlExample')} className="flex-1" />
                            <Button size="sm" onClick={() => { setBackgroundApiUrl(apiUrlInput.trim()); toast(t('toast.updateSuccess')) }}>{t('common.apply')}</Button>
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
                            if (!currentBackgroundUrl) {
                              toast.error(t('toast.downloadFailed'))
                              return
                            }
                            toast(t('common.loading'))
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
                            toast.success(t('toast.saveSuccess'))
                          } catch {
                            toast.error(t('toast.downloadFailed'))
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        {t('settings.background.downloadWallpaper')}
                      </Button>
                    </div>
                  </Card>
                  {isMobile && (
                    <Card id="settings-card-mobile-nav" title={t('settings.mobileNav.title')} description={t('settings.mobileNav.description')} highlighted={highlightedCardId === 'mobile-nav'} isMobileStyle={isMobile}>
                      <SettingItem label={t('settings.mobileNav.hideText')} hint={t('settings.mobileNav.hideTextHint')}>
                        <Toggle checked={mobileNavHideText} onChange={setMobileNavHideText} label={mobileNavHideText ? t('common.hidden') : t('common.visible')} />
                      </SettingItem>
                    </Card>
                  )}
                </>
              )}

              {/* Clock */}
              {tab === 'clock' && (
                <>
                  <Card id="settings-card-hour-cycle" title={t('settings.clockFormat.title')} description={t('settings.clockFormat.description')} highlighted={highlightedCardId === 'hour-cycle'} isMobileStyle={isMobile}>
                    <SettingItem label={t('settings.clockFormat.title')}>
                      <div className="flex flex-wrap gap-2">
                        <SegButton active={clockHourCycle === '24'} onClick={() => onChangeHourCycle('24')}>{t('settings.clockFormat.hour24')}</SegButton>
                        <SegButton active={clockHourCycle === '12'} onClick={() => onChangeHourCycle('12')}>{t('settings.clockFormat.hour12')}</SegButton>
                      </div>
                    </SettingItem>
                  </Card>
                  <Card id="settings-card-clock-seconds" title={t('settings.showSeconds.title')} description={t('settings.showSeconds.description')} highlighted={highlightedCardId === 'clock-seconds' || highlightedCardId === 'clock-date'} isMobileStyle={isMobile}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <SettingItem label={t('settings.showSeconds.title')}><Toggle checked={clockShowSeconds} onChange={setClockShowSeconds} label={clockShowSeconds ? t('common.on') : t('common.off')} /></SettingItem>
                      <SettingItem label={t('settings.showDate.title')}><Toggle checked={clockShowDate} onChange={setClockShowDate} label={clockShowDate ? t('common.on') : t('common.off')} /></SettingItem>
                    </div>
                  </Card>
                  <Card id="settings-card-clock-color" title={t('settings.clockColor.title')} description={t('settings.clockColor.description')} highlighted={highlightedCardId === 'clock-color'} isMobileStyle={isMobile}>
                    <SettingItem label={t('settings.clockColor.followAccent')} hint={t('settings.clockColor.followAccentHint')}><Toggle checked={clockFollowAccent} onChange={setClockFollowAccent} label={clockFollowAccent ? t('common.on') : t('common.off')} /></SettingItem>
                  </Card>
                  <Card id="settings-card-clock-size" title={t('settings.clockSize.title')} description={t('settings.clockSize.description')} highlighted={highlightedCardId === 'clock-size'} isMobileStyle={isMobile}>
                    <SettingItem label={t('settings.clockSize.scale')} hint={t('settings.clockSize.scaleHint')} fullWidth>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-fg/80">{clockScale}%</span>
                          {clockScale !== 100 && (
                            <button type="button" onClick={() => setClockScale(100)} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">{t('common.reset')}</button>
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
                  <Card id="settings-card-home-layout" title={t('settings.clockPosition.title')} description={t('settings.clockPosition.description')} highlighted={highlightedCardId === 'home-layout'} isMobileStyle={isMobile}>
                    <SettingItem label={t('settings.clockPosition.verticalPosition')} hint={t('settings.clockPosition.verticalPositionHint')} fullWidth>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-fg/80">{homeFixedPosition}%</span>
                          {homeFixedPosition !== 30 && (
                            <button type="button" onClick={() => setHomeFixedPosition(30)} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">{t('common.reset')}</button>
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
                  <Card id="settings-card-background-dimming" title={t('settings.dimming.title')} description={t('settings.dimming.description')} highlighted={highlightedCardId === 'background-dimming'} isMobileStyle={isMobile}>
                    <SettingItem label={t('settings.dimming.brightness')} hint={t('settings.dimming.brightnessHint', { default: dimmingDefault })} fullWidth>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-fg/80">{backgroundDimming}%</span>
                          {backgroundDimming !== dimmingDefault && (
                            <button type="button" onClick={() => setBackgroundDimming(dimmingDefault)} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">{t('common.reset')}</button>
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
                  <Card id="settings-card-sidebar" title={t('settings.sidebar.title')} description={t('settings.sidebar.description')} highlighted={highlightedCardId === 'sidebar'} isMobileStyle={isMobile}>
                    <div className="space-y-4">
                      <SettingItem label={t('settings.sidebar.keepCollapsed')} hint={t('settings.sidebar.keepCollapsedHint')}>
                        <Toggle checked={sidebarClickKeepCollapsed} onChange={setSidebarClickKeepCollapsed} label={sidebarClickKeepCollapsed ? t('common.yes') : t('common.no')} />
                      </SettingItem>
                      <SettingItem label={t('settings.sidebar.autoHide')} hint={t('settings.sidebar.autoHideHint')}><Toggle checked={sidebarAutoHide} onChange={setSidebarAutoHide} label={sidebarAutoHide ? t('common.on') : t('common.off')} /></SettingItem>
                      {sidebarAutoHide && (
                        <SettingItem label={t('settings.sidebarDelay.label', { delay: sidebarAutoHideDelay })} hint={t('settings.sidebarDelay.hint')} fullWidth>
                          <Slider value={sidebarAutoHideDelay} onChange={setSidebarAutoHideDelay} min={1} max={10} unit={t('settings.units.seconds')} defaultValue={3} onReset={() => setSidebarAutoHideDelay(3)} />
                        </SettingItem>
                      )}
                    </div>
                  </Card>
                  <Card id="settings-card-dock" title={t('settings.dock.title')} description={t('settings.dock.description')} highlighted={highlightedCardId === 'dock'} isMobileStyle={isMobile}>
                    <div className="space-y-4">
                      <SettingItem label={t('settings.dock.showDock')} hint={t('settings.dock.showDockHint')}><Toggle checked={dockVisible} onChange={setDockVisible} label={dockVisible ? t('common.show') : t('common.hide')} /></SettingItem>
                      {dockVisible && (
                        <>
                          <SettingItem label={t('settings.dock.bookmarksEntry')} hint={t('settings.dock.bookmarksEntryHint')}><Toggle checked={dockShowBookmarks} onChange={setDockShowBookmarks} label={dockShowBookmarks ? t('common.show') : t('common.hide')} /></SettingItem>
                          <SettingItem label={t('settings.dock.settingsEntry')} hint={t('settings.dock.settingsEntryHint')}><Toggle checked={dockShowSettings} onChange={setDockShowSettings} label={dockShowSettings ? t('common.show') : t('common.hide')} /></SettingItem>
                          <SettingItem label={t('settings.dock.newBookmarkPosition')} hint={t('settings.dock.newBookmarkPositionHint')}>
                            <div className="flex flex-wrap gap-2">
                              <SegButton active={dockAddPosition === 'left'} onClick={() => setDockAddPosition('left')}>{t('common.left')}</SegButton>
                              <SegButton active={dockAddPosition === 'right'} onClick={() => setDockAddPosition('right')}>{t('common.right')}</SegButton>
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
                  <Card id="settings-card-icon-size" title={t('settings.iconSize.title')} description={t('settings.iconSize.description')} highlighted={highlightedCardId === 'icon-size'} isMobileStyle={isMobile}>
                    <SettingItem label={t('settings.iconSize.currentSize', { size: bookmarkIconSize })} fullWidth>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-fg/80">{bookmarkIconSize}px</span>
                          {bookmarkIconSize !== 64 && (
                            <button type="button" onClick={() => setBookmarkIconSize(64)} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">{t('common.reset')}</button>
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
                  <Card id="settings-card-icon-gap" title={t('settings.iconGap.title')} description={t('settings.iconGap.description')} highlighted={highlightedCardId === 'icon-gap'} isMobileStyle={isMobile}>
                    <SettingItem label={t('settings.iconGap.currentGap', { gap: bookmarkIconGap })} hint={t('settings.iconGap.hint')} fullWidth>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-fg/80">{bookmarkIconGap}px</span>
                          {bookmarkIconGap !== (isMobile ? 36 : 52) && (
                            <button type="button" onClick={() => setBookmarkIconGap(isMobile ? 36 : 52)} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">{t('common.reset')}</button>
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
                  <Card id="settings-card-icon-radius-ratio" title={t('settings.iconRadiusRatio.title')} description={t('settings.iconRadiusRatio.description')} highlighted={highlightedCardId === 'icon-radius-ratio'} isMobileStyle={isMobile}>
                    <SettingItem label={t('settings.iconRadiusRatio.currentRatio', { ratio: Math.round(iconRadiusRatio * 100) })} hint={t('settings.iconRadiusRatio.preview', { radius: Math.round(64 * iconRadiusRatio * 2) / 2 })} fullWidth>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-fg/80">{Math.round(iconRadiusRatio * 100)}%</span>
                          {iconRadiusRatio !== 0.25 && (
                            <button type="button" onClick={() => setIconRadiusRatio(0.25)} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">{t('common.reset')}</button>
                          )}
                        </div>
                        <input 
                          ref={iconRadiusSliderRef}
                          type="range" 
                          min={0} 
                          max={50} 
                          step={1} 
                          value={Math.round(iconRadiusRatio * 100)} 
                          onChange={(e) => setIconRadiusRatio(Number(e.target.value) / 100)} 
                          onMouseDown={handleStartIconRadiusPreview}
                          onTouchStart={handleStartIconRadiusPreview}
                          className="w-full accent-[rgb(var(--primary))] h-2 rounded-full cursor-pointer"
                        />
                      </div>
                    </SettingItem>
                  </Card>
                  <Card id="settings-card-bookmark-sort" title={t('settings.bookmarkSort.title')} description={t('settings.bookmarkSort.description')} highlighted={highlightedCardId === 'bookmark-sort'} isMobileStyle={isMobile}>
                    <div className="space-y-4">
                      <SettingItem label={t('settings.bookmarkSort.sortMode')}>
                        <div className="flex flex-wrap gap-2">
                          <SegButton active={bookmarkDrawerSortMode === 'custom'} onClick={() => setBookmarkDrawerSortMode('custom')}>{t('settings.bookmarkSort.custom')}</SegButton>
                          <SegButton active={bookmarkDrawerSortMode === 'folders-first'} onClick={() => setBookmarkDrawerSortMode('folders-first')}>{t('settings.bookmarkSort.foldersFirst')}</SegButton>
                          <SegButton active={bookmarkDrawerSortMode === 'links-first'} onClick={() => setBookmarkDrawerSortMode('links-first')}>{t('settings.bookmarkSort.linksFirst')}</SegButton>
                          <SegButton active={bookmarkDrawerSortMode === 'alphabetical'} onClick={() => setBookmarkDrawerSortMode('alphabetical')}>{t('settings.bookmarkSort.alphabetical')}</SegButton>
                        </div>
                      </SettingItem>
                      <SettingItem label={t('settings.bookmarkSort.lockSort')} hint={t('settings.bookmarkSort.lockSortHint')}><Toggle checked={bookmarkSortLocked} onChange={setBookmarkSortLocked} label={bookmarkSortLocked ? t('settings.bookmarkSort.locked') : t('settings.bookmarkSort.unlocked')} /></SettingItem>
                    </div>
                  </Card>
                  <Card id="settings-card-dnd-animation" title={t('settings.dndAnimation.title')} description={t('settings.dndAnimation.description')} highlighted={highlightedCardId === 'dnd-animation'} isMobileStyle={isMobile}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <SettingItem label={t('settings.dndAnimation.prePush')} hint={t('settings.dndAnimation.prePushHint')}><Toggle checked={dndPrePush} onChange={setDndPrePush} label={dndPrePush ? t('common.on') : t('common.off')} /></SettingItem>
                      <SettingItem label={t('settings.dndAnimation.pushAnim')} hint={t('settings.dndAnimation.pushAnimHint')}><Toggle checked={dndPushAnim} onChange={setDndPushAnim} label={dndPushAnim ? t('common.on') : t('common.off')} /></SettingItem>
                      <SettingItem label={t('settings.dndAnimation.dropAnim')} hint={t('settings.dndAnimation.dropAnimHint')}><Toggle checked={dndDropAnim} onChange={setDndDropAnim} label={dndDropAnim ? t('common.on') : t('common.off')} /></SettingItem>
                    </div>
                  </Card>
                </>
              )}

              {/* Search */}
              {tab === 'search' && (
                <>
                  <Card id="settings-card-search-engine" title={t('settings.searchEngine.title')} description={t('settings.searchEngine.description')} highlighted={highlightedCardId === 'search-engine'} isMobileStyle={isMobile}>
                    <div className="space-y-3">
                      {/* 搜索引擎选择器 - 两列等宽布局 */}
                      <div className="grid grid-cols-2 gap-3 transition-all duration-300 ease-in-out">
                        {(engineSelectorExpanded ? PRESET_SEARCH_ENGINES : PRESET_SEARCH_ENGINES.slice(0, COLLAPSED_ENGINE_COUNT)).map((engine) => {
                          const isSelected = selectedEngineId === engine.id
                          const syncedIcon = getSyncedIcon(engine.domain)
                          return (
                            <SearchEngineCard
                              key={engine.id}
                              engine={engine}
                              isSelected={isSelected}
                              accent={accent}
                              onClick={() => setSelectedEngineId(engine.id)}
                              syncedIcon={syncedIcon}
                              globalBg={globalIconBg}
                            />
                          )
                        })}
                      </div>
                      {/* 展开/收起按钮 */}
                      {PRESET_SEARCH_ENGINES.length > COLLAPSED_ENGINE_COUNT && (
                        <button
                          type="button"
                          onClick={() => setEngineSelectorExpanded(!engineSelectorExpanded)}
                          className={cn(
                            'w-full flex items-center justify-center gap-2 py-2',
                            'text-sm text-fg/60 hover:text-fg/80 transition-colors',
                            'border-t border-glass-border/15 pt-3'
                          )}
                        >
                          {engineSelectorExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 transition-transform duration-200" />
                              <span>{t('settings.engineSelector.collapse')}</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                              <span>{t('settings.engineSelector.expand', { count: PRESET_SEARCH_ENGINES.length - COLLAPSED_ENGINE_COUNT })}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </Card>

                  <Card id="settings-card-search-glow" title={t('settings.searchGlow.title')} description={t('settings.searchGlow.description')} highlighted={highlightedCardId === 'search-glow'} isMobileStyle={isMobile}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <SettingItem label={t('settings.searchGlow.border')}><Toggle checked={searchGlowBorder} onChange={setSearchGlowBorder} label={searchGlowBorder ? t('common.on') : t('common.off')} /></SettingItem>
                      <SettingItem label={t('settings.searchGlow.light')}><Toggle checked={searchGlowLight} onChange={setSearchGlowLight} label={searchGlowLight ? t('common.on') : t('common.off')} /></SettingItem>
                      {searchGlowLight && <SettingItem label={t('settings.searchGlow.lightMove')}><Toggle checked={searchGlowLightMove} onChange={setSearchGlowLightMove} label={searchGlowLightMove ? t('common.on') : t('common.off')} /></SettingItem>}
                    </div>
                  </Card>
                  <Card id="settings-card-dropdown-style" title={t('settings.dropdownStyle.title')} description={t('settings.dropdownStyle.description')} highlighted={highlightedCardId === 'dropdown-style'} isMobileStyle={isMobile}>
                    <div className="space-y-4">
                      <SettingItem label={t('settings.dropdownStyle.opacity', { value: searchDropdownOpacity })} fullWidth>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-fg/80">{searchDropdownOpacity}%</span>
                            {searchDropdownOpacity !== 50 && (
                              <button type="button" onClick={() => setSearchDropdownOpacity(50)} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">{t('common.reset')}</button>
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
                      <SettingItem label={t('settings.dropdownStyle.blur', { value: searchDropdownBlur })} fullWidth>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-fg/80">{searchDropdownBlur}px</span>
                            {searchDropdownBlur !== 24 && (
                              <button type="button" onClick={() => setSearchDropdownBlur(24)} className="text-xs text-fg/50 hover:text-fg/70 transition-colors">{t('common.reset')}</button>
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
                  <Card id="settings-card-search-history" title={t('settings.searchHistory.title')} description={t('settings.searchHistory.description')} highlighted={highlightedCardId === 'search-history'} isMobileStyle={isMobile}>
                    <SettingItem label={searchHistoryCount === 0 ? t('settings.searchHistory.disabled') : t('settings.searchHistory.showCount', { count: searchHistoryCount })} fullWidth>
                      <Slider value={searchHistoryCount} onChange={setSearchHistoryCount} min={0} max={20} unit={t('settings.units.items')} defaultValue={10} onReset={() => setSearchHistoryCount(10)} />
                    </SettingItem>
                  </Card>
                  <Card id="settings-card-recent-bookmarks" title={t('settings.recentBookmarks.title')} description={t('settings.recentBookmarks.description')} highlighted={highlightedCardId === 'recent-bookmarks'} isMobileStyle={isMobile}>
                    <div className="space-y-4">
                      <SettingItem label={t('settings.recentBookmarks.enable')}><Toggle checked={recentBookmarksEnabled} onChange={setRecentBookmarksEnabled} label={recentBookmarksEnabled ? t('common.on') : t('common.off')} /></SettingItem>
                      {recentBookmarksEnabled && (
                        <>
                          <SettingItem label={t('settings.recentBookmarks.displayMode')}>
                            <div className="flex flex-wrap gap-2">
                              <SegButton active={recentBookmarksMode === 'dynamic'} onClick={() => setRecentBookmarksMode('dynamic')}>{t('settings.recentBookmarks.dynamicRow')}</SegButton>
                              <SegButton active={recentBookmarksMode === 'fixed'} onClick={() => setRecentBookmarksMode('fixed')}>{t('settings.recentBookmarks.fixedCount')}</SegButton>
                            </div>
                          </SettingItem>
                          {recentBookmarksMode === 'fixed' && (
                            <SettingItem label={t('settings.recentBookmarks.showCount', { count: recentBookmarksCount })} fullWidth>
                              <Slider value={recentBookmarksCount} onChange={setRecentBookmarksCount} min={1} max={12} unit={t('settings.units.count')} defaultValue={8} onReset={() => setRecentBookmarksCount(8)} />
                            </SettingItem>
                          )}
                        </>
                      )}
                    </div>
                  </Card>
                  <Card id="settings-card-search-row-height" title={t('settings.searchRowHeight.title')} description={t('settings.searchRowHeight.description')} highlighted={highlightedCardId === 'search-row-height'} isMobileStyle={isMobile}>
                    <SettingItem label={t('settings.searchRowHeight.currentHeight', { height: searchRowHeight })} fullWidth>
                      <Slider value={searchRowHeight} onChange={setSearchRowHeight} min={16} max={36} step={2} unit="px" defaultValue={32} onReset={() => setSearchRowHeight(32)} />
                    </SettingItem>
                  </Card>
                </>
              )}

              {/* Account */}
              {tab === 'account' && (
                <>
                  <Card id="settings-card-login-status" title={t('settings.loginStatus.title')} description={t('settings.loginStatus.description')} highlighted={highlightedCardId === 'login-status'} isMobileStyle={isMobile}>
                    {user ? (
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm font-medium text-fg">{user.nickname}</p><p className="text-xs text-fg/60">@{user.username}</p></div>
                        <Button variant="ghost" size="sm" onClick={() => { logout(); toast(t('auth.logoutSuccess')) }}>{t('nav.logout')}</Button>
                      </div>
                    ) : <p className="text-sm text-fg/60">{t('settings.loginStatus.notLoggedIn')}</p>}
                  </Card>
                  {user && (
                    <>
                      <Card id="settings-card-profile" title={t('settings.profile.title')} description={t('settings.profile.description')} highlighted={highlightedCardId === 'profile'} isMobileStyle={isMobile}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <SettingItem label={t('settings.profile.username')} hint={t('settings.profile.usernameHint')}><Input value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} placeholder={t('settings.profile.username')} className={cn(!usernameValid && usernameInput && 'border-red-500/50')} /></SettingItem>
                          <SettingItem label={t('settings.profile.nickname')} hint={t('settings.profile.nicknameHint')}><Input value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} placeholder={t('settings.profile.nickname')} className={cn(!nicknameValid && nicknameInput && 'border-red-500/50')} /></SettingItem>
                          <SettingItem label={t('settings.profile.email')}><Input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder={t('settings.profile.emailExample')} className={cn(!emailValid && emailInput && 'border-red-500/50')} /></SettingItem>
                          <SettingItem label={t('settings.profile.phone')}><Input value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder={t('settings.profile.phone')} className={cn(!phoneValid && phoneInput && 'border-red-500/50')} /></SettingItem>
                        </div>
                        <div className="mt-4 pt-4 border-t border-glass-border/10"><Button variant="primary" onClick={handleSaveProfile} disabled={!profileValid || profileLoading}>{profileLoading ? t('common.loading') : t('settings.profile.save')}</Button></div>
                      </Card>
                      <Card id="settings-card-password" title={t('settings.changePassword.title')} description={t('settings.changePassword.description')} highlighted={highlightedCardId === 'password'} isMobileStyle={isMobile}>
                        <div className="space-y-4 max-w-md">
                          <SettingItem label={t('settings.changePassword.current')}>
                            <div className="relative">
                              <Input type={showCurrentPwd ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t('settings.changePassword.current')} />
                              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-fg/40 hover:text-fg/60" onClick={() => setShowCurrentPwd(!showCurrentPwd)}>{showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            </div>
                          </SettingItem>
                          <SettingItem label={t('settings.changePassword.new')} hint={t('settings.changePassword.newHint')}>
                            <div className="relative">
                              <Input type={showNewPwd ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('settings.changePassword.new')} className={cn(!newPasswordValid && newPassword && 'border-red-500/50')} />
                              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-fg/40 hover:text-fg/60" onClick={() => setShowNewPwd(!showNewPwd)}>{showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            </div>
                          </SettingItem>
                          <SettingItem label={t('settings.changePassword.confirm')}>
                            <div className="relative">
                              <Input type={showConfirmPwd ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('settings.changePassword.confirm')} className={cn(!confirmPasswordValid && confirmPassword && 'border-red-500/50')} />
                              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-fg/40 hover:text-fg/60" onClick={() => setShowConfirmPwd(!showConfirmPwd)}>{showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                            </div>
                            {!confirmPasswordValid && confirmPassword && <p className="text-xs text-red-400">{t('settings.changePassword.mismatch')}</p>}
                          </SettingItem>
                          <Button variant="primary" onClick={handleChangePassword} disabled={!passwordFormValid || passwordLoading}>{passwordLoading ? t('common.loading') : t('settings.changePassword.submit')}</Button>
                        </div>
                      </Card>
                      <Card id="settings-card-api-key" title={t('settings.apiKey.title')} description={t('settings.apiKey.description')} highlighted={highlightedCardId === 'api-key'} isMobileStyle={isMobile}><APIKeyManager /></Card>
                    </>
                  )}
                  <Card id="settings-card-import-export" title={t('settings.importExport.title')} description={t('settings.importExport.description')} highlighted={highlightedCardId === 'import-export'} isMobileStyle={isMobile}>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="primary" onClick={exportSettings}>{t('settings.importExport.export')}</Button>
                      <label className="inline-flex">
                        <input type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (f) void importSettings(f) }} />
                        <Button variant="glass" type="button">{t('settings.importExport.import')}</Button>
                      </label>
                    </div>
                  </Card>
                  <Card id="settings-card-language" title={t('settings.language.title')} description={t('settings.language.description')} highlighted={highlightedCardId === 'language'} isMobileStyle={isMobile}>
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-fg/60" />
                      <Select
                        value={currentLanguage}
                        onChange={(value) => handleLanguageChange(value as LanguageCode)}
                        options={supportedLanguages.map((lang): SelectOption => ({
                          value: lang.code,
                          label: lang.nativeName,
                        }))}
                        minWidth="160px"
                      />
                    </div>
                  </Card>
                  <Card id="settings-card-about" title={t('settings.about.title')} description={t('settings.about.description')} highlighted={highlightedCardId === 'about'} isMobileStyle={isMobile}>
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium text-fg">Start</p><p className="text-xs text-fg/60">{t('settings.about.version')} v{__APP_VERSION__}</p></div>
                      <Button variant="ghost" size="sm" onClick={() => setChangelogOpen(true)}><History className="w-4 h-4 mr-2" />{t('settings.about.changelog')}</Button>
                    </div>
                  </Card>
                </>
              )}

              {/* Reset */}
              {tab === 'reset' && (
                <>
                  <Card id="settings-card-reset-appearance" title={t('settings.resetAppearance.title')} description={t('settings.resetAppearance.description')} isMobileStyle={isMobile}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-fg/70">{t('settings.resetAppearance.detail')}</p>
                      <Button variant="ghost" size="sm" onClick={() => setResetDialogType('appearance')}>
                        <RotateCcw className="w-4 h-4 mr-2" />{t('common.reset')}
                      </Button>
                    </div>
                  </Card>
                  <Card id="settings-card-reset-dnd" title={t('settings.resetDnd.title')} description={t('settings.resetDnd.description')} isMobileStyle={isMobile}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-fg/70">{t('settings.resetDnd.detail')}</p>
                      <Button variant="ghost" size="sm" onClick={() => setResetDialogType('dnd')}>
                        <RotateCcw className="w-4 h-4 mr-2" />{t('common.reset')}
                      </Button>
                    </div>
                  </Card>
                  <Card id="settings-card-clear-cache" title={t('settings.clearCache.title')} description={t('settings.clearCache.description')} isMobileStyle={isMobile}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-fg/70">{t('settings.clearCache.detail')}</p>
                      <Button variant="ghost" size="sm" onClick={() => setResetDialogType('cache')}>
                        <Trash2 className="w-4 h-4 mr-2" />{t('common.delete')}
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
        onConfirm={() => { resetAppearance(); toast.success(t('settings.resetConfirm.appearanceDone')) }}
        title={t('settings.resetConfirm.appearanceTitle')}
        description={t('settings.resetConfirm.appearanceDesc')}
      />
      <ResetConfirmDialog
        open={resetDialogType === 'dnd'}
        onClose={() => setResetDialogType(null)}
        onConfirm={() => { resetBookmarkDnd(); toast.success(t('settings.resetConfirm.dndDone')) }}
        title={t('settings.resetConfirm.dndTitle')}
        description={t('settings.resetConfirm.dndDesc')}
      />
      <ResetConfirmDialog
        open={resetDialogType === 'cache'}
        onClose={() => setResetDialogType(null)}
        onConfirm={async () => {
          try {
            // 清理 IndexedDB 壁纸缓存
            const dbRequest = indexedDB.open('start-wallpaper-cache', 1)
            dbRequest.onsuccess = () => {
              const db = dbRequest.result
              const tx = db.transaction('images', 'readwrite')
              const store = tx.objectStore('images')
              store.clear()
            }
            // 清理 localStorage 中的壁纸 URL 缓存
            localStorage.removeItem('start:bingDaily')
            localStorage.removeItem('start:picsumCache')
            localStorage.removeItem('start:apiWallpaper')
            // 清理书签缓存
            localStorage.removeItem('start:bookmarkCache')
            toast.success(t('settings.resetConfirm.cacheCleared'))
          } catch {
            toast.error(t('settings.resetConfirm.cacheClearFailed'))
          }
        }}
        title={t('settings.resetConfirm.clearCache')}
        description={t('settings.resetConfirm.clearCacheDesc')}
      />
      </div>
    </>
  )
}