import express from 'express'
import cors from 'cors'
import os from 'node:os'
import { createServer } from 'http'
import { env } from './env'
import { authRouter } from './routes/auth'
import { usersRouter } from './routes/users'
import { bookmarksRouter } from './routes/bookmarks'
import { settingsRouter } from './routes/settings'
import { adminRouter } from './routes/admin'
import { extensionsRouter } from './routes/extensions'
import utilsRouter from './routes/utils'
import { logsRouter } from './routes/logs'
import { apiKeysRouter } from './routes/apiKeys'
import { iconsRouter } from './routes/icons'
import { updateRouter } from './controllers/updateController'
import { initLogger, createLogger } from './services/logger'
import { getLogStorage } from './services/logStorage'
import { requestLogger } from './middleware/requestLogger'
import { errorLogger, setupGlobalErrorHandlers } from './middleware/errorLogger'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { uptimeTracker } from './services/uptimeTracker'
import { prisma } from './prisma'
import { initSettingsWebSocket } from './services/settingsWebSocket'

// 记录启动时间
const startTime = Date.now()

// 初始化日志存储
const logStorage = getLogStorage()

// 初始化全局 Logger（连接日志存储）
initLogger((type, entry) => logStorage.write(type, entry))
const logger = createLogger('server')

// 设置全局错误处理
setupGlobalErrorHandlers()

const app = express()
const httpServer = createServer(app)

// 请求日志中间件（在所有路由之前）
app.use(requestLogger)

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))

// 健康检查端点
app.get('/health', async (_req, res) => {
  try {
    // 检查数据库连接
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - dbStart
    
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: process.env.npm_package_version || '1.1.5',
      database: {
        connected: true,
        latency: dbLatency,
      },
    })
  } catch {
    res.status(503).json({
      ok: false,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: process.env.npm_package_version || '1.1.5',
      database: {
        connected: false,
        latency: -1,
      },
    })
  }
})

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/bookmarks', bookmarksRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/admin/update', updateRouter)
app.use('/api/extensions', extensionsRouter)
app.use('/api/utils', utilsRouter)
app.use('/api', logsRouter)
app.use('/api/api-keys', apiKeysRouter)
app.use('/api/icons', iconsRouter)

// 404 处理（在所有路由之后）
app.use(notFoundHandler)

// 错误日志中间件
app.use(errorLogger)

// 统一错误处理中间件（必须放在最后）
app.use(errorHandler)

/**
 * 获取本机 IP 地址（用于日志显示）
 * 优先返回非内部的 IPv4 地址
 */
function getLocalIP(): string {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // 跳过内部地址和 IPv6
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

const HOST = env.HOST || '0.0.0.0'

// 初始化 WebSocket 服务器
initSettingsWebSocket(httpServer)

httpServer.listen(env.PORT, HOST, async () => {
  const startupTime = Date.now() - startTime
  // 日志显示时，如果是 0.0.0.0 则显示实际 IP
  const displayHost = HOST === '0.0.0.0' ? getLocalIP() : HOST
  logger.info(`Server started on http://${displayHost}:${env.PORT}`, { startupTime: `${startupTime}ms` })
  
  // 将启动时间存储到全局变量，供 API 查询
  ;(global as any).__SERVER_START_TIME__ = startTime
  ;(global as any).__SERVER_STARTUP_DURATION__ = startupTime

  // 初始化运行时长追踪器
  await uptimeTracker.initialize()
  logger.info('UptimeTracker initialized')
})

// 注册进程退出处理器，确保运行时长数据被保存
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`)
  await uptimeTracker.shutdown()
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))


