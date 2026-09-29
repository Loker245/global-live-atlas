<script setup lang="ts">
import MapView from './components/MapView.vue'
import SearchBar from './components/SearchBar.vue'
import SidePanel from './components/SidePanel.vue'
</script>

<template>
  <div class="app">
    <MapView />
    <SearchBar />
    <SidePanel />
  </div>
</template>

<style scoped>
.app {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
