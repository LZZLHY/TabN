import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import i18n from '../i18n'
import { BING_DAILY_FALLBACK_IMAGE, fetchBingDailyImage } from '../services/bing'
import { useAppearanceStore } from '../stores/appearance'

// 壁纸加载失败时的纯灰色背景（不使用图片 URL）
const FALLBACK_GRAY_BACKGROUND = ''

type CachedBing = { date: string; url: string; base64?: string; copyright?: string; timestamp?: number }
type CachedApi = { url: string; result: string; base64?: string; timestamp: number }
type CachedPicsum = { url: string; thumbnail?: string; timestamp: number }

// 壁纸来源 URL
const PICSUM_BASE_URL = 'https://picsum.photos/1920/1080'

// 缓存有效期（分钟）
const CACHE_VALID_MINUTES = 30
const PICSUM_CACHE_KEY = 'start:picsumCache'
const PICSUM_DB_KEY = 'picsum-current'

// Picsum 缓存读取
function readPicsumCache(): CachedPicsum | null {
  try {
    const raw = localStorage.getItem(PICSUM_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedPicsum
    if (!parsed?.url) return null
    return parsed
  } catch {
    return null
  }
}

// Picsum 缓存写入
function writePicsumCache(cache: CachedPicsum) {
  try {
    localStorage.setItem(PICSUM_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }
}

// 从 Base64 生成缩略图（用于 localStorage 同步显示，避免黑屏）
// 缩略图尺寸较小，可以存储在 localStorage 中（约 50-100KB）
async function generateThumbnailFromBase64(base64: string, maxWidth = 400): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        
        // 计算缩略图尺寸（保持宽高比）
        const ratio = img.height / img.width
        const width = Math.min(maxWidth, img.width)
        const height = width * ratio
        
        canvas.width = width
        canvas.height = height
        
        // 绘制缩略图
        ctx.drawImage(img, 0, 0, width, height)
        
        // 转换为 Base64（使用 JPEG 格式，质量 0.7，减小体积）
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7)
        resolve(thumbnail)
      } catch {
        resolve(null)
      }
    }
    
    img.onerror = () => resolve(null)
    // 直接使用 Base64 作为源，不需要网络请求
    img.src = base64
  })
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

// 缓存清理：删除超过指定天数的旧壁纸缓存
const CACHE_MAX_AGE_DAYS = 7

