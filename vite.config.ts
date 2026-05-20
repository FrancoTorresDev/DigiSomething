import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/digimon-api': {
        target: 'https://digimoncard.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/digimon-api/, '/api-public')
      },
      '/reddit-api': {
        target: 'https://www.reddit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/reddit-api/, '')
      },
      '/limitless-api': {
        target: 'https://play.limitlesstcg.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/limitless-api/, '/api')
      },
      '/card-images': {
        target: 'https://images.digimoncard.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/card-images/, '/images/cards')
      }
    }
  }
})
