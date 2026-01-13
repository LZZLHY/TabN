import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { z } from 'zod'

// 允许本地使用 backend/env.local 或 backend/env（不强依赖 .env）
const candidates = ['.env', 'env.local', 'env']
for (const name of candidates) {
  const p = path.resolve(process.cwd(), name)
  if (fs.existsSync(p)) {
    dotenv.config({ path: p })
    break
  }
}

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  PORT: z.coerce.number().int().positive().default(3100),
  HOST: z.string().default('0.0.0.0'),
  // 日志配置
  LOG_LEVEL: z.string().default('info'),
  LOG_DIR: z.string().default('./logs'),
  LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  LOG_CONSOLE: z.string().transform(v => v !== 'false').default('true'),
  LOG_FILE: z.string().transform(v => v !== 'false').default('true'),
})

export const env = EnvSchema.parse(process.env)


