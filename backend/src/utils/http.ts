import type { Response } from 'express'

export function ok<T>(res: Response, data: T) {
  return res.json({ ok: true, data })
}

export function fail(res: Response, status: number, message: string) {
  return res.status(status).json({ ok: false, message })
}


