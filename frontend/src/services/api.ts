export type ApiOk<T> = { ok: true; data: T }
export type ApiFail = { ok: false; message: string }
export type ApiResponse<T> = ApiOk<T> | ApiFail

export function apiBase() {
  // 优先使用环境变量
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined
  if (v && v.trim()) return v.trim()
  
  // 自动使用当前访问的主机名（支持 IP 访问）
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  return `${protocol}//${hostname}:3100`
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<ApiResponse<T>> {
  const url = `${apiBase()}${path}`
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json')
  if (init.token) headers.set('authorization', `Bearer ${init.token}`)

  try {
    const res = await fetch(url, { ...init, headers })
    const text = await res.text()
    try {
      const json = text ? (JSON.parse(text) as ApiResponse<T>) : ({ ok: false, message: '空响应' } as ApiFail)
      return json
    } catch {
      return { ok: false, message: '服务器响应格式错误' }
    }
  } catch (e) {
    console.error('API Fetch Error:', e)
    return { ok: false, message: '网络请求失败，请检查服务器是否启动' }
  }
}
