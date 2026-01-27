/**
 * 文件夹操作的统一排序逻辑
 * 解决创建/删除文件夹时的排序问题
 */

import { getOrder, saveOrder } from './orderStorage'
import type { BookmarkContext } from '../../types/bookmark'

/**
 * 获取文件夹内的子项并按保存的顺序排列
 * 用于文件夹图标预览等场景
 */
export function getSortedFolderChildren<T extends { id: string }>(
  children: T[],
  userId: string | undefined,
  folderId: string,
  context: BookmarkContext
): T[] {
  if (!userId || children.length === 0) return children
  
  const folderOrder = getOrder(userId, folderId, context)
  if (!folderOrder.length) return children
  
  const orderMap = new Map(folderOrder.map((id, i) => [id, i]))
  return [...children].sort((a, b) => {
    const ia = orderMap.get(a.id) ?? Infinity
    const ib = orderMap.get(b.id) ?? Infinity
    return ia - ib
  })
}

type FolderOperationArgs = {
  userId: string
  context: BookmarkContext
  parentId: string | null
}

/**
 * 创建文件夹后更新排序
 * @param baseItemId 目标书签 ID（被拖拽到的书签）
 * @param incomingItemId 拖拽的书签 ID
 * @param folderId 新创建的文件夹 ID
 * @param currentVisibleIds 当前的显示顺序（拖拽开始时的顺序）
 */
export function updateOrderAfterCreateFolder(
  args: FolderOperationArgs & {
    baseItemId: string
    incomingItemId: string
    folderId: string
    currentVisibleIds: string[]
  }
): string[] {
  const { userId, context, parentId, baseItemId, incomingItemId, folderId, currentVisibleIds } = args
  
  // 1. 保存文件夹内部顺序：目标(base)在前，拖拽项(incoming)在后
  saveOrder(userId, folderId, [baseItemId, incomingItemId], context)
  
  // 2. 计算父级的新顺序
  // 使用传入的当前显示顺序，而非从 localStorage 读取（避免 prePush 导致的位置偏移）
  const baseOrder = [...currentVisibleIds]
  const baseIdx = baseOrder.indexOf(baseItemId)
  
  // 在 baseItem 的位置替换为文件夹
  if (baseIdx !== -1) {
    baseOrder.splice(baseIdx, 1, folderId)
  } else {
    // 如果找不到 baseItem（不应该发生），尝试找 incomingItem 的位置
    const incomingIdx = baseOrder.indexOf(incomingItemId)
    if (incomingIdx !== -1) {
      baseOrder.splice(incomingIdx, 1, folderId)
    } else {
      // 都找不到，添加到末尾（兜底）
      baseOrder.push(folderId)
    }
  }
  
  // 移除 incomingItem（它已经在文件夹内了）
  const newOrder = baseOrder.filter(id => id !== incomingItemId)
  
  // 3. 保存父级顺序
  saveOrder(userId, parentId, newOrder, context)
  
  return newOrder
}

/**
 * 删除文件夹后更新排序
 * @param folderId 被删除的文件夹 ID
 * @param childIds 文件夹内的子项 ID（已按文件夹内部顺序排列）
 * @param currentVisibleIds 当前的显示顺序
 */
export function updateOrderAfterDeleteFolder(
  args: FolderOperationArgs & {
    folderId: string
    childIds: string[]
    currentVisibleIds: string[]
  }
): string[] {
  const { userId, context, parentId, folderId, childIds, currentVisibleIds } = args
  
  // 获取文件夹内部的排序
  const folderOrder = getOrder(userId, folderId, context)
  const childSet = new Set(childIds)
  
  // 按文件夹内部顺序排列子项
  const orderedChildren = [
    ...folderOrder.filter(id => childSet.has(id)),
    ...childIds.filter(id => !folderOrder.includes(id)),
  ]
  
  // 使用当前显示顺序找到文件夹的位置
  const baseOrder = [...currentVisibleIds]
  const folderIdx = baseOrder.indexOf(folderId)
  const insertIdx = folderIdx >= 0 ? folderIdx : baseOrder.length
  
  // 移除文件夹，并过滤掉可能已存在的子项
  const base = baseOrder.filter(id => id !== folderId && !childSet.has(id))
  const idx = Math.max(0, Math.min(insertIdx, base.length))
  
  // 在文件夹位置插入子项
  const newOrder = [
    ...base.slice(0, idx),
    ...orderedChildren,
    ...base.slice(idx),
  ]
  
  // 保存新顺序
  saveOrder(userId, parentId, newOrder, context)
  
  return newOrder
}

/**
 * 移动书签到文件夹后更新排序
 * @param itemId 被移动的书签 ID
 * @param targetFolderId 目标文件夹 ID
 * @param currentVisibleIds 当前的显示顺序
 */
export function updateOrderAfterMoveToFolder(
  args: FolderOperationArgs & {
    itemId: string
    targetFolderId: string
    currentVisibleIds: string[]
  }
): string[] {
  const { userId, context, parentId, itemId, targetFolderId, currentVisibleIds } = args
  
  // 1. 更新目标文件夹内部顺序（添加到末尾）
  const folderOrder = getOrder(userId, targetFolderId, context)
  if (!folderOrder.includes(itemId)) {
    saveOrder(userId, targetFolderId, [...folderOrder, itemId], context)
  }
  
  // 2. 从当前层级移除
  const newOrder = currentVisibleIds.filter(id => id !== itemId)
  saveOrder(userId, parentId, newOrder, context)
  
  return newOrder
}

/**
 * 获取下一个可用的文件夹名称
 * @param prefix 前缀，如 "收藏夹" 或 "新建文件夹"
 * @param existingNames 现有的文件夹名称列表
 * @returns 下一个可用的名称，如 "收藏夹1" 或 "新建文件夹2"
 */
export function getNextFolderName(prefix: string, existingNames: string[]): string {
  // 提取所有匹配前缀的数字
  const usedNumbers = new Set<number>()
  const regex = new RegExp(`^${prefix}(\\d+)$`)
  
  for (const name of existingNames) {
    const match = name.match(regex)
    if (match) {
      usedNumbers.add(parseInt(match[1], 10))
    }
  }
  
  // 找到最小可用数字（从1开始）
  let num = 1
  while (usedNumbers.has(num)) {
    num++
  }
  
  return `${prefix}${num}`
}
