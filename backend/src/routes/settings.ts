import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { getMySettings, putMySettings } from '../controllers/settingsController'

export const settingsRouter = Router()

settingsRouter.get('/me', requireAuth, getMySettings)
settingsRouter.put('/me', requireAuth, putMySettings)


