/**
 * 图标预设验证工具函数
 * Requirements: 2.2, 2.3, 8.1, 8.2, 8.3, 8.4
 */

/** 预设名称最大长度 */
export const PRESET_NAME_MAX_LENGTH = 50

/** 每用户最大预设数量 */
export const MAX_PRESETS_PER_USER = 8

/** 有效的图标类型 */
export const VALID_ICON_TYPES = ['URL', 'BASE64', 'TEXT', null] as const
export type ValidIconType = typeof VALID_ICON_TYPES[number]

/** iconBg 格式正则表达式 */
const ICON_BG_PATTERNS = {
  hex: /^#[0-9A-Fa-f]{6}$/,
  default: /^default(:(primary|blur:\d+))*$/,
  transparent: /^transparent$/,
}

/**
 * 验证预设名称
 * @returns 错误消息，如果有效则返回 null
 */
export function validatePresetName(name: unknown): string | null {
  if (typeof name !== 'string') {
    return 'Preset name must be a string'
  }
  
  const trimmed = name.trim()
  
  if (trimmed.length === 0) {
    return 'Preset name cannot be empty'
  }
  
  if (trimmed.length > PRESET_NAME_MAX_LENGTH) {
    return `Preset name cannot exceed ${PRESET_NAME_MAX_LENGTH} characters`
  }
  
  return null
}

/**
 * 清理预设名称（去除首尾空格，防止 XSS）
 */
export function sanitizePresetName(name: string): string {
  return name
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * 验证图标类型
 * @returns 错误消息，如果有效则返回 null
 */
export function validateIconType(iconType: unknown): string | null {
  if (iconType === null || iconType === undefined) {
    return null
  }
  
  if (typeof iconType !== 'string') {
    return 'Icon type must be a string or null'
  }
  
  if (!['URL', 'BASE64', 'TEXT'].includes(iconType)) {
    return 'Icon type must be URL, BASE64, TEXT, or null'
  }
  
  return null
}

/**
 * 验证图标背景格式
 * @returns 错误消息，如果有效则返回 null
 */
export function validateIconBg(iconBg: unknown): string | null {
  if (iconBg === null || iconBg === undefined) {
    return null
  }
  
  if (typeof iconBg !== 'string') {
    return 'Icon background must be a string or null'
  }
  
  // 检查是否匹配任一有效格式
  if (
    ICON_BG_PATTERNS.hex.test(iconBg) ||
    ICON_BG_PATTERNS.default.test(iconBg) ||
    ICON_BG_PATTERNS.transparent.test(iconBg)
  ) {
    return null
  }
  
  return 'Icon background must be null, transparent, default, default:primary, default:blur:N, or #RRGGBB format'
}

/**
 * 验证完整的预设数据
 * @returns 错误消息数组，如果全部有效则返回空数组
 */
export function validatePresetData(data: {
  name?: unknown
  iconType?: unknown
  iconBg?: unknown
}): string[] {
  const errors: string[] = []
  
  const nameError = validatePresetName(data.name)
  if (nameError) {
    errors.push(nameError)
  }
  
  const iconTypeError = validateIconType(data.iconType)
  if (iconTypeError) {
    errors.push(iconTypeError)
  }
  
  const iconBgError = validateIconBg(data.iconBg)
  if (iconBgError) {
    errors.push(iconBgError)
  }
  
  return errors
}
