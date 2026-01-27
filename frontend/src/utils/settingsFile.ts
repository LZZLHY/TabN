import { useAppearanceStore, type AppearanceState } from '../stores/appearance'
import { useBookmarkDndStore, type BookmarkDndState } from '../stores/bookmarkDnd'

/**
 * ========================================================================
 * 【重要备忘录】新增设置项时的维护清单
 * ========================================================================
 * 当在 appearance.ts 或 bookmarkDnd.ts 中添加新的设置项时，需要同步更新：
 * 
 * 1. 下方的 APPEARANCE_KEYS 数组 - 添加新的 key 名称
 * 2. applySettingsFile 函数中 - 添加对应的解析和验证逻辑
 * 
 * 这样设计的好处：
 * - createSettingsFile 会自动包含所有 APPEARANCE_KEYS 中的字段
 * - 类型系统会自动推断，无需手动维护 Pick 类型
 * ========================================================================
 */

// 定义需要导出/导入的 appearance 字段列表
// 【新增设置项时，只需在此数组添加 key 即可自动包含在导出文件中】
const APPEARANCE_KEYS = [
  'mode',
  'accent',
  'backgroundType',
  'backgroundCustomUrl',
  'sidebarExpanded',
  'sidebarAutoHide',
  'sidebarAutoHideDelay',
  'sidebarClickKeepCollapsed',
  'clockHourCycle',
  'clockShowSeconds',
  'clockShowDate',
  'clockFollowAccent',
  'clockScale',
  'cornerRadius',
  'searchEngine',
  'customSearchUrl',
  'searchHistoryCount',
  'searchRowHeight',
  'recentBookmarksCount',
  'recentBookmarksEnabled',
  'recentBookmarksMode',
  'searchGlowBorder',
  'searchGlowLight',
  'searchGlowLightMove',
  'searchDropdownOpacity',
  'searchDropdownBlur',
  'bookmarkDrawerSortMode',
  'bookmarkSortLocked',
  'mobileNavHideText',
  'homeFixedPosition',
] as const

type AppearanceKey = (typeof APPEARANCE_KEYS)[number]
type AppearanceExport = Pick<AppearanceState, AppearanceKey>

export type SettingsFileV1 = {
  version: 1
  exportedAt: string
  appearance: AppearanceExport
  bookmarkDnd?: Pick<BookmarkDndState, 'prePush' | 'pushAnimation' | 'dropAnimation'>
}

export type ApplySettingsResult =
  | { ok: true; partial: boolean; applied: string[]; skipped: string[]; message: string }
  | { ok: false; message: string }

export function createSettingsFile(): SettingsFileV1 {
  const s = useAppearanceStore.getState()
  const b = useBookmarkDndStore.getState()
  
  // 自动从 APPEARANCE_KEYS 构建 appearance 对象
  // 【新增设置项时，只需在 APPEARANCE_KEYS 数组添加 key，此处会自动包含】
  const appearance = {} as AppearanceExport
  for (const key of APPEARANCE_KEYS) {
    ;(appearance as Record<string, unknown>)[key] = s[key]
  }
  
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    appearance,
    bookmarkDnd: {
      prePush: b.prePush,
      pushAnimation: b.pushAnimation,
      dropAnimation: b.dropAnimation,
    },
  }
}

function isBool(v: unknown): v is boolean {
  return typeof v === 'boolean'
}

