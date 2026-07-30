<template>
  <el-card shadow="hover" class="revenue-card">
    <template #header>
      <div class="revenue-header">
        <span class="revenue-title">{{ $t('dashboard.revenueTitle') }}</span>
        <!-- 维度切换：月/季/年 -->
        <el-radio-group v-model="period" size="small" @change="load">
          <el-radio-button value="month">{{ $t('dashboard.periodMonth') }}</el-radio-button>
          <el-radio-button value="quarter">{{ $t('dashboard.periodQuarter') }}</el-radio-button>
          <el-radio-button value="year">{{ $t('dashboard.periodYear') }}</el-radio-button>
        </el-radio-group>
      </div>
    </template>

    <!-- 错误态：独立重试，不影响其他模块 -->
    <div v-if="state === 'error'" class="module-error">
      <span>{{ $t('dashboard.revenueError') }}</span>
      <el-button size="small" @click="load">{{ $t('dashboard.retry') }}</el-button>
    </div>

    <template v-else>
      <!-- 汇总区（加载中显示 -） -->
      <div class="revenue-summary">
        <span class="revenue-total">
          {{ state === 'loading' ? '-' : `¥${formatCents(summary.totalCents)}` }}
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

      <!-- 纯 CSS 柱状图（三号图表库选型前占位，后续可替换） -->
      <div v-if="state === 'loading'" class="chart-skeleton">
        <div v-for="i in bars.length" :key="i" class="chart-skeleton-bar"></div>
      </div>
      <div v-else class="chart-area">
        <div class="chart-bars">
          <div
            v-for="(bar, i) in bars" :key="i"
            class="chart-col" :title="`${bar.label}: ¥${formatCents(bar.cents)}`"
          >
            <div class="chart-bar" :style="{ height: barHeight(bar.cents) }"></div>
            <span class="chart-label">{{ bar.label }}</span>
          </div>
        </div>
      </div>
    </template>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { artistApi } from '../../../api/index.js'

const { locale } = useI18n()

const period = ref('month')
const state = ref('loading') // loading | ok | error
const bars = ref([])
const summary = ref({})

/** 金额分 → 元 */
function formatCents(cents) {
  return ((cents || 0) / 100).toFixed(2)
}

/** 柱高百分比（最大值归一化；全 0 时柱子高度 0，不留空白——验收 1.4） */
function barHeight(cents) {
  const max = Math.max(...bars.value.map(b => b.cents || 0), 1)
  return `${Math.round(((cents || 0) / max) * 100)}%`
}

/** 归一化后端返回（已对齐三号 dashboard.service.js 实际字段） */
function normalize(raw) {
  const list = raw?.bars || raw?.data || raw?.buckets || []
  bars.value = list.map(b => ({
    label: b.label ?? b.name ?? b.key ?? '',
    cents: b.cents ?? b.amountCents ?? b.amount ?? b.totalCents ?? 0
  }))
  const s = raw?.summary || {}
  summary.value = {
    totalCents: s.totalCents ?? raw?.totalCents ?? raw?.total ?? 0,
    orderCount: s.completedCount ?? s.orderCount ?? raw?.orderCount ?? raw?.completedCount ?? null,
    changePct: s.changePercent ?? s.changePct ?? raw?.changePct ?? raw?.momChange ?? null,
    prevLabel: raw?.prevLabel ?? prevPeriodLabel()
  }
}

/** 环比标签：后端未返回 prevLabel，前端按维度计算上一周期名称 */
function prevPeriodLabel() {
  const now = new Date()
  if (period.value === 'month') {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return prev.toLocaleDateString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', { month: 'long' })
  }
  if (period.value === 'quarter') {
    const q = Math.floor(now.getMonth() / 3)
    return q === 0 ? `Q4 ${now.getFullYear() - 1}` : `Q${q}`
  }
  return String(now.getFullYear() - 1)
}

async function load() {
  state.value = 'loading'
  try {
    const res = await artistApi.getDashboardRevenue(period.value)
    normalize(res)
    state.value = 'ok'
  } catch {
    state.value = 'error'
  }
}

onMounted(() => load())
</script>

<style scoped>
.revenue-card { background: var(--bg-card); }
.revenue-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.revenue-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }

/* 汇总区 */
.revenue-summary { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.revenue-total {
  font-size: 26px; font-weight: 700; color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}
.revenue-count { font-size: 13px; color: var(--text-secondary); }
.revenue-change { font-size: 13px; font-weight: 600; }
.revenue-change--up { color: var(--el-color-success); }
.revenue-change--down { color: var(--el-color-danger); }

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
  background: linear-gradient(180deg, var(--color-primary), var(--color-primary-soft));
  transition: height 0.35s ease;
}
.chart-col:hover .chart-bar { filter: brightness(1.15); }
.chart-label {
  margin-top: 4px; font-size: 10px; color: var(--text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}

/* 骨架屏 */
.chart-skeleton { display: flex; align-items: flex-end; gap: 4px; height: 140px; }
.chart-skeleton-bar {
  flex: 1; border-radius: 3px 3px 0 0;
  background: var(--bg-secondary, #f0f0f0);
  animation: chart-pulse 1.2s ease-in-out infinite;
}
.chart-skeleton-bar:nth-child(odd) { height: 55%; }
.chart-skeleton-bar:nth-child(even) { height: 35%; }
@keyframes chart-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

/* 错误态 */
.module-error {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 24px 0; font-size: 13px; color: var(--text-secondary);
}
</style>
