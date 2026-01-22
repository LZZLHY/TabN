export type BingDailyImage = {
  url: string
  copyright?: string
}

const OFFICIAL_JSON =
  'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN'

/**
 * 备用：第三方镜像，直接返回图片文件（作为 CSS background-image 使用不受 CORS 影响）
 * 说明：如果你更想“纯官方”，可以在后端加一层代理，再把前端切回 OFFICIAL_JSON。
 */
export const BING_DAILY_FALLBACK_IMAGE =
  'https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN'

export async function fetchBingDailyImage(): Promise<BingDailyImage> {
  const res = await fetch(OFFICIAL_JSON)
  if (!res.ok) throw new Error(`Bing API 状态码异常：${res.status}`)

  const data = (await res.json()) as {
    images?: Array<{ url?: string; copyright?: string }>
  }

  const first = data.images?.[0]
  const url = first?.url ? `https://www.bing.com${first.url}` : ''
  if (!url) throw new Error('Bing 返回内容缺少 images[0].url')

  return { url, copyright: first?.copyright }
}










