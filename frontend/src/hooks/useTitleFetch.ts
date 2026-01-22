import { useCallback, useRef, useState } from 'react'
import { apiFetch } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { isValidUrlForFetch, extractDomainName } from '../utils/url'

interface FetchTitleResponse {
  title: string | null
  fallback: string
}

interface UseTitleFetchOptions {
  debounceMs?: number
  enabled?: boolean
}

interface UseTitleFetchResult {
  fetchTitle: (url: string) => void
  title: string | null
  fallback: string | null
  loading: boolean
  error: string | null
  reset: () => void
}

export function useTitleFetch(options: UseTitleFetchOptions = {}): UseTitleFetchResult {
  const { debounceMs = 500, enabled = true } = options
  
  const token = useAuthStore((s) => s.token)
  
  const [title, setTitle] = useState<string | null>(null)
  const [fallback, setFallback] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const reset = useCallback(() => {
    setTitle(null)
    setFallback(null)
    setLoading(false)
    setError(null)
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])
  
  const fetchTitle = useCallback((url: string) => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Validate URL
    if (!enabled || !isValidUrlForFetch(url)) {
      setLoading(false)
      return
    }
    
    // Set fallback immediately
    const domain = extractDomainName(url)
    setFallback(domain)
    
    // Start loading
    setLoading(true)
    setError(null)
    
    // Debounce the actual fetch
    debounceTimerRef.current = setTimeout(async () => {
      if (!token) {
        setLoading(false)
        return
      }
      
      abortControllerRef.current = new AbortController()
      
      try {
        const resp = await apiFetch<FetchTitleResponse>('/api/utils/fetch-title', {
          method: 'POST',
          token,
          body: JSON.stringify({ url }),
        })
        
        if (resp.ok) {
          setTitle(resp.data.title)
          setFallback(resp.data.fallback)
        } else {
          // Silent failure - just use fallback
          setTitle(null)
        }
      } catch {
        // Silent failure
        setTitle(null)
      } finally {
        setLoading(false)
      }
    }, debounceMs)
  }, [token, enabled, debounceMs])
  
  return {
    fetchTitle,
    title,
    fallback,
    loading,
    error,
    reset,
  }
}
