<template>
  <div class="multiplier-manager" v-loading="loading">
    <!-- 用途倍率 -->
    <div class="m-group">
      <h4 class="group-title">📋 用途倍率 <span class="group-hint">多个同时选中时取最高</span></h4>
      <div v-for="m in usageList" :key="m.id" class="m-row">
        <span class="m-name">{{ m.name }}</span>
        <span class="m-value">×{{ m.multiplier }}</span>
        <el-switch v-model="m.enabled" :active-value="1" :inactive-value="0" size="small" @change="toggle(m)" />
        <el-button text size="small" @click="startEdit(m)">编辑</el-button>
        <el-popconfirm title="确定删除？" @confirm="remove(m)">
          <template #reference>
            <el-button text size="small" type="danger">✕</el-button>
          </template>
        </el-popconfirm>
      </div>
      <div v-if="usageList.length === 0" class="m-empty">暂无用途倍率</div>
      <el-button size="small" @click="openCreate('usage')">＋ 添加用途倍率</el-button>
    </div>

    <!-- 加急倍率 -->
    <div class="m-group">
      <h4 class="group-title">⚡ 加急倍率 <span class="group-hint">与用途倍率相乘叠加</span></h4>
      <div v-for="m in rushList" :key="m.id" class="m-row">
        <span class="m-name">{{ m.name }}</span>
        <span class="m-value">×{{ m.multiplier }}</span>
        <el-switch v-model="m.enabled" :active-value="1" :inactive-value="0" size="small" @change="toggle(m)" />
        <el-button text size="small" @click="startEdit(m)">编辑</el-button>
        <el-popconfirm title="确定删除？" @confirm="remove(m)">
          <template #reference>
            <el-button text size="small" type="danger">✕</el-button>
          </template>
        </el-popconfirm>
      </div>
      <div v-if="rushList.length === 0" class="m-empty">暂无加急倍率</div>
      <el-button size="small" @click="openCreate('rush')">＋ 添加加急倍率</el-button>
    </div>

    <!-- 新建/编辑弹窗 -->
    <el-dialog v-model="showDialog" :title="editing ? '编辑倍率' : '新建倍率'" width="380px" destroy-on-close>
      <el-form :model="form" label-position="top" size="default">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" maxlength="50" placeholder="如：商用授权 / 加急（3天内）" />
        </el-form-item>
        <el-form-item label="倍率值" required>
          <el-input-number v-model="form.multiplier" :min="1.0" :max="100" :step="0.1" :precision="1" style="width:100%" />
          <div class="form-hint">1.5 = 价格 ×1.5（加收50%）</div>
        </el-form-item>
        <el-form-item label="说明（客户可见）">
          <el-input v-model="form.description" type="textarea" :rows="2" maxlength="200" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="save" :loading="saving">{{ editing ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { artistApi } from '../../api/index.js'
import { ElMessage } from 'element-plus'

const loading = ref(true)
const saving = ref(false)
const list = ref([])
const showDialog = ref(false)
const editing = ref(null)
const createType = ref('usage')

const form = ref({ name: '', multiplier: 1.5, description: '' })

const usageList = computed(() => list.value.filter(m => m.type === 'usage'))
const rushList = computed(() => list.value.filter(m => m.type === 'rush'))

function openCreate(type) {
  createType.value = type
  editing.value = null
  form.value = { name: '', multiplier: 1.5, description: '' }
  showDialog.value = true
}

function startEdit(m) {
  editing.value = m
  form.value = { name: m.name, multiplier: m.multiplier, description: m.description || '' }
  showDialog.value = true
}

async function save() {
  if (!form.value.name.trim()) { ElMessage.warning('请输入名称'); return }
  saving.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      multiplier: form.value.multiplier,
      description: form.value.description.trim() || null
    }
    if (editing.value) {
      const updated = await artistApi.updateMultiplier(editing.value.id, payload)
      const idx = list.value.findIndex(x => x.id === updated.id)
      if (idx >= 0) list.value[idx] = updated
      ElMessage.success('已更新')
    } else {
      const created = await artistApi.createMultiplier({ ...payload, type: createType.value })
      list.value.push(created)
      ElMessage.success('已创建')
    }
    showDialog.value = false
  } catch (err) { ElMessage.error(err.message) }
  finally { saving.value = false }
}

async function remove(m) {
  try {
    await artistApi.deleteMultiplier(m.id)
    list.value = list.value.filter(x => x.id !== m.id)
    ElMessage.success('已删除')
  } catch (err) { ElMessage.error(err.message) }
}

async function toggle(m) {
  try {
    await artistApi.updateMultiplier(m.id, { enabled: !!m.enabled })
  } catch (err) {
    m.enabled = m.enabled ? 0 : 1
    ElMessage.error(err.message)
  }
}

onMounted(async () => {
  try {
    list.value = await artistApi.getMultipliers()
  } catch (err) { ElMessage.error(err.message) }
  finally { loading.value = false }
})
</script>

<style scoped>
.m-group { margin-bottom: 28px; }
.group-title { font-size: 15px; font-weight: 700; margin: 0 0 12px; color: var(--text-primary); }
.group-hint { font-size: 11px; font-weight: 400; color: var(--text-muted); margin-left: 8px; }
.m-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 8px; margin-bottom: 6px;
  background: var(--bg-card); border: 1px solid var(--border-color);
}
.m-name { flex: 1; font-size: 14px; font-weight: 600; color: var(--text-primary); }
.m-value { font-size: 14px; font-weight: 700; color: var(--el-color-primary); font-variant-numeric: tabular-nums; min-width: 40px; text-align: right; }
.m-empty { font-size: 13px; color: var(--text-muted); font-style: italic; padding: 8px 0 12px; }
.form-hint { font-size: 11px; color: var(--text-secondary); margin-top: 4px; }
</style>
