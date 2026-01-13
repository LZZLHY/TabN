import { Router } from 'express'
import { login, me, register } from '../controllers/authController'
import { requireAuth } from '../middleware/auth'

export const authRouter = Router()

authRouter.post('/register', register)
authRouter.post('/login', login)
authRouter.get('/me', requireAuth, me)


