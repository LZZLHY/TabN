import { ErrorCode, ApiError, AUTH_ERROR_CODES, getErrorMessage } from '../utils/errors'

/** 成功响应类型 */
export type ApiOk<T> = { ok: true; data: T }

/** 失败响应类型 */
export type ApiFail = { 
  ok: false
  message: string
  code?: ErrorCode
  requestId?: string
  details?: Record<string, unknown>
}

/** API 响应联合类型 */
export type ApiResponse<T> = ApiOk<T> | ApiFail

/** 错误处理回调类型 */
export type ErrorHandler = (error: ApiFail) => void

/** 全局错误处理器 */
let globalErrorHandler: ErrorHandler | null = null

/** 认证失效回调 */
let authExpiredHandler: (() => void) | null = null

/**
 * 设置全局错误处理器
 * @param handler 错误处理回调函数
 */
export function setGlobalErrorHandler(handler: ErrorHandler): void {
  globalErrorHandler = handler
}

/**
 * 设置认证失效处理器
 * @param handler 认证失效时的回调函数
 */
export function setAuthExpiredHandler(handler: () => void): void {
  authExpiredHandler = handler
}

/**
 * 获取 API 基础 URL
 */
export function apiBase(): string {
  // 优先使用环境变量
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined
  if (v && v.trim()) return v.trim()
  
  // 自动使用当前访问的主机名（支持 IP 访问）
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  return `${protocol}//${hostname}:3100`
}

/** apiFetch 配置选项 */
export interface ApiFetchOptions extends RequestInit {
  /** 认证 token */
  token?: string
  /** 是否静默处理错误（不触发全局错误处理） */
  silent?: boolean
  /** 是否跳过认证失效检查 */
  skipAuthCheck?: boolean
}

/**
 * 统一 API 请求函数
 * 
 * @param path API 路径
 * @param init 请求配置
 * @returns API 响应
 */
export async function apiFetch<T>(
  path: string,
  init: ApiFetchOptions = {},
): Promise<ApiResponse<T>> {
  const { token, silent = false, skipAuthCheck = false, ...fetchInit } = init
  const url = `${apiBase()}${path}`
  const headers = new Headers(fetchInit.headers)
  headers.set('content-type', 'application/json')
  if (token) headers.set('authorization', `Bearer ${token}`)

  try {
    const res = await fetch(url, { ...fetchInit, headers })
    const text = await res.text()
    
    // 解析响应
    let json: ApiResponse<T>
    try {
      json = text 
        ? (JSON.parse(text) as ApiResponse<T>) 
        : { ok: false, message: '空响应', code: ErrorCode.UNKNOWN }
    } catch {
      json = { ok: false, message: '服务器响应格式错误', code: ErrorCode.UNKNOWN }
    }

    // 处理错误响应
    if (!json.ok) {
      const errorResponse = json as ApiFail
      
      // 检查认证失效
      if (!skipAuthCheck && errorResponse.code && AUTH_ERROR_CODES.includes(errorResponse.code)) {
        authExpiredHandler?.()
      }
      
      // 触发全局错误处理
      if (!silent && globalErrorHandler) {
        globalErrorHandler(errorResponse)
      }
    }

    return json
  } catch (e) {
    console.error('API Fetch Error:', e)
    
    const errorResponse: ApiFail = { 
      ok: false, 
      message: '网络请求失败，请检查服务器是否启动',
      code: ErrorCode.NETWORK_ERROR,
    }
    
    // 触发全局错误处理
    if (!silent && globalErrorHandler) {
      globalErrorHandler(errorResponse)
    }
    
    return errorResponse
  }
}

/**
 * 判断响应是否成功
 */
export function isApiOk<T>(response: ApiResponse<T>): response is ApiOk<T> {
  return response.ok === true
}

/**
 * 判断响应是否失败
 */
export function isApiFail<T>(response: ApiResponse<T>): response is ApiFail {
  return response.ok === false
}

/**
 * 从 API 响应获取错误消息
 */
export function getApiErrorMessage(response: ApiFail): string {
  return response.message || getErrorMessage(new ApiError(
    response.code || ErrorCode.UNKNOWN,
    response.message
  ))
}
