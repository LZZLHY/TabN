/**
 * 书签排序模式
 * - custom: 自定义排序（用户拖拽的顺序）
 * - folders-first: 文件夹在前，链接在后
 * - links-first: 链接在前，文件夹在后
 * - alphabetical: 按名称字母排序（支持中文拼音）
 * - click-count: 按点击次数排序（降序，相同点击数按拼音排序）
 * - by-tag: 按标签分类排序（标签内按名称A-Z，标签间按标签名A-Z，无标签排最后）
 */
export type SortMode = 'custom' | 'folders-first' | 'links-first' | 'alphabetical' | 'click-count' | 'by-tag'

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
 * 图标类型
 * - URL: 图标为外部 URL
 * - BASE64: 图标为 Base64 编码的数据
 * - null: 无自定义图标
 */
export type IconType = 'URL' | 'BASE64' | null

/**
 * 用于排序的书签项
 */
export type BookmarkItem = {
  id: string
  name: string
  type: BookmarkType
}

/**
 * 完整的书签数据结构
 * 包含标签和图标扩展字段
 */
export interface Bookmark {
  id: string
  userId: string
  name: string
  url: string | null
  note: string | null
  type: BookmarkType
  parentId: string | null
  /** 书签标签数组 */
  tags: string[]
  /** 自定义图标 URL（当 iconType 为 'URL' 时使用） */
  iconUrl: string | null
  /** Base64 编码的图标数据（当 iconType 为 'BASE64' 时使用） */
  iconData: string | null
  /** 图标类型 */
  iconType: IconType
  createdAt: string
  updatedAt: string
}
