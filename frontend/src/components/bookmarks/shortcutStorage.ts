/**
 * 快捷方式集合存储模块
 * 管理用户选择添加到快捷栏的书签 ID 集合
 */

/**
 * 生成快捷方式集合的存储键
 */
export function shortcutStorageKey(userId: string): string {
  return `start:shortcutSet:${userId}`
}

/**
 * 获取快捷方式 ID 集合
 */
export function getShortcutSet(userId: string): string[] {
  try {
    const raw = localStorage.getItem(shortcutStorageKey(userId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * 保存快捷方式 ID 集合
 */
export function saveShortcutSet(userId: string, ids: string[]): void {
  localStorage.setItem(shortcutStorageKey(userId), JSON.stringify(ids))
}

/**
 * 添加快捷方式（幂等操作）
 */
export function addToShortcutSet(userId: string, id: string): void {
  const current = getShortcutSet(userId)
  if (!current.includes(id)) {
    saveShortcutSet(userId, [...current, id])
  }
}

/**
 * 移除快捷方式
 */
export function removeFromShortcutSet(userId: string, id: string): void {
  const current = getShortcutSet(userId)
  saveShortcutSet(userId, current.filter(x => x !== id))
}

/**
 * 清理无效 ID（书签已删除的情况）
 * @returns 清理后的有效 ID 列表
 */
export function cleanupShortcutSet(userId: string, validIds: string[]): string[] {
  const current = getShortcutSet(userId)
  const validSet = new Set(validIds)
  const cleaned = current.filter(id => validSet.has(id))
  if (cleaned.length !== current.length) {
    saveShortcutSet(userId, cleaned)
  }
  return cleaned
}
