import { ref } from 'vue'
import { httpGet } from './http'
import { err, ok, type ApiError, type ApiResult } from './types'
import { getCache, setCache } from '../utils/cache'

/**
 * 数据源：world-countries 完整数据集（v3.1 结构，基于 mledoze/countries 并补全
 * population / timezones 字段），经 jsDelivr CDN 分发。
 * 注：mledoze/countries 原始仓库不含 population / timezones，不满足信息卡需求。
 */
const CDN_URL = 'https://cdn.jsdelivr.net/gh/mariuspatru/restcountries@main/all-countries-v3.1.json'
/** 本地降级源（public/data/countries-data.json） */
const LOCAL_URL = '/data/countries-data.json'
const CACHE_KEY = 'countries:all'
const TTL_24H = 24 * 60 * 60 * 1000

export interface CountryInfo {
  name: { common: string; official: string }
  cca2: string
  capital?: string[]
  population?: number
  area?: number
  region?: string
  languages?: Record<string, string>
  currencies?: Record<string, { name: string; symbol?: string }>
  timezones?: string[]
  flags?: { png?: string; svg?: string; alt?: string }
  translations?: Record<string, { common: string; official: string }>
  /** [lat, lng] */
  latlng?: number[]
}

export interface CountrySearchItem {
  cca2: string
  nameZh: string
  nameEn: string
  /** [lng, lat]，数据缺失时为 null */
  center: [number, number] | null
}

/** 数据来源标注（供 SourceTag 展示，降级时追加「（本地数据）」） */
export const dataSourceLabel = ref('world-countries')

let pending: Promise<ApiResult<CountryInfo[]>> | null = null
/** 会话内内存缓存，避免每次查询都对 localStorage 的大字符串重复 JSON.parse */
let memoryCache: CountryInfo[] | null = null

function fail(error: ApiError): ApiResult<CountryInfo[]> {
  return { data: null, error }
}

/** 加载完整数据集：localStorage 24h 缓存 → jsDelivr CDN → 本地降级 */
function loadDataset(): Promise<ApiResult<CountryInfo[]>> {
  if (pending) return pending

  pending = (async (): Promise<ApiResult<CountryInfo[]>> => {
    if (memoryCache) {
      return ok(memoryCache)
    }

    const cached = getCache<CountryInfo[]>(CACHE_KEY)
    if (cached) {
      memoryCache = cached
      dataSourceLabel.value = 'world-countries'
      return ok(cached)
    }

    const cdn = await httpGet<CountryInfo[]>(CDN_URL, { source: 'jsDelivr' })
    if (cdn.data) {
      setCache(CACHE_KEY, cdn.data, TTL_24H)
      memoryCache = cdn.data
      dataSourceLabel.value = 'world-countries'
      return cdn
    }

    // CDN 失败 → 自动降级到本地打包数据（不写入缓存，下次仍优先尝试 CDN）
    const local = await httpGet<CountryInfo[]>(LOCAL_URL, { source: '本地数据' })
    if (local.data) {
      memoryCache = local.data
      dataSourceLabel.value = 'world-countries（本地数据）'
      return local
    }

    return fail({
      kind: 'NETWORK',
      message: `CDN 与本地数据均加载失败（CDN：${cdn.error?.message}；本地：${local.error?.message}）`,
      source: 'world-countries',
    })
  })().finally(() => {
    pending = null
  })

  return pending
}

/**
 * 按 ISO alpha-2 查询国家信息
 */
export async function getCountryByCode(code: string): Promise<ApiResult<CountryInfo>> {
  const res = await loadDataset()
  if (res.error || !res.data) {
    return err<CountryInfo>(res.error!)
  }
  const country = res.data.find((c) => c.cca2 === code.toUpperCase())
  if (!country) {
    return err({ kind: 'NO_DATA', message: `数据集中未找到国家代码：${code}`, source: 'world-countries' })
  }
  return ok(country)
}

/** 上游数据集缺失 zho 翻译的中文名补丁 */
const ZH_NAME_FIXES: Record<string, string> = {
  CN: '中国',
  SG: '新加坡',
  HK: '中国香港',
  MO: '中国澳门',
  TW: '中国台湾',
}

/** 取中文常用名（优先 translations.zho.common，其次补丁表，最后回退英文名） */
export function zhName(info: CountryInfo): string {
  return info.translations?.zho?.common ?? ZH_NAME_FIXES[info.cca2] ?? info.name.common
}

/**
 * 本地模糊搜索：匹配 translations.zho.common / name.common / cca2（忽略大小写）
 */
export async function searchCountries(keyword: string, limit = 8): Promise<CountrySearchItem[]> {
  const q = keyword.trim().toLowerCase()
  if (!q) return []
  const res = await loadDataset()
  if (!res.data) return []

  const out: CountrySearchItem[] = []
  for (const c of res.data) {
    const zh = c.translations?.zho?.common ?? ZH_NAME_FIXES[c.cca2] ?? ''
    const en = c.name.common
    if (
      zh.toLowerCase().includes(q) ||
      en.toLowerCase().includes(q) ||
      c.cca2.toLowerCase() === q
    ) {
      out.push({
        cca2: c.cca2,
        nameZh: zh || en,
        nameEn: en,
        center: c.latlng ? [c.latlng[1], c.latlng[0]] : null,
      })
      if (out.length >= limit) break
    }
  }
  return out
}
