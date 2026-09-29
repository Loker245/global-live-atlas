<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as maplibregl from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Feature } from 'geojson'
import { useCountryStore } from '../stores/country'
import SourceTag from './SourceTag.vue'

maplibregl.setWorkerUrl(maplibreWorkerUrl)

const store = useCountryStore()
const mapContainer = ref<HTMLDivElement | null>(null)
let map: maplibregl.Map | null = null

type Ring = number[][]
type MultiPolygon = number[][][][]

function featureBbox(feature: Feature): [number, number, number, number] {
  const bbox: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]
  const walk = (coords: number[][]) => {
    for (const [lng, lat] of coords) {
      if (lng < bbox[0]) bbox[0] = lng
      if (lat < bbox[1]) bbox[1] = lat
      if (lng > bbox[2]) bbox[2] = lng
      if (lat > bbox[3]) bbox[3] = lat
    }
  }
  const geom = feature.geometry
  if (geom.type === 'Polygon') {
    ;(geom.coordinates as Ring[]).forEach(walk)
  } else if (geom.type === 'MultiPolygon') {
    ;(geom.coordinates as MultiPolygon).forEach((poly) => poly.forEach(walk))
  }
  return bbox
}

/** 依据包围盒大小估算合适的缩放级别 */
function zoomForBbox(bbox: [number, number, number, number]): number {
  const span = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1])
  if (span > 100) return 2
  if (span > 40) return 3
  if (span > 15) return 4
  if (span > 6) return 5
  if (span > 2) return 6
  return 7
}

function applyHighlight(isoA2: string | null) {
  if (!map || !map.getLayer('country-highlight-fill')) return
  const filter = ['==', ['get', 'ISO_A2'], isoA2 ?? ''] as maplibregl.FilterSpecification
  map.setFilter('country-highlight-fill', filter)
  map.setFilter('country-highlight-line', filter)
}

onMounted(() => {
  map = new maplibregl.Map({
    container: mapContainer.value!,
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.de/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
    },
    center: [10, 30],
    zoom: 1.6,
  })
  map.addControl(new maplibregl.NavigationControl(), 'top-right')
  // 开发环境暴露地图实例，便于端到端测试
  if (import.meta.env.DEV) {
    ;(window as unknown as { __map: maplibregl.Map }).__map = map
  }

  map.on('load', () => {
    map!.addSource('countries', {
      type: 'geojson',
      data: '/data/countries.geojson',
    })

    map!.addLayer({
      id: 'countries-fill',
      type: 'fill',
      source: 'countries',
      paint: {
        'fill-color': '#a5d8ff',
        'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.65, 0.35],
      },
    })
    map!.addLayer({
      id: 'countries-line',
      type: 'line',
      source: 'countries',
      paint: { 'line-color': '#74c0fc', 'line-width': 0.8 },
    })

    // 选中国家的高亮层（fill + outline）
    map!.addLayer({
      id: 'country-highlight-fill',
      type: 'fill',
      source: 'countries',
      filter: ['==', ['get', 'ISO_A2'], ''],
      paint: { 'fill-color': '#ffa94d', 'fill-opacity': 0.55 },
    })
    map!.addLayer({
      id: 'country-highlight-line',
      type: 'line',
      source: 'countries',
      filter: ['==', ['get', 'ISO_A2'], ''],
      paint: { 'line-color': '#e8590c', 'line-width': 2 },
    })

    map!.on('mouseenter', 'countries-fill', () => {
      map!.getCanvas().style.cursor = 'pointer'
    })
    map!.on('mouseleave', 'countries-fill', () => {
      map!.getCanvas().style.cursor = ''
    })

    map!.on('click', 'countries-fill', (e) => {
      const feature = e.features?.[0]
      if (!feature) return
      const props = (feature.properties ?? {}) as Record<string, string>
      const isoA2 = (props.ISO_A2 && props.ISO_A2 !== '-99' ? props.ISO_A2 : props.ISO_A2_EH) ?? ''
      if (!isoA2) return

      // 1) 无条件更新 store（点击第二个国家必须能切换，无任何"已选中则跳过"守卫）
      //    中心点先回退到点击坐标，bbox 计算成功后覆盖
      let center: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      let bbox: [number, number, number, number] | null = null
      try {
        bbox = featureBbox(feature as unknown as Feature)
        center = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
      } catch (err) {
        console.warn('国家包围盒计算失败，使用点击坐标', err)
      }
      store.select({
        isoA2,
        nameZh: '',
        nameEn: props.NAME ?? '',
        center,
        zoom: bbox ? zoomForBbox(bbox) : undefined,
      })

      // 2) 高亮在 store 更新之后执行，失败只告警，不阻断切换
      try {
        applyHighlight(isoA2)
      } catch (err) {
        console.warn('国家高亮失败', err)
      }
    })
  })
})

watch(
  () => store.selected,
  (country) => {
    // 高亮/飞行动画失败不能影响后续选择
    try {
      applyHighlight(country?.isoA2 ?? null)
      if (country) {
        map?.flyTo({ center: country.center, zoom: country.zoom, duration: 1500 })
      }
    } catch (err) {
      console.warn('地图高亮/定位失败', err)
    }
  },
)

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div class="map-view">
    <div ref="mapContainer" class="map-container" />
    <SourceTag source="OpenStreetMap / Natural Earth" url="https://www.openstreetmap.org/copyright" />
  </div>
</template>

<style scoped>
.map-view {
  position: relative;
  width: 100%;
  height: 100%;
}
.map-container {
  width: 100%;
  height: 100%;
}
</style>
