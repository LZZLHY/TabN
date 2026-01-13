/**
 * 日志文件存储服务
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import fs from 'node:fs'
import path from 'node:path'
import { env } from '../env'
import {
  LogFileType,
  type StorageConfig,
  type ReadOptions,
  type StorageStats,
} from '../types/logger'

/** 默认存储配置 */
const defaultConfig: StorageConfig = {
  baseDir: path.resolve(process.cwd(), env.LOG_DIR),
  retentionDays: env.LOG_RETENTION_DAYS,
  maxFileSize: 100 * 1024 * 1024, // 100MB
}

/** 获取当前日期字符串 (YYYY-MM-DD) */
export function getDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/** 根据时间戳获取日期字符串 */
export function getDateFromTimestamp(timestamp: string): string {
  return timestamp.slice(0, 10)
}

/** 日志存储类 */
export class LogStorage {
  private config: StorageConfig
  private writeStreams: Map<string, fs.WriteStream> = new Map()

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    this.ensureDirectories()
  }

  /** 确保日志目录存在 */
  private ensureDirectories(): void {
    const types = Object.values(LogFileType)
    for (const type of types) {
      const dir = path.join(this.config.baseDir, type)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    }
  }

  /** 获取日志文件路径 */
  getFilePath(type: LogFileType, date: string = getDateString()): string {
    return path.join(this.config.baseDir, type, `${date}.log`)
  }

  /** 写入日志条目 */
  async write(type: LogFileType, entry: string): Promise<void> {
    const filePath = this.getFilePath(type)
    
    try {
      // 使用追加模式写入
      await fs.promises.appendFile(filePath, entry + '\n', 'utf-8')
    } catch (err) {
      // 如果目录不存在，创建后重试
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        const dir = path.dirname(filePath)
        await fs.promises.mkdir(dir, { recursive: true })
        await fs.promises.appendFile(filePath, entry + '\n', 'utf-8')
      } else {
        throw err
      }
    }
  }

  /** 读取日志文件 */
  async read(type: LogFileType, date: string, options: ReadOptions = {}): Promise<string[]> {
    const filePath = this.getFilePath(type, date)
    
    if (!fs.existsSync(filePath)) {
      return []
    }

    const content = await fs.promises.readFile(filePath, 'utf-8')
    let lines = content.split('\n').filter(line => line.trim())

    // 关键词过滤
    if (options.filter) {
      const filterLower = options.filter.toLowerCase()
      lines = lines.filter(line => line.toLowerCase().includes(filterLower))
    }

    // 分页
    const offset = options.offset || 0
    const limit = options.limit || lines.length

    return lines.slice(offset, offset + limit)
  }

  /** 读取多天的日志 */
  async readRange(
    type: LogFileType,
    startDate: string,
    endDate: string,
    options: ReadOptions = {}
  ): Promise<string[]> {
    const results: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = getDateString(d)
      const lines = await this.read(type, dateStr, { filter: options.filter })
      results.push(...lines)
    }

    // 应用分页
    const offset = options.offset || 0
    const limit = options.limit || results.length

    return results.slice(offset, offset + limit)
  }

  /** 清理过期日志 */
  async cleanup(): Promise<{ deleted: number; errors: string[] }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays)
    const cutoffStr = getDateString(cutoffDate)

    let deleted = 0
    const errors: string[] = []

    const types = Object.values(LogFileType)
    for (const type of types) {
      const dir = path.join(this.config.baseDir, type)
      
      if (!fs.existsSync(dir)) {
        continue
      }

      const files = await fs.promises.readdir(dir)
      
      for (const file of files) {
        // 跳过非日志文件
        if (!file.endsWith('.log')) {
          continue
        }

        // 从文件名提取日期 (YYYY-MM-DD.log)
        const dateStr = file.slice(0, 10)
        
        // 如果日期早于截止日期，删除文件
        if (dateStr < cutoffStr) {
          const filePath = path.join(dir, file)
          try {
            await fs.promises.unlink(filePath)
            deleted++
          } catch (err) {
            errors.push(`Failed to delete ${filePath}: ${(err as Error).message}`)
          }
        }
      }
    }

    return { deleted, errors }
  }

  /** 获取存储统计信息 */
  async getStats(): Promise<StorageStats> {
    let totalSize = 0
    let fileCount = 0
    let oldestLog = ''
    let newestLog = ''

    const types = Object.values(LogFileType)
    
    for (const type of types) {
      const dir = path.join(this.config.baseDir, type)
      
      if (!fs.existsSync(dir)) {
        continue
      }

      const files = await fs.promises.readdir(dir)
      
      for (const file of files) {
        if (!file.endsWith('.log')) {
          continue
        }

        const filePath = path.join(dir, file)
        const stat = await fs.promises.stat(filePath)
        
        totalSize += stat.size
        fileCount++

        const dateStr = file.slice(0, 10)
        if (!oldestLog || dateStr < oldestLog) {
          oldestLog = dateStr
        }
        if (!newestLog || dateStr > newestLog) {
          newestLog = dateStr
        }
      }
    }

    return {
      totalSize,
      fileCount,
      oldestLog,
      newestLog,
    }
  }

  /** 检查磁盘空间并发出警告 */
  async checkDiskSpace(warningThresholdMB: number = 100): Promise<boolean> {
    const stats = await this.getStats()
    const sizeMB = stats.totalSize / (1024 * 1024)
    
    if (sizeMB > warningThresholdMB) {
      // 返回 true 表示需要警告
      return true
    }
    
    return false
  }

  /** 获取配置 */
  getConfig(): StorageConfig {
    return { ...this.config }
  }
}

/** 全局存储实例 */
let globalStorage: LogStorage | null = null

/** 获取全局存储实例 */
export function getLogStorage(): LogStorage {
  if (!globalStorage) {
    globalStorage = new LogStorage()
  }
  return globalStorage
}

/** 初始化全局存储 */
export function initLogStorage(config?: Partial<StorageConfig>): LogStorage {
  globalStorage = new LogStorage(config)
  return globalStorage
}
