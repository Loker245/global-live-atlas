<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { searchCountries, type CountrySearchItem } from '../api/countries'
import { useCountryStore } from '../stores/country'

const store = useCountryStore()
const keyword = ref('')
const results = ref<CountrySearchItem[]>([])
const loading = ref(false)
const showDropdown = ref(false)

let timer: ReturnType<typeof setTimeout> | null = null

function onInput() {
  if (timer) clearTimeout(timer)
  const q = keyword.value.trim()
  if (!q) {
    results.value = []
    showDropdown.value = false
    return
  }
  // 300ms 防抖
  timer = setTimeout(() => doSearch(q), 300)
}

async function doSearch(q: string) {
  loading.value = true
  results.value = await searchCountries(q)
  loading.value = false
  showDropdown.value = true
}

function pick(item: CountrySearchItem) {
  keyword.value = `${item.nameZh}（${item.cca2}）`
  showDropdown.value = false
  store.select({
    isoA2: item.cca2,
    nameZh: item.nameZh,
    nameEn: item.nameEn,
    center: item.center ?? [0, 20],
  })
}

function onBlur() {
  // 延迟收起，保证 click 先触发
  setTimeout(() => (showDropdown.value = false), 200)
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div class="search-bar">
    <el-input
      v-model="keyword"
      placeholder="搜索国家（中文 / 英文 / ISO 码）…"
      clearable
      :loading="loading"
      @input="onInput"
      @focus="showDropdown = results.length > 0"
      @blur="onBlur"
    />
    <ul v-if="showDropdown" class="dropdown">
      <template v-if="results.length">
        <li v-for="item in results" :key="item.cca2" @mousedown.prevent="pick(item)">
          <span class="zh">{{ item.nameZh }}</span>
          <span class="iso">{{ item.cca2 }}</span>
          <span class="en">{{ item.nameEn }}</span>
        </li>
      </template>
      <li v-else class="empty">无匹配国家</li>
    </ul>
  </div>
</template>

<style scoped>
.search-bar {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  width: min(420px, 60vw);
}
.dropdown {
  margin: 4px 0 0;
  padding: 4px 0;
  list-style: none;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  max-height: 280px;
  overflow-y: auto;
}
.dropdown li {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #303133;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dropdown li:hover {
  background: #ecf5ff;
  color: #409eff;
}
.dropdown li.empty {
  color: #909399;
  cursor: default;
}
.iso {
  font-size: 11px;
  color: #fff;
  background: #909399;
  border-radius: 4px;
  padding: 0 5px;
}
.en {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
