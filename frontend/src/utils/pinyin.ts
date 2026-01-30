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

/**
 * 获取匹配分数（用于排序）
 * 分数越高，匹配越优先
 * 
 * 分数规则：
 * - 100: 完全匹配（名称等于查询）
 * - 90: 首字母完全匹配（youtube 输入 y）
 * - 80: 名称开头匹配（youtube 输入 you）
 * - 70: 拼音开头匹配（中文名称的拼音首字母或全拼开头匹配）
 * - 50: 名称中间匹配（douyin 输入 y）
 * - 40: 拼音中间匹配
 * - 0: 不匹配
 * 
 * @param text 要匹配的文本
 * @param query 查询字符串
 * @returns 匹配分数
 */
export function getMatchScore(text: string, query: string): number {
  if (!text || !query) return 0
  
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase().trim()
  
  if (!queryLower) return 0
  
  // 完全匹配
  if (textLower === queryLower) {
    return 100
  }
  
  // 首字母完全匹配（单字符查询且匹配首字母）
  if (queryLower.length === 1 && textLower.startsWith(queryLower)) {
    return 90
  }
  
  // 名称开头匹配
  if (textLower.startsWith(queryLower)) {
    return 80
  }
  
  // 拼音开头匹配
  const pinyinFull = toPinyin(text).toLowerCase()
  const pinyinInitials = toPinyinInitials(text).toLowerCase()
  
  if (pinyinFull.startsWith(queryLower) || pinyinInitials.startsWith(queryLower)) {
    return 70
  }
  
  // 名称中间匹配
  if (textLower.includes(queryLower)) {
    return 50
  }
  
  // 拼音中间匹配
  if (pinyinFull.includes(queryLower) || pinyinInitials.includes(queryLower)) {
    return 40
  }
  
  // 使用 pinyin-pro 的 match 函数进行智能匹配（混合匹配等）
  const matchResult = match(text, queryLower, { continuous: true })
  if (matchResult && matchResult.length > 0) {
    return 30
  }
  
  return 0
}
