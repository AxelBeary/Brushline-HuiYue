<template>
  <!-- HySpinner — 加载指示（纯装饰，GPU 友好）
       variant="ring": 0.9s 线性旋转圆环（替代局部 EP loading 遮罩）
       variant="wave":  7 点波浪点阵，85ms 步长交错
       动画只碰 transform/opacity；reduced-motion 由 theme.css 全局兜底 -->
  <div class="hy-spinner" :class="`hy-spinner--${variant}`" role="status" aria-label="loading">
    <span class="hy-spinner-ring" v-if="variant === 'ring'" aria-hidden="true"></span>
    <span
      v-else
      v-for="i in 7"
      :key="i"
      class="hy-spinner-dot"
      :style="{ '--d': (i - 1) }"
      aria-hidden="true"
    ></span>
  </div>
</template>

<script setup>
defineProps({
  variant: { type: String, default: 'ring', validator: v => ['ring', 'wave'].includes(v) },
  size: { type: Number, default: 32 }
})
</script>

<style scoped>
.hy-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
}
.hy-spinner--ring {
  width: v-bind(size + 'px');
  height: v-bind(size + 'px');
}
.hy-spinner-ring {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid var(--border-color, #e5e5e5);
  border-top-color: var(--el-color-primary, #356B69);
  animation: hy-spin 0.9s linear infinite;
}
@keyframes hy-spin {
  to { transform: rotate(360deg); }
}
.hy-spinner--wave {
  gap: 5px;
}
.hy-spinner-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--el-color-primary, #356B69);
  animation: hy-wave 1s ease-in-out infinite;
  animation-delay: calc(var(--d, 0) * 85ms);
}
@keyframes hy-wave {
  0%, 100% { transform: translateY(0); opacity: 0.4; }
  50% { transform: translateY(-5px); opacity: 1; }
}
</style>
