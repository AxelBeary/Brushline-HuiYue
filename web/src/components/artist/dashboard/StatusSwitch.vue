<template>
  <!-- 状态切换（已有功能，v0.18 位置调整到右栏——验收 §7；v0.38: CardHead 朱砂 mark 卡头） -->
  <el-card shadow="hover" class="status-card">
    <template #header><CardHead :title="$t('dashboard.currentStatus')" /></template>
    <SliderSwitch :model-value="modelValue" :options="statusOptions" @change="$emit('pick', $event)" />
  </el-card>
</template>

<script setup>
// v0.38 第二批: 统一卡片头部（REQ-026 §二）
import CardHead from '../visual/CardHead.vue'
import SliderSwitch from '../SliderSwitch.vue'
import { useI18n } from 'vue-i18n'

defineProps({
  modelValue: { type: String, default: 'open' }
})
defineEmits(['pick'])

// 05B: 状态滑块选项（props/emits 不变：modelValue + pick，外部零改动）
const { t } = useI18n()
const statusOptions = [
  { value: 'open', label: t('dashboard.statusOpen') },
  { value: 'full', label: t('dashboard.statusFull') },
  { value: 'break', label: t('dashboard.statusBreak') }
]
</script>

<style scoped>
/* v0.38 第二批: 纸墨 token */
.status-card { background: var(--card); }
</style>
