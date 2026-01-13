import type { Response } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from '../types/auth'
import { fail, ok } from '../utils/http'
import { fetchTitle } from '../services/titleFetcher'
import { isValidUrlForFetch } from '../utils/url'

const FetchTitleSchema = z.object({
  url: z.string().trim().min(1, '网址不能为空'),
})

export async function fetchTitleHandler(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录')

  const parsed = FetchTitleSchema.safeParse(req.body)
  if (!parsed.success) {
    return fail(res, 400, parsed.error.issues[0]?.message ?? '参数错误')
  }

  const { url } = parsed.data

  // Validate URL format
  if (!isValidUrlForFetch(url)) {
    return fail(res, 400, '无效的网址格式')
  }

  try {
    const result = await fetchTitle(url)
    return ok(res, result)
  } catch (error) {
    return fail(res, 500, '获取标题失败')
  }
}
