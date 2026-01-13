/**
 * 敏感数据脱敏工具
 * Requirements: 2.5
 */

/** 敏感字段列表（不区分大小写） */
export const SENSITIVE_FIELDS = [
  'password',
  'token',
  'authorization',
  'secret',
  'apikey',
  'api_key',
  'api-key',
  'accesstoken',
  'access_token',
  'access-token',
  'refreshtoken',
  'refresh_token',
  'refresh-token',
  'credential',
  'private_key',
  'privatekey',
  'private-key',
] as const

/** 脱敏后的替换值 */
export const REDACTED = '[REDACTED]'

/** 检查字段名是否为敏感字段 */
export function isSensitiveField(fieldName: string): boolean {
  // 移除连字符和下划线，转为小写进行比较
  const normalized = fieldName.toLowerCase().replace(/[-_]/g, '')
  
  // 精确匹配的敏感字段
  const exactSensitiveFields = [
    'password',
    'passwd',
    'secret',
    'credential',
    'credentials',
    'authorization',
    'apikey',
    'privatekey',
    'token',
    'accesstoken',
    'refreshtoken',
    'authtoken',
    'bearertoken',
    'idtoken',
    'jwttoken',
  ]
  
  // 检查精确匹配
  if (exactSensitiveFields.includes(normalized)) {
    return true
  }
  
  // 检查是否包含敏感关键词（用于处理如 userPassword, passwordHash, x-api-key 等）
  const sensitiveKeywords = [
    'password',
    'passwd',
    'secret',
    'apikey',
    'privatekey',
    'accesstoken',
    'refreshtoken',
  ]
  
  for (const keyword of sensitiveKeywords) {
    if (normalized.includes(keyword)) {
      return true
    }
  }
  
  // 检查以 token 结尾但不是 tokens（复数形式通常是数组名）
  if (normalized.endsWith('token') && !normalized.endsWith('tokens')) {
    return true
  }
  
  return false
}

/** 深度克隆并脱敏对象 */
export function sanitizeObject<T>(obj: T, maxDepth: number = 10): T {
  return sanitizeValue(obj, 0, maxDepth) as T
}

/** 递归脱敏值 */
function sanitizeValue(value: unknown, depth: number, maxDepth: number): unknown {
  // 防止无限递归
  if (depth > maxDepth) {
    return '[MAX_DEPTH_EXCEEDED]'
  }

  // null 或 undefined
  if (value === null || value === undefined) {
    return value
  }

  // 基本类型直接返回
  if (typeof value !== 'object') {
    return value
  }

  // 数组 - 递归处理每个元素
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, depth + 1, maxDepth))
  }

  // Date 对象
  if (value instanceof Date) {
    return value
  }

  // 普通对象
  const result: Record<string, unknown> = {}
  
  for (const key of Object.keys(value as Record<string, unknown>)) {
    // 跳过原型链上的特殊属性
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue
    }
    
    const val = (value as Record<string, unknown>)[key]
    
    if (isSensitiveField(key)) {
      // 敏感字段脱敏
      result[key] = REDACTED
    } else if (typeof val === 'object' && val !== null) {
      // 递归处理嵌套对象
      result[key] = sanitizeValue(val, depth + 1, maxDepth)
    } else {
      result[key] = val
    }
  }

  return result
}

/** 脱敏 HTTP headers */
export function sanitizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {}
  
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue
    }
    
    if (isSensitiveField(key)) {
      result[key] = REDACTED
    } else {
      result[key] = value
    }
  }
  
  return result
}

/** 脱敏 URL 查询参数 */
export function sanitizeQuery(query: Record<string, unknown>): Record<string, unknown> {
  return sanitizeObject(query)
}

/** 脱敏请求体 */
export function sanitizeBody(body: unknown): unknown {
  if (body === null || body === undefined) {
    return body
  }
  
  if (typeof body === 'string') {
    // 尝试解析 JSON
    try {
      const parsed = JSON.parse(body)
      return JSON.stringify(sanitizeObject(parsed))
    } catch {
      // 非 JSON 字符串，检查是否包含敏感信息
      return body
    }
  }
  
  return sanitizeObject(body)
}

/** 截断过长的字符串 */
export function truncateString(str: string, maxLength: number = 1000): string {
  if (str.length <= maxLength) {
    return str
  }
  return str.slice(0, maxLength) + `... [truncated, total ${str.length} chars]`
}

/** 脱敏并截断请求体 */
export function sanitizeAndTruncateBody(body: unknown, maxLength: number = 10000): unknown {
  const sanitized = sanitizeBody(body)
  
  if (typeof sanitized === 'string') {
    return truncateString(sanitized, maxLength)
  }
  
  // 对象转 JSON 后截断
  const json = JSON.stringify(sanitized)
  if (json.length > maxLength) {
    return truncateString(json, maxLength)
  }
  
  return sanitized
}
