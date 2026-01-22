import { Router } from 'express'
import { generateAPIKey, regenerateAPIKey, getAPIKeyStatus } from '../controllers/apiKeyController'
import { requireAuth } from '../middleware/auth'

export const apiKeysRouter = Router()

// 所有 API 密钥路由都需要 JWT 认证
apiKeysRouter.use(requireAuth)

// POST /api-keys - 生成密钥
// Requirements: 5.1
apiKeysRouter.post('/', generateAPIKey)

// DELETE /api-keys - 重新生成密钥（作废旧密钥）
// Requirements: 5.2
apiKeysRouter.delete('/', regenerateAPIKey)

// GET /api-keys - 获取密钥状态
// Requirements: 5.1, 5.2
apiKeysRouter.get('/', getAPIKeyStatus)
