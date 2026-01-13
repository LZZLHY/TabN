import { Router } from 'express'
import { updateMyNickname } from '../controllers/userController'
import { requireAuth } from '../middleware/auth'

export const usersRouter = Router()

usersRouter.patch('/me/nickname', requireAuth, updateMyNickname)


