/**
 * 网络错误和空状态组件
 * 
 * 提供重试按钮和本地缓存展示功能
 */

import { WifiOff, RefreshCw, ServerOff, AlertCircle } from 'lucide-react'

export type ErrorType = 'network' | 'server' | 'empty' | 'unknown'

interface NetworkErrorProps {
  type?: ErrorType
  title?: string
  message?: string
  onRetry?: () => void
  retrying?: boolean
  showCachedData?: boolean
  cachedDataMessage?: string
  className?: string
}

const ErrorIcons: Record<ErrorType, typeof WifiOff> = {
  network: WifiOff,
  server: ServerOff,
  empty: AlertCircle,
  unknown: AlertCircle,
}

const DefaultTitles: Record<ErrorType, string> = {
  network: '网络连接失败',
  server: '服务器暂时不可用',
  empty: '暂无数据',
  unknown: '加载失败',
}

const DefaultMessages: Record<ErrorType, string> = {
  network: '请检查您的网络连接，或稍后重试',
  server: '服务器正在维护中，请稍后重试',
  empty: '当前没有可显示的内容',
  unknown: '发生了一些错误，请稍后重试',
}

export function NetworkError({
  type = 'unknown',
  title,
  message,
  onRetry,
  retrying = false,
  showCachedData = false,
  cachedDataMessage,
  className = '',
}: NetworkErrorProps) {
  const Icon = ErrorIcons[type]
  const displayTitle = title || DefaultTitles[type]
  const displayMessage = message || DefaultMessages[type]

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
        <Icon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
      </div>
      
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {displayTitle}
      </h3>
      
      <p className="mb-6 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        {displayMessage}
      </p>

      {showCachedData && cachedDataMessage && (
        <div className="mb-4 rounded-lg bg-yellow-50 px-4 py-2 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
          {cachedDataMessage}
        </div>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
          {retrying ? '重试中...' : '重试'}
        </button>
      )}
    </div>
  )
}

interface OfflineBannerProps {
  onRetry?: () => void
  retrying?: boolean
}

export function OfflineBanner({ onRetry, retrying }: OfflineBannerProps) {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform">
      <div className="flex items-center gap-3 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-gray-700">
        <WifiOff className="h-4 w-4 text-yellow-400" />
        <span>网络连接已断开</span>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={retrying}
            className="ml-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium transition-colors hover:bg-white/30 disabled:opacity-50"
          >
            {retrying ? '重试中...' : '重试'}
          </button>
        )}
      </div>
    </div>
  )
}

interface LoadingSkeletonProps {
  count?: number
  className?: string
}

export function LoadingCardSkeleton({ count = 6, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="aspect-square animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"
        />
      ))}
    </div>
  )
}

export function LoadingListSkeleton({ count = 5, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-800"
        >
          <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  )
}
