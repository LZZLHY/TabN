/**
 * 核心日志服务
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { env } from '../env'
import {
  LogLevel,
  LogLevelNames,
  parseLogLevel,
  type LogEntry,
  type LoggerConfig,
  type ILogger,
  LogFileType,
} from '../types/logger'

// 控制台颜色代码
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: COLORS.dim,
  [LogLevel.INFO]: COLORS.green,
  [LogLevel.WARN]: COLORS.yellow,
  [LogLevel.ERROR]: COLORS.red,
  [LogLevel.FATAL]: COLORS.magenta,
}

/** 日志存储写入函数类型 */
type LogWriter = (type: LogFileType, entry: string) => Promise<void>

/** 默认配置 */
const defaultConfig: LoggerConfig = {
  level: parseLogLevel(env.LOG_LEVEL),
  enableConsole: env.LOG_CONSOLE,
  enableFile: env.LOG_FILE,
  logDir: env.LOG_DIR,
  retentionDays: env.LOG_RETENTION_DAYS,
}

/** Logger 实现类 */
export class Logger implements ILogger {
  private config: LoggerConfig
  private source: string
  private requestId?: string
  private userId?: string
  private writer?: LogWriter

  constructor(
    source: string = 'app',
    config: Partial<LoggerConfig> = {},
    writer?: LogWriter
  ) {
    this.source = source
    this.config = { ...defaultConfig, ...config }
    this.writer = writer
  }

  /** 设置日志写入器 */
  setWriter(writer: LogWriter): void {
    this.writer = writer
  }

  /** 设置请求上下文 */
  setRequestContext(requestId: string, userId?: string): void {
    this.requestId = requestId
    this.userId = userId
  }

  /** 清除请求上下文 */
  clearRequestContext(): void {
    this.requestId = undefined
    this.userId = undefined
  }

  /** 创建子 logger */
  child(source: string): ILogger {
    const childLogger = new Logger(source, this.config, this.writer)
    childLogger.requestId = this.requestId
    childLogger.userId = this.userId
    return childLogger
  }

  /** DEBUG 级别日志 */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  /** INFO 级别日志 */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context)
  }

  /** WARN 级别日志 */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context)
  }

  /** ERROR 级别日志 */
  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context)
  }

  /** FATAL 级别日志 */
  fatal(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, context)
  }

  /** 核心日志方法 */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    // 日志级别过滤
    if (level < this.config.level) {
      return
    }

    const entry = this.createEntry(level, message, context)

    // 输出到控制台
    if (this.config.enableConsole) {
      this.writeToConsole(entry)
    }

    // 写入文件
    if (this.config.enableFile && this.writer) {
      const fileType = this.getFileType(level)
      const jsonLine = JSON.stringify(entry)
      this.writer(fileType, jsonLine).catch((err) => {
        // 写入失败时输出到 stderr
        process.stderr.write(`[Logger] Failed to write log: ${err.message}\n`)
      })
    }
  }

  /** 创建日志条目 */
  private createEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LogLevelNames[level],
      message,
      source: this.source,
    }

    if (context && Object.keys(context).length > 0) {
      entry.context = context
    }

    if (this.requestId) {
      entry.requestId = this.requestId
    }

    if (this.userId) {
      entry.userId = this.userId
    }

    return entry
  }

  /** 输出到控制台（开发模式使用彩色格式） */
  private writeToConsole(entry: LogEntry): void {
    const color = LEVEL_COLORS[entry.level]
    const time = entry.timestamp.slice(11, 23) // HH:mm:ss.SSS
    const levelPad = entry.levelName.padEnd(5)
    
    let line = `${COLORS.dim}${time}${COLORS.reset} ${color}${levelPad}${COLORS.reset} ${COLORS.cyan}[${entry.source}]${COLORS.reset} ${entry.message}`
    
    if (entry.requestId) {
      line += ` ${COLORS.dim}(${entry.requestId})${COLORS.reset}`
    }

    if (entry.context) {
      line += ` ${COLORS.dim}${JSON.stringify(entry.context)}${COLORS.reset}`
    }

    if (entry.level >= LogLevel.ERROR) {
      console.error(line)
    } else if (entry.level === LogLevel.WARN) {
      console.warn(line)
    } else {
      console.log(line)
    }
  }

  /** 根据日志级别确定文件类型 */
  private getFileType(level: LogLevel): LogFileType {
    if (level >= LogLevel.ERROR) {
      return LogFileType.ERROR
    }
    return LogFileType.APP
  }
}

/** 全局 logger 实例 */
let globalLogger: Logger | null = null

/** 获取全局 logger */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger('app')
  }
  return globalLogger
}

/** 初始化全局 logger（带写入器） */
export function initLogger(writer?: LogWriter): Logger {
  globalLogger = new Logger('app', {}, writer)
  return globalLogger
}

/** 创建模块专用 logger */
export function createLogger(source: string): ILogger {
  return getLogger().child(source)
}

// 导出便捷方法
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => getLogger().debug(message, context),
  info: (message: string, context?: Record<string, unknown>) => getLogger().info(message, context),
  warn: (message: string, context?: Record<string, unknown>) => getLogger().warn(message, context),
  error: (message: string, context?: Record<string, unknown>) => getLogger().error(message, context),
  fatal: (message: string, context?: Record<string, unknown>) => getLogger().fatal(message, context),
}
