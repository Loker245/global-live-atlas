<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useCountryStore } from '../stores/country'
import { dataSourceLabel, getCountryByCode, zhName, type CountryInfo } from '../api/countries'
import ChartsPanel from './ChartsPanel.vue'
import SourceTag from './SourceTag.vue'

const store = useCountryStore()

const visible = ref(false)
const loading = ref(false)
const info = ref<CountryInfo | null>(null)
const activeTab = ref('overview')
const chartsRef = ref<InstanceType<typeof ChartsPanel> | null>(null)

/** ISO alpha-2 → 国旗 emoji */
function flagEmoji(isoA2: string): string {
  if (!/^[A-Z]{2}$/.test(isoA2)) return '🏳️'
  return String.fromCodePoint(...[...isoA2].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

const titleZh = computed(() =>
  info.value ? zhName(info.value) : store.selected?.nameZh || store.selected?.nameEn || '',
)
const titleEn = computed(() => info.value?.name.common ?? store.selected?.nameEn ?? '')

const languages = computed(() =>
  info.value?.languages ? Object.values(info.value.languages).join('、') : '-',
)
const currencies = computed(() => {
  const c = info.value?.currencies
  if (!c) return '-'
  return Object.values(c)
    .map((v) => `${v.name}${v.symbol ? `（${v.symbol}）` : ''}`)
    .join('、')
})
const timezones = computed(() => info.value?.timezones?.join('、') ?? '-')

watch(
  () => store.selected,
  async (country) => {
    if (!country) {
      visible.value = false
      info.value = null
      return
    }
    visible.value = true
    info.value = null
    if (!country.isoA2) return
    loading.value = true
    const { data, error } = await getCountryByCode(country.isoA2)
    loading.value = false
    if (error) {
      ElMessage.warning(
        error.kind === 'RATE_LIMIT'
          ? '国家信息请求过于频繁，请稍后再试'
          : error.kind === 'NO_DATA'
            ? '未查询到该国信息'
            : `国家信息加载失败：${error.message}`,
      )
      return
    }
    info.value = data
    // 注意：不能在此 watcher 内回写 store.selected（会形成无限递归触发），
    // 面板标题直接使用本地 info 计算即可
  },
)

function onTabChange() {
  // Tab 切换后容器尺寸变化，触发图表 resize
  nextTick(() => chartsRef.value?.resize())
}

function onClose() {
  store.clear()
}

const fmt = (n?: number) => (n == null ? '-' : n.toLocaleString('zh-CN'))
</script>

<template>
  <el-drawer
    v-model="visible"
    direction="rtl"
    size="480px"
    :with-header="false"
    :modal="false"
    @close="onClose"
  >
    <div v-if="store.selected" class="panel">
      <header class="panel-header">
        <span class="flag">{{ flagEmoji(store.selected.isoA2) }}</span>
        <div class="names">
          <h2 class="name-zh">{{ titleZh }}</h2>
          <p class="name-en">{{ titleEn }}</p>
        </div>
      </header>

      <el-tabs v-model="activeTab" @tab-change="onTabChange">
        <el-tab-pane label="概览" name="overview">
          <div v-loading="loading" class="overview">
            <el-descriptions v-if="info" :column="1" border>
              <el-descriptions-item label="首都">
                {{ info.capital?.join('、') || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="人口">
                {{ fmt(info.population) }}
              </el-descriptions-item>
              <el-descriptions-item label="面积">
                {{ info.area != null ? `${fmt(info.area)} km²` : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="官方语言">{{ languages }}</el-descriptions-item>
              <el-descriptions-item label="货币">{{ currencies }}</el-descriptions-item>
              <el-descriptions-item label="时区">{{ timezones }}</el-descriptions-item>
            </el-descriptions>
            <el-empty v-else-if="!loading" description="暂无国家信息" />
            <SourceTag :source="dataSourceLabel" url="https://github.com/mledoze/countries" />
          </div>
        </el-tab-pane>

        <el-tab-pane label="图表" name="charts">
          <ChartsPanel
            v-if="info"
            ref="chartsRef"
            :name-zh="titleZh"
            :population="info.population"
            :area="info.area"
          />
          <el-empty v-else description="暂无图表数据" />
        </el-tab-pane>

        <el-tab-pane label="更多" name="more">
          <el-empty description="敬请期待" />
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-drawer>
</template>

<style scoped>
.panel {
  position: relative;
  height: 100%;
}
.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.flag {
  font-size: 44px;
  line-height: 1;
}
.name-zh {
  margin: 0;
  font-size: 22px;
  color: #303133;
}
.name-en {
  margin: 4px 0 0;
  font-size: 13px;
  color: #909399;
}
.overview {
  position: relative;
  min-height: 300px;
  padding-bottom: 30px;
}
</style>
