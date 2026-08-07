<template>
  <!-- 名额概览卡（#4 改版：slotDisplay 主文案 + 合并进度条 + 整卡点击跳额度管理） -->
  <el-card
    v-if="visible" shadow="hover" class="slot-card"
    @click="$router.push('/slots')"
  >
    <template #header>
      <CardHead :title="$t('dashboard.slotTitle')">
        <template #extra>
          <span class="slot-arrow">→</span>
        </template>
      </CardHead>
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
// v0.38 第二批: 统一卡片头部（REQ-026 §二）
import CardHead from '../visual/CardHead.vue'

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
/* v0.38 第二批: 纸墨 token（第一批白名单内补漏；主文案数字墨色不上色铁律） */
/* 克制动效批（2026-08-07）：卡片 hover 微浮起 + 按压，≤0.2s */
.artist-scope .slot-card { background: var(--card); cursor: pointer; transition: border-color 0.2s, transform 0.15s ease-out, box-shadow 0.2s; }
.slot-card:hover { border-color: color-mix(in srgb, var(--hq) 50%, transparent); transform: translateY(-2px); box-shadow: var(--sh-2); }
.slot-card:active { transform: translateY(-2px) scale(0.98); }
.slot-arrow { color: var(--ink3); font-size: calc(var(--font-scale, 1) * 16px); }

/* #4: 主文案（与客户主页一致，大字）——统计数字墨色不上色（原 --color-primary 墨黑下变浅蓝） */
.slot-display {
  font-size: calc(var(--font-scale, 1) * 20px); font-weight: 700; color: var(--ink);
  font-family: var(--f-d);
  margin: 0 0 12px; font-variant-numeric: tabular-nums;
}
/* #4: 未开启引导文案 */
.slot-guide { font-size: calc(var(--font-scale, 1) * 13px); color: var(--ink2); margin: 0; }

.slot-row { margin-bottom: 10px; }
.slot-label { font-size: calc(var(--font-scale, 1) * 13px); color: var(--ink2); display: block; margin-bottom: 4px; }
.slot-bar {
  height: 10px; border-radius: 5px;
  background: var(--paper2);
  overflow: hidden;
}
.slot-bar-fill {
  height: 100%; border-radius: 5px;
  background: var(--hq);
  transition: width 0.35s ease;
}
/* 满 → 藤黄（验收 5.3；藤黄=缓冲提醒） */
.slot-bar-fill--full { background: var(--th); }

.slot-next { font-size: calc(var(--font-scale, 1) * 12px); color: var(--ink2); margin: 4px 0 0; }
</style>
