import { useCallback, useEffect, useRef, useState } from 'react'
import type { SearchEngine } from '../stores/appearance'

const DEBOUNCE_DELAY = 300
const MAX_SUGGESTIONS = 8
const REQUEST_TIMEOUT = 5000

/**
 * 搜索建议 API URL 模板
 * 注意：由于跨域限制，这些 API 可能需要通过后端代理
 */
const SUGGESTION_API_URLS: Record<Exclude<SearchEngine, 'custom'>, string> = {
  // 百度使用 JSONP
  baidu: 'https://suggestion.baidu.com/su?wd={query}&cb={callback}',
  // 必应 OpenSearch JSON
  bing: 'https://api.bing.com/osjson.aspx?query={query}',
  // 谷歌 OpenSearch JSON
  google: 'https://suggestqueries.google.com/complete/search?client=firefox&q={query}',
}

/**
 * 生成唯一的 JSONP 回调函数名
 */
function generateCallbackName(): string {
  return `__searchSuggestionCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

/**
 * 通过 JSONP 获取百度搜索建议
 */
async function fetchBaiduSuggestions(query: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const callbackName = generateCallbackName()
    const url = SUGGESTION_API_URLS.baidu
      .replace('{query}', encodeURIComponent(query))
      .replace('{callback}', callbackName)

    const script = document.createElement('script')
    script.src = url

    const cleanup = () => {
      delete (window as any)[callbackName]
      script.remove()
    }

    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('Request timeout'))
    }, REQUEST_TIMEOUT)

    ;(window as any)[callbackName] = (data: { s?: string[] }) => {
      clearTimeout(timeout)
      cleanup()
      resolve(Array.isArray(data?.s) ? data.s : [])
    }

    script.onerror = () => {
      clearTimeout(timeout)
      cleanup()
      reject(new Error('Script load error'))
    }

    document.head.appendChild(script)
  })
}

/**
 * 通过 fetch 获取必应/谷歌搜索建议
 * 注意：由于 CORS 限制，这可能需要后端代理
 */
async function fetchJsonSuggestions(
  engine: 'bing' | 'google',
  query: string
): Promise<string[]> {
  const url = SUGGESTION_API_URLS[engine].replace('{query}', encodeURIComponent(query))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      mode: 'cors',
    })
    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    
    // OpenSearch JSON 格式: [query, [suggestions], ...]
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1].filter((s: unknown) => typeof s === 'string')
    }
    
    return []
  } catch (error) {
    clearTimeout(timeout)
    throw error
  }
}

/**
 * 获取搜索建议
 */
export async function fetchSuggestions(
  query: string,
  engine: SearchEngine
): Promise<string[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  // 自定义搜索引擎不支持建议
  if (engine === 'custom') return []

  try {
    let suggestions: string[]
    
    if (engine === 'baidu') {
      suggestions = await fetchBaiduSuggestions(trimmed)
    } else {
      suggestions = await fetchJsonSuggestions(engine, trimmed)
    }

    // 限制返回数量
    return suggestions.slice(0, MAX_SUGGESTIONS)
  } catch (error) {
    console.warn(`Failed to fetch suggestions from ${engine}:`, error)
    return []
  }
}

/**
 * 限制建议数量（纯函数，用于测试）
 */
export function limitSuggestions(suggestions: string[], max: number = MAX_SUGGESTIONS): string[] {
  return suggestions.slice(0, max)
}

export interface UseSearchSuggestionsReturn {
  suggestions: string[]
  isLoading: boolean
  error: Error | null
}

/**
 * 搜索建议 Hook，带防抖处理
 * @param query 搜索查询
 * @param engine 搜索引擎
 * @param enabled 是否启用
 */
export function useSearchSuggestions(
  query: string,
  engine: SearchEngine,
  enabled: boolean = true
): UseSearchSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async (q: string, eng: SearchEngine) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchSuggestions(q, eng)
      setSuggestions(result)
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err)
      }
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // 清理之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const trimmed = query.trim()

    // 不启用或空查询时清空建议
    if (!enabled || !trimmed) {
      setSuggestions([])
      setIsLoading(false)
      setError(null)
      return
    }

    // 自定义搜索引擎不支持建议
    if (engine === 'custom') {
      setSuggestions([])
      return
    }

    // 防抖处理
    debounceTimerRef.current = setTimeout(() => {
      void fetchData(trimmed, engine)
    }, DEBOUNCE_DELAY)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, engine, enabled, fetchData])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return { suggestions, isLoading, error }
}

// 导出常量和工具函数用于测试
export const searchSuggestionsUtils = {
  DEBOUNCE_DELAY,
  MAX_SUGGESTIONS,
  fetchSuggestions,
  limitSuggestions,
}
