const PREFIX = 'hqss:'

interface CacheEntry<T> {
  value: T
  /** 过期时间戳（ms） */
  expireAt: number
}

function fullKey(key: string): string {
  return PREFIX + key
}

/**
 * 读取缓存；不存在或已过期返回 null（过期时顺带清理）
 */
export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(fullKey(key))
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (typeof entry.expireAt !== 'number' || Date.now() > entry.expireAt) {
      localStorage.removeItem(fullKey(key))
      return null
    }
    return entry.value
  } catch {
    return null
  }
}

/**
 * 写入缓存
 * @param ttlMs 有效期（毫秒）
 */
export function setCache<T>(key: string, value: T, ttlMs: number): void {
  try {
    const entry: CacheEntry<T> = { value, expireAt: Date.now() + ttlMs }
    localStorage.setItem(fullKey(key), JSON.stringify(entry))
  } catch {
    // 存储满等异常时静默失败，不影响主流程
  }
}

/**
 * 清除缓存；不传 key 时清除所有 hqss: 前缀缓存
 */
export function clearCache(key?: string): void {
  try {
    if (key) {
      localStorage.removeItem(fullKey(key))
      return
    }
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) toRemove.push(k)
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}
