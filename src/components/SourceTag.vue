<script setup lang="ts">
defineProps<{
  source: string
  url?: string
}>()
</script>

<template>
  <a
    class="source-tag"
    :href="url"
    target="_blank"
    rel="noopener noreferrer"
    :title="`数据来源：${source}`"
  >
    数据来源：{{ source }}
  </a>
</template>

<style scoped>
.source-tag {
  position: absolute;
  right: 10px;
  bottom: 8px;
  z-index: 5;
  padding: 2px 8px;
  font-size: 11px;
  line-height: 18px;
  color: #606266;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  text-decoration: none;
  cursor: pointer;
}
.source-tag:hover {
  color: #409eff;
  border-color: #c6e2ff;
}
</style>
