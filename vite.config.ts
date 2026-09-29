import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // REST Countries 不支持浏览器 CORS，统一走「路径前缀 + 代理」模式
      '/rc': {
        target: 'https://restcountries.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rc/, ''),
      },
    },
  },
})
