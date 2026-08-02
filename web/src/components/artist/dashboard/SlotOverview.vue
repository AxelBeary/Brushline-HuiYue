<template>
  <!-- 名额概览卡（#4 改版：slotDisplay 主文案 + 合并进度条 + 整卡点击跳额度管理） -->
  <el-card
    v-if="visible" shadow="hover" class="slot-card"
    @click="$router.push('/slots')"
  >
    <template #header>
      <div class="slot-header">
        <span class="slot-title">{{ $t('dashboard.slotTitle') }}</span>
        <span class="slot-arrow">→</span>
      </div>
    </template>

    <!-- 未开启名额限制 → 引导文案 -->
    <template v-if="!limitEnabled">
      <p class="slot-guide">{{ $t('dashboard.slotNotEnabled') }}</p>
    </template>

    <!-- 已开启 → 主文案 + 合并进度条 -->
    <template v-else>
      <!-- 主文案：与客户主页看到的一致（后端 computeSlotDisplay） -->
      <p class="slot-display">{{ slotDisplay || $t('dashboard.slotDisplayFallback') }}</p>

      <!-- 合并进度条：总容量 = 正式 + 缓冲，已用 = formalCount + bufferCount -->
      <div class="slot-row">
        <span class="slot-label">{{ $t('dashboard.slotCombined', { used: usedCount, total: totalCapacity }) }}</span>
        <div class="slot-bar">
          <div
            class="slot-bar-fill"
            :class="{ 'slot-bar-fill--full': isFull }"
            :style="{ width: usedPct + '%' }"
          ></div>
        </div>
      </div>

      <!-- 下一位候补（有则显示） -->
      <p v-if="nextBuffer" class="slot-next">
        {{ $t('dashboard.slotNext', { name: nextBuffer.client_name || nextBuffer.client_qq, qq: nextBuffer.client_qq }) }}
      </p>
    </template>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useArtistStore } from '../../../stores/artist.js'
import { artistApi } from '../../../api/index.js'

const store = useArtistStore()

const batchLimit = computed(() => store.profile?.batch_limit ?? null)
const bufferLimit = computed(() => store.profile?.buffer_limit ?? 0)

const formalCount = ref(0)
const bufferCount = ref(0)
const nextBuffer = ref(null)
const loadFailed = ref(false)
/** 客户主页同款名额文案（PERF-1 后画师端 profile 已返回 slotDisplay，直接读取） */
const slotDisplay = computed(() => store.profile?.slotDisplay ?? null)

/** 名额限制是否开启（batch_limit 或 monthly_quota 任一非空） */
const limitEnabled = computed(() =>
  store.profile?.batch_limit != null || store.profile?.monthly_quota != null
)

/** 加载失败 → 静默降级（Q3）；未开启时仍显示引导卡 */
const visible = computed(() => !loadFailed.value)

const usedCount = computed(() => formalCount.value + bufferCount.value)
const totalCapacity = computed(() => (batchLimit.value ?? 0) + bufferLimit.value)
const isFull = computed(() => totalCapacity.value > 0 && usedCount.value >= totalCapacity.value)
const usedPct = computed(() => {
  if (!totalCapacity.value) return 0
  return Math.min(100, Math.round((usedCount.value / totalCapacity.value) * 100))
})

async function load() {
  try {
    // 复用 SPEC-004 队列查询（不新建 API——验收 §5.3）
    const [formal, buffer] = await Promise.all([
      artistApi.getQueue(),
      artistApi.getQueue('buffer')
    ])
    formalCount.value = (formal || []).length
    bufferCount.value = (buffer || []).length
    nextBuffer.value = (buffer || [])[0] || null
  } catch {
    // 静默降级：不显示卡片，不阻塞其他模块
    loadFailed.value = true
  }
}

onMounted(() => load())
</script>

<style scoped>
.slot-card { background: var(--bg-card); cursor: pointer; transition: border-color 0.2s; }
.slot-card:hover { border-color: var(--el-color-primary-light-5); }
.slot-header { display: flex; align-items: center; justify-content: space-between; }
.slot-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.slot-arrow { color: var(--text-muted); font-size: 16px; }

/* #4: 主文案（与客户主页一致，大字） */
.slot-display {
  font-size: 20px; font-weight: 700; color: var(--color-primary);
  margin: 0 0 12px; font-variant-numeric: tabular-nums;
}
/* #4: 未开启引导文案 */
.slot-guide { font-size: 13px; color: var(--text-secondary); margin: 0; }

.slot-row { margin-bottom: 10px; }
.slot-label { font-size: 13px; color: var(--text-secondary); display: block; margin-bottom: 4px; }
.slot-bar {
  height: 10px; border-radius: 5px;
  background: var(--bg-secondary, #f0f0f0);
  overflow: hidden;
}
.slot-bar-fill {
  height: 100%; border-radius: 5px;
  background: var(--color-primary);
  transition: width 0.35s ease;
}
/* 满 → 橙红（验收 5.3） */
.slot-bar-fill--full { background: var(--el-color-warning); }

.slot-next { font-size: 12px; color: var(--text-secondary); margin: 4px 0 0; }
</style>
