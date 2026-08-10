<template>
  <el-card shadow="hover" class="revenue-card">
    <template #header>
      <CardHead :title="$t('dashboard.revenueTitle')">
        <template #extra>
          <!-- 维度切换：月/季/年 -->
          <SliderSwitch v-model="period" size="small" :options="periodOptions" @change="load" />
        </template>
      </CardHead>
    </template>

    <!-- 错误态：独立重试，不影响其他模块 -->
    <div v-if="state === 'error'" class="module-error">
      <span>{{ $t('dashboard.revenueError') }}</span>
      <el-button size="small" @click="load">{{ $t('dashboard.retry') }}</el-button>
    </div>

    <template v-else>
      <!-- 汇总区（加载中显示 -；02D P1-1: 金额数字滚动——滚动原始分，¥ 前缀/格式化在外层） -->
      <div class="revenue-summary">
        <span class="revenue-total">
          {{ state === 'loading' ? '-' : `¥${formatCents(totalCents.display)}` }}
        </span>
        <span v-if="state !== 'loading' && summary.orderCount != null" class="revenue-count">
          {{ $t('dashboard.revenueOrderCount', { n: summary.orderCount }) }}
        </span>
        <!-- 环比：无上一周期数据时不显示（验收 1.7） -->
        <span
          v-if="state !== 'loading' && summary.changePct != null"
          class="revenue-change" :class="summary.changePct >= 0 ? 'revenue-change--up' : 'revenue-change--down'"
        >
          {{ summary.changePct >= 0 ? '↑' : '↓' }} {{ Math.abs(summary.changePct) }}%
          {{ $t('dashboard.revenueVs', { label: summary.prevLabel || '' }) }}
        </span>
      </div>

      <!-- 纯 CSS 柱状图（三号图表库选型前占位，后续可替换）
           02D P1-7: 数据到达后下一帧再设高度（height 0 → 实际值，transition 0.35s 触发柱状生长） -->
      <div v-if="state === 'loading'" class="chart-skeleton">
        <div v-for="i in bars.length" :key="i" class="chart-skeleton-bar"></div>
      </div>
      <div v-else class="chart-area">
        <div class="chart-bars">
          <div
            v-for="(bar, i) in bars" :key="i"
            class="chart-col" :title="`${bar.label}: ¥${formatCents(bar.cents)}`"
          >
            <div class="chart-bar" :style="{ height: grown ? barHeight(bar.cents) : '0%' }"></div>
            <span class="chart-label">{{ bar.label }}</span>
          </div>
        </div>
      </div>
    </template>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { artistApi } from '../../../api/index.js'
import { normalizeRevenue } from '../../../utils/dashboard-normalize.js'
import { formatCents } from '../../../utils/money.js'
import { useCountUp } from '../../../utils/useCountUp.js'
// v0.38 第二批: 统一卡片头部（REQ-026 §二）
import CardHead from '../visual/CardHead.vue'
import SliderSwitch from '../SliderSwitch.vue'

const { locale, t } = useI18n()

const period = ref('month')

// 05B: 维度切换滑块选项（月/季/年）
const periodOptions = [
  { value: 'month', label: t('dashboard.periodMonth') },
  { value: 'quarter', label: t('dashboard.periodQuarter') },
  { value: 'year', label: t('dashboard.periodYear') }
]
const state = ref('loading') // loading | ok | error
const bars = ref([])
const summary = ref({})
/** 02D P1-7: 柱状生长标记——数据到达后下一帧置 true，height 0% → 实际值触发 transition */
const grown = ref(false)

/** 金额分 → 元 */
/** 柱高百分比（最大值归一化；全 0 时柱子高度 0，不留空白——验收 1.4） */
function barHeight(cents) {
  const max = Math.max(...bars.value.map(b => b.cents || 0), 1)
  return `${Math.round(((cents || 0) / max) * 100)}%`
}

// 02D P1-1: 汇总金额滚动（原始分，外层 ¥ + formatCents）
const totalCents = useCountUp(computed(() => summary.value.totalCents ?? 0))

// G-2（R-22）: 请求序号守卫——狂切周期时晚到的慢请求直接丢弃（对齐 useOrderForm seq 模式）
let loadSeq = 0
async function load() {
  const mySeq = ++loadSeq
  state.value = 'loading'
  grown.value = false
  try {
    const res = await artistApi.getDashboardRevenue(period.value)
    if (mySeq !== loadSeq) return
    const norm = normalizeRevenue(res, period.value, locale.value)
    bars.value = norm.bars
    summary.value = norm.summary
    state.value = 'ok'
    // 02D P1-7: 柱状生长——数据渲染（height 0%）后下一帧再设实际高度，transition 0.35s 从底部生长
    requestAnimationFrame(() => { grown.value = true })
  } catch {
    if (mySeq === loadSeq) state.value = 'error'
  }
}

onMounted(() => load())
</script>

<style scoped>
/* ═══ v0.38 第二批: 纸墨 token 换肤（REQ-026；第一批记账修复——统计数字墨色不上色铁律） ═══ */
.revenue-card { background: var(--card); }

/* 汇总区 */
.revenue-summary { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
/* 收入主数值：文楷落款感 + 墨色不上色（REQ §1.3 数字用文楷；铁律：统计数字一律墨色——
   原 var(--color-primary) 在墨黑主题下映射浅花青，数字变浅蓝，一号审核记账修复） */
.revenue-total {
  font-size: calc(var(--font-scale, 1) * 26px); font-weight: 700; color: var(--ink);
  font-family: var(--f-d);
  font-variant-numeric: tabular-nums;
}
.revenue-count { font-size: calc(var(--font-scale, 1) * 13px); color: var(--ink2); }
.revenue-change { font-size: calc(var(--font-scale, 1) * 13px); font-weight: 600; }
.revenue-change--up { color: var(--sl); }
.revenue-change--down { color: var(--zs); }

/* 纯 CSS 柱状图 */
.chart-area { padding-top: 4px; }
.chart-bars {
  display: flex; align-items: flex-end; gap: 4px;
  height: 140px;
}
.chart-col {
  flex: 1; min-width: 0; height: 100%;
  display: flex; flex-direction: column; justify-content: flex-end; align-items: center;
}
.chart-bar {
  width: 100%; max-width: 36px; min-height: 2px;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(180deg, var(--hq), color-mix(in srgb, var(--hq) 25%, transparent));
  transition: height 0.35s ease;
}
.chart-col:hover .chart-bar { filter: brightness(1.15); }
.chart-label {
  margin-top: 4px; font-size: calc(var(--font-scale, 1) * 10px); color: var(--ink3);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}

/* 骨架屏 */
.chart-skeleton { display: flex; align-items: flex-end; gap: 4px; height: 140px; }
.chart-skeleton-bar {
  flex: 1; border-radius: 3px 3px 0 0;
  background: var(--paper2);
  animation: chart-pulse 1.2s ease-in-out infinite;
}
.chart-skeleton-bar:nth-child(odd) { height: 55%; }
.chart-skeleton-bar:nth-child(even) { height: 35%; }
@keyframes chart-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

/* 错误态 */
.module-error {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 24px 0; font-size: calc(var(--font-scale, 1) * 13px); color: var(--ink2);
}
</style>
