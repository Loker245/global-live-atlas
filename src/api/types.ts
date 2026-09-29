export type ApiErrorKind = 'RATE_LIMIT' | 'NETWORK' | 'NO_DATA'

export interface ApiError {
  kind: ApiErrorKind
  message: string
  source: string
}

export interface ApiResult<T> {
  data: T | null
  error: ApiError | null
}

export function ok<T>(data: T): ApiResult<T> {
  return { data, error: null }
}

export function err<T = never>(error: ApiError): ApiResult<T> {
  return { data: null, error }
}
