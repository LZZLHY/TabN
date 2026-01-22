/**
 * 图标验证和处理工具
 * Requirements: 4.2, 4.5, 6.5
 */

/** 图标验证规则 */
export const IconValidation = {
  /** Base64 图标最大大小（字节） */
  maxBase64Size: 100 * 1024, // 100KB
  /** 允许的 MIME 类型 */
  allowedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/svg+xml',
    'image/webp',
  ] as const,
} as const

/** 图标类型 */
export type IconType = 'URL' | 'BASE64'

/** 图标数据接口 */
export interface IconData {
  type: IconType
  value: string
}

/** 验证结果接口 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * 验证图标 URL 格式
 * @param url 图标 URL
 * @returns 是否有效
 * 
 * Requirements:
 * - 4.2: 验证图标 URL 格式有效性
 */
export function validateIconUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }

  // 去除首尾空格
  const trimmedUrl = url.trim()

  if (trimmedUrl.length === 0) {
    return false
  }

  try {
    const parsedUrl = new URL(trimmedUrl)
    // 只允许 http 和 https 协议
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 解析 Base64 数据 URI
 * @param data Base64 数据字符串
 * @returns 解析结果，包含 MIME 类型和数据部分
 */
export function parseBase64DataUri(data: string): {
  mimeType: string | null
  base64Data: string | null
} {
  if (!data || typeof data !== 'string') {
    return { mimeType: null, base64Data: null }
  }

  // 匹配 data URI 格式: data:image/png;base64,xxxxx
  const dataUriRegex = /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9+.-]+);base64,(.+)$/
  const match = data.match(dataUriRegex)

  if (!match) {
    return { mimeType: null, base64Data: null }
  }

  return {
    mimeType: match[1],
    base64Data: match[2],
  }
}

/**
 * 验证 Base64 图标数据
 * @param data Base64 数据字符串（data URI 格式）
 * @returns 验证结果
 * 
 * Requirements:
 * - 4.5: 限制 Base64 图标数据最大 100KB
 * - 6.5: 验证图标数据格式
 */
