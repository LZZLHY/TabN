import { useEffect, useMemo, useState } from 'react'
import { BING_DAILY_FALLBACK_IMAGE, fetchBingDailyImage } from '../services/bing'
import { useAppearanceStore } from '../stores/appearance'

type CachedBing = { date: string; url: string; base64?: string; copyright?: string; timestamp?: number }
type CachedApi = { url: string; result: string; base64?: string; timestamp: number }
type CachedPicsum = { url: string; timestamp: number }

// 壁纸来源 URL
const PICSUM_BASE_URL = 'https://picsum.photos/1920/1080'

// 缓存有效期（分钟）
const CACHE_VALID_MINUTES = 30
const PICSUM_CACHE_KEY = 'start:picsumCache'

// Picsum 缓存读写
function readPicsumCache(): CachedPicsum | null {
  try {
    const raw = localStorage.getItem(PICSUM_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedPicsum
  } catch {
    return null
  }
}

function writePicsumCache(cache: CachedPicsum) {
  try {
    localStorage.setItem(PICSUM_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }
}

// IndexedDB 存储背景图 Base64（localStorage 有 5MB 限制）
const DB_NAME = 'start-wallpaper-cache'
const STORE_NAME = 'images'

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

async function getImageFromDB(key: string): Promise<string | null> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function saveImageToDB(key: string, base64: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put(base64, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // ignore
  }
}

async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function todayLocal(): string {
  // sv-SE => YYYY-MM-DD（本地时区）
  return new Date().toLocaleDateString('sv-SE')
}

function readCache(): CachedBing | null {
  try {
    const raw = localStorage.getItem('start:bingDaily')
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedBing
    if (!parsed?.date || !parsed?.url) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(value: CachedBing) {
  try {
    localStorage.setItem('start:bingDaily', JSON.stringify({ ...value, timestamp: Date.now() }))
  } catch {
    // ignore
  }
}

// API 壁纸缓存
function readApiCache(): CachedApi | null {
  try {
    const raw = localStorage.getItem('start:apiWallpaper')
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedApi
    if (!parsed?.url || !parsed?.result || !parsed?.timestamp) return null
    return parsed
  } catch {
    return null
  }
}

function writeApiCache(value: CachedApi) {
  try {
    localStorage.setItem('start:apiWallpaper', JSON.stringify(value))
  } catch {
    // ignore
  }
}

function isApiCacheValid(cache: CachedApi | null, currentUrl: string): boolean {
  if (!cache) return false
  if (cache.url !== currentUrl) return false
  const elapsed = Date.now() - cache.timestamp
  return elapsed < CACHE_VALID_MINUTES * 60 * 1000
}

export function useBackgroundImage() {
  const backgroundType = useAppearanceStore((s) => s.backgroundType)
  const backgroundCustomUrl = useAppearanceStore((s) => s.backgroundCustomUrl)
  const backgroundApiUrl = useAppearanceStore((s) => s.backgroundApiUrl)

  // Bing 壁纸 - 同步从 localStorage 读取 URL 缓存
  const [bingUrl, setBingUrl] = useState<string>(() => {
    const today = todayLocal()
    const cache = readCache()
    // 如果有今天的缓存，直接返回缓存的 URL
    if (cache && cache.date === today && cache.url) {
      return cache.url
    }
    // 没有缓存时，使用固定的回退图片
    return BING_DAILY_FALLBACK_IMAGE
  })
  
  // Picsum 壁纸 - 同步从 localStorage 读取缓存
  const [picsumUrl, setPicsumUrl] = useState<string>(() => {
    const cache = readPicsumCache()
    // 如果有缓存，直接返回（Picsum 每次刷新都是新图，但我们保留上一张避免闪黑）
    if (cache && cache.url) {
      return cache.url
    }
    return ''
  })
  
  // API 壁纸缓存状态
  const [apiResult, setApiResult] = useState<string>(() => {
    const cache = readApiCache()
    if (cache && isApiCacheValid(cache, backgroundApiUrl)) {
      return cache.result
    }
    return ''
  })

  // 初始化：从 IndexedDB 读取 Base64 缓存，或请求新图片（只执行一次）
  useEffect(() => {
    const today = todayLocal()
    const cache = readCache()
    let cancelled = false
    
    ;(async () => {
      // 尝试从 IndexedDB 读取 Base64 缓存
      const cachedBase64 = await getImageFromDB(`bing-${today}`)
      if (cancelled) return
      
      if (cachedBase64) {
        setBingUrl(cachedBase64)
        return
      }
      
      // 如果有今天的 URL 缓存，后台转换为 Base64（不更新显示）
      if (cache && cache.date === today && cache.url) {
        const base64 = await imageUrlToBase64(cache.url)
        if (base64 && !cancelled) {
          await saveImageToDB(`bing-${today}`, base64)
        }
        return
      }
      
      // 没有缓存，请求新图片
      try {
        const data = await fetchBingDailyImage()
        if (cancelled) return
        setBingUrl(data.url)
        writeCache({ date: today, url: data.url, copyright: data.copyright })
        // 后台转换为 Base64 并缓存
        const base64 = await imageUrlToBase64(data.url)
        if (base64 && !cancelled) {
          await saveImageToDB(`bing-${today}`, base64)
        }
      } catch {
        // 请求失败，保持当前图片
      }
    })()
    
    return () => { cancelled = true }
  }, [])

  // Picsum 壁纸：使用 sessionStorage 标记本次会话是否已加载新图片
  // 刷新时保持上一张图片，只有切换到 Picsum 模式时才加载新图片
  useEffect(() => {
    if (backgroundType !== 'picsum') return
    
    // 检查本次会话是否已加载过新图片
    const sessionKey = 'start:picsumLoaded'
    if (sessionStorage.getItem(sessionKey)) return
    sessionStorage.setItem(sessionKey, '1')
    
    let cancelled = false
    
    // 预加载新图片
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      // 获取重定向后的实际 URL（Picsum 会重定向到具体图片）
      const actualUrl = img.src
      // 新图片加载完成，更新状态（触发平滑过渡）
      setPicsumUrl(actualUrl)
      writePicsumCache({ url: actualUrl, timestamp: Date.now() })
    }
    // 添加随机参数避免浏览器缓存
    img.src = `${PICSUM_BASE_URL}?t=${Date.now()}`
    
    return () => { cancelled = true }
  }, [backgroundType])

  // API 壁纸请求（带缓存）
  useEffect(() => {
    if (backgroundType !== 'api') return
    
    const apiUrl = backgroundApiUrl.trim()
    if (!apiUrl) return
    
    // 检查缓存是否有效（初始化时已检查，这里只在 URL 变化时重新检查）
    const cache = readApiCache()
    if (isApiCacheValid(cache, apiUrl)) {
      // 缓存有效，不需要请求
      return
    }
    
    let cancelled = false
    
    ;(async () => {
      try {
        // 请求 API 获取实际图片 URL
        const response = await fetch(apiUrl)
        if (cancelled) return
        
        // 检查响应类型
        const contentType = response.headers.get('content-type') || ''
        
        if (contentType.includes('image/')) {
          // 直接返回图片，使用原 URL
          setApiResult(apiUrl)
          writeApiCache({ url: apiUrl, result: apiUrl, timestamp: Date.now() })
        } else if (contentType.includes('application/json')) {
          // JSON 响应，尝试解析图片 URL
          const data = await response.json()
          const imageUrl = data.url || data.imgurl || data.image || data.pic || apiUrl
          setApiResult(imageUrl)
          writeApiCache({ url: apiUrl, result: imageUrl, timestamp: Date.now() })
        } else {
          // 其他情况，直接使用原 URL
          setApiResult(apiUrl)
          writeApiCache({ url: apiUrl, result: apiUrl, timestamp: Date.now() })
        }
      } catch {
        if (cancelled) return
        // 请求失败，使用原 URL
        setApiResult(apiUrl)
      }
    })()
    
    return () => {
      cancelled = true
    }
  }, [backgroundType, backgroundApiUrl])

  const finalUrl = useMemo(() => {
    switch (backgroundType) {
      case 'custom': {
        const u = backgroundCustomUrl.trim()
        if (u) return u
        break
      }
      case 'picsum':
        // 使用缓存的 URL，避免闪黑
        return picsumUrl || PICSUM_BASE_URL
      case 'api': {
        // 使用缓存的 API 结果，如果没有则使用原 URL
        if (apiResult) return apiResult
        const apiUrl = backgroundApiUrl.trim()
        if (apiUrl) return apiUrl
        break
      }
      case 'bing':
        return bingUrl || BING_DAILY_FALLBACK_IMAGE
    }
    return bingUrl || BING_DAILY_FALLBACK_IMAGE
  }, [backgroundCustomUrl, backgroundApiUrl, backgroundType, bingUrl, apiResult, picsumUrl])

  return { backgroundUrl: finalUrl }
}


