/**
 * 前端日志接收路由
 * 
 * 接收前端上报的错误日志和性能指标
 */

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { createLogger } from '../services/logger'
import { getLogStorage } from '../services/logStorage'
import { LogFileType } from '../types/logger'

const router = Router()
const logger = createLogger('frontend-logs')

/** 错误日志 schema */
const ErrorLogSchema = z.object({
  type: z.enum(['error', 'unhandledrejection']),
  message: z.string(),
  stack: z.string().optional(),
  url: z.string(),
  userAgent: z.string(),
  timestamp: z.string(),
  userId: z.string().optional(),
  componentStack: z.string().optional(),
  extra: z.record(z.unknown()).optional(),
})

/** 性能指标 schema */
const PerformanceMetricsSchema = z.object({
  url: z.string(),
  userAgent: z.string(),
  timestamp: z.string(),
  userId: z.string().optional(),
  metrics: z.object({
    fcp: z.number().optional(),
    lcp: z.number().optional(),
    fid: z.number().optional(),
    cls: z.number().optional(),
    ttfb: z.number().optional(),
  }),
})

/** 日志批次 schema */
const LogBatchSchema = z.object({
  errors: z.array(ErrorLogSchema).optional(),
  performance: PerformanceMetricsSchema.optional(),
})

/**
 * POST /api/logs/frontend - 接收前端日志
 */
router.post('/frontend', async (req: Request, res: Response) => {
  try {
    const parsed = LogBatchSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ ok: false, message: '日志格式无效' })
    }

    const { errors, performance } = parsed.data
    const storage = getLogStorage()

    // 处理错误日志
    if (errors && errors.length > 0) {
      for (const error of errors) {
        // 记录到日志系统
        logger.error('Frontend error', {
          type: error.type,
          message: error.message,
          url: error.url,
          userId: error.userId,
          stack: error.stack?.slice(0, 500), // 截断堆栈
        })

        // 写入错误日志文件
        const logEntry = JSON.stringify({
          timestamp: error.timestamp,
          source: 'frontend',
          type: error.type,
          message: error.message,
          stack: error.stack,
          url: error.url,
          userAgent: error.userAgent,
          userId: error.userId,
          componentStack: error.componentStack,
          extra: error.extra,
        })
        
        await storage.write(LogFileType.ERROR, logEntry)
      }
      
      logger.info('Received frontend errors', { count: errors.length })
    }

    // 处理性能指标
    if (performance) {
      logger.info('Frontend performance metrics', {
        url: performance.url,
        userId: performance.userId,
        fcp: performance.metrics.fcp,
        lcp: performance.metrics.lcp,
        ttfb: performance.metrics.ttfb,
      })

      // 写入应用日志文件
      const logEntry = JSON.stringify({
        timestamp: performance.timestamp,
        source: 'frontend',
        type: 'performance',
        url: performance.url,
        userAgent: performance.userAgent,
        userId: performance.userId,
        metrics: performance.metrics,
      })
      
      await storage.write(LogFileType.APP, logEntry)
    }

    res.json({ ok: true })
  } catch (error) {
    logger.error('Failed to process frontend logs', { error })
    res.status(500).json({ ok: false, message: '处理日志失败' })
  }
})

export const frontendLogsRouter = router
