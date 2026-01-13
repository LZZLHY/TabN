import { pinyin, match } from 'pinyin-pro'

/**
 * 将中文转换为拼音（全拼，无声调，小写）
 * @param text 中文文本
 * @returns 拼音字符串（空格分隔）
 */
export function toPinyin(text: string): string {
  if (!text) return ''
  return pinyin(text, { toneType: 'none', type: 'array' }).join('')
}

/**
 * 将中文转换为拼音首字母
 * @param text 中文文本
 * @returns 拼音首字母字符串
 */
export function toPinyinInitials(text: string): string {
  if (!text) return ''
  return pinyin(text, { pattern: 'first', toneType: 'none', type: 'array' }).join('')
}

/**
 * 检查查询是否匹配文本（支持拼音匹配）
 * 匹配规则：
 * 1. 原文包含查询（大小写不敏感）
 * 2. 拼音全拼包含查询
 * 3. 拼音首字母包含查询
 * 
 * @param text 要匹配的文本
 * @param query 查询字符串
 * @returns 是否匹配
 */
export function matchWithPinyin(text: string, query: string): boolean {
  if (!text || !query) return false
  
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase().trim()
  
  if (!queryLower) return false
  
  // 1. 原文直接匹配
  if (textLower.includes(queryLower)) {
    return true
  }
  
  // 2. 使用 pinyin-pro 的 match 函数进行智能匹配
  // match 函数支持拼音全拼、首字母、混合匹配
  const matchResult = match(text, queryLower, { continuous: true })
  if (matchResult && matchResult.length > 0) {
    return true
  }
  
  return false
}
