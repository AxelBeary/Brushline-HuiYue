<template>
  <!-- 问候区：整块可点击换一句（R7）+ 今日统计行（R52） -->
  <div class="greeting-hero">
    <div
      class="greeting-area" role="button" tabindex="0" :title="$t('dashboard.anotherOne')"
      @click="fetchGreeting" @keydown.enter="fetchGreeting" @keydown.space.prevent="fetchGreeting"
    >
      <div class="greeting-main">
        <Transition name="greeting-fade" mode="out-in">
          <h2 class="greeting-text font-display" :key="greeting.text">{{ greeting.text }}</h2>
        </Transition>
      </div>
      <div class="greeting-date">{{ dateLine }}</div>
    </div>
    <!-- R52: 今日统计紧凑行（始终显示，无数据 ¥0；金额后端返分，前端 /100）
         v0.38: 统计数字一律墨色（REQ §1.1 硬规则，不上色） -->
    <div class="today-stats-row">
      <span class="today-stats-item">{{ $t('dashboard.todayNewOrders') }} <strong>¥{{ formatCents(stats?.todayNewOrderCents) }}</strong></span>
      <span class="today-stats-sep">·</span>
      <span class="today-stats-item">{{ $t('dashboard.todayRevenue') }} <strong>¥{{ formatCents(stats?.todayRevenueCents) }}</strong></span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { artistApi } from '../../../api/index.js'

defineProps({
  /** 今日统计（getStats 返回，含 todayNewOrderCents / todayRevenueCents） */
  stats: { type: Object, default: null }
})

const { t, locale } = useI18n()

// ─── 问候语 ───
const greeting = ref({ text: '', slot: 'any' })
const greetingLoading = ref(false)

const dateLine = computed(() => {
  const now = new Date()
  const opts = { month: 'long', day: 'numeric', weekday: 'long' }
  const dateStr = now.toLocaleDateString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', opts)
  const slotNames = {
    morning: t('dashboard.slotMorning'), afternoon: t('dashboard.slotAfternoon'),
    evening: t('dashboard.slotEvening'), night: t('dashboard.slotNight'), any: ''
  }
  const slotName = slotNames[greeting.value.slot] || ''
  return slotName ? `${dateStr} · ${slotName}` : dateStr
})

async function fetchGreeting() {
  // R7 防连击：请求进行中忽略重复点击，避免动画堆积
  if (greetingLoading.value) return
  greetingLoading.value = true
  try {
    greeting.value = await artistApi.getGreeting()
  } catch { /* 静默失败，保留默认 */ }
  finally { greetingLoading.value = false }
}

/** 金额分 → 元（后端返分，前端 /100；无数据 ¥0） */
function formatCents(cents) {
  return ((cents || 0) / 100).toFixed(2)
}

onMounted(() => fetchGreeting())
</script>

<style scoped>
.greeting-hero { display: flex; flex-direction: column; gap: 12px; }

/* 问候区：整块可点击（R7） */
.greeting-area {
  padding: 20px 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--color-primary-soft), transparent 70%);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: filter 0.18s;
}
.greeting-area:hover { filter: brightness(1.04); }
.greeting-area:active { filter: brightness(0.97); }
.greeting-main { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.greeting-icon { font-size: 24px; }
.greeting-text { font-size: 28px; font-weight: 400; color: var(--text-primary); margin: 0; }
.greeting-date { margin-top: 6px; font-size: 12px; color: var(--text-secondary); }

/* 问候语切换动画 */
.greeting-fade-enter-active { transition: opacity 0.2s, transform 0.2s; }
.greeting-fade-leave-active { transition: opacity 0.15s; }
.greeting-fade-enter-from { opacity: 0; transform: translateY(6px); }
.greeting-fade-leave-to { opacity: 0; }

/* R52: 今日统计紧凑行 */
.today-stats-row {
  display: flex; align-items: center; gap: 10px;
  font-size: 14px; color: var(--text-secondary);
}
.today-stats-item strong { font-variant-numeric: tabular-nums; }
.today-stats-sep { color: var(--text-muted); }
</style>
