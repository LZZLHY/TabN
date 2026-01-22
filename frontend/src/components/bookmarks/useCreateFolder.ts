/**
 * 创建文件夹的核心逻辑
 * 
 * 问题：创建文件夹后，文件夹会从列表末尾移动到正确位置，导致动画不连贯
 * 
 * 解决方案：
 * 1. 在 API 创建文件夹成功后，立即更新 visibleIds，将文件夹放在正确位置
 * 2. 同时更新 localStorage 中的顺序
 * 3. 然后再调用 load() 刷新数据
 * 4. load() 后 useLayoutEffect 会从 localStorage 读取顺序，此时顺序已经正确
 * 
 * 关键：在 load() 之前就把 visibleIds 设置成正确的顺序，这样 load() 后不会有位置变化
 */

import { saveOrder } from './orderStorage'
import type { BookmarkContext } from '../../types/bookmark'

export type CreateFolderArgs = {
  userId: string
  context: BookmarkContext
  parentId: string | null
  baseItemId: string      // 被叠加的图标 ID
  incomingItemId: string  // 拖拽的图标 ID
  folderId: string        // 新创建的文件夹 ID
  currentVisibleIds: string[]  // 当前的 visibleIds
}

/**
 * 创建文件夹后更新顺序
 * 
 * @returns 新的 visibleIds，文件夹在 baseItem 的位置
 */
export function getNewOrderAfterCreateFolder(args: CreateFolderArgs): string[] {
  const { userId, context, parentId, baseItemId, incomingItemId, folderId, currentVisibleIds } = args
  
  // 1. 保存文件夹内部顺序：目标(base)在前，拖拽项(incoming)在后
  saveOrder(userId, folderId, [baseItemId, incomingItemId], context)
  
  // 2. 计算新的 visibleIds
  // 找到 baseItem 的位置
  const baseIdx = currentVisibleIds.indexOf(baseItemId)
  
  // 创建新顺序：移除 baseItem 和 incomingItem，在 baseItem 位置插入文件夹
  const newOrder = currentVisibleIds.filter(id => id !== baseItemId && id !== incomingItemId)
  
  if (baseIdx !== -1) {
    // 在原 baseItem 位置插入文件夹
    const insertIdx = Math.min(baseIdx, newOrder.length)
    newOrder.splice(insertIdx, 0, folderId)
  } else {
    // 兜底：添加到末尾
    newOrder.push(folderId)
  }
  
  // 3. 保存到 localStorage
  saveOrder(userId, parentId, newOrder, context)
  
  return newOrder
}

/**
 * 创建文件夹的完整流程
 * 
 * 使用方法：
 * 1. 调用 API 创建文件夹
 * 2. 调用 API 移动书签到文件夹
 * 3. 调用此函数获取新的 visibleIds
 * 4. 立即调用 setVisibleIds(newOrder) 更新显示
 * 5. 最后调用 load() 刷新数据
 * 
 * 这样可以确保文件夹直接出现在正确位置，不会有从末尾移动的动画
 */
