/**
 * 共享错误码定义
 * 单一源头，前后端共同引用
 */

/** 错误码枚举 */
export enum ErrorCode {
  // 通用错误 (1xxx)
  UNKNOWN = 1000,
  VALIDATION = 1001,
  NOT_FOUND = 1002,
  CONFLICT = 1003,
  
  // 认证错误 (2xxx)
  UNAUTHORIZED = 2001,
  TOKEN_EXPIRED = 2002,
  TOKEN_INVALID = 2003,
  FORBIDDEN = 2004,
  
  // 数据库错误 (3xxx)
  DATABASE_ERROR = 3001,
  UNIQUE_CONSTRAINT = 3002,
  FOREIGN_KEY_CONSTRAINT = 3003,
  
  // 业务错误 (4xxx)
  USER_NOT_FOUND = 4001,
  BOOKMARK_NOT_FOUND = 4002,
  FOLDER_NOT_FOUND = 4003,
  PASSWORD_INCORRECT = 4004,
  ACCOUNT_OCCUPIED = 4005,
  DUPLICATE_BOOKMARK = 4006,
  
  // 服务器错误 (5xxx)
  INTERNAL_ERROR = 5001,
  SERVICE_UNAVAILABLE = 5002,
  NETWORK_ERROR = 5003,
}

/** 需要重新登录的错误码 */
export const AUTH_ERROR_CODES: readonly ErrorCode[] = [
  ErrorCode.UNAUTHORIZED,
  ErrorCode.TOKEN_EXPIRED,
  ErrorCode.TOKEN_INVALID,
]

/** 错误码对应的 HTTP 状态码映射 */
export const ErrorHttpStatus: Record<ErrorCode, number> = {
  [ErrorCode.UNKNOWN]: 500,
  [ErrorCode.VALIDATION]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.TOKEN_INVALID]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.UNIQUE_CONSTRAINT]: 409,
  [ErrorCode.FOREIGN_KEY_CONSTRAINT]: 400,
  
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.BOOKMARK_NOT_FOUND]: 404,
  [ErrorCode.FOLDER_NOT_FOUND]: 404,
  [ErrorCode.PASSWORD_INCORRECT]: 401,
  [ErrorCode.ACCOUNT_OCCUPIED]: 409,
  [ErrorCode.DUPLICATE_BOOKMARK]: 409,
  
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.NETWORK_ERROR]: 502,
}

/** 错误码对应的默认消息（中文） */
export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.UNKNOWN]: '未知错误',
  [ErrorCode.VALIDATION]: '参数验证失败',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.CONFLICT]: '资源冲突',
  
  [ErrorCode.UNAUTHORIZED]: '未登录',
  [ErrorCode.TOKEN_EXPIRED]: '登录已过期',
  [ErrorCode.TOKEN_INVALID]: '登录态无效',
  [ErrorCode.FORBIDDEN]: '无权限访问',
  
  [ErrorCode.DATABASE_ERROR]: '数据库错误',
  [ErrorCode.UNIQUE_CONSTRAINT]: '数据已存在',
  [ErrorCode.FOREIGN_KEY_CONSTRAINT]: '关联数据不存在',
  
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.BOOKMARK_NOT_FOUND]: '书签不存在',
  [ErrorCode.FOLDER_NOT_FOUND]: '文件夹不存在',
  [ErrorCode.PASSWORD_INCORRECT]: '密码错误',
  [ErrorCode.ACCOUNT_OCCUPIED]: '账号/邮箱/手机号已被占用',
  [ErrorCode.DUPLICATE_BOOKMARK]: '书签已存在',
  
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服务暂不可用',
  [ErrorCode.NETWORK_ERROR]: '网络错误',
}

/** 用户友好的错误消息（前端使用） */
export const UserFriendlyMessages: Record<ErrorCode, string> = {
  [ErrorCode.UNKNOWN]: '发生未知错误，请稍后重试',
  [ErrorCode.VALIDATION]: '输入数据有误，请检查后重试',
  [ErrorCode.NOT_FOUND]: '请求的资源不存在',
  [ErrorCode.CONFLICT]: '数据冲突，请刷新后重试',
  
  [ErrorCode.UNAUTHORIZED]: '请先登录',
  [ErrorCode.TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [ErrorCode.TOKEN_INVALID]: '登录状态无效，请重新登录',
  [ErrorCode.FORBIDDEN]: '没有权限执行此操作',
  
  [ErrorCode.DATABASE_ERROR]: '服务器数据处理出错',
  [ErrorCode.UNIQUE_CONSTRAINT]: '数据已存在，请勿重复添加',
  [ErrorCode.FOREIGN_KEY_CONSTRAINT]: '关联数据不存在',
  
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.BOOKMARK_NOT_FOUND]: '书签不存在',
  [ErrorCode.FOLDER_NOT_FOUND]: '文件夹不存在',
  [ErrorCode.PASSWORD_INCORRECT]: '密码错误',
  [ErrorCode.ACCOUNT_OCCUPIED]: '账号/邮箱/手机号已被占用',
  [ErrorCode.DUPLICATE_BOOKMARK]: '该网址已添加过书签',
  
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误，请稍后重试',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用，请稍后重试',
  [ErrorCode.NETWORK_ERROR]: '网络连接失败，请检查网络',
}

/** 判断是否为认证错误 */
export function isAuthErrorCode(code: ErrorCode): boolean {
  return AUTH_ERROR_CODES.includes(code)
}

/** 判断是否为网络错误 */
export function isNetworkErrorCode(code: ErrorCode): boolean {
  return code === ErrorCode.NETWORK_ERROR
}

/** 判断是否为服务器错误 */
export function isServerErrorCode(code: ErrorCode): boolean {
  return code >= 5000 && code < 6000
}

/** 获取用户友好的错误消息 */
export function getUserFriendlyMessage(code: ErrorCode): string {
  return UserFriendlyMessages[code] || ErrorMessages[code] || '发生错误，请稍后重试'
}
