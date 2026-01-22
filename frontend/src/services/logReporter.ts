/**
 * 前端日志上报服务
 * 
 * 捕获前端报错和性能指标（FCP/LCP），上报到后端日志系统
 */

import { apiBase } from './api'

interface ErrorLog {
  type: 'error' | 'unhandledrejection'
  message: string
  stack?: string
  url: string
  userAgent: string
  timestamp: string
  userId?: string
  componentStack?: string
  extra?: Record<string, unknown>
}

interface PerformanceMetrics {
  url: string
  userAgent: string
  timestamp: string
  userId?: string
  metrics: {
    fcp?: number  // First Contentful Paint
    lcp?: number  // Largest Contentful Paint
    fid?: number  // First Input Delay
    cls?: number  // Cumulative Layout Shift
    ttfb?: number // Time to First Byte
  }
}

interface LogBatch {
  errors: ErrorLog[]
  performance?: PerformanceMetrics
}

class LogReporter {
  private errorBuffer: ErrorLog[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private isInitialized = false
  private userId?: string

  /** 批量发送间隔 (毫秒) */
  private readonly FLUSH_INTERVAL = 5000
  
  /** 最大缓冲区大小 */
  private readonly MAX_BUFFER_SIZE = 20

  /** 初始化日志上报器 */
  init(userId?: string): void {
    if (this.isInitialized) return
    this.isInitialized = true
    this.userId = userId

    // 监听全局错误
    window.addEventListener('error', this.handleError)
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection)

    // 收集性能指标
    this.collectPerformanceMetrics()

    // 页面卸载时发送剩余日志
    window.addEventListener('beforeunload', () => this.flush(true))
  }

  /** 设置用户 ID */
  setUserId(userId?: string): void {
    this.userId = userId
  }

  /** 销毁日志上报器 */
  destroy(): void {
    if (!this.isInitialized) return
    
    window.removeEventListener('error', this.handleError)
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
    
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    
    this.isInitialized = false
  }

  /** 手动上报错误 */
  reportError(error: Error, extra?: Record<string, unknown>): void {
    this.addError({
      type: 'error',
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      extra,
    })
  }

  /** 手动上报 React 错误边界捕获的错误 */
  reportReactError(error: Error, componentStack?: string): void {
    this.addError({
      type: 'error',
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      componentStack,
    })
  }

  /** 处理全局错误事件 */
  private handleError = (event: ErrorEvent): void => {
    this.addError({
      type: 'error',
      message: event.message,
      stack: event.error?.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  }

  /** 处理未捕获的 Promise 拒绝 */
  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = event.reason
    this.addError({
      type: 'unhandledrejection',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: this.userId,
    })
  }

  /** 添加错误到缓冲区 */
  private addError(error: ErrorLog): void {
    this.errorBuffer.push(error)

    // 如果缓冲区满了，立即发送
    if (this.errorBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.flush()
    } else {
      this.scheduleFlush()
    }
  }

  /** 调度延迟发送 */
  private scheduleFlush(): void {
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      this.flush()
    }, this.FLUSH_INTERVAL)
  }

  /** 发送缓冲区中的日志 */
  private async flush(sync = false): Promise<void> {
    if (this.errorBuffer.length === 0) return

    const batch: LogBatch = {
      errors: this.errorBuffer.splice(0),
    }

    try {
      const url = `${apiBase()}/api/logs/frontend`
      
      if (sync && navigator.sendBeacon) {
        // 页面卸载时使用 sendBeacon
        navigator.sendBeacon(url, JSON.stringify(batch))
      } else {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
        })
      }
    } catch {
      // 上报失败时静默处理，避免无限循环
      console.warn('[LogReporter] Failed to send logs')
    }
  }

  /** 收集性能指标 */
  private collectPerformanceMetrics(): void {
    // 使用 PerformanceObserver 收集 Web Vitals
    if (!('PerformanceObserver' in window)) return

    const metrics: PerformanceMetrics['metrics'] = {}
    let metricsCollected = 0
    const expectedMetrics = 3 // FCP, LCP, TTFB

    const sendMetrics = (): void => {
      if (Object.keys(metrics).length === 0) return

      const data: PerformanceMetrics = {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        userId: this.userId,
        metrics,
      }

      fetch(`${apiBase()}/api/logs/frontend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performance: data }),
      }).catch(() => {
        // 静默处理
      })
    }

    // 收集 FCP
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        for (const entry of entries) {
          if (entry.name === 'first-contentful-paint') {
            metrics.fcp = Math.round(entry.startTime)
            metricsCollected++
            fcpObserver.disconnect()
            if (metricsCollected >= expectedMetrics) sendMetrics()
          }
        }
      })
      fcpObserver.observe({ type: 'paint', buffered: true })
    } catch {
      // 不支持
    }

    // 收集 LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        if (lastEntry) {
          metrics.lcp = Math.round(lastEntry.startTime)
        }
      })
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

      // LCP 在页面交互后停止观察
      const stopLcpObserver = (): void => {
        metricsCollected++
        lcpObserver.disconnect()
        if (metricsCollected >= expectedMetrics) sendMetrics()
      }
      
      // 用户交互或页面隐藏时停止
      ['click', 'keydown', 'scroll'].forEach(type => {
        window.addEventListener(type, stopLcpObserver, { once: true, passive: true })
      })
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') stopLcpObserver()
      }, { once: true })
    } catch {
      // 不支持
    }

    // 收集 TTFB
    try {
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      if (navEntries.length > 0) {
        metrics.ttfb = Math.round(navEntries[0].responseStart)
        metricsCollected++
        if (metricsCollected >= expectedMetrics) sendMetrics()
      }
    } catch {
      // 不支持
    }

    // 5 秒后强制发送（即使没有收集完所有指标）
    setTimeout(() => {
      if (Object.keys(metrics).length > 0) {
        sendMetrics()
      }
    }, 5000)
  }
}

export const logReporter = new LogReporter()
