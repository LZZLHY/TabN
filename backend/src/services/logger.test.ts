/**
 * Logger 属性测试
 * Property 1: Log Level Filtering
 * Property 4: Log Entry Structure Consistency
 * Validates: Requirements 1.2, 1.3, 1.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { Logger } from './logger'
import { LogLevel, LogLevelNames, type LogEntry } from '../types/logger'

describe('Logger', () => {
  /**
   * Property 1: Log Level Filtering
   * For any log entry with level L and configured minimum level M,
   * the entry SHALL be output if and only if L >= M.
   * Validates: Requirements 1.5
   */
  describe('Property 1: Log Level Filtering', () => {
    it('should output logs only when level >= configured minimum level', () => {
      fc.assert(
        fc.property(
          // 生成随机的配置级别 (0-4)
          fc.integer({ min: 0, max: 4 }),
          // 生成随机的日志级别 (0-4)
          fc.integer({ min: 0, max: 4 }),
          // 生成随机消息
          fc.string({ minLength: 1, maxLength: 100 }),
          (configLevel, logLevel, message) => {
            const outputs: LogEntry[] = []
            
            // 创建 logger，禁用控制台输出，使用自定义写入器捕获输出
            const logger = new Logger('test', {
              level: configLevel as LogLevel,
              enableConsole: false,
              enableFile: true,
            }, async (_type, entry) => {
              outputs.push(JSON.parse(entry))
            })

            // 根据日志级别调用对应方法
            const methods = ['debug', 'info', 'warn', 'error', 'fatal'] as const
            const method = methods[logLevel]
            logger[method](message)

            // 验证：日志应该被输出当且仅当 logLevel >= configLevel
            const shouldOutput = logLevel >= configLevel
            
            if (shouldOutput) {
              expect(outputs.length).toBe(1)
              expect(outputs[0].level).toBe(logLevel)
              expect(outputs[0].message).toBe(message)
            } else {
              expect(outputs.length).toBe(0)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 4: Log Entry Structure Consistency
   * For any log entry, serializing to JSON then parsing back
   * SHALL produce an equivalent LogEntry object (round-trip property).
   * Validates: Requirements 1.2, 1.3
   */
  describe('Property 4: Log Entry Structure Consistency', () => {
    it('should produce consistent LogEntry after JSON round-trip', () => {
      fc.assert(
        fc.property(
          // 生成随机的日志级别
          fc.integer({ min: 0, max: 4 }),
          // 生成随机消息
          fc.string({ minLength: 1, maxLength: 200 }),
          // 生成随机 source
          fc.string({ minLength: 1, maxLength: 50 }),
          // 生成可选的 context
          fc.option(
            fc.dictionary(
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.oneof(fc.string(), fc.integer(), fc.boolean())
            ),
            { nil: undefined }
          ),
          // 生成可选的 requestId
          fc.option(fc.uuid(), { nil: undefined }),
          // 生成可选的 userId
          fc.option(fc.uuid(), { nil: undefined }),
          (level, message, source, context, requestId, userId) => {
            const outputs: string[] = []
            
            const logger = new Logger(source, {
              level: LogLevel.DEBUG, // 确保所有级别都输出
              enableConsole: false,
              enableFile: true,
            }, async (_type, entry) => {
              outputs.push(entry)
            })

            // 设置请求上下文
            if (requestId || userId) {
              logger.setRequestContext(requestId || 'req-id', userId)
            }

            // 调用日志方法
            const methods = ['debug', 'info', 'warn', 'error', 'fatal'] as const
            const method = methods[level]
            logger[method](message, context)

            // 验证 JSON 往返一致性
            expect(outputs.length).toBe(1)
            const jsonStr = outputs[0]
            const parsed = JSON.parse(jsonStr) as LogEntry
            const reserialized = JSON.stringify(parsed)
            const reparsed = JSON.parse(reserialized) as LogEntry

            // 验证关键字段
            expect(reparsed.level).toBe(level)
            expect(reparsed.levelName).toBe(LogLevelNames[level as LogLevel])
            expect(reparsed.message).toBe(message)
            expect(reparsed.source).toBe(source)
            expect(typeof reparsed.timestamp).toBe('string')
            
            // 验证 timestamp 是有效的 ISO 8601 格式
            expect(new Date(reparsed.timestamp).toISOString()).toBe(reparsed.timestamp)

            // 验证 context
            if (context && Object.keys(context).length > 0) {
              expect(reparsed.context).toEqual(context)
            }

            // 验证 requestId
            if (requestId) {
              expect(reparsed.requestId).toBe(requestId)
            }

            // 验证 userId
            if (userId) {
              expect(reparsed.userId).toBe(userId)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Unit Tests', () => {
    it('should create child logger with same context', () => {
      const outputs: LogEntry[] = []
      const parent = new Logger('parent', {
        level: LogLevel.DEBUG,
        enableConsole: false,
        enableFile: true,
      }, async (_type, entry) => {
        outputs.push(JSON.parse(entry))
      })

      parent.setRequestContext('req-123', 'user-456')
      const child = parent.child('child-module')
      child.info('test message')

      expect(outputs.length).toBe(1)
      expect(outputs[0].source).toBe('child-module')
      expect(outputs[0].requestId).toBe('req-123')
      expect(outputs[0].userId).toBe('user-456')
    })

    it('should include all required fields in log entry', () => {
      const outputs: LogEntry[] = []
      const logger = new Logger('test', {
        level: LogLevel.DEBUG,
        enableConsole: false,
        enableFile: true,
      }, async (_type, entry) => {
        outputs.push(JSON.parse(entry))
      })

      logger.info('test message', { key: 'value' })

      expect(outputs.length).toBe(1)
      const entry = outputs[0]
      expect(entry).toHaveProperty('timestamp')
      expect(entry).toHaveProperty('level')
      expect(entry).toHaveProperty('levelName')
      expect(entry).toHaveProperty('message')
      expect(entry).toHaveProperty('source')
      expect(entry).toHaveProperty('context')
    })
  })
})
