/**
 * 全局更新状态管理
 * 用于在更新过程中通知 ErrorBoundary 不要显示错误页面
 */

import { create } from 'zustand'

interface UpdateStateStore {
  /** 是否正在更新/重启中 */
  isUpdating: boolean
  /** 更新消息 */
  message: string
  /** 设置更新状态 */
  setUpdating: (isUpdating: boolean, message?: string) => void
}

export const useUpdateStateStore = create<UpdateStateStore>((set) => ({
  isUpdating: false,
  message: '正在更新，请稍候...',
  setUpdating: (isUpdating, message = '正在更新，请稍候...') => 
    set({ isUpdating, message }),
}))

/** 直接获取更新状态（供非 React 组件使用） */
export const getUpdateState = () => useUpdateStateStore.getState()
