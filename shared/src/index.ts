/**
 * @start/shared - 前后端共享模块
 * 
 * 包含错误码、API 类型定义等共享内容
 * 单一源头，避免前后端手工同步
 */

// 导出错误相关
export {
  ErrorCode,
  AUTH_ERROR_CODES,
  ErrorHttpStatus,
  ErrorMessages,
  UserFriendlyMessages,
  isAuthErrorCode,
  isNetworkErrorCode,
  isServerErrorCode,
  getUserFriendlyMessage,
} from './errors'

// 导出 API 类型
export * from './types'
