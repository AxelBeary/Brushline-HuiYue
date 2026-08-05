<template>
  <el-card shadow="hover" class="todo-card">
    <template #header>
      <CardHead :title="$t('dashboard.todoTitle')" />
    </template>

    <!-- 错误态 -->
    <div v-if="state === 'error'" class="module-error">
      <span>{{ $t('dashboard.todoError') }}</span>
      <el-button size="small" @click="load">{{ $t('dashboard.retry') }}</el-button>
    </div>

    <!-- 加载态：骨架条 -->
    <div v-else-if="state === 'loading'" class="todo-skeleton">
      <div v-for="i in 4" :key="i" class="todo-skeleton-row"></div>
    </div>

    <!-- 空状态 -->
    <p v-else-if="!items.length" class="todo-empty">{{ $t('dashboard.todoEmpty') }}</p>

    <!-- 合并列表（排序由后端，前端只渲染标签+跳转） -->
    <div v-else class="todo-list">
      <div
        v-for="item in items" :key="item.id"
        class="todo-item" :class="`todo-item--${item.tag}`"
        @click="$router.push(`/orders/${item.id}?from=dashboard`)"
      >
        <el-tag :type="tagType(item.tag)" size="small" effect="dark" class="todo-tag">
          {{ $t(`dashboard.tag_${item.tag}`) }}
        </el-tag>
        <span class="todo-order-no">#{{ item.order_no }}</span>
        <span v-if="item.client_name" class="todo-client">{{ item.client_name }}</span>
        <el-tag :type="statusType(item.status)" size="small" class="todo-status">
          {{ $t(`common.orderStatus.${item.status}`) }}
        </el-tag>
        <span v-if="item.deadline" class="todo-deadline">{{ formatDate(item.deadline) }}</span>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { artistApi } from '../../../api/index.js'
import { ORDER_STATUS_TYPE } from '../../../constants/order.js'
import { formatDateTime } from '../../../utils/datetime.js'
import { normalizeTodo } from '../../../utils/dashboard-normalize.js'
// v0.38 第二批: 统一卡片头部（REQ-026 §二）
import CardHead from '../visual/CardHead.vue'

const state = ref('loading') // loading | ok | error
const items = ref([])

const statusType = (s) => ORDER_STATUS_TYPE[s] || 'info'

/** 标签类型映射（逾期/截稿 红色系，新单 主色，修改 警告，进行中 信息） */
function tagType(tag) {
  const map = { overdue: 'danger', dueToday: 'danger', pending: 'primary', revision: 'warning', inProgress: 'info' }
  return map[tag] || 'info'
}

function formatDate(str) {
  return formatDateTime(str)
}

async function load() {
  state.value = 'loading'
  try {
    const res = await artistApi.getDashboardTodo()
    items.value = normalizeTodo(res)
    state.value = 'ok'
  } catch {
    state.value = 'error'
  }
}

onMounted(() => load())
</script>

<style scoped>
/* v0.38 第二批: 纸墨 token（第一批白名单内补漏） */
.todo-card { background: var(--card); }

.todo-list { display: flex; flex-direction: column; gap: 4px; }
.todo-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: var(--r-m); cursor: pointer;
  transition: background 0.15s;
}
.todo-item:hover { background: var(--sb-hover); }
/* 逾期/截稿条目左侧朱砂标记（朱砂=逾期，语义一对一） */
.todo-item--overdue, .todo-item--dueToday { border-left: 3px solid var(--zs); }
.todo-tag { flex-shrink: 0; }
.todo-order-no { font-weight: 600; font-size: 14px; color: var(--ink); flex-shrink: 0; font-family: var(--f-d); }
.todo-client {
  font-size: 13px; color: var(--ink2);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1;
}
.todo-status { flex-shrink: 0; }
.todo-deadline { font-size: 12px; color: var(--ink2); flex-shrink: 0; }

.todo-empty { color: var(--ink2); font-size: 13px; margin: 0; }

/* 骨架条 */
.todo-skeleton { display: flex; flex-direction: column; gap: 8px; }
.todo-skeleton-row {
  height: 36px; border-radius: var(--r-m);
  background: var(--paper2);
  animation: todo-pulse 1.2s ease-in-out infinite;
}
@keyframes todo-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

/* 错误态 */
.module-error {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 24px 0; font-size: 13px; color: var(--ink2);
}
</style>