export function validateBase64Icon(data: string): ValidationResult {
  const errors: string[] = []

  if (!data || typeof data !== 'string') {
    errors.push('图标数据不能为空')
    return { valid: false, errors }
  }

  // 去除首尾空格
  const trimmedData = data.trim()

  if (trimmedData.length === 0) {
    errors.push('图标数据不能为空')
    return { valid: false, errors }
  }

  // 解析 data URI
  const { mimeType, base64Data } = parseBase64DataUri(trimmedData)

  if (!mimeType || !base64Data) {
    errors.push('图标数据格式无效，需要 data URI 格式（如 data:image/png;base64,...）')
    return { valid: false, errors }
  }

  // 验证 MIME 类型
  if (!IconValidation.allowedMimeTypes.includes(mimeType as typeof IconValidation.allowedMimeTypes[number])) {
    errors.push(`不支持的图片格式 "${mimeType}"，支持的格式：${IconValidation.allowedMimeTypes.join(', ')}`)
  }

  // 验证 Base64 编码是否有效
  if (!isValidBase64(base64Data)) {
    errors.push('Base64 编码无效')
  }

  // 计算实际数据大小（Base64 解码后的字节数）
  // Base64 编码后的长度约为原始数据的 4/3 倍
  const estimatedSize = Math.ceil((base64Data.length * 3) / 4)

  if (estimatedSize > IconValidation.maxBase64Size) {
    const maxSizeKB = IconValidation.maxBase64Size / 1024
    const actualSizeKB = Math.ceil(estimatedSize / 1024)
    errors.push(`图标数据不能超过 ${maxSizeKB}KB，当前大小约 ${actualSizeKB}KB`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 验证 Base64 字符串是否有效
 * @param str Base64 字符串（不含 data URI 前缀）
 * @returns 是否有效
 */
export function isValidBase64(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false
  }

  // Base64 字符集：A-Z, a-z, 0-9, +, /, =（填充）
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/

  // 检查长度是否为 4 的倍数（考虑填充）
  if (str.length % 4 !== 0) {
    return false
  }

  return base64Regex.test(str)
}

/**
 * 验证图标数据（URL 或 Base64）
 * @param iconData 图标数据对象
 * @returns 验证结果
 * 
 * Requirements:
 * - 4.2: 验证图标 URL 格式有效性
 * - 4.5: 限制 Base64 图标数据最大 100KB
 * - 6.5: 验证图标数据格式
 */
export function validateIconData(iconData: IconData): ValidationResult {
  const errors: string[] = []

  if (!iconData || typeof iconData !== 'object') {
    errors.push('图标数据不能为空')
    return { valid: false, errors }
  }

  if (!iconData.type || !['URL', 'BASE64'].includes(iconData.type)) {
    errors.push('图标类型无效，必须是 "URL" 或 "BASE64"')
    return { valid: false, errors }
  }

  if (!iconData.value || typeof iconData.value !== 'string') {
    errors.push('图标值不能为空')
    return { valid: false, errors }
  }

  if (iconData.type === 'URL') {
    if (!validateIconUrl(iconData.value)) {
      errors.push('图标 URL 格式无效')
    }
  } else if (iconData.type === 'BASE64') {
    const base64Result = validateBase64Icon(iconData.value)
    if (!base64Result.valid) {
      errors.push(...base64Result.errors)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 获取 Base64 图标的 MIME 类型
 * @param data Base64 数据字符串
 * @returns MIME 类型或 null
 */
export function getBase64MimeType(data: string): string | null {
  const { mimeType } = parseBase64DataUri(data)
  return mimeType
}

/**
 * 获取 Base64 图标的估算大小（字节）
 * @param data Base64 数据字符串
 * @returns 估算大小或 0
 */
export function getBase64Size(data: string): number {
  const { base64Data } = parseBase64DataUri(data)
  if (!base64Data) {
    return 0
  }
  return Math.ceil((base64Data.length * 3) / 4)
}

/**
 * 将图标数据序列化为 JSON 字符串
 * @param icon 图标数据对象
 * @returns JSON 字符串
 * 
 * Requirements:
 * - 9.1: 将图标数据序列化为 JSON 格式
 * - 9.4: 在图标数据中包含类型标识
 */
export function serializeIcon(icon: IconData): string {
  if (!icon || typeof icon !== 'object') {
    throw new Error('图标数据不能为空')
  }

  if (!icon.type || !['URL', 'BASE64'].includes(icon.type)) {
    throw new Error('图标类型无效，必须是 "URL" 或 "BASE64"')
  }

  if (icon.value === undefined || icon.value === null) {
    throw new Error('图标值不能为空')
  }

  return JSON.stringify({
    type: icon.type,
    value: icon.value,
  })
}

/**
 * 将 JSON 字符串反序列化为图标数据对象
 * @param json JSON 字符串
 * @returns 图标数据对象
 * 
 * Requirements:
 * - 9.2: 将 JSON 数据反序列化为图标对象
 * - 9.3: 序列化后再反序列化应产生等价的对象（往返一致性）
 */
export function deserializeIcon(json: string): IconData {
  if (!json || typeof json !== 'string') {
    throw new Error('JSON 字符串不能为空')
  }

  const trimmedJson = json.trim()
  if (trimmedJson.length === 0) {
    throw new Error('JSON 字符串不能为空')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmedJson)
  } catch {
    throw new Error('JSON 格式无效')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON 数据必须是对象')
  }

  const obj = parsed as Record<string, unknown>

  if (!obj.type || !['URL', 'BASE64'].includes(obj.type as string)) {
    throw new Error('图标类型无效，必须是 "URL" 或 "BASE64"')
  }

  if (obj.value === undefined || obj.value === null || typeof obj.value !== 'string') {
    throw new Error('图标值必须是字符串')
  }

  return {
    type: obj.type as IconType,
    value: obj.value,
  }
}
