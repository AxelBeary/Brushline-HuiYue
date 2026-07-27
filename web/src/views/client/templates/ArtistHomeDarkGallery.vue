<template>
  <div v-if="artist" class="dark-gallery">
    <!-- 全屏 Hero -->
    <section class="dg-hero">
      <div class="dg-hero-content">
        <h1 class="dg-name">{{ artist.name }}</h1>
        <p class="dg-bio">{{ artist.bio }}</p>
        <div class="dg-status">
          <span :class="['dg-status-dot', artist.status]" />
          <span class="dg-status-text">{{ statusText(artist.status) }}</span>
        </div>
        <div class="dg-actions">
          <button class="dg-btn dg-btn-primary" :disabled="artist.status !== 'open'"
            @click="$router.push(`/artist/${subdomain}/order`)">
            {{ $t('artistHome.commission') }}
          </button>
          <button class="dg-btn" @click="$router.push(`/artist/${subdomain}/track`)">
            {{ $t('artistHome.track') }}
          </button>
        </div>
        <div class="dg-links" v-if="artist.weiboUrl || artist.bilibiliUrl">
          <a v-if="artist.weiboUrl" :href="artist.weiboUrl" target="_blank" rel="noopener">{{ $t('artistHome.weibo') }}</a>
          <a v-if="artist.bilibiliUrl" :href="artist.bilibiliUrl" target="_blank" rel="noopener">{{ $t('artistHome.bilibili') }}</a>
        </div>
      </div>
    </section>

    <!-- 作品全屏画廊 -->
    <section class="dg-section" v-if="artworks.length">
      <div class="dg-gallery">
        <div v-for="art in artworks" :key="art.id" class="dg-gallery-item">
          <img :src="`/uploads/${art.image_path}`" :alt="art.title || ''" class="dg-gallery-img" />
          <p class="dg-gallery-caption" v-if="art.title">{{ art.title }}</p>
        </div>
      </div>
    </section>

    <!-- 价格表 -->
    <section class="dg-section dg-section-alt" v-if="tiers.length">
      <div class="dg-section-inner">
        <h2 class="dg-section-title">{{ $t('artistHome.priceList') }}</h2>
        <div class="dg-tier-grid">
          <div v-for="tier in tiers" :key="tier.id" class="dg-tier-card">
            <img v-if="tier.example_image" :src="`/uploads/${tier.example_image}`" :alt="tier.name" class="dg-tier-img" />
            <div class="dg-tier-body">
              <h3 class="dg-tier-name">{{ tier.name }}</h3>
              <div class="dg-tier-price">¥{{ tier.price }}</div>
              <p class="dg-tier-desc" v-if="tier.description">{{ tier.description }}</p>
              <p class="dg-tier-days" v-if="tier.work_days">{{ $t('artistHome.aboutDays', { n: tier.work_days }) }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 流程 -->
    <section class="dg-section" v-if="workflowStages.length">
      <div class="dg-section-inner">
        <h2 class="dg-section-title">{{ $t('artistHome.workflow') }}</h2>
        <div class="dg-workflow">
          <div v-for="(stage, i) in workflowStages" :key="stage.id" class="dg-wf-step">
            <div class="dg-wf-number">{{ i + 1 }}</div>
            <div class="dg-wf-info">
              <h4>{{ stage.name }}</h4>
              <p v-if="stage.description">{{ stage.description }}</p>
              <span v-if="stage.takes_payment" class="dg-wf-pay">💰 {{ stage.basis_points ? `${stage.basis_points / 100}%` : '' }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 须知 -->
    <section class="dg-section dg-section-alt" v-if="rules">
      <div class="dg-section-inner">
        <h2 class="dg-section-title">{{ $t('artistHome.rules') }}</h2>
        <div class="dg-rules" v-html="sanitizedRules"></div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="dg-footer">
      <ThemePicker />
      <Disclaimer />
    </footer>
  </div>
</template>

<script setup>
import ThemePicker from '../../../components/ThemePicker.vue'
import Disclaimer from '../../../components/Disclaimer.vue'
import { ARTIST_STATUS_TYPE } from '../../../constants/order.js'

const props = defineProps({
  artist: Object, tiers: Array, artworks: Array, rules: String,
  workflowStages: Array, subdomain: String, sanitizedRules: String
})

const statusText = (s) => {
  const map = { open: 'Open', full: 'Full', break: 'On Break' }
  return map[s] || s
}
</script>

<style scoped>
.dark-gallery {
  min-height: 100vh;
  background: #0a0a0a;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* Hero */
.dg-hero {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
}
.dg-hero-content { max-width: 600px; }
.dg-name { font-size: 48px; font-weight: 300; color: #fff; margin-bottom: 16px; letter-spacing: 2px; }
.dg-bio { font-size: 18px; color: #999; line-height: 1.6; margin-bottom: 20px; }
.dg-status { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 28px; }
.dg-status-dot {
  width: 8px; height: 8px; border-radius: 50%; display: inline-block;
}
.dg-status-dot.open { background: #4ade80; box-shadow: 0 0 8px #4ade80; }
.dg-status-dot.full { background: #fbbf24; box-shadow: 0 0 8px #fbbf24; }
.dg-status-dot.break { background: #f87171; box-shadow: 0 0 8px #f87171; }
.dg-status-text { font-size: 14px; color: #aaa; text-transform: uppercase; letter-spacing: 2px; }

.dg-actions { display: flex; gap: 16px; justify-content: center; margin-bottom: 24px; }
.dg-btn {
  padding: 12px 32px; border: 1px solid #333; background: transparent;
  color: #ccc; font-size: 14px; cursor: pointer; transition: all 0.3s;
  letter-spacing: 1px;
}
.dg-btn:hover { border-color: #666; color: #fff; }
.dg-btn-primary { background: #fff; color: #0a0a0a; border-color: #fff; }
.dg-btn-primary:hover { background: #e0e0e0; border-color: #e0e0e0; }
.dg-btn-primary:disabled { opacity: 0.3; cursor: not-allowed; }
.dg-links { display: flex; gap: 24px; justify-content: center; }
.dg-links a { color: #666; text-decoration: none; font-size: 13px; transition: color 0.2s; }
.dg-links a:hover { color: #fff; }

/* Section */
.dg-section { padding: 80px 20px; }
.dg-section-alt { background: #0f0f0f; }
.dg-section-inner { max-width: 900px; margin: 0 auto; }
.dg-section-title {
  font-size: 14px; font-weight: 400; color: #666; text-transform: uppercase;
  letter-spacing: 4px; margin-bottom: 48px; text-align: center;
}

/* Gallery */
.dg-gallery { max-width: 1200px; margin: 0 auto; }
.dg-gallery-item { margin-bottom: 40px; text-align: center; }
.dg-gallery-img {
  width: 100%; max-width: 1000px; height: auto;
  display: block; margin: 0 auto;
}
.dg-gallery-caption { color: #666; font-size: 13px; margin-top: 12px; }

/* Tiers */
.dg-tier-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; }
.dg-tier-card { background: #141414; border: 1px solid #222; overflow: hidden; }
.dg-tier-img { width: 100%; height: 180px; object-fit: cover; display: block; }
.dg-tier-body { padding: 20px; }
.dg-tier-name { font-size: 18px; font-weight: 400; color: #fff; margin-bottom: 8px; }
.dg-tier-price { font-size: 28px; font-weight: 300; color: #fff; margin-bottom: 12px; }
.dg-tier-desc { font-size: 13px; color: #888; line-height: 1.6; }
.dg-tier-days { font-size: 12px; color: #666; margin-top: 8px; }

/* Workflow */
.dg-workflow { max-width: 500px; margin: 0 auto; }
.dg-wf-step {
  display: flex; gap: 20px; align-items: flex-start;
  padding: 20px 0; border-bottom: 1px solid #1a1a1a;
}
.dg-wf-step:last-child { border-bottom: none; }
.dg-wf-number {
  width: 36px; height: 36px; border-radius: 50%; border: 1px solid #333;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: #666; flex-shrink: 0;
}
.dg-wf-info h4 { font-size: 16px; font-weight: 400; color: #e0e0e0; margin-bottom: 4px; }
.dg-wf-info p { font-size: 13px; color: #888; margin: 0; }
.dg-wf-pay { font-size: 12px; color: #fbbf24; margin-top: 4px; display: inline-block; }
.dg-rules { line-height: 1.8; color: #aaa; font-size: 14px; }
.dg-rules :deep(a) { color: #888; }
.dg-rules :deep(h1), .dg-rules :deep(h2), .dg-rules :deep(h3) { color: #e0e0e0; }

/* Footer */
.dg-footer { padding: 40px 20px; text-align: center; background: #0a0a0a; }

@media (max-width: 768px) {
  .dg-name { font-size: 32px; }
  .dg-hero { min-height: 60vh; }
  .dg-section { padding: 48px 16px; }
  .dg-tier-grid { grid-template-columns: 1fr; }
}
</style>
