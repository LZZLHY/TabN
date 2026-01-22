/**
 * useApiError Hook 测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useApiError, showApiError, showSuccess } from './useApiError'
import { setGlobalErrorHandler, setAuthExpiredHandler, type ApiFail } from '../services/api'
import { ErrorCode } from '../utils/errors'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock auth store
const mockLogout = vi.fn()
vi.mock('../stores/auth', () => ({
  useAuthStore: vi.fn((selector) => selector({ logout: mockLogout })),
}))

// Mock api module
vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api')
  return {
    ...actual,
    setGlobalErrorHandler: vi.fn(),
    setAuthExpiredHandler: vi.fn(),
  }
})

import { toast } from 'sonner'

describe('useApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should set global error handler on mount', () => {
    renderHook(() => useApiError())
    
    expect(setGlobalErrorHandler).toHaveBeenCalledTimes(1)
    expect(setAuthExpiredHandler).toHaveBeenCalledTimes(1)
  })

  it('should not set handlers multiple times', () => {
    const { rerender } = renderHook(() => useApiError())
    rerender()
    rerender()
    
    // 只应该调用一次
    expect(setGlobalErrorHandler).toHaveBeenCalledTimes(1)
    expect(setAuthExpiredHandler).toHaveBeenCalledTimes(1)
  })
})

describe('showApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 清除错误缓存（通过等待足够长时间或重新导入模块）
  })

  it('should show error toast for generic errors', async () => {
    // 需要一些延迟来避免去重
    await new Promise(resolve => setTimeout(resolve, 3100))
    
    const error: ApiFail = {
      ok: false,
      message: 'Generic error',
      code: ErrorCode.UNKNOWN,
    }
    
    showApiError(error)
    
    expect(toast.error).toHaveBeenCalledWith('Generic error')
  })

  it('should show warning toast for validation errors', async () => {
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const error: ApiFail = {
      ok: false,
      message: 'Validation failed unique message',
      code: ErrorCode.VALIDATION,
    }
    
    showApiError(error)
    
    expect(toast.warning).toHaveBeenCalledWith('Validation failed unique message')
  })

  it('should show warning toast for auth errors', async () => {
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const error: ApiFail = {
      ok: false,
      message: 'Token expired unique message',
      code: ErrorCode.TOKEN_EXPIRED,
    }
    
    showApiError(error)
    
    expect(toast.warning).toHaveBeenCalledWith('Token expired unique message')
  })

  it('should accept string message', async () => {
    await new Promise(resolve => setTimeout(resolve, 100))
    
    showApiError('Simple error message unique')
    
    expect(toast.error).toHaveBeenCalledWith('Simple error message unique')
  })
})

describe('showSuccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show success toast', () => {
    showSuccess('Operation completed')
    
    expect(toast.success).toHaveBeenCalledWith('Operation completed')
  })
})
