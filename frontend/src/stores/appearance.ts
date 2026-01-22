import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SortMode } from '../types/bookmark'

export type ThemeMode = 'system' | 'light' | 'dark'
export type BackgroundType = 'bing' | 'custom'
export type ClockHourCycle = '24' | '12'
export type SearchEngine = 'baidu' | 'bing' | 'google' | 'custom'
/** 首页布局模式：dynamic=动态挤压（快捷栏越多时钟搜索框上移），fixed=固定位置 */
export type HomeLayoutMode = 'dynamic' | 'fixed'

export type AppearanceState = {
  /** 深色模式策略 */
  mode: ThemeMode
  /** 主题色（hex），例如：#3b82f6 */
  accent: string
  /** 背景策略 */
  backgroundType: BackgroundType
  /** 自定义背景图 URL */
  backgroundCustomUrl: string

  /** 左侧栏是否展开（记住习惯） */
  sidebarExpanded: boolean
  /** 侧边栏是否自动隐藏 */
  sidebarAutoHide: boolean
  /** 侧边栏自动隐藏延迟（秒），范围 1-10 */
  sidebarAutoHideDelay: number
  /** 点击图标后保持收起（不自动展开侧边栏） */
  sidebarClickKeepCollapsed: boolean

  /** 时钟：12/24 小时制 */
  clockHourCycle: ClockHourCycle
  /** 时钟：是否显示秒 */
  clockShowSeconds: boolean
  /** 时钟：是否显示日期 */
  clockShowDate: boolean
  /** 时钟：字体颜色是否跟随主题色 */
  clockFollowAccent: boolean
  /** 时钟：大小缩放比例（50-150%） */
  clockScale: number

  /** 全局圆角（px），影响面板/图标等 */
  cornerRadius: number

  /** 搜索引擎偏好 */
  searchEngine: SearchEngine
  /** 自定义搜索引擎 URL 模板，使用 {query} 作为占位符 */
  customSearchUrl: string
  /** 搜索历史显示条数，0 表示关闭，范围 0-20 */
  searchHistoryCount: number
  /** 搜索建议/历史每行高度（px），范围 32-56 */
  searchRowHeight: number
  /** 最近打开书签显示数量，范围 1-12 */
  recentBookmarksCount: number
  /** 是否显示最近打开书签 */
  recentBookmarksEnabled: boolean
  /** 最近打开显示模式：fixed=固定数量，dynamic=动态一行 */
  recentBookmarksMode: 'fixed' | 'dynamic'

  /** 书签页排序模式 */
  bookmarkDrawerSortMode: SortMode
  /** 是否锁定排序（禁止拖拽） */
  bookmarkSortLocked: boolean

  /** 搜索框流光边框是否启用 */
  searchGlowBorder: boolean
  /** 搜索框背后光效是否启用 */
  searchGlowLight: boolean
  /** 搜索框光效是否跟随线条移动 */
  searchGlowLightMove: boolean

  /** 移动端底部导航是否隐藏文字 */
  mobileNavHideText: boolean

  /** 首页布局模式：dynamic=动态挤压，fixed=固定位置 */
  homeLayoutMode: HomeLayoutMode
  /** 固定模式下时钟+搜索框的垂直位置（vh），范围 15-50 */
  homeFixedPosition: number

  setMode: (mode: ThemeMode) => void
  setAccent: (hex: string) => void
  setBackgroundType: (t: BackgroundType) => void
  setBackgroundCustomUrl: (url: string) => void
  toggleSidebar: () => void
  setSidebarExpanded: (expanded: boolean) => void
  setSidebarAutoHide: (v: boolean) => void
  setSidebarAutoHideDelay: (v: number) => void
  setSidebarClickKeepCollapsed: (v: boolean) => void
  setClockHourCycle: (v: ClockHourCycle) => void
  setClockShowSeconds: (v: boolean) => void
  setClockShowDate: (v: boolean) => void
  setClockFollowAccent: (v: boolean) => void
  setClockScale: (v: number) => void
  setCornerRadius: (px: number) => void
  setSearchEngine: (engine: SearchEngine) => void
  setCustomSearchUrl: (url: string) => void
  setSearchHistoryCount: (count: number) => void
  setSearchRowHeight: (height: number) => void
  setRecentBookmarksCount: (count: number) => void
  setRecentBookmarksEnabled: (enabled: boolean) => void
  setRecentBookmarksMode: (mode: 'fixed' | 'dynamic') => void
  setBookmarkDrawerSortMode: (mode: SortMode) => void
  setBookmarkSortLocked: (locked: boolean) => void
  setSearchGlowBorder: (enabled: boolean) => void
  setSearchGlowLight: (enabled: boolean) => void
  setSearchGlowLightMove: (enabled: boolean) => void
  setMobileNavHideText: (hide: boolean) => void
  setHomeLayoutMode: (mode: HomeLayoutMode) => void
  setHomeFixedPosition: (position: number) => void
  resetAppearance: () => void
}

