<template>
  <!-- 状态切换（已有功能，v0.18 位置调整到右栏——验收 §7；v0.38: CardHead 朱砂 mark 卡头） -->
  <el-card shadow="hover" class="status-card">
    <template #header><CardHead :title="$t('dashboard.currentStatus')" /></template>
    <el-radio-group :model-value="modelValue" @change="$emit('pick', $event)" size="large">
      <el-radio-button value="open">{{ $t('dashboard.statusOpen') }}</el-radio-button>
      <el-radio-button value="full">{{ $t('dashboard.statusFull') }}</el-radio-button>
      <el-radio-button value="break">{{ $t('dashboard.statusBreak') }}</el-radio-button>
    </el-radio-group>
  </el-card>
</template>

<script setup>
// v0.38 第二批: 统一卡片头部（REQ-026 §二）
import CardHead from '../visual/CardHead.vue'

defineProps({
  modelValue: { type: String, default: 'open' }
})
defineEmits(['pick'])
</script>

<style scoped>
/* v0.38 第二批: 纸墨 token */
.status-card { background: var(--card); }
</style>
