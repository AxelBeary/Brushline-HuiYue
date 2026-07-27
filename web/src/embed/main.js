import { createApp, h } from 'vue'
import EmbedOrderPage from './EmbedOrderPage.vue'

// 极简 Vue 实例 — 不带 router/pinia/i18n，减少包体积
const app = createApp({
  render: () => h(EmbedOrderPage)
})
app.mount('#app')
