<template>
  <!-- 名额概览卡（SPEC-004 复用；batch_limit=NULL 不渲染——验收 5.1；错误静默降级——Q3 已定） -->
  <el-card
    v-if="visible" shadow="hover" class="slot-card"
    @click="$router.push('/queue?zone=buffer')"
  >
    <template #header>
      <div class="slot-header">
        <span class="slot-title">{{ $t('dashboard.slotTitle') }}</span>
        <span class="slot-arrow">→</span>
      </div>
    </template>

    <!-- 正式区进度条 -->
    <div class="slot-row">
      <span class="slot-label">{{ $t('dashboard.slotFormal', { used: formalCount, total: batchLimit }) }}</span>
      <div class="slot-bar">
        <div
          class="slot-bar-fill"
          :class="{ 'slot-bar-fill--full': isFormalFull }"
          :style="{ width: formalPct + '%' }"
        ></div>
      </div>
    </div>

    <!-- 缓冲区进度条（buffer_limit > 0 时显示） -->
    <div v-if="bufferLimit > 0" class="slot-row">
      <span class="slot-label">{{ $t('dashboard.slotBuffer', { used: bufferCount, total: bufferLimit }) }}</span>
      <div class="slot-bar slot-bar--buffer">
        <div class="slot-bar-fill slot-bar-fill--buffer" :style="{ width: bufferPct + '%' }"></div>
      </div>
    </div>

    <!-- 下一位候补（有则显示，无则不显示——验收 5.5/5.6） -->
    <p v-if="nextBuffer" class="slot-next">
      {{ $t('dashboard.slotNext', { name: nextBuffer.client_name || nextBuffer.client_qq, qq: nextBuffer.client_qq }) }}
    </p>
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

/** batch_limit=NULL → 不渲染（验收 5.1）；加载失败 → 静默降级（Q3） */
const visible = computed(() => batchLimit.value != null && !loadFailed.value)

const isFormalFull = computed(() => batchLimit.value > 0 && formalCount.value >= batchLimit.value)
const formalPct = computed(() => {
  if (!batchLimit.value) return 0
  return Math.min(100, Math.round((formalCount.value / batchLimit.value) * 100))
})
const bufferPct = computed(() => {
  if (!bufferLimit.value) return 0
  return Math.min(100, Math.round((bufferCount.value / bufferLimit.value) * 100))
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
/* 正式区满 → 橙红（验收 5.3） */
.slot-bar-fill--full { background: var(--el-color-warning); }
/* 缓冲区 → 蓝色系（验收 §5.4 建议） */
.slot-bar-fill--buffer { background: var(--el-color-primary-light-3); }

.slot-next { font-size: 12px; color: var(--text-secondary); margin: 4px 0 0; }
</style>
