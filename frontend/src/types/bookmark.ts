/**
 * 书签排序模式
 * - custom: 自定义排序（用户拖拽的顺序）
 * - folders-first: 文件夹在前，链接在后
 * - links-first: 链接在前，文件夹在后
 * - alphabetical: 按名称字母排序（支持中文拼音）
 */
export type SortMode = 'custom' | 'folders-first' | 'links-first' | 'alphabetical'

/**
 * 书签上下文
 * - shortcut: 快捷栏（首页）
 * - drawer: 书签页（抽屉）
 */
export type BookmarkContext = 'shortcut' | 'drawer'

/**
 * 书签类型
 */
export type BookmarkType = 'LINK' | 'FOLDER'

/**
 * 用于排序的书签项
 */
export type BookmarkItem = {
  id: string
  name: string
  type: BookmarkType
}
