import * as cheerio from 'cheerio'
import { extractDomainName } from '../utils/url'

export interface FetchTitleResult {
  title: string | null
  fallback: string
}

const TIMEOUT_MS = 5000

/**
 * Fetch the title of a webpage
 * @param url - The URL to fetch title from
 * @returns Object containing title (or null) and fallback domain name
 */
export async function fetchTitle(url: string): Promise<FetchTitleResult> {
  const fallback = extractDomainName(url)
  
  if (!fallback) {
    return { title: null, fallback: '' }
  }
  
  try {
    // Normalize URL
    let normalizedUrl = url.trim()
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl
    }
    
    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
    
    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      return { title: null, fallback }
    }
    
    // Get content type to check encoding
    const contentType = response.headers.get('content-type') || ''
    
    // Read response as buffer first for encoding detection
    const buffer = await response.arrayBuffer()
    
    // Try to detect encoding from content-type header
    let encoding = 'utf-8'
    const charsetMatch = contentType.match(/charset=([^\s;]+)/i)
    if (charsetMatch) {
      encoding = charsetMatch[1].toLowerCase()
    }
    
    // Decode the buffer
    let html: string
    try {
      const decoder = new TextDecoder(encoding)
      html = decoder.decode(buffer)
    } catch {
      // Fallback to utf-8 if encoding is not supported
      html = new TextDecoder('utf-8').decode(buffer)
    }
    
    // Check for meta charset in HTML if not found in header
    if (!charsetMatch) {
      const metaCharsetMatch = html.match(/<meta[^>]+charset=["']?([^"'\s>]+)/i)
      if (metaCharsetMatch) {
        const metaEncoding = metaCharsetMatch[1].toLowerCase()
        if (metaEncoding !== 'utf-8') {
          try {
            const decoder = new TextDecoder(metaEncoding)
            html = decoder.decode(buffer)
          } catch {
            // Keep the utf-8 decoded version
          }
        }
      }
    }
    
    // Parse HTML and extract title
    const $ = cheerio.load(html)
    let title = $('title').first().text().trim()
    
    // Clean up title - remove excessive whitespace
    if (title) {
      title = title.replace(/\s+/g, ' ').trim()
      // Limit title length
      if (title.length > 120) {
        title = title.substring(0, 117) + '...'
      }
    }
    
    return {
      title: title || null,
      fallback,
    }
  } catch (error) {
    // Handle timeout and other errors silently
    return { title: null, fallback }
  }
}
