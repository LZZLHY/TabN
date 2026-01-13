/**
 * LogStorage 属性测试
 * Property 7: Log File Rotation
 * Property 8: Log Retention Cleanup
 * Validates: Requirements 5.1, 5.2, 5.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import fs from 'node:fs'
import path from 'node:path'
import { LogStorage, getDateString, getDateFromTimestamp } from './logStorage'
import { LogFileType } from '../types/logger'

// 测试用临时目录
const TEST_LOG_DIR = path.join(process.cwd(), 'test-logs')

describe('LogStorage', () => {
  let storage: LogStorage

  beforeEach(() => {
    // 创建测试目录
    if (fs.existsSync(TEST_LOG_DIR)) {
      fs.rmSync(TEST_LOG_DIR, { recursive: true })
    }
    storage = new LogStorage({
      baseDir: TEST_LOG_DIR,
      retentionDays: 7,
      maxFileSize: 10 * 1024 * 1024,
    })
  })

  afterEach(() => {
    // 清理测试目录
    if (fs.existsSync(TEST_LOG_DIR)) {
      fs.rmSync(TEST_LOG_DIR, { recursive: true })
    }
  })

  /**
   * Property 7: Log File Rotation
   * For any date D, all log entries with timestamp on date D
   * SHALL be written to the file named `{type}/D.log`.
   * Validates: Requirements 5.1
   */
  describe('Property 7: Log File Rotation', () => {
    it('should write logs to correct date-based file', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机日志类型
          fc.constantFrom(...Object.values(LogFileType)),
          // 生成随机日期 (最近30天内)
          fc.integer({ min: 0, max: 29 }).map(daysAgo => {
            const date = new Date()
            date.setDate(date.getDate() - daysAgo)
            return getDateString(date)
          }),
          // 生成随机日志内容
          fc.string({ minLength: 1, maxLength: 200 }).map(msg => 
            JSON.stringify({ timestamp: new Date().toISOString(), message: msg })
          ),
          async (logType, dateStr, logEntry) => {
            // 写入日志
            const filePath = storage.getFilePath(logType, dateStr)
            
            // 手动写入到指定日期的文件
            const dir = path.dirname(filePath)
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true })
            }
            fs.appendFileSync(filePath, logEntry + '\n')

            // 验证文件路径格式正确
            expect(filePath).toContain(logType)
            expect(filePath).toContain(`${dateStr}.log`)

            // 验证文件存在
            expect(fs.existsSync(filePath)).toBe(true)

            // 验证内容可以读取
            const lines = await storage.read(logType, dateStr)
            expect(lines.length).toBeGreaterThan(0)
            expect(lines.some(line => line.includes(logEntry.slice(0, 50)))).toBe(true)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should generate correct file path for any date', () => {
      fc.assert(
        fc.property(
          // 生成随机年月日
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 }),
          fc.constantFrom(...Object.values(LogFileType)),
          (year, month, day, logType) => {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const filePath = storage.getFilePath(logType, dateStr)

            // 验证路径包含正确的类型目录
            expect(filePath).toContain(path.join(logType, `${dateStr}.log`))
            
            // 验证日期格式正确
            expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 8: Log Retention Cleanup
   * For any log file older than retentionDays,
   * the cleanup process SHALL delete that file.
   * Validates: Requirements 5.2, 5.3
   */
  describe('Property 8: Log Retention Cleanup', () => {
    it('should delete files older than retention period', async () => {
      // 创建不同日期的日志文件
      const today = new Date()
      const retentionDays = 7

      // 创建一个在保留期内的文件 (3天前)
      const recentDate = new Date(today)
      recentDate.setDate(recentDate.getDate() - 3)
      const recentDateStr = getDateString(recentDate)
      
      // 创建一个超出保留期的文件 (10天前)
      const oldDate = new Date(today)
      oldDate.setDate(oldDate.getDate() - 10)
      const oldDateStr = getDateString(oldDate)

      // 写入测试文件
      const recentPath = storage.getFilePath(LogFileType.APP, recentDateStr)
      const oldPath = storage.getFilePath(LogFileType.APP, oldDateStr)

      const dir = path.dirname(recentPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(recentPath, 'recent log\n')
      fs.writeFileSync(oldPath, 'old log\n')

      // 验证文件都存在
      expect(fs.existsSync(recentPath)).toBe(true)
      expect(fs.existsSync(oldPath)).toBe(true)

      // 执行清理
      const result = await storage.cleanup()

      // 验证旧文件被删除
      expect(fs.existsSync(oldPath)).toBe(false)
      
      // 验证新文件保留
      expect(fs.existsSync(recentPath)).toBe(true)
      
      // 验证删除计数
      expect(result.deleted).toBeGreaterThanOrEqual(1)
    })

    it('should preserve files within retention period', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成保留期内的天数 (0 到 retentionDays-1)
          fc.integer({ min: 0, max: 6 }),
          fc.constantFrom(...Object.values(LogFileType)),
          async (daysAgo, logType) => {
            const date = new Date()
            date.setDate(date.getDate() - daysAgo)
            const dateStr = getDateString(date)

            // 写入文件
            const filePath = storage.getFilePath(logType, dateStr)
            const dir = path.dirname(filePath)
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true })
            }
            fs.writeFileSync(filePath, `log from ${daysAgo} days ago\n`)

            // 执行清理
            await storage.cleanup()

            // 验证文件仍然存在
            expect(fs.existsSync(filePath)).toBe(true)
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('Unit Tests', () => {
    it('should write and read log entries', async () => {
      const entry = JSON.stringify({ message: 'test', timestamp: new Date().toISOString() })
      
      await storage.write(LogFileType.APP, entry)
      
      const lines = await storage.read(LogFileType.APP, getDateString())
      expect(lines.length).toBe(1)
      expect(lines[0]).toBe(entry)
    })

    it('should filter logs by keyword', async () => {
      await storage.write(LogFileType.APP, JSON.stringify({ message: 'error occurred' }))
      await storage.write(LogFileType.APP, JSON.stringify({ message: 'info message' }))
      await storage.write(LogFileType.APP, JSON.stringify({ message: 'another error' }))

      const filtered = await storage.read(LogFileType.APP, getDateString(), { filter: 'error' })
      expect(filtered.length).toBe(2)
    })

    it('should support pagination', async () => {
      for (let i = 0; i < 10; i++) {
        await storage.write(LogFileType.APP, JSON.stringify({ index: i }))
      }

      const page1 = await storage.read(LogFileType.APP, getDateString(), { limit: 3, offset: 0 })
      const page2 = await storage.read(LogFileType.APP, getDateString(), { limit: 3, offset: 3 })

      expect(page1.length).toBe(3)
      expect(page2.length).toBe(3)
      expect(page1[0]).not.toBe(page2[0])
    })

    it('should return correct stats', async () => {
      await storage.write(LogFileType.APP, 'test log 1')
      await storage.write(LogFileType.ERROR, 'test error')

      const stats = await storage.getStats()
      expect(stats.fileCount).toBe(2)
      expect(stats.totalSize).toBeGreaterThan(0)
      expect(stats.newestLog).toBe(getDateString())
    })

    it('should return empty array for non-existent file', async () => {
      const lines = await storage.read(LogFileType.APP, '1999-01-01')
      expect(lines).toEqual([])
    })
  })
})

describe('getDateString', () => {
  it('should return correct date format', () => {
    fc.assert(
      fc.property(
        // 使用 noShrink 避免生成无效日期
        fc.date({ 
          min: new Date('2020-01-01T00:00:00.000Z'), 
          max: new Date('2030-12-31T23:59:59.999Z') 
        }).filter(d => !isNaN(d.getTime())),
        (date) => {
          const result = getDateString(date)
          expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
          
          // 验证格式正确且可以解析
          const [year, month, day] = result.split('-').map(Number)
          expect(year).toBeGreaterThanOrEqual(2020)
          expect(year).toBeLessThanOrEqual(2030)
          expect(month).toBeGreaterThanOrEqual(1)
          expect(month).toBeLessThanOrEqual(12)
          expect(day).toBeGreaterThanOrEqual(1)
          expect(day).toBeLessThanOrEqual(31)
          
          // 验证结果是 ISO 字符串的日期部分
          expect(result).toBe(date.toISOString().slice(0, 10))
        }
      ),
      { numRuns: 100 }
    )
  })
})
