import { Router } from 'express'
import { updateIcon, batchUpdateIcons, listBookmarksForExtension } from '../controllers/iconController'
import { requireAPIKey } from '../middleware/apiKeyAuth'

export const iconsRouter = Router()

// 所有图标扩展 API 路由都需要 API Key 认证
iconsRouter.use(requireAPIKey)

// PATCH /icons/:bookmarkId - 单个更新
// Requirements: 6.1
iconsRouter.patch('/:bookmarkId', updateIcon)

// POST /icons/batch - 批量更新
// Requirements: 7.1
iconsRouter.post('/batch', batchUpdateIcons)

// GET /icons/bookmarks - 获取书签列表（供扩展使用）
iconsRouter.get('/bookmarks', listBookmarksForExtension)
