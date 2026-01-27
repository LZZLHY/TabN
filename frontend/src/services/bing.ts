export type BingDailyImage = {
  url: string
  copyright?: string
}

/**
 * 多个第三方 Bing 每日图片 API（按优先级排序）
 * 前端直接请求，无需后端代理
 */
const BING_APIS = [
  // API 1: bing.biturl.top - 返回 JSON
  {
    url: 'https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=zh-CN',
    parse: (data: Record<string, unknown>) => ({
      url: data.url as string,
      copyright: data.copyright as string | undefined,
    }),
  },
  // API 2: bing.img.run - 返回 JSON
  {
    url: 'https://bing.img.run/1920x1080.php',
    parse: (_data: Record<string, unknown>, response: Response) => ({
      url: response.url, // 重定向后的最终 URL
      copyright: undefined,
    }),
    isRedirect: true,
  },
  // API 3: bingw.jasonzeng.dev - 返回 JSON
  {
    url: 'https://bingw.jasonzeng.dev/api/bing?w=1920&h=1080',
    parse: (data: Record<string, unknown>) => ({
      url: data.url as string,
      copyright: data.copyright as string | undefined,
    }),
  },
]

/**
 * 最终回退：固定的默认背景图（可被浏览器缓存）
 * 使用 Bing 官方的一张固定图片作为默认背景
 */
export const BING_DAILY_FALLBACK_IMAGE =
  'https://www.bing.com/th?id=OHR.MeknesMorocco_ZH-CN7974498025_1920x1080.jpg'

/**
 * 获取 Bing 每日图片
 * 依次尝试多个第三方 API，全部失败时使用回退图片
 */
export async function fetchBingDailyImage(): Promise<BingDailyImage> {
  for (const api of BING_APIS) {
    try {
      const res = await fetch(api.url)
      if (res.ok) {
        if (api.isRedirect) {
          // 重定向类型的 API，直接使用最终 URL
          const result = api.parse({}, res)
          if (result.url) return result
        } else {
          // JSON 类型的 API
          const data = await res.json()
          const result = api.parse(data, res)
          if (result.url) return result
        }
      }
    } catch {
      // 当前 API 失败，尝试下一个
      continue
    }
  }
  
  // 所有 API 都失败，使用回退图片
  return { url: BING_DAILY_FALLBACK_IMAGE }
}










