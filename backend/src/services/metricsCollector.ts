/**
 * 系统指标收集器
 * 收集和暴露系统运行指标
 */

import os from 'node:os'
import { prisma } from '../prisma'

interface RequestStats {
  total: number
  success: number
  error: number
  totalResponseTime: number
}

interface Metrics {
  timestamp: string
  uptime: number
  memory: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
    arrayBuffers: number
  }
  cpu: {
    user: number
    system: number
  }
  system: {
    platform: string
    arch: string
    nodeVersion: string
    cpuCount: number
    totalMemory: number
    freeMemory: number
    loadAverage: number[]
  }
  requests: {
    total: number
    success: number
    error: number
    avgResponseTime: number
  }
  database: {
    connected: boolean
    latency: number
  }
}

class MetricsCollector {
  private requestStats: RequestStats = {
    total: 0,
    success: 0,
    error: 0,
    totalResponseTime: 0,
  }

  private startCpuUsage = process.cpuUsage()
  private startTime = Date.now()

  /** 记录请求 */
  recordRequest(success: boolean, responseTime: number): void {
    this.requestStats.total++
    if (success) {
      this.requestStats.success++
    } else {
      this.requestStats.error++
    }
    this.requestStats.totalResponseTime += responseTime
  }

  /** 收集所有指标 */
  async collect(): Promise<Metrics> {
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage(this.startCpuUsage)
    const uptime = Math.floor((Date.now() - this.startTime) / 1000)

    // 检查数据库连接
    let dbConnected = false
    let dbLatency = -1
    try {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1`
      dbLatency = Date.now() - dbStart
      dbConnected = true
    } catch {
      // 数据库连接失败
    }

    const avgResponseTime = this.requestStats.total > 0
      ? Math.round(this.requestStats.totalResponseTime / this.requestStats.total)
      : 0

    return {
      timestamp: new Date().toISOString(),
      uptime,
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpuCount: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg(),
      },
      requests: {
        total: this.requestStats.total,
        success: this.requestStats.success,
        error: this.requestStats.error,
        avgResponseTime,
      },
      database: {
        connected: dbConnected,
        latency: dbLatency,
      },
    }
  }

  /** 重置统计（用于测试） */
  reset(): void {
    this.requestStats = {
      total: 0,
      success: 0,
      error: 0,
      totalResponseTime: 0,
    }
    this.startCpuUsage = process.cpuUsage()
    this.startTime = Date.now()
  }
}

export const metricsCollector = new MetricsCollector()
