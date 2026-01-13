import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { listApprovedExtensions, submitExtension } from '../controllers/extensionController'

export const extensionsRouter = Router()

extensionsRouter.get('/public', listApprovedExtensions)
extensionsRouter.post('/', requireAuth, submitExtension)


