/**
 * 日志路由
 * Requirements: 7.6
 */

import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth'
import {
  queryLogs,
  getLogStats,
  exportLogs,
  streamLogs,
  receiveClientLogs,
} from '../controllers/logController'

export const logsRouter = Router()

// 管理员日志查看 API
logsRouter.get('/admin/logs', requireAuth, requireAdmin, queryLogs)
logsRouter.get('/admin/logs/stats', requireAuth, requireAdmin, getLogStats)
logsRouter.post('/admin/logs/export', requireAuth, requireAdmin, exportLogs)
logsRouter.get('/admin/logs/stream', requireAuth, requireAdmin, streamLogs)

// 前端日志上报 API（需要登录但不需要管理员权限）
logsRouter.post('/logs/client', requireAuth, receiveClientLogs)
