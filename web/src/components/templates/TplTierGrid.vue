<template>
  <div class="tpl-tier-grid">
    <div
      v-for="tier in tiers"
      :key="tier.id"
      class="tpl-tier-card tpl-reveal"
      :class="{ 'tpl-tier-card--featured': featured }"
    >
      <el-image
        v-if="tier.example_image"
        :src="imgUrl(tier.example_image)"
        fit="cover"
        class="tpl-tier-img"
        :alt="tier.name"
        :preview-src-list="[imgUrl(tier.example_image)]"
        lazy
      />
      <div class="tpl-tier-body">
        <div class="tpl-tier-head">
          <h3 class="tpl-tier-name">{{ tier.name }}</h3>
          <div class="tpl-tier-price">¥{{ tier.price }}</div>
        </div>
        <p class="tpl-tier-desc" v-if="tier.description">{{ tier.description }}</p>
        <p class="tpl-tier-days" v-if="tier.work_days">
          {{ $t('artistHome.aboutDays', { n: tier.work_days }) }}
        </p>
        <!-- 价格计算器扩展点：addons 有值时在此渲染适用增项 -->
        <slot name="addons" :tier="tier"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useArtistData } from '../../composables/useArtistData.js'

const props = defineProps({
  tiers: { type: Array, default: () => [] },
  /** featured: 主打档位放大（classic 用） */
  featured: { type: Boolean, default: false }
})

const { imgUrl } = useArtistData(props)
</script>

<style scoped>
.tpl-tier-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}
.tpl-tier-card {
  background: var(--pal-surface);
  border: 1px solid var(--pal-border);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
}
.tpl-tier-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px color-mix(in srgb, var(--pal-text) 12%, transparent);
}
.tpl-tier-card--featured:first-child {
  grid-column: span 2;
}
.tpl-tier-img {
  width: 100%;
  height: 180px;
  display: block;
}
.tpl-tier-body {
  padding: 20px 22px 24px;
}
.tpl-tier-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.tpl-tier-name {
  font-size: 18px;
  font-weight: 600;
  font-family: var(--font-display);
  color: var(--pal-text);
}
.tpl-tier-price {
  font-size: 26px;
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}
.tpl-tier-desc {
  font-size: 13px;
  line-height: 1.6;
  color: var(--pal-text-dim);
  margin: 0 0 8px;
}
.tpl-tier-days {
  font-size: 12px;
  color: var(--pal-text-dim);
  margin: 0;
}

@media (max-width: 768px) {
  .tpl-tier-card--featured:first-child {
    grid-column: span 1;
  }
}
</style>
