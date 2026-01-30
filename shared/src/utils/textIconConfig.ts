/**
 * 文字图标配置序列化工具
 * 提供配置的序列化、反序列化和默认文字提取功能
 */

import { TextIconConfig, isValidTextIconFont, isValidTextIconLayout, DEFAULT_TEXT_ICON_CONFIG } from '../types/textIcon'

/**
 * 序列化后的配置格式（使用短键名减少存储空间）
 */
interface SerializedTextIconConfig {
  /** text */
  t: string
  /** color */
  c: string
  /** fontFamily */
  f: string
  /** fontSize */
  s?: number
  /** layout */
  l?: string
}

/**
 * 序列化文字图标配置为 JSON 字符串
 * 使用短键名 (t, c, f, s, l) 减少存储空间
 * 
 * @param config 文字图标配置
 * @returns JSON 字符串
 * 
 * @example
 * serializeTextIconConfig({ text: 'A', color: '#FF5733', fontFamily: 'system', fontSize: 50, layout: 'auto' })
 * // => '{"t":"A","c":"#FF5733","f":"system","s":50,"l":"auto"}'
 */
export function serializeTextIconConfig(config: TextIconConfig): string {
  const serialized: SerializedTextIconConfig = {
    t: config.text,
    c: config.color,
    f: config.fontFamily,
  }
  
  // 只在非默认值时添加可选字段
  if (config.fontSize !== undefined && config.fontSize !== 50) {
    serialized.s = config.fontSize
  }
  if (config.layout !== undefined && config.layout !== 'auto') {
    serialized.l = config.layout
  }
  
  return JSON.stringify(serialized)
}

/**
 * 验证 hex 颜色格式
 * @param color 颜色字符串
 * @returns 是否为有效的 6 位 hex 颜色
 */
function isValidHexColor(color: unknown): boolean {
  return typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color)
}

/**
 * 反序列化 JSON 字符串为文字图标配置
 * 包含验证和默认值处理，确保返回的配置始终有效
 * 
 * @param data JSON 字符串或 null
 * @returns 有效的文字图标配置
 * 
 * 验证规则：
 * - text: 必须是字符串，最多 4 个字符
 * - color: 必须是有效的 6 位 hex 颜色格式 (#RRGGBB)，否则返回空字符串
 * - fontFamily: 必须是有效的字体选项，否则返回 'system'
 * - fontSize: 必须是 10-100 之间的数字，否则返回 50
 * - layout: 必须是有效的布局选项，否则返回 'auto'
 * 
 * @example
 * parseTextIconConfig('{"t":"AB","c":"#FF5733","f":"mono","s":60,"l":"grid"}')
 * // => { text: 'AB', color: '#FF5733', fontFamily: 'mono', fontSize: 60, layout: 'grid' }
 * 
 * parseTextIconConfig(null)
 * // => { text: '', color: '', fontFamily: 'system', fontSize: 50, layout: 'auto' }
 * 
 * parseTextIconConfig('invalid json')
 * // => { text: '', color: '', fontFamily: 'system', fontSize: 50, layout: 'auto' }
 */
export function parseTextIconConfig(data: string | null): TextIconConfig {
  if (!data) {
    return { ...DEFAULT_TEXT_ICON_CONFIG }
  }

  try {
    const obj = JSON.parse(data) as Partial<SerializedTextIconConfig>
    
    // 解析字号，确保在有效范围内
    let fontSize = 50
    if (typeof obj.s === 'number' && obj.s >= 10 && obj.s <= 100) {
      fontSize = obj.s
    }
    
    return {
      // 文字：必须是字符串，截取前 4 个字符
      text: typeof obj.t === 'string' ? obj.t.slice(0, 4) : '',
      // 颜色：必须是有效的 hex 格式
      color: isValidHexColor(obj.c) ? (obj.c as string) : '',
      // 字体：必须是有效的字体选项
      fontFamily: isValidTextIconFont(obj.f) ? obj.f : 'system',
      // 字号
      fontSize,
      // 布局
      layout: isValidTextIconLayout(obj.l) ? obj.l : 'auto',
    }
  } catch {
    // JSON 解析失败，返回默认配置
    return { ...DEFAULT_TEXT_ICON_CONFIG }
  }
}

/**
 * 从 URL 中提取域名
 * @param url URL 字符串
 * @returns 域名或 null
 */
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    // URL 解析失败，尝试简单提取
    // 处理类似 "example.com/path" 的情况
    const match = url.match(/^(?:https?:\/\/)?([^\/]+)/)
    return match ? match[1] : null
  }
}

/**
 * 从书签名称或 URL 提取默认文字
 * 
 * 提取规则：
 * 1. 如果书签名称非空且不只是空白，使用名称的第一个字符（字母需大写）
 * 2. 如果名称为空或只有空白，从 URL 域名提取第一个字符
 * 3. 如果都不可用，返回 "?"
 * 
 * @param name 书签名称
 * @param url 书签 URL
 * @returns 默认显示文字（单个字符）
 * 
 * @example
 * getDefaultText('Google', 'https://google.com')
 * // => 'G'
 * 
 * getDefaultText('apple', 'https://apple.com')
 * // => 'A'
 * 
 * getDefaultText('', 'https://github.com')
 * // => 'G'
 * 
 * getDefaultText('   ', '')
 * // => '?'
 */
export function getDefaultText(name: string, url: string): string {
  // 1. 尝试从书签名称提取
  const trimmedName = name.trim()
  if (trimmedName.length > 0) {
    const firstChar = trimmedName.charAt(0)
    // 如果是字母，转为大写
    return firstChar.toUpperCase()
  }

  // 2. 尝试从 URL 域名提取
  if (url) {
    const domain = extractDomain(url)
    if (domain && domain.length > 0) {
      const firstChar = domain.charAt(0)
      return firstChar.toUpperCase()
    }
  }

  // 3. 都不可用，返回默认占位符
  return '?'
}
