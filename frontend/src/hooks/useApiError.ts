/**
 * useApiError Hook
 * 
 * 统一处理 API 错误，显示 toast 通知
 */

import { useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { 
  setGlobalErrorHandler, 
  setAuthExpiredHandler, 
  type ApiFail 
} from '../services/api'
import { useAuthStore } from '../stores/auth'
import { ErrorCode, AUTH_ERROR_CODES } from '../utils/errors'

/** 错误消息去重时间窗口（毫秒） */
const DEDUPE_WINDOW = 3000

/** 错误消息缓存 */
const errorCache = new Map<string, number>()

/**
 * 检查是否为重复错误消息
 */
function isDuplicateError(message: string): boolean {
  const now = Date.now()
  const lastTime = errorCache.get(message)
  
  if (lastTime && now - lastTime < DEDUPE_WINDOW) {
    return true
  }
  
  errorCache.set(message, now)
  return false
}

/**
 * 根据错误码获取 toast 类型
 */
function getToastType(code?: ErrorCode): 'error' | 'warning' | 'info' {
  if (!code) return 'error'
  
  // 认证错误使用 warning
  if (AUTH_ERROR_CODES.includes(code)) {
    return 'warning'
  }
  
  // 验证错误使用 warning
  if (code === ErrorCode.VALIDATION) {
    return 'warning'
  }
  
  // 服务器错误使用 error
  if (code >= 5000) {
    return 'error'
  }
  
  return 'error'
}

/**
 * API 错误处理配置
 */
export interface UseApiErrorOptions {
  /** 是否显示 toast 通知，默认 true */
  showToast?: boolean
  /** 认证失效时是否自动登出，默认 true */
  autoLogout?: boolean
  /** 认证失效时是否显示提示，默认 true */
  showAuthExpiredToast?: boolean
}

/**
 * 统一 API 错误处理 Hook
 * 
 * 在应用根组件中使用一次即可，会自动设置全局错误处理器
 * 
 * @example
 * function App() {
 *   useApiError()
 *   return <RouterProvider router={router} />
 * }
 */
export function useApiError(options: UseApiErrorOptions = {}): void {
  const { 
    showToast = true, 
    autoLogout = true,
    showAuthExpiredToast = true,
  } = options
  
  const logout = useAuthStore((s) => s.logout)
  const hasSetup = useRef(false)

  // 错误处理回调
  const handleError = useCallback((error: ApiFail) => {
    // 跳过重复错误
    if (isDuplicateError(error.message)) {
      return
    }
    
    // 显示 toast 通知
    if (showToast) {
      const toastType = getToastType(error.code)
      
      switch (toastType) {
        case 'warning':
          toast.warning(error.message)
          break
        case 'info':
          toast.info(error.message)
          break
        default:
          toast.error(error.message)
      }
    }
  }, [showToast])

  // 认证失效处理回调
  const handleAuthExpired = useCallback(() => {
    if (showAuthExpiredToast && !isDuplicateError('登录已过期，请重新登录')) {
      toast.warning('登录已过期，请重新登录')
    }
    
    if (autoLogout) {
      logout()
    }
  }, [autoLogout, showAuthExpiredToast, logout])

  // 设置全局处理器（只执行一次）
  useEffect(() => {
    if (hasSetup.current) return
    hasSetup.current = true
    
    setGlobalErrorHandler(handleError)
    setAuthExpiredHandler(handleAuthExpired)
  }, [handleError, handleAuthExpired])
}

/**
 * 手动显示 API 错误 toast
 * 
 * 用于需要手动控制错误显示的场景
 */
export function showApiError(error: ApiFail | string): void {
  const message = typeof error === 'string' ? error : error.message
  const code = typeof error === 'string' ? undefined : error.code
  
  if (isDuplicateError(message)) {
    return
  }
  
  const toastType = getToastType(code)
  
  switch (toastType) {
    case 'warning':
      toast.warning(message)
      break
    case 'info':
      toast.info(message)
      break
    default:
      toast.error(message)
  }
}

/**
 * 显示成功 toast
 */
export function showSuccess(message: string): void {
  toast.success(message)
}