async function cleanupOldCache(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    // 获取所有 key
    const keysRequest = store.getAllKeys()
    
    return new Promise((resolve) => {
      keysRequest.onsuccess = () => {
        const keys = keysRequest.result as string[]
        const today = new Date()
        const cutoffDate = new Date(today)
        cutoffDate.setDate(cutoffDate.getDate() - CACHE_MAX_AGE_DAYS)
        
        let deletedCount = 0
        
        keys.forEach((key) => {
          // 解析 key 中的日期（格式：bing-YYYY-MM-DD）
          const match = key.match(/^bing-(\d{4}-\d{2}-\d{2})$/)
          if (match) {
            const keyDate = new Date(match[1])
            if (keyDate < cutoffDate) {
              store.delete(key)
              deletedCount++
            }
          }
        })
        
        if (deletedCount > 0) {
          console.log(`[壁纸缓存] 已清理 ${deletedCount} 个过期缓存`)
        }
        
        resolve()
      }
      keysRequest.onerror = () => resolve()
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
  
  // Picsum 壁纸 - 同步从 localStorage 读取缩略图缓存（与 Bing 一致的实现方式）
  // 缩略图用于页面刷新时立即显示，避免黑屏
  const [picsumUrl, setPicsumUrl] = useState<string>(() => {
    const cache = readPicsumCache()
    // 如果有缓存的缩略图，直接返回（页面刷新时立即显示）
    if (cache && cache.thumbnail) {
      return cache.thumbnail
    }
    // 没有缓存时，返回空字符串（等待加载）
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

  // 预加载图片并转换为 Base64，完成后再切换（避免黑屏）
  const preloadAndCacheImage = async (
    url: string,
    cacheKey: string,
    cancelled: { current: boolean }
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = async () => {
        if (cancelled.current) {
          resolve(null)
          return
        }
        // 图片加载完成，转换为 Base64
        const base64 = await imageUrlToBase64(url)
        if (base64 && !cancelled.current) {
          await saveImageToDB(cacheKey, base64)
          resolve(base64)
        } else {
          // 转换失败，返回原 URL（图片已预加载，不会黑屏）
          resolve(url)
        }
      }
      
      img.onerror = () => {
        resolve(null)
      }
      
      img.src = url
    })
  }

  // 检查并更新必应壁纸的核心逻辑
  // forceCheck: 强制检查 API（用于凌晨轮询时，即使有缓存也要检查是否有新壁纸）
  const checkAndUpdateBingWallpaper = async (
    cancelled: { current: boolean },
    forceCheck = false
  ) => {
    const today = todayLocal()
    const cache = readCache()
    
    // 尝试从 IndexedDB 读取今天的 Base64 缓存
    const cachedBase64 = await getImageFromDB(`bing-${today}`)
    if (cancelled.current) return
    
    // 如果有今天的缓存且不是强制检查，直接使用缓存
    if (cachedBase64 && !forceCheck) {
      setBingUrl(cachedBase64)
      return
    }
    
    // 如果有今天的 URL 缓存且不是强制检查，预加载并转换为 Base64
    if (cache && cache.date === today && cache.url && !forceCheck) {
      const result = await preloadAndCacheImage(cache.url, `bing-${today}`, cancelled)
      if (result && !cancelled.current) {
        setBingUrl(result)
      }
      return
    }
    
    // 请求 API 获取最新壁纸
    try {
      const data = await fetchBingDailyImage()
      if (cancelled.current) return
      
      // 检查 URL 是否与缓存相同（如果相同说明 Bing 还没更新）
      if (cache && cache.url === data.url) {
        // URL 相同，Bing 还没更新，继续使用缓存
        if (cachedBase64) {
          setBingUrl(cachedBase64)
        } else if (cache.url) {
          const result = await preloadAndCacheImage(cache.url, `bing-${today}`, cancelled)
          if (result && !cancelled.current) {
            setBingUrl(result)
          }
        }
        return
      }
      
      // URL 不同，有新壁纸！更新缓存
      writeCache({ date: today, url: data.url, copyright: data.copyright })
      
      // 预加载新图片，完成后再切换（避免黑屏）
      const result = await preloadAndCacheImage(data.url, `bing-${today}`, cancelled)
      if (result && !cancelled.current) {
        setBingUrl(result)
      }
    } catch {
      // 请求失败，使用现有缓存
      if (cachedBase64) {
        setBingUrl(cachedBase64)
      } else if (cache && cache.url) {
        const result = await preloadAndCacheImage(cache.url, `bing-${cache.date}`, cancelled)
        if (result && !cancelled.current) {
          setBingUrl(result)
        } else if (!cancelled.current) {
          // 缓存图片也加载失败，使用灰色背景
          setBingUrl(FALLBACK_GRAY_BACKGROUND)
          toast.error(i18n.t('toast.wallpaperError'), { description: i18n.t('toast.wallpaperErrorHint') })
        }
      } else if (!cancelled.current) {
        // 没有任何缓存，使用灰色背景
        setBingUrl(FALLBACK_GRAY_BACKGROUND)
        toast.error(i18n.t('toast.wallpaperError'), { description: i18n.t('toast.wallpaperErrorHint') })
      }
    }
  }

  // 初始化：从 IndexedDB 读取 Base64 缓存，或请求新图片
  useEffect(() => {
    const cancelled = { current: false }
    // 使用 requestIdleCallback 延迟执行，避免 eslint 警告
    const scheduleCheck = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1))
    scheduleCheck(() => {
      if (!cancelled.current) {
        void checkAndUpdateBingWallpaper(cancelled)
        // 清理过期缓存（7 天前的壁纸）
        void cleanupOldCache()
      }
    })
    return () => { cancelled.current = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 每日凌晨轮询检查：00:00 - 02:00 每 30 分钟检查一次
  useEffect(() => {
    // 只在必应壁纸模式下启用轮询
    if (backgroundType !== 'bing') return
    
    const timeoutIds: ReturnType<typeof setTimeout>[] = []
    const cancelled = { current: false }
    
    // 检查当前是否在凌晨时段（00:00 - 02:00）
    const isInMidnightWindow = () => {
      const hour = new Date().getHours()
      return hour >= 0 && hour < 2
    }
    
    // 在凌晨时段内设置多次检查（00:00, 00:30, 01:00, 01:30）
    const scheduleMidnightChecks = () => {
      // 检查时间点：00:00:05, 00:30:00, 01:00:00, 01:30:00
      const checkTimes = [
        { hour: 0, minute: 0, second: 5 },
        { hour: 0, minute: 30, second: 0 },
        { hour: 1, minute: 0, second: 0 },
        { hour: 1, minute: 30, second: 0 },
      ]
      
      const now = new Date()
      
      checkTimes.forEach(({ hour, minute, second }) => {
        const checkTime = new Date(now)
        checkTime.setHours(hour, minute, second, 0)
        
        // 如果当前时间已过这个检查点，设置为明天
        if (checkTime.getTime() <= now.getTime()) {
          checkTime.setDate(checkTime.getDate() + 1)
        }
        
        const delay = checkTime.getTime() - now.getTime()
        
        const tid = setTimeout(() => {
          if (cancelled.current) return
          // 凌晨轮询：强制检查 API，比较 URL 是否变化
          void checkAndUpdateBingWallpaper(cancelled, true)
        }, delay)
        
        timeoutIds.push(tid)
      })
      
      // 设置下一个 24 小时周期的检查
      const msUntil2AM = (() => {
        const target = new Date(now)
        if (now.getHours() >= 2) {
          target.setDate(target.getDate() + 1)
        }
        target.setHours(2, 0, 0, 0)
        return target.getTime() - now.getTime()
      })()
      
      // 2 点后重新调度明天的检查
      const recycleId = setTimeout(() => {
        if (cancelled.current) return
        scheduleMidnightChecks()
      }, msUntil2AM + 1000)
      
      timeoutIds.push(recycleId)
    }
    
    // 如果当前在凌晨时段，立即强制检查一次
    if (isInMidnightWindow()) {
      void checkAndUpdateBingWallpaper(cancelled, true)
    }
    
    scheduleMidnightChecks()
    
    return () => {
      cancelled.current = true
      timeoutIds.forEach(id => clearTimeout(id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundType])

  // Picsum 壁纸：每次刷新都加载新的随机图片
  // 流程：
  // 1. 初始化时从 localStorage 读取缩略图立即显示（同步，避免黑屏）
  // 2. React 加载后立即从 IndexedDB 读取完整 Base64 升级显示（几乎无感知）
  // 3. 在后台加载新的随机图片
  // 4. 新图片完全加载完成后，同时更新 IndexedDB 和缩略图，然后切换显示
  useEffect(() => {
    if (backgroundType !== 'picsum') return
    
    let cancelled = false
    
    const checkAndUpdatePicsumWallpaper = async () => {
      // 1. 立即从 IndexedDB 读取完整 Base64 升级显示
      const cachedBase64 = await getImageFromDB(PICSUM_DB_KEY)
      if (cancelled) return
      
      if (cachedBase64) {
        // 有完整缓存，立即升级显示（从缩略图升级到完整图片）
        setPicsumUrl(cachedBase64)
      }
      
      // 2. 在后台加载新的随机图片
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = async () => {
        if (cancelled) return
        
        // 获取重定向后的实际 URL（Picsum 会重定向到具体图片 ID）
        const actualUrl = img.src
        
        // 将图片转换为完整 Base64
        const base64 = await imageUrlToBase64(actualUrl)
        if (cancelled) return
        
        if (base64) {
          // 从 Base64 生成缩略图（确保缩略图和完整图片是同一张）
          const thumbnail = await generateThumbnailFromBase64(base64)
          if (cancelled) return
          
          // 同时更新 IndexedDB 和 localStorage（确保同步）
          await saveImageToDB(PICSUM_DB_KEY, base64)
          if (cancelled) return
          
          // 更新 localStorage 缓存（包含缩略图，用于下次刷新时同步显示）
          writePicsumCache({ 
            url: actualUrl, 
            thumbnail: thumbnail || undefined,
            timestamp: Date.now() 
          })
          
          // 3. 新图片加载完成，无缝切换
          setPicsumUrl(base64)
        } else {
          // Base64 转换失败，使用原 URL（图片已预加载到浏览器缓存）
          writePicsumCache({ url: actualUrl, timestamp: Date.now() })
          setPicsumUrl(actualUrl)
        }
      }
      
      img.onerror = () => {
        if (cancelled) return
        // 新图片加载失败，保持显示当前图片
        if (!cachedBase64 && !readPicsumCache()?.thumbnail) {
          // 没有任何缓存，显示错误提示
          setPicsumUrl('')
          toast.error(i18n.t('toast.wallpaperError'), { description: i18n.t('toast.wallpaperErrorHint') })
        }
      }
      
      // 添加随机参数避免浏览器缓存，获取新的随机图片
      img.src = `${PICSUM_BASE_URL}?t=${Date.now()}`
    }
    
    // 立即执行，不使用 requestIdleCallback（优先升级显示完整图片）
    void checkAndUpdatePicsumWallpaper()
    
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
        // 使用缓存的 URL 或 Base64，如果没有缓存则返回空字符串显示灰色背景
        return picsumUrl || ''
      case 'api': {
        // 使用缓存的 API 结果，如果没有则使用原 URL
        if (apiResult) return apiResult
        const apiUrl = backgroundApiUrl.trim()
        if (apiUrl) return apiUrl
        break
      }
      case 'bing':
        // 如果 bingUrl 为空字符串，表示加载失败，返回空让 CSS 显示灰色背景
        return bingUrl
    }
    // 默认使用 bing 壁纸
    return bingUrl
  }, [backgroundCustomUrl, backgroundApiUrl, backgroundType, bingUrl, apiResult, picsumUrl])

  return { backgroundUrl: finalUrl }
}