function isStr(v: unknown): v is string {
  return typeof v === 'string'
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function applySettingsFile(raw: unknown): ApplySettingsResult {
  if (!raw || typeof raw !== 'object') return { ok: false, message: '文件内容不是合法 JSON 对象' }

  // 兼容旧格式：
  // - v1: { version: 1, appearance: {...}, bookmarkDnd?: {...} }
  // - v0(无 version): { appearance: {...} } 或直接平铺 { mode/accent/... }
  const obj = raw as Record<string, unknown>
  const version = typeof obj.version === 'number' ? obj.version : 0

  const applied: string[] = []
  const skipped: string[] = []

  const currentA = useAppearanceStore.getState()
  const currentB = useBookmarkDndStore.getState()

  const appearanceRaw =
    obj.appearance && typeof obj.appearance === 'object'
      ? (obj.appearance as Record<string, unknown>)
      : (obj as Record<string, unknown>)

  const nextA: Partial<AppearanceState> = {}

  const mode = appearanceRaw.mode
  if (mode === 'system' || mode === 'light' || mode === 'dark') {
    nextA.mode = mode
    applied.push('外观/深色模式')
  } else if (typeof mode !== 'undefined') {
    skipped.push('外观/深色模式')
  }

  const accent = appearanceRaw.accent
  if (isStr(accent) && accent.trim()) {
    nextA.accent = accent.trim()
    applied.push('外观/主题色')
  } else if (typeof accent !== 'undefined') {
    skipped.push('外观/主题色')
  }

  const backgroundType = appearanceRaw.backgroundType
  if (backgroundType === 'bing' || backgroundType === 'custom') {
    nextA.backgroundType = backgroundType
    applied.push('外观/背景类型')
  } else if (typeof backgroundType !== 'undefined') {
    skipped.push('外观/背景类型')
  }

  const backgroundCustomUrl = appearanceRaw.backgroundCustomUrl
  if (isStr(backgroundCustomUrl)) {
    nextA.backgroundCustomUrl = backgroundCustomUrl
    applied.push('外观/自定义背景')
  } else if (typeof backgroundCustomUrl !== 'undefined') {
    skipped.push('外观/自定义背景')
  }

  const sidebarExpanded = appearanceRaw.sidebarExpanded
  if (isBool(sidebarExpanded)) {
    nextA.sidebarExpanded = sidebarExpanded
    applied.push('外观/侧边栏展开')
  } else if (typeof sidebarExpanded !== 'undefined') {
    skipped.push('外观/侧边栏展开')
  }

  const sidebarAutoHide = appearanceRaw.sidebarAutoHide
  if (isBool(sidebarAutoHide)) {
    nextA.sidebarAutoHide = sidebarAutoHide
    applied.push('外观/侧边栏自动隐藏')
  } else if (typeof sidebarAutoHide !== 'undefined') {
    skipped.push('外观/侧边栏自动隐藏')
  }

  const sidebarAutoHideDelay = appearanceRaw.sidebarAutoHideDelay
  if (isNum(sidebarAutoHideDelay) && sidebarAutoHideDelay >= 1 && sidebarAutoHideDelay <= 10) {
    nextA.sidebarAutoHideDelay = sidebarAutoHideDelay
    applied.push('外观/侧边栏隐藏延迟')
  } else if (typeof sidebarAutoHideDelay !== 'undefined') {
    skipped.push('外观/侧边栏隐藏延迟')
  }

  const sidebarClickKeepCollapsed = appearanceRaw.sidebarClickKeepCollapsed
  if (isBool(sidebarClickKeepCollapsed)) {
    nextA.sidebarClickKeepCollapsed = sidebarClickKeepCollapsed
    applied.push('外观/点击后保持收起')
  } else if (typeof sidebarClickKeepCollapsed !== 'undefined') {
    skipped.push('外观/点击后保持收起')
  }

  const clockHourCycle = appearanceRaw.clockHourCycle
  if (clockHourCycle === '12' || clockHourCycle === '24') {
    nextA.clockHourCycle = clockHourCycle
    applied.push('时钟/小时制')
  } else if (typeof clockHourCycle !== 'undefined') {
    skipped.push('时钟/小时制')
  }

  const clockShowSeconds = appearanceRaw.clockShowSeconds
  if (isBool(clockShowSeconds)) {
    nextA.clockShowSeconds = clockShowSeconds
    applied.push('时钟/秒')
  } else if (typeof clockShowSeconds !== 'undefined') {
    skipped.push('时钟/秒')
  }

  const clockShowDate = appearanceRaw.clockShowDate
  if (isBool(clockShowDate)) {
    nextA.clockShowDate = clockShowDate
    applied.push('时钟/日期')
  } else if (typeof clockShowDate !== 'undefined') {
    skipped.push('时钟/日期')
  }

  const clockFollowAccent = appearanceRaw.clockFollowAccent
  if (isBool(clockFollowAccent)) {
    nextA.clockFollowAccent = clockFollowAccent
    applied.push('时钟/跟随主题色')
  } else if (typeof clockFollowAccent !== 'undefined') {
    skipped.push('时钟/跟随主题色')
  }

  const clockScale = appearanceRaw.clockScale
  if (isNum(clockScale) && clockScale >= 50 && clockScale <= 150) {
    nextA.clockScale = clockScale
    applied.push('时钟/大小')
  } else if (typeof clockScale !== 'undefined') {
    skipped.push('时钟/大小')
  }

  // 兼容：旧文件可能没有 cornerRadius
  const cornerRadius = appearanceRaw.cornerRadius
  if (isNum(cornerRadius) && cornerRadius >= 0 && cornerRadius <= 48) {
    nextA.cornerRadius = cornerRadius
    applied.push('外观/圆角')
  } else if (typeof cornerRadius !== 'undefined') {
    skipped.push('外观/圆角')
  }

  // 搜索引擎设置
  const searchEngine = appearanceRaw.searchEngine
  if (searchEngine === 'baidu' || searchEngine === 'bing' || searchEngine === 'google' || searchEngine === 'custom') {
    nextA.searchEngine = searchEngine
    applied.push('搜索/搜索引擎')
  } else if (typeof searchEngine !== 'undefined') {
    skipped.push('搜索/搜索引擎')
  }

  const customSearchUrl = appearanceRaw.customSearchUrl
  if (isStr(customSearchUrl)) {
    nextA.customSearchUrl = customSearchUrl
    applied.push('搜索/自定义搜索URL')
  } else if (typeof customSearchUrl !== 'undefined') {
    skipped.push('搜索/自定义搜索URL')
  }

  const searchHistoryCount = appearanceRaw.searchHistoryCount
  if (isNum(searchHistoryCount) && searchHistoryCount >= 0 && searchHistoryCount <= 20) {
    nextA.searchHistoryCount = searchHistoryCount
    applied.push('搜索/历史条数')
  } else if (typeof searchHistoryCount !== 'undefined') {
    skipped.push('搜索/历史条数')
  }

  const searchRowHeight = appearanceRaw.searchRowHeight
  if (isNum(searchRowHeight) && searchRowHeight >= 16 && searchRowHeight <= 36) {
    nextA.searchRowHeight = searchRowHeight
    applied.push('搜索/选项行高')
  } else if (typeof searchRowHeight !== 'undefined') {
    skipped.push('搜索/选项行高')
  }

  const recentBookmarksCount = appearanceRaw.recentBookmarksCount
  if (isNum(recentBookmarksCount) && recentBookmarksCount >= 1 && recentBookmarksCount <= 12) {
    nextA.recentBookmarksCount = recentBookmarksCount
    applied.push('搜索/最近书签数量')
  } else if (typeof recentBookmarksCount !== 'undefined') {
    skipped.push('搜索/最近书签数量')
  }

  const recentBookmarksEnabled = appearanceRaw.recentBookmarksEnabled
  if (isBool(recentBookmarksEnabled)) {
    nextA.recentBookmarksEnabled = recentBookmarksEnabled
    applied.push('搜索/显示最近书签')
  } else if (typeof recentBookmarksEnabled !== 'undefined') {
    skipped.push('搜索/显示最近书签')
  }

  const recentBookmarksMode = appearanceRaw.recentBookmarksMode
  if (recentBookmarksMode === 'fixed' || recentBookmarksMode === 'dynamic') {
    nextA.recentBookmarksMode = recentBookmarksMode
    applied.push('搜索/最近书签模式')
  } else if (typeof recentBookmarksMode !== 'undefined') {
    skipped.push('搜索/最近书签模式')
  }

  const searchGlowBorder = appearanceRaw.searchGlowBorder
  if (isBool(searchGlowBorder)) {
    nextA.searchGlowBorder = searchGlowBorder
    applied.push('搜索/流光边框')
  } else if (typeof searchGlowBorder !== 'undefined') {
    skipped.push('搜索/流光边框')
  }

  const searchGlowLight = appearanceRaw.searchGlowLight
  if (isBool(searchGlowLight)) {
    nextA.searchGlowLight = searchGlowLight
    applied.push('搜索/背后光效')
  } else if (typeof searchGlowLight !== 'undefined') {
    skipped.push('搜索/背后光效')
  }

  const searchGlowLightMove = appearanceRaw.searchGlowLightMove
  if (isBool(searchGlowLightMove)) {
    nextA.searchGlowLightMove = searchGlowLightMove
    applied.push('搜索/光效跟随移动')
  } else if (typeof searchGlowLightMove !== 'undefined') {
    skipped.push('搜索/光效跟随移动')
  }

  const searchDropdownOpacity = appearanceRaw.searchDropdownOpacity
  if (isNum(searchDropdownOpacity) && searchDropdownOpacity >= 0 && searchDropdownOpacity <= 100) {
    nextA.searchDropdownOpacity = searchDropdownOpacity
    applied.push('搜索/建议框不透明度')
  } else if (typeof searchDropdownOpacity !== 'undefined') {
    skipped.push('搜索/建议框不透明度')
  }

  const searchDropdownBlur = appearanceRaw.searchDropdownBlur
  if (isNum(searchDropdownBlur) && searchDropdownBlur >= 0 && searchDropdownBlur <= 128) {
    nextA.searchDropdownBlur = searchDropdownBlur
    applied.push('搜索/建议框模糊度')
  } else if (typeof searchDropdownBlur !== 'undefined') {
    skipped.push('搜索/建议框模糊度')
  }

  // 书签排序设置
  const bookmarkDrawerSortMode = appearanceRaw.bookmarkDrawerSortMode
  if (bookmarkDrawerSortMode === 'custom' || bookmarkDrawerSortMode === 'folders-first' || bookmarkDrawerSortMode === 'links-first' || bookmarkDrawerSortMode === 'alphabetical' || bookmarkDrawerSortMode === 'click-count' || bookmarkDrawerSortMode === 'by-tag') {
    nextA.bookmarkDrawerSortMode = bookmarkDrawerSortMode
    applied.push('桌面/书签排序模式')
  } else if (typeof bookmarkDrawerSortMode !== 'undefined') {
    skipped.push('桌面/书签排序模式')
  }

  const bookmarkSortLocked = appearanceRaw.bookmarkSortLocked
  if (isBool(bookmarkSortLocked)) {
    nextA.bookmarkSortLocked = bookmarkSortLocked
    applied.push('桌面/排序锁定')
  } else if (typeof bookmarkSortLocked !== 'undefined') {
    skipped.push('桌面/排序锁定')
  }

  const mobileNavHideText = appearanceRaw.mobileNavHideText
  if (isBool(mobileNavHideText)) {
    nextA.mobileNavHideText = mobileNavHideText
    applied.push('移动端/隐藏导航文字')
  } else if (typeof mobileNavHideText !== 'undefined') {
    skipped.push('移动端/隐藏导航文字')
  }

  const homeFixedPosition = appearanceRaw.homeFixedPosition
  if (isNum(homeFixedPosition) && homeFixedPosition >= 15 && homeFixedPosition <= 50) {
    nextA.homeFixedPosition = homeFixedPosition
    applied.push('时钟/固定位置')
  } else if (typeof homeFixedPosition !== 'undefined') {
    skipped.push('时钟/固定位置')
  }

  // 至少要有一个可用字段，否则认为文件不兼容
  const hasAnyAppearance =
    Object.keys(nextA).length > 0 ||
    (version === 0 &&
      appearanceRaw &&
      typeof appearanceRaw === 'object' &&
      ('mode' in appearanceRaw ||
        'accent' in appearanceRaw ||
        'backgroundType' in appearanceRaw ||
        'clockHourCycle' in appearanceRaw))

  if (!hasAnyAppearance && !(obj.bookmarkDnd && typeof obj.bookmarkDnd === 'object')) {
    return { ok: false, message: '设置文件结构不兼容（无法识别可导入的字段）' }
  }

  // 应用外观：仅覆盖成功解析的字段，其它保留当前值
  if (Object.keys(nextA).length) {
    useAppearanceStore.setState({ ...currentA, ...nextA })
  }

  // v1 才有 bookmarkDnd；但也允许旧文件直接带 bookmarkDnd 字段
  const bd = obj.bookmarkDnd as Partial<BookmarkDndState> | undefined
  if (bd && typeof bd === 'object') {
    const nextB: Partial<BookmarkDndState> = {}
    if (isBool(bd.prePush)) {
      nextB.prePush = bd.prePush
      applied.push('桌面/预挤压')
    } else if (typeof bd.prePush !== 'undefined') {
      skipped.push('桌面/预挤压')
    }
    if (isBool(bd.pushAnimation)) {
      nextB.pushAnimation = bd.pushAnimation
      applied.push('桌面/挤压动画')
    } else if (typeof bd.pushAnimation !== 'undefined') {
      skipped.push('桌面/挤压动画')
    }
    if (isBool(bd.dropAnimation)) {
      nextB.dropAnimation = bd.dropAnimation
      applied.push('桌面/归位动画')
    } else if (typeof bd.dropAnimation !== 'undefined') {
      skipped.push('桌面/归位动画')
    }
    if (Object.keys(nextB).length) {
      useBookmarkDndStore.setState({ ...currentB, ...nextB })
    }
  }

  const partial = skipped.length > 0
  const message =
    applied.length === 0
      ? '未导入任何设置（文件字段不可用）'
      : partial
        ? `已部分导入设置（${applied.length} 项生效，${skipped.length} 项跳过）`
        : '设置已全部导入'

  return { ok: true, partial, applied, skipped, message }
}


