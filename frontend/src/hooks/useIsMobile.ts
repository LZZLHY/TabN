import { useMediaQuery, breakpoints } from './useMediaQuery'

/**
 * 判断是否为移动端设备
 * 基于视口宽度 < 768px
 */
export function useIsMobile(): boolean {
  return useMediaQuery(breakpoints.mobile)
}

/**
 * 判断是否为平板设备
 * 基于视口宽度 768px - 1023px
 */
export function useIsTablet(): boolean {
  return useMediaQuery(breakpoints.tablet)
}

/**
 * 判断是否为桌面设备
 * 基于视口宽度 >= 1024px
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(breakpoints.desktop)
}

/**
 * 判断是否支持触摸
 */
export function useIsTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}
