import { useEffect, useMemo, useState } from 'react'
import { BING_DAILY_FALLBACK_IMAGE, fetchBingDailyImage } from '../services/bing'
import { useAppearanceStore } from '../stores/appearance'

type CachedBing = { date: string; url: string; copyright?: string }

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
    localStorage.setItem('start:bingDaily', JSON.stringify(value))
  } catch {
    // ignore
  }
}

export function useBackgroundImage() {
  const backgroundType = useAppearanceStore((s) => s.backgroundType)
  const backgroundCustomUrl = useAppearanceStore((s) => s.backgroundCustomUrl)

  const [init] = useState(() => {
    const today = todayLocal()
    const cache = readCache()

    if (cache && cache.date === today) {
      return {
        today,
        fromCache: true,
        url: cache.url,
        copyright: cache.copyright ?? '',
      }
    }

    return { today, fromCache: false, url: '', copyright: '' }
  })

  const [bingUrl, setBingUrl] = useState<string>(init.url)
  const [bingCopyright, setBingCopyright] = useState<string>(init.copyright)

  useEffect(() => {
    if (init.fromCache) {
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const data = await fetchBingDailyImage()
        if (cancelled) return
        setBingUrl(data.url)
        setBingCopyright(data.copyright ?? '')
        writeCache({ date: init.today, url: data.url, copyright: data.copyright })
      } catch {
        // 常见原因：浏览器端 CORS。这里直接退回到“图片镜像地址”
        if (cancelled) return
        setBingUrl(BING_DAILY_FALLBACK_IMAGE)
        setBingCopyright('Bing 每日一图')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [init.fromCache, init.today])

  const finalUrl = useMemo(() => {
    if (backgroundType === 'custom') {
      const u = backgroundCustomUrl.trim()
      if (u) return u
    }
    return bingUrl || BING_DAILY_FALLBACK_IMAGE
  }, [backgroundCustomUrl, backgroundType, bingUrl])

  return { backgroundUrl: finalUrl, bingCopyright }
}


