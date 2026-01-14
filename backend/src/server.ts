import express from 'express'
import cors from 'cors'
import { env } from './env'
import { authRouter } from './routes/auth'
import { usersRouter } from './routes/users'
import { bookmarksRouter } from './routes/bookmarks'
import { settingsRouter } from './routes/settings'
import { adminRouter } from './routes/admin'
import { extensionsRouter } from './routes/extensions'
import utilsRouter from './routes/utils'
import { logsRouter } from './routes/logs'
import { updateRouter } from './controllers/updateController'
import { initLogger, createLogger } from './services/logger'
import { getLogStorage } from './services/logStorage'
import { requestLogger } from './middleware/requestLogger'
import { errorLogger, setupGlobalErrorHandlers } from './middleware/errorLogger'

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

// 请求日志中间件（在所有路由之前）
app.use(requestLogger)

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/bookmarks', bookmarksRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/admin/update', updateRouter)
app.use('/api/extensions', extensionsRouter)
app.use('/api/utils', utilsRouter)
app.use('/api', logsRouter)

app.use((req, res) => res.status(404).json({ ok: false, message: `Not Found: ${req.method} ${req.path}` }))

// 错误日志中间件（在所有路由之后）
app.use(errorLogger)

// 通用错误处理器
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error in request', { error: err.message, stack: err.stack })
  res.status(500).json({ ok: false, message: '服务器内部错误' })
})

const HOST = env.HOST || '0.0.0.0'
app.listen(env.PORT, HOST, () => {
  const startupTime = Date.now() - startTime
  logger.info(`Server started on http://${HOST}:${env.PORT}`, { startupTime: `${startupTime}ms` })
  
  // 将启动时间存储到全局变量，供 API 查询
  ;(global as any).__SERVER_START_TIME__ = startTime
  ;(global as any).__SERVER_STARTUP_DURATION__ = startupTime
})