const DEFAULTS: Pick<
  AppearanceState,
  | 'mode'
  | 'accent'
  | 'backgroundType'
  | 'backgroundCustomUrl'
  | 'sidebarExpanded'
  | 'sidebarAutoHide'
  | 'sidebarAutoHideDelay'
  | 'sidebarClickKeepCollapsed'
  | 'clockHourCycle'
  | 'clockShowSeconds'
  | 'clockShowDate'
  | 'clockFollowAccent'
  | 'clockScale'
  | 'cornerRadius'
  | 'searchEngine'
  | 'customSearchUrl'
  | 'searchHistoryCount'
  | 'searchRowHeight'
  | 'recentBookmarksCount'
  | 'recentBookmarksEnabled'
  | 'recentBookmarksMode'
  | 'bookmarkDrawerSortMode'
  | 'bookmarkSortLocked'
  | 'searchGlowBorder'
  | 'searchGlowLight'
  | 'searchGlowLightMove'
  | 'mobileNavHideText'
  | 'homeLayoutMode'
  | 'homeFixedPosition'
> = {
  mode: 'system',
  accent: '#3b82f6',
  backgroundType: 'bing',
  backgroundCustomUrl: '',
  sidebarExpanded: false,
  sidebarAutoHide: false,
  sidebarAutoHideDelay: 3,
  sidebarClickKeepCollapsed: true,
  clockHourCycle: '24',
  clockShowSeconds: true,
  clockShowDate: true,
  clockFollowAccent: false,
  clockScale: 100,
  cornerRadius: 18,
  searchEngine: 'bing',
  customSearchUrl: '',
  searchHistoryCount: 10,
  searchRowHeight: 40,
  recentBookmarksCount: 8,
  recentBookmarksEnabled: true,
  recentBookmarksMode: 'dynamic',
  bookmarkDrawerSortMode: 'custom',
  bookmarkSortLocked: false,
  searchGlowBorder: false,
  searchGlowLight: false,
  searchGlowLightMove: false,
  mobileNavHideText: false,
  homeLayoutMode: 'dynamic',
  homeFixedPosition: 30,
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setMode: (mode) => set({ mode }),
      setAccent: (accent) => set({ accent }),
      setBackgroundType: (backgroundType) => set({ backgroundType }),
      setBackgroundCustomUrl: (backgroundCustomUrl) =>
        set({ backgroundCustomUrl }),
      toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
      setSidebarExpanded: (sidebarExpanded) => set({ sidebarExpanded }),
      setSidebarAutoHide: (sidebarAutoHide) => set({ sidebarAutoHide }),
      setSidebarAutoHideDelay: (v) =>
        set({ sidebarAutoHideDelay: Math.max(1, Math.min(10, v)) }),
      setSidebarClickKeepCollapsed: (sidebarClickKeepCollapsed) => set({ sidebarClickKeepCollapsed }),
      setClockHourCycle: (clockHourCycle) => set({ clockHourCycle }),
      setClockShowSeconds: (clockShowSeconds) => set({ clockShowSeconds }),
      setClockShowDate: (clockShowDate) => set({ clockShowDate }),
      setClockFollowAccent: (clockFollowAccent) => set({ clockFollowAccent }),
      setClockScale: (v) =>
        set({ clockScale: Math.max(50, Math.min(150, v)) }),
      setCornerRadius: (cornerRadius) => set({ cornerRadius }),
      setSearchEngine: (searchEngine) => set({ searchEngine }),
      setCustomSearchUrl: (customSearchUrl) => set({ customSearchUrl }),
      setSearchHistoryCount: (v) =>
        set({ searchHistoryCount: Math.max(0, Math.min(20, v)) }),
      setSearchRowHeight: (v) =>
        set({ searchRowHeight: Math.max(32, Math.min(56, v)) }),
      setRecentBookmarksCount: (v) =>
        set({ recentBookmarksCount: Math.max(1, Math.min(12, v)) }),
      setRecentBookmarksEnabled: (recentBookmarksEnabled) => set({ recentBookmarksEnabled }),
      setRecentBookmarksMode: (recentBookmarksMode) => set({ recentBookmarksMode }),
      setBookmarkDrawerSortMode: (bookmarkDrawerSortMode) => set({ bookmarkDrawerSortMode }),
      setBookmarkSortLocked: (bookmarkSortLocked) => set({ bookmarkSortLocked }),
      setSearchGlowBorder: (searchGlowBorder) => set({ searchGlowBorder }),
      setSearchGlowLight: (searchGlowLight) => set({ searchGlowLight }),
      setSearchGlowLightMove: (searchGlowLightMove) => set({ searchGlowLightMove }),
      setMobileNavHideText: (mobileNavHideText) => set({ mobileNavHideText }),
      setHomeLayoutMode: (homeLayoutMode) => set({ homeLayoutMode }),
      setHomeFixedPosition: (v) =>
        set({ homeFixedPosition: Math.max(15, Math.min(50, v)) }),
      resetAppearance: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'start:appearance',
      version: 10,
      partialize: (s) => ({
        mode: s.mode,
        accent: s.accent,
        backgroundType: s.backgroundType,
        backgroundCustomUrl: s.backgroundCustomUrl,
        sidebarExpanded: s.sidebarExpanded,
        sidebarAutoHide: s.sidebarAutoHide,
        sidebarAutoHideDelay: s.sidebarAutoHideDelay,
        sidebarClickKeepCollapsed: s.sidebarClickKeepCollapsed,
        clockHourCycle: s.clockHourCycle,
        clockShowSeconds: s.clockShowSeconds,
        clockShowDate: s.clockShowDate,
        clockFollowAccent: s.clockFollowAccent,
        clockScale: s.clockScale,
        cornerRadius: s.cornerRadius,
        searchEngine: s.searchEngine,
        customSearchUrl: s.customSearchUrl,
        searchHistoryCount: s.searchHistoryCount,
        searchRowHeight: s.searchRowHeight,
        recentBookmarksCount: s.recentBookmarksCount,
        recentBookmarksEnabled: s.recentBookmarksEnabled,
        recentBookmarksMode: s.recentBookmarksMode,
        bookmarkDrawerSortMode: s.bookmarkDrawerSortMode,
        bookmarkSortLocked: s.bookmarkSortLocked,
        searchGlowBorder: s.searchGlowBorder,
        searchGlowLight: s.searchGlowLight,
        searchGlowLightMove: s.searchGlowLightMove,
        mobileNavHideText: s.mobileNavHideText,
        homeLayoutMode: s.homeLayoutMode,
        homeFixedPosition: s.homeFixedPosition,
      }),
    },
  ),
)



