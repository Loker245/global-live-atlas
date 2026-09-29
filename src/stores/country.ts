import { defineStore } from 'pinia'

export interface SelectedCountry {
  /** ISO 3166-1 alpha-2 代码 */
  isoA2: string
  /** 中文名（可能为空，由 REST Countries 补充） */
  nameZh: string
  /** 英文名 */
  nameEn: string
  /** 中心点 [lng, lat] */
  center: [number, number]
  /** flyTo 目标缩放级别（可选，缺省由地图决定） */
  zoom?: number
}

export const useCountryStore = defineStore('country', {
  state: () => ({
    selected: null as SelectedCountry | null,
  }),
  actions: {
    select(country: SelectedCountry) {
      this.selected = country
    },
    clear() {
      this.selected = null
    },
  },
})
