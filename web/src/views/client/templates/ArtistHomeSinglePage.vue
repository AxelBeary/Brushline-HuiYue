<template>
  <div v-if="artist" class="sp-page">
    <!-- 导航 -->
    <nav class="sp-nav">
      <span class="sp-nav-brand">{{ artist.name }}</span>
      <div class="sp-nav-links">
        <a href="#about" @click.prevent="scrollTo('about')">{{ $t('artistHome.about') }}</a>
        <a href="#pricing" @click.prevent="scrollTo('pricing')">Pricing</a>
        <a href="#workflow" @click.prevent="scrollTo('workflow')">Process</a>
        <a href="#gallery" @click.prevent="scrollTo('gallery')">Work</a>
        <button
          class="sp-nav-cta"
          :disabled="artist.status !== 'open'"
          @click="$router.push(`/artist/${subdomain}/order`)"
        >
          {{ $t('artistHome.commission') }}
        </button>
      </div>
    </nav>

    <!-- Hero -->
    <section id="about" class="sp-hero">
      <div class="sp-hero-inner">
        <div class="sp-hero-text">
          <p class="sp-hero-label" v-if="artist.status === 'open'">Open for Commissions</p>
          <p class="sp-hero-label sp-hero-label-full" v-else-if="artist.status === 'full'">Currently Full</p>
          <p class="sp-hero-label sp-hero-label-break" v-else>On Break</p>
          <h1>{{ artist.name }}</h1>
          <p class="sp-hero-bio">{{ artist.bio }}</p>
          <div class="sp-hero-actions">
            <button
              class="sp-btn sp-btn-primary"
              :disabled="artist.status !== 'open'"
              @click="$router.push(`/artist/${subdomain}/order`)"
            >
              Start a Commission →
            </button>
            <button class="sp-btn" @click="$router.push(`/artist/${subdomain}/track`)">
              Track Order
            </button>
          </div>
          <div class="sp-hero-links" v-if="artist.weiboUrl || artist.bilibiliUrl">
            <a v-if="artist.weiboUrl" :href="artist.weiboUrl" target="_blank">Weibo</a>
            <span v-if="artist.weiboUrl && artist.bilibiliUrl" class="sp-link-sep">·</span>
            <a v-if="artist.bilibiliUrl" :href="artist.bilibiliUrl" target="_blank">Bilibili</a>
          </div>
        </div>
      </div>
    </section>

    <!-- 作品 -->
    <section id="gallery" class="sp-section" v-if="artworks.length">
      <div class="sp-section-inner">
        <h2 class="sp-section-title">{{ $t('artistHome.artworks') }}</h2>
        <div class="sp-gallery">
          <div v-for="art in artworks" :key="art.id" class="sp-gallery-item">
            <img :src="`/uploads/${art.image_path}`" :alt="art.title || ''" class="sp-gallery-img" />
            <p class="sp-gallery-label" v-if="art.title">{{ art.title }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 价格 -->
    <section id="pricing" class="sp-section sp-section-alt" v-if="tiers.length">
      <div class="sp-section-inner">
        <h2 class="sp-section-title">{{ $t('artistHome.priceList') }}</h2>
        <div class="sp-pricing-grid">
          <div v-for="tier in tiers" :key="tier.id" class="sp-pricing-card">
            <div class="sp-pricing-header">
              <h3>{{ tier.name }}</h3>
              <div class="sp-pricing-amount">¥{{ tier.price }}</div>
            </div>
            <p class="sp-pricing-desc" v-if="tier.description">{{ tier.description }}</p>
            <p class="sp-pricing-days" v-if="tier.work_days">{{ $t('artistHome.aboutDays', { n: tier.work_days }) }}</p>
            <img v-if="tier.example_image" :src="`/uploads/${tier.example_image}`" :alt="tier.name" class="sp-pricing-img" />
          </div>
        </div>
      </div>
    </section>

    <!-- 流程 -->
    <section id="workflow" class="sp-section" v-if="workflowStages.length">
      <div class="sp-section-inner">
        <h2 class="sp-section-title">How It Works</h2>
        <div class="sp-process">
          <div v-for="(stage, i) in workflowStages" :key="stage.id" class="sp-process-step">
            <div class="sp-process-icon">{{ i + 1 }}</div>
            <div>
              <h3 class="sp-process-name">{{ stage.name }}</h3>
              <p class="sp-process-desc" v-if="stage.description">{{ stage.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 须知 -->
    <section class="sp-section sp-section-alt" v-if="rules" id="rules">
      <div class="sp-section-inner">
        <h2 class="sp-section-title">{{ $t('artistHome.rules') }}</h2>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="sp-rules" v-html="sanitizedRules"></div>
      </div>
    </section>

    <!-- CTA -->
    <section class="sp-cta">
      <div class="sp-section-inner sp-cta-inner">
        <h2>{{ $t('artistHome.commission') }}</h2>
        <p>Ready to work together? Let's create something amazing.</p>
        <button
          class="sp-btn sp-btn-primary sp-btn-lg"
          :disabled="artist.status !== 'open'"
          @click="$router.push(`/artist/${subdomain}/order`)"
        >
          {{ $t('artistHome.startCommission') }}
        </button>
        <div class="sp-cta-meta">
          <ThemePicker />
          <Disclaimer />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import ThemePicker from '../../../components/ThemePicker.vue'
import Disclaimer from '../../../components/Disclaimer.vue'

defineProps({
  artist: Object, tiers: Array, artworks: Array, rules: String,
  workflowStages: Array, subdomain: String, sanitizedRules: String
})

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style scoped>
.sp-page {
  background: #fafafa;
  color: #1a1a1a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.sp-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 32px; background: rgba(250,250,250,0.9); backdrop-filter: blur(12px);
  border-bottom: 1px solid #eee;
}
.sp-nav-brand { font-size: 18px; font-weight: 600; }
.sp-nav-links { display: flex; align-items: center; gap: 24px; }
.sp-nav-links a { color: #666; text-decoration: none; font-size: 14px; transition: color 0.2s; }
.sp-nav-links a:hover { color: #1a1a1a; }
.sp-nav-cta {
  padding: 8px 20px; background: #1a1a1a; color: #fff; border: none;
  font-size: 13px; cursor: pointer; transition: opacity 0.2s;
}
.sp-nav-cta:disabled { opacity: 0.3; cursor: not-allowed; }

.sp-hero {
  padding: 140px 32px 80px; min-height: 70vh;
  display: flex; align-items: center;
}
.sp-hero-inner { max-width: 600px; margin: 0 auto; text-align: center; }
.sp-hero-label {
  font-size: 13px; text-transform: uppercase; letter-spacing: 3px;
  color: #4ade80; margin-bottom: 16px;
}
.sp-hero-label-full { color: #fbbf24; }
.sp-hero-label-break { color: #f87171; }
.sp-hero h1 { font-size: 56px; font-weight: 700; line-height: 1.1; margin-bottom: 16px; letter-spacing: -2px; }
.sp-hero-bio { font-size: 18px; color: #666; line-height: 1.6; margin-bottom: 32px; }
.sp-hero-actions { display: flex; gap: 16px; justify-content: center; margin-bottom: 24px; }
.sp-btn {
  padding: 12px 28px; border: 1px solid #ddd; background: transparent;
  color: #666; font-size: 14px; cursor: pointer; transition: all 0.2s;
}
.sp-btn:hover { border-color: #1a1a1a; color: #1a1a1a; }
.sp-btn-primary { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
.sp-btn-primary:hover { background: #333; border-color: #333; }
.sp-btn-primary:disabled { opacity: 0.3; cursor: not-allowed; }
.sp-btn-lg { padding: 16px 40px; font-size: 16px; }
.sp-hero-links { display: flex; align-items: center; justify-content: center; gap: 8px; }
.sp-hero-links a { color: #999; text-decoration: none; font-size: 14px; transition: color 0.2s; }
.sp-hero-links a:hover { color: #1a1a1a; }
.sp-link-sep { color: #ddd; }

/* Section */
.sp-section { padding: 80px 32px; }
.sp-section-alt { background: #f0f0f0; }
.sp-section-inner { max-width: 900px; margin: 0 auto; }
.sp-section-title {
  font-size: 32px; font-weight: 700; margin-bottom: 48px;
  letter-spacing: -1px; text-align: center;
}

/* Gallery */
.sp-gallery { columns: 2; column-gap: 20px; }
.sp-gallery-item {
  break-inside: avoid; margin-bottom: 20px;
  background: #fff; overflow: hidden;
}
.sp-gallery-img { width: 100%; display: block; }
.sp-gallery-label { padding: 12px 16px; font-size: 13px; color: #666; margin: 0; }

/* Pricing */
.sp-pricing-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
.sp-pricing-card { background: #fff; padding: 32px; }
.sp-pricing-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
.sp-pricing-header h3 { font-size: 20px; font-weight: 600; }
.sp-pricing-amount { font-size: 28px; font-weight: 700; }
.sp-pricing-desc { color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 8px; }
.sp-pricing-days { font-size: 13px; color: #999; margin-bottom: 16px; }
.sp-pricing-img { width: 100%; height: 160px; object-fit: cover; }

/* Process */
.sp-process { max-width: 500px; margin: 0 auto; }
.sp-process-step {
  display: flex; gap: 20px; padding: 24px 0;
  border-bottom: 1px solid #eee;
}
.sp-process-step:last-child { border-bottom: none; }
.sp-process-icon {
  width: 40px; height: 40px; background: #1a1a1a; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 600; flex-shrink: 0;
}
.sp-process-name { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.sp-process-desc { font-size: 14px; color: #666; margin: 0; }
.sp-rules { line-height: 1.8; font-size: 14px; color: #555; }
.sp-rules :deep(h1), .sp-rules :deep(h2), .sp-rules :deep(h3) { color: #1a1a1a; }

/* CTA */
.sp-cta { padding: 80px 32px; text-align: center; background: #1a1a1a; color: #fff; }
.sp-cta-inner { max-width: 500px; }
.sp-cta h2 { font-size: 40px; font-weight: 700; margin-bottom: 12px; letter-spacing: -2px; }
.sp-cta p { color: #999; font-size: 16px; margin-bottom: 32px; }
.sp-cta .sp-btn-primary { background: #fff; color: #1a1a1a; border-color: #fff; }
.sp-cta .sp-btn-primary:hover { background: #e0e0e0; }
.sp-cta-meta { margin-top: 32px; display: flex; flex-direction: column; align-items: center; gap: 8px; }

@media (max-width: 768px) {
  .sp-hero h1 { font-size: 36px; }
  .sp-nav-links a { display: none; }
  .sp-nav-links .sp-nav-cta { display: block; }
  .sp-gallery { columns: 1; }
  .sp-section { padding: 48px 16px; }
  .sp-pricing-grid { grid-template-columns: 1fr; }
}
</style>
