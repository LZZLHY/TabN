import type { Request } from 'express'

export type AuthPayload = {
  sub: string
}

export type AuthedRequest = Request & {
  auth?: { userId: string; role: 'USER' | 'ADMIN' | 'ROOT' }
}


