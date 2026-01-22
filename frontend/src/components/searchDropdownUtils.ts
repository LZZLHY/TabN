import type { DropdownItem } from './SearchDropdown'

interface ShortcutMatch {
  id: string
  name: string
  url: string
  favicon: string
}

interface RecentBookmark {
  id: string
  name: string
  url: string
  favicon: string | null
}

/**
 * 获取所有项目的扁平列表（用于键盘导航）
 */
export function getAllDropdownItems(
  shortcuts: ShortcutMatch[],
  suggestions: string[],
  history: string[],
  recentBookmarks: RecentBookmark[] = []
): DropdownItem[] {
  return [
    ...recentBookmarks.map((b) => ({ type: 'recent' as const, ...b })),
    ...shortcuts.map((s) => ({ type: 'shortcut' as const, ...s })),
    ...suggestions.map((text) => ({ type: 'suggestion' as const, text })),
    ...history.map((text) => ({ type: 'history' as const, text })),
  ]
}
