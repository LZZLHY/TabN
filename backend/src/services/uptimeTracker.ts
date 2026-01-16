/**
 * UptimeTracker 服务
 * 负责管理服务的总运行时长统计
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.9, 3.2
 */

import { prisma } from '../prisma'
import { createLogger } from './logger'

const logger = createLogger('UptimeTracker')

/** 运行时长数据结构 */
interface UptimeData {
  totalMs: number
  lastSaveTime: string
}

/** 数据库存储的 key */
const UPTIME_KEY = 'total_uptime'

/** 默认保存间隔（1分钟） */
const DEFAULT_SAVE_INTERVAL_MS = 60 * 1000

/**
 * UptimeTracker 类
 * 负责追踪和管理服务的累计运行时长
 */
class UptimeTracker {
  /** 历史累计运行时长（毫秒） */
  private totalUptimeMs: number = 0
  
  /** 本次会话开始时间戳 */
  private sessionStartTime: number = 0
  
  /** 定期保存的定时器 */
  private saveInterval: NodeJS.Timeout | null = null
  
  /** 是否已初始化 */
  private initialized: boolean = false

  /**
   * 初始化：从数据库加载历史数据
   * Requirements: 2.2, 2.5, 3.3
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('UptimeTracker already initialized')
      return
    }

    // 记录会话开始时间
    this.sessionStartTime = Date.now()

    try {
      // 从数据库读取历史运行时长
      const config = await prisma.systemConfig.findUnique({
        where: { key: UPTIME_KEY }
      })

      if (config) {
        try {
          const data: UptimeData = JSON.parse(config.value)
          this.totalUptimeMs = data.totalMs || 0
          logger.info('Loaded uptime data from database', {
            totalMs: this.totalUptimeMs,
            lastSaveTime: data.lastSaveTime
          })
        } catch (parseError) {
          // 数据格式损坏：从零开始计算，记录警告日志
          logger.warn('Uptime data corrupted, starting from zero', {
            error: parseError instanceof Error ? parseError.message : String(parseError)
          })
          this.totalUptimeMs = 0
        }
      } else {
        // 首次运行，从零开始
        logger.info('No previous uptime data found, starting from zero')
        this.totalUptimeMs = 0
      }
    } catch (dbError) {
      // 数据库读取失败：从零开始计算，记录警告日志
      logger.warn('Failed to read uptime data from database, starting from zero', {
        error: dbError instanceof Error ? dbError.message : String(dbError)
      })
      this.totalUptimeMs = 0
    }

    this.initialized = true
    
    // 启动定期保存任务
    this.startPeriodicSave()
  }

  /**
   * 获取当前总运行时长（历史 + 本次会话）
   * Requirements: 2.1, 2.3
   * @returns 总运行时长（毫秒）
   */
  getTotalUptime(): number {
    return this.totalUptimeMs + this.getSessionUptime()
  }

  /**
   * 获取本次会话运行时长
   * @returns 本次会话运行时长（毫秒）
   */
  getSessionUptime(): number {
    if (this.sessionStartTime === 0) {
      return 0
    }
    return Date.now() - this.sessionStartTime
  }

  /**
   * 保存当前运行时长到数据库
   * Requirements: 2.4, 3.2, 3.4
   */
  async save(): Promise<void> {
    const currentTotal = this.getTotalUptime()
    const now = new Date().toISOString()

    const data: UptimeData = {
      totalMs: currentTotal,
      lastSaveTime: now
    }

    try {
      await prisma.systemConfig.upsert({
        where: { key: UPTIME_KEY },
        update: {
          value: JSON.stringify(data)
        },
        create: {
          key: UPTIME_KEY,
          value: JSON.stringify(data)
        }
      })

      logger.debug('Uptime data saved', {
        totalMs: currentTotal,
        lastSaveTime: now
      })
    } catch (dbError) {
      // 数据库写入失败：记录错误日志，下次定时任务重试
      logger.error('Failed to save uptime data to database', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        totalMs: currentTotal
      })
    }
  }

  /**
   * 重置运行时长（用于系统初始化）
   * Requirements: 2.7
   */
  async reset(): Promise<void> {
    this.totalUptimeMs = 0
    this.sessionStartTime = Date.now()

    const data: UptimeData = {
      totalMs: 0,
      lastSaveTime: new Date().toISOString()
    }

    try {
      await prisma.systemConfig.upsert({
        where: { key: UPTIME_KEY },
        update: {
          value: JSON.stringify(data)
        },
        create: {
          key: UPTIME_KEY,
          value: JSON.stringify(data)
        }
      })

      logger.info('Uptime data reset to zero')
    } catch (dbError) {
      logger.error('Failed to reset uptime data in database', {
        error: dbError instanceof Error ? dbError.message : String(dbError)
      })
    }
  }

  /**
   * 启动定期保存任务
   * Requirements: 2.9
   * @param intervalMs 保存间隔（毫秒），默认 1 分钟
   */
  startPeriodicSave(intervalMs: number = DEFAULT_SAVE_INTERVAL_MS): void {
    // 如果已有定时器，先停止
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
    }

    this.saveInterval = setInterval(async () => {
      await this.save()
    }, intervalMs)

    logger.info('Periodic save started', { intervalMs })
  }

  /**
   * 停止定期保存并保存最终数据
   * Requirements: 2.4
   */
  async shutdown(): Promise<void> {
    // 停止定期保存
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
      this.saveInterval = null
    }

    // 保存最终数据
    await this.save()

    logger.info('UptimeTracker shutdown complete', {
      totalUptime: this.getTotalUptime()
    })
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized
  }
}

// 单例导出
export const uptimeTracker = new UptimeTracker()

// 导出类以便测试
export { UptimeTracker }
