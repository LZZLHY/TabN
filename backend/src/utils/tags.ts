/**
 * 标签验证和处理工具
 * Requirements: 1.5, 1.6, 1.7
 */

/** 标签验证规则 */
export const TagValidation = {
  /** 单个书签最多标签数 */
  maxTagsPerBookmark: 10,
  /** 单个标签最大长度 */
  maxTagLength: 20,
  /** 标签格式正则：中文、英文、数字、下划线、连字符 */
  pattern: /^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/,
} as const

/** 验证结果接口 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * 验证标签数组
 * @param tags 标签数组
 * @returns 验证结果
 * 
 * Requirements:
 * - 1.5: 自动去除空格（在 sanitizeTags 中处理）
 * - 1.6: 限制单个书签最多 10 个标签
 * - 1.7: 限制单个标签长度最多 20 个字符
 */
export function validateTags(tags: string[]): ValidationResult {
  const errors: string[] = []

  // 检查标签数量
  if (tags.length > TagValidation.maxTagsPerBookmark) {
    errors.push(`单个书签最多 ${TagValidation.maxTagsPerBookmark} 个标签`)
  }

  // 检查每个标签
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i]

    // 检查标签长度
    if (tag.length > TagValidation.maxTagLength) {
      errors.push(`标签 "${tag}" 长度不能超过 ${TagValidation.maxTagLength} 个字符`)
    }

    // 检查标签是否为空
    if (tag.length === 0) {
      errors.push('标签不能为空')
    }

    // 检查标签格式
    if (tag.length > 0 && !TagValidation.pattern.test(tag)) {
      errors.push(`标签 "${tag}" 只能包含中文、英文、数字、下划线和连字符`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 清理标签数组
 * - 去除每个标签的前导和尾随空格
 * - 去除重复标签
 * - 过滤空标签
 * 
 * @param tags 原始标签数组
 * @returns 清理后的标签数组
 * 
 * Requirements:
 * - 1.5: 自动去除空格
 */
export function sanitizeTags(tags: string[]): string[] {
  // 去除空格
  const trimmed = tags.map(tag => tag.trim())

  // 过滤空标签
  const nonEmpty = trimmed.filter(tag => tag.length > 0)

  // 去重（保持原始顺序）
  const unique = [...new Set(nonEmpty)]

  return unique
}

/**
 * 验证并清理标签
 * 先清理再验证，返回清理后的标签和验证结果
 * 
 * @param tags 原始标签数组
 * @returns 清理后的标签和验证结果
 */
export function validateAndSanitizeTags(tags: string[]): {
  tags: string[]
  validation: ValidationResult
} {
  const sanitized = sanitizeTags(tags)
  const validation = validateTags(sanitized)

  return {
    tags: sanitized,
    validation,
  }
}
