/**
 * 图标预设路由
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
import { Router } from 'express'
import { listPresets, createPreset, deletePreset, updatePreset } from '../controllers/presetController'
import { requireAuth } from '../middleware/auth'

export const presetsRouter = Router()

// 所有预设路由都需要认证
presetsRouter.get('/', requireAuth, listPresets)
presetsRouter.post('/', requireAuth, createPreset)
presetsRouter.patch('/:id', requireAuth, updatePreset)
presetsRouter.delete('/:id', requireAuth, deletePreset)
