export function normalizeUrl(u: string) {
  const s = u.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  return `https://${s}`
}

/**
 * Check if a URL is valid for fetching title
 * @param url - The URL to validate
 * @returns true if the URL is valid and should trigger a fetch
 */
export function isValidUrlForFetch(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  
  const trimmed = url.trim()
  
  // Minimum length check (e.g., "a.co" is 4 chars)
  if (trimmed.length < 4) return false
  
  try {
    // Add protocol if missing
    let normalizedUrl = trimmed
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl
    }
    
    const parsed = new URL(normalizedUrl)
    
    // Must have a valid hostname with at least one dot
    if (!parsed.hostname || !parsed.hostname.includes('.')) return false
    
    // Protocol must be http or https
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    
    return true
  } catch {
    return false
  }
}

/**
 * Extract domain from a URL string
 * @param url - The URL to extract domain from
 * @returns The domain/hostname, or empty string if invalid
 */
export function extractDomain(url: string): string {
  if (!url || typeof url !== 'string') return ''
  
  try {
    // Add protocol if missing
    let normalizedUrl = url.trim()
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl
    }
    
    const parsed = new URL(normalizedUrl)
    return parsed.hostname || ''
  } catch {
    return ''
  }
}

/**
 * Extract the main domain name (without TLD) for use as fallback name
 * e.g., "baidu.com" -> "baidu", "www.github.com" -> "github"
 * @param url - The URL to extract name from
 * @returns The main domain name, or empty string if invalid
 */
export function extractDomainName(url: string): string {
  const hostname = extractDomain(url)
  if (!hostname) return ''
  
  // Remove www. prefix if present
  const domain = hostname.replace(/^www\./i, '')
  
  // Split by dots
  const parts = domain.split('.')
  
  // Handle special cases like co.uk, com.cn, etc.
  const specialTLDs = ['co.uk', 'com.cn', 'com.hk', 'com.tw', 'co.jp', 'com.au', 'co.nz', 'org.cn']
  const lastTwo = parts.slice(-2).join('.')
  
  if (specialTLDs.includes(lastTwo) && parts.length > 2) {
    // e.g., "example.co.uk" -> "example"
    return parts[parts.length - 3]
  }
  
  if (parts.length >= 2) {
    // e.g., "baidu.com" -> "baidu", "sub.example.com" -> "example"
    return parts[parts.length - 2]
  }
  
  // Single part domain (rare, like localhost)
  return parts[0]
}

/**
 * 获取多源 favicon URL 列表（并行竞速）
 * DuckDuckGo + Google + 网站本站 favicon
 * @param hostname - 域名
 * @param size - 图标尺寸（默认 64）
 * @returns favicon URL 数组
 */
export function getFaviconSources(hostname: string, size: number = 64): string[] {
  if (!hostname) return []
  const encoded = encodeURIComponent(hostname)
  return [
    // 1. DuckDuckGo - 质量好，国内部分地区可访问
    `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
    // 2. Google - 最稳定但国内可能被墙
    `https://www.google.com/s2/favicons?domain=${encoded}&sz=${size}`,
    // 3. 网站本站 favicon - 直接从网站获取
    `https://${hostname}/favicon.ico`,
  ]
}


