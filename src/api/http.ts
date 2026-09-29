import { err, ok, type ApiResult } from './types'

export interface HttpOptions {
  /** 数据来源标识，用于 ApiError.source */
  source: string
  headers?: Record<string, string>
  /** 视为“空结果”的判定函数；默认判断 null / 空数组 */
  isEmpty?: (data: unknown) => boolean
}

const defaultIsEmpty = (data: unknown): boolean =>
  data == null || (Array.isArray(data) && data.length === 0)

/**
 * fetch 封装：
 * - HTTP 429  → RATE_LIMIT
 * - 网络异常   → NETWORK
 * - 空结果     → NO_DATA
 */
export async function httpGet<T>(url: string, options: HttpOptions): Promise<ApiResult<T>> {
  const isEmpty = options.isEmpty ?? defaultIsEmpty
  try {
    const resp = await fetch(url, { headers: options.headers })

    if (resp.status === 429) {
      return err({
        kind: 'RATE_LIMIT',
        message: `请求过于频繁（HTTP 429）：${url}`,
        source: options.source,
      })
    }

    if (resp.status === 404) {
      return err({
        kind: 'NO_DATA',
        message: `未找到数据（HTTP 404）：${url}`,
        source: options.source,
      })
    }

    if (!resp.ok) {
      return err({
        kind: 'NETWORK',
        message: `HTTP ${resp.status}：${url}`,
        source: options.source,
      })
    }

    const data = (await resp.json()) as T

    if (isEmpty(data)) {
      return err({
        kind: 'NO_DATA',
        message: `返回结果为空：${url}`,
        source: options.source,
      })
    }

    return ok(data)
  } catch (e) {
    return err({
      kind: 'NETWORK',
      message: e instanceof Error ? e.message : String(e),
      source: options.source,
    })
  }
}
