import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig({
  base: '/CreatorCommunity',
  server: {
    historyApiFallback: true
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          const normalizedId = id.replaceAll('\\', '/')
          if (
            normalizedId.includes('/node_modules/vue/') ||
            normalizedId.includes('/node_modules/vue-router/') ||
            normalizedId.includes('/node_modules/vue-i18n/') ||
            normalizedId.includes('/node_modules/@vue/')
          ) {
            return 'vue-vendor'
          }
          if (
            normalizedId.includes('/node_modules/element-plus/') ||
            normalizedId.includes('/node_modules/@element-plus/')
          ) {
            return 'element-plus'
          }
          if (
            normalizedId.includes('/node_modules/ethers/') ||
            normalizedId.includes('/node_modules/@ethersproject/')
          ) {
            return 'ethers'
          }
          if (normalizedId.includes('/node_modules/markdown-it/')) {
            return 'markdown'
          }
          return 'vendor'
        }
      }
    }
  },
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },

})
