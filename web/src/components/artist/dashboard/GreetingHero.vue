<template>
  <!-- 问候区：整块可点击换一句（R7）+ 今日统计行（R52） -->
  <div class="greeting-hero">
    <div
      class="greeting-area" role="button" tabindex="0" :title="$t('dashboard.anotherOne')"
      @click="fetchGreeting" @keydown.enter="fetchGreeting" @keydown.space.prevent="fetchGreeting"
    >
      <div class="greeting-main">
        <!-- 02D P0: 首次进入用 greeting-enter（blur→清晰 0.45s），点击换一句用 greeting-fade（0.2s）——
             动态 name 互不叠加，避免冲突 -->
        <Transition :name="greetingAnimName" mode="out-in">
          <h2 class="greeting-text font-display" :key="greeting.text">{{ greeting.text }}</h2>
        </Transition>
      </div>
      <div class="greeting-date">{{ dateLine }}</div>
    </div>
    <!-- R52: 今日统计紧凑行（始终显示，无数据 ¥0；金额后端返分，前端 /100）
         v0.38: 统计数字一律墨色（REQ §1.1 硬规则，不上色）
         02D P0: 数据到达一次性 fade-up（delay 0.15s 与每日一句衔接）；02D P1-1: 金额数字滚动 -->
    <div class="today-stats-row" :class="{ 'stats-fade-up': statsEntered }">
      <span class="today-stats-item">{{ $t('dashboard.todayNewOrders') }} <strong>¥{{ formatCents(todayNewOrder.display) }}</strong></span>
      <span class="today-stats-sep">·</span>
      <span class="today-stats-item">{{ $t('dashboard.todayRevenue') }} <strong>¥{{ formatCents(todayRevenue.display) }}</strong></span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { artistApi } from '../../../api/index.js'
import { formatCents } from '../../../utils/money.js'
import { useCountUp } from '../../../utils/useCountUp.js'

const props = defineProps({
  /** 今日统计（getStats 返回，含 todayNewOrderCents / todayRevenueCents） */
  stats: { type: Object, default: null }
})

const { t, locale } = useI18n()

// ─── 问候语 ───
const greeting = ref({ text: '', slot: 'any' })
const greetingLoading = ref(false)
/** 02D P0: 当前 Transition 名——首次 greeting-enter（进入动画），之后 greeting-fade（点击换句） */
const greetingAnimName = ref('greeting-fade')

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
    const data = await artistApi.getGreeting()
    // 02D P0: 首次加载（text 从空变非空）切换为进入动画；0.45s 动画结束后切回点击换句的 fade
    const isFirst = !greeting.value.text
    if (isFirst) greetingAnimName.value = 'greeting-enter'
    greeting.value = data
    if (isFirst) {
      window.setTimeout(() => { greetingAnimName.value = 'greeting-fade' }, 500)
    }
  } catch { /* 静默失败，保留默认 */ }
  finally { greetingLoading.value = false }
}

// ─── 02D P1-1: 今日统计金额滚动（滚动原始分，¥ 前缀与格式化在外层） ───
const todayNewOrder = useCountUp(computed(() => props.stats?.todayNewOrderCents ?? 0))
const todayRevenue = useCountUp(computed(() => props.stats?.todayRevenueCents ?? 0))

// ─── 02D P0: 统计行 fade-up——数据到达（stats 从空变有）时触发一次性动画 ───
const statsEntered = ref(false)
watch(() => props.stats, (v) => {
  if (v && !statsEntered.value) statsEntered.value = true
}, { immediate: true })

/** 金额分 → 元（后端返分，前端 /100；无数据 ¥0） */
onMounted(() => fetchGreeting())
</script>

<style scoped>
/* v0.38 第二批: 纸墨 token（第一批白名单内补漏） */
.greeting-hero { display: flex; flex-direction: column; gap: 12px; }

/* 问候区：整块可点击（R7） */
.greeting-area {
  padding: 20px 24px;
  border-radius: var(--r-l);
  background: linear-gradient(135deg, var(--hq-t), transparent 70%);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: filter 0.18s;
}
.greeting-area:hover { filter: brightness(1.04); }
.greeting-area:active { filter: brightness(0.97); }
.greeting-main { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.greeting-icon { font-size: calc(var(--font-scale, 1) * 24px); }
.greeting-text { font-size: calc(var(--font-scale, 1) * 28px); font-weight: 400; color: var(--ink); margin: 0; }
.greeting-date { margin-top: 6px; font-size: calc(var(--font-scale, 1) * 12px); color: var(--ink2); }

/* 问候语切换动画（点击换一句：0.2s 淡入） */
.greeting-fade-enter-active { transition: opacity var(--dur-mid), transform var(--dur-mid); }
.greeting-fade-leave-active { transition: opacity var(--dur-fast); }
.greeting-fade-enter-from { opacity: 0; transform: translateY(6px); }
.greeting-fade-leave-to { opacity: 0; }

/* 02D P0: 首次进入动画——blur 到清晰 + 上移浮现（一次性 0.45s，克制纪律：不循环） */
.greeting-enter-enter-active { transition: opacity 0.45s ease-out, transform 0.45s ease-out, filter 0.45s ease-out; }
.greeting-enter-enter-from { opacity: 0; transform: translateY(6px); filter: blur(4px); }
.greeting-enter-leave-active { transition: opacity var(--dur-fast); }
.greeting-enter-leave-to { opacity: 0; }

/* 02D P0: 今日统计行 fade-up（delay 0.15s 与每日一句衔接；一次性） */
.stats-fade-up { animation: stats-up var(--dur-slow) var(--ease-out) both; animation-delay: 0.15s; }
@keyframes stats-up {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}

/* 02D: reduced-motion 显式关闭（theme.css 全局只压 duration 不压 delay，delay 期间 both 填充态会空白） */
@media (prefers-reduced-motion: reduce) {
  .greeting-enter-enter-active,
  .greeting-enter-leave-active,
  .greeting-fade-enter-active,
  .greeting-fade-leave-active { transition: none; }
  .stats-fade-up { animation: none; }
}

/* R52: 今日统计紧凑行 */
.today-stats-row {
  display: flex; align-items: center; gap: 10px;
  font-size: calc(var(--font-scale, 1) * 14px); color: var(--ink2);
}
/* 统计数字墨色不上色铁律（REQ §1.1）——strong 仅加粗等宽，颜色继承墨色 */
.today-stats-item strong { font-variant-numeric: tabular-nums; color: var(--ink); font-family: var(--f-d); }
.today-stats-sep { color: var(--ink3); }
</style>