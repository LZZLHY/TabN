import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../env'

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10)
  return await bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, passwordHash: string) {
  return await bcrypt.compare(password, passwordHash)
}

export function signToken(userId: string, tokenVersion: number = 0) {
  return jwt.sign({ sub: userId, v: tokenVersion }, env.JWT_SECRET, { expiresIn: '30d' })
}


