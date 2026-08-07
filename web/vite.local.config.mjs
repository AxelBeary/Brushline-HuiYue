import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
export default defineConfig({
  plugins: [vue(), Components({ resolvers: [ElementPlusResolver({ importStyle: 'css' })], dts: false })],
  server: {
    port: 5175,
    strictPort: false,
    proxy: {
      '/api': { target: 'http://localhost:3999', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3999', changeOrigin: true }
    }
  }
})
