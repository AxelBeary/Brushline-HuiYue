<template>
  <!-- 状态切换（已有功能，v0.18 位置调整到右栏——验收 §7） -->
  <el-card shadow="hover" class="status-card">
    <template #header>{{ $t('dashboard.currentStatus') }}</template>
    <el-radio-group :model-value="modelValue" @change="$emit('pick', $event)" size="large">
      <el-radio-button value="open">{{ $t('dashboard.statusOpen') }}</el-radio-button>
      <el-radio-button value="full">{{ $t('dashboard.statusFull') }}</el-radio-button>
      <el-radio-button value="break">{{ $t('dashboard.statusBreak') }}</el-radio-button>
    </el-radio-group>
  </el-card>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: 'open' }
})
defineEmits(['pick'])
</script>

<style scoped>
.status-card { background: var(--bg-card); }
</style>
