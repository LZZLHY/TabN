import { useEffect, useState } from 'react'

/**
 * 响应式媒体查询 Hook
 * @param query 媒体查询字符串，例如 '(max-width: 767px)'
 * @returns 是否匹配该媒体查询
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    
    // 同步初始状态（query 变化时）
    if (mediaQuery.matches !== matches) {
      setMatches(mediaQuery.matches)
    }
    
    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- matches 不需要作为依赖
  }, [query])

  return matches
}

/**
 * 预定义断点
 */
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
} as const
