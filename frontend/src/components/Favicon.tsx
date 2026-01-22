import { useState, useEffect, memo } from 'react'
import { getFaviconSources, extractDomain, extractDomainName } from '../utils/url'
import { cn } from '../utils/cn'

type FaviconProps = {
  url: string
  name?: string
  size?: number
  className?: string
  letterClassName?: string
  alt?: string
  onAllFailed?: () => void
}

/**
 * 多源 Favicon 组件（并行竞速）
 * 同时请求 DuckDuckGo + Google + 网站本站，哪个先成功用哪个
 * 加载期间显示首字母作为占位
 */
export const Favicon = memo(function Favicon({
  url,
  name,
  size = 64,
  className = '',
  letterClassName = '',
  alt = '',
  onAllFailed,
}: FaviconProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)

  const hostname = extractDomain(url)
  const sources = getFaviconSources(hostname, size)
  
  // 获取首字母：优先用 name，否则用域名
  const letter = (name?.trim()?.[0] || extractDomainName(url)?.[0] || '?').toUpperCase()

  useEffect(() => {
    if (!hostname || sources.length === 0) {
      onAllFailed?.()
      return
    }

    // 重置状态
    setLoadedSrc(null)

    let cancelled = false
    let successFound = false
    let failedCount = 0
    const totalSources = sources.length

    // 并行加载所有源
    sources.forEach((src) => {
      const img = new Image()
      img.onload = () => {
        if (cancelled || successFound) return
        // 第一个成功的就用它
        successFound = true
        setLoadedSrc(src)
      }
      img.onerror = () => {
        if (cancelled || successFound) return
        failedCount++
        if (failedCount >= totalSources) {
          onAllFailed?.()
        }
      }
      img.src = src
    })

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostname, size])

  // 没有 hostname 直接返回 null
  if (!hostname) {
    return null
  }

  // 加载成功，显示图片
  if (loadedSrc) {
    return (
      <img
        src={loadedSrc}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
      />
    )
  }

  // 加载中或全部失败，显示首字母
  return (
    <span className={cn('flex items-center justify-center text-base font-semibold', letterClassName)}>
      {letter}
    </span>
  )
})
