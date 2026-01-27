// 书签类型定义

export type BookmarkType = 'LINK' | 'FOLDER'

export type Bookmark = {
  id: string
  name: string
  url: string | null
  note: string | null
  type: BookmarkType
  parentId: string | null
  tags?: string[]
  iconUrl?: string | null
  iconData?: string | null
  iconType?: 'URL' | 'BASE64' | null
  iconBg?: string | null  // 图标背景：null/default=原始, transparent=透明, #RRGGBB=自定义颜色
  createdAt: string
  updatedAt: string
}

export type MenuState =
  | { open: false }
  | { open: true; x: number; y: number; item: Bookmark }

// 快捷栏最大行数
export const MAX_ROWS = 3

// 每行图标数量（根据屏幕宽度不同）
export const getItemsPerRow = () => {
  if (typeof window === 'undefined') return 8
  const width = window.innerWidth
  if (width >= 1280) return 8 // xl
  if (width >= 1024) return 7 // lg
  if (width >= 768) return 5  // md
  if (width >= 640) return 4  // sm
  return 4 // 移动端 4 个
}

// Dock 模式最大图标数
export const DOCK_MAX_ITEMS = 12

// 懒加载阈值
export const LAZY_LOAD_THRESHOLD = 50
