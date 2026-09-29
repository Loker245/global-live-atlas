<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { dataSourceLabel } from '../api/countries'
import SourceTag from './SourceTag.vue'

const props = defineProps<{
  nameZh: string
  population?: number
  area?: number
}>()

const popChartEl = ref<HTMLDivElement | null>(null)
const areaChartEl = ref<HTMLDivElement | null>(null)
let popChart: echarts.ECharts | null = null
let areaChart: echarts.ECharts | null = null

const fmt = (n?: number) => (n == null ? '-' : n.toLocaleString('zh-CN'))

function renderCharts() {
  if (!popChart || !areaChart) return

  popChart.setOption({
    title: { text: '人口', left: 'center', textStyle: { fontSize: 14 } },
    grid: { left: 20, right: 20, top: 40, bottom: 30, containLabel: true },
    xAxis: { type: 'category', data: [props.nameZh || '当前国家'] },
    yAxis: { type: 'value', name: '人' },
    series: [
      {
        type: 'bar',
        data: [props.population ?? 0],
        barWidth: 60,
        itemStyle: { color: '#5470c6' },
        label: { show: true, position: 'top', formatter: () => fmt(props.population) },
      },
    ],
    tooltip: { trigger: 'axis' },
  })

  areaChart.setOption({
    title: { text: '面积', left: 'center', textStyle: { fontSize: 14 } },
    grid: { left: 20, right: 30, top: 40, bottom: 30, containLabel: true },
    xAxis: { type: 'value', name: 'km²' },
    yAxis: { type: 'category', data: [props.nameZh || '当前国家'] },
    series: [
      {
        type: 'bar',
        data: [props.area ?? 0],
        barWidth: 36,
        itemStyle: { color: '#91cc75' },
        label: { show: true, position: 'right', formatter: () => `${fmt(props.area)} km²` },
      },
    ],
    tooltip: { trigger: 'axis' },
  })
}

function resize() {
  popChart?.resize()
  areaChart?.resize()
}

defineExpose({ resize })

watch(() => [props.population, props.area, props.nameZh], renderCharts)

onMounted(() => {
  popChart = echarts.init(popChartEl.value!)
  areaChart = echarts.init(areaChartEl.value!)
  renderCharts()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  popChart?.dispose()
  areaChart?.dispose()
})
</script>

<template>
  <div class="charts-panel">
    <div ref="popChartEl" class="chart" />
    <div ref="areaChartEl" class="chart" />
    <SourceTag :source="dataSourceLabel" url="https://github.com/mledoze/countries" />
  </div>
</template>

<style scoped>
.charts-panel {
  position: relative;
  padding-bottom: 28px;
}
.chart {
  width: 100%;
  height: 240px;
}
</style>
