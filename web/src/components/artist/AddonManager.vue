<template>
  <div class="addon-manager" v-loading="loading">
    <div class="addon-columns">
      <!-- 左列：增项库 -->
      <div class="addon-library">
        <h4 class="col-title">📦 增项库</h4>
        <draggable
          v-model="addons"
          item-key="id"
          handle=".drag-handle"
          :group="{ name: 'addons', pull: 'clone', put: false }"
          :sort="true"
          @end="onLibraryDragEnd"
          class="addon-list"
        >
          <template #item="{ element: a }">
            <div class="addon-card" :class="{ disabled: !a.enabled }" @click="startEdit(a)">
              <span class="drag-handle" title="拖拽排序 / 拖到右边关联档位">⠿</span>
              <div class="addon-info">
                <span class="addon-name">{{ a.name }}</span>
                <span class="addon-price">{{ formatPrice(a) }}</span>
              </div>
              <span class="addon-cat-badge">{{ categoryLabel(a.category) }}</span>
              <el-switch
                v-model="a.enabled" :active-value="1" :inactive-value="0"
                size="small" @click.stop @change="toggleEnabled(a)"
              />
              <el-popconfirm title="确定删除这个增项？" @confirm="removeAddon(a)">
                <template #reference>
                  <el-button text size="small" type="danger" class="del-btn" @click.stop>✕</el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </draggable>

        <!-- 新建增项 -->
        <div class="add-row">
          <el-input v-model="newName" placeholder="增项名称…" size="small" style="flex:1" @keyup.enter="openCreate" />
          <el-button size="small" @click="openCreate" :disabled="!newName.trim()">＋ 新建</el-button>
        </div>
      </div>

      <!-- 右列：档位货架 -->
      <div class="tier-shelf">
        <h4 class="col-title">🏪 档位货架 <span class="col-hint">拖增项到档位上关联</span></h4>
        <div v-for="tier in tiers" :key="tier.id" class="tier-slot">
          <div class="tier-header">
            <span class="tier-name">{{ tier.name }}</span>
            <span class="tier-price">¥{{ tier.price }}</span>
          </div>
          <draggable
            :list="tierAddons(tier.id)"
            item-key="id"
            :group="{ name: 'addons', pull: false, put: true }"
            class="tier-addons"
            @add="(evt) => onTierDrop(tier.id, evt)"
          >
            <template #item="{ element: a }">
              <el-tag
                closable size="small" class="tier-chip"
                @close="unlinkAddon(tier.id, a.id)"
              >
                {{ a.name }}
              </el-tag>
            </template>
          </draggable>
          <div v-if="tierAddons(tier.id).length === 0" class="tier-empty">拖增项到这里</div>
        </div>
        <div v-if="tiers.length === 0" class="tier-empty-global">
          还没有档位，请先在「档位管理」中添加
        </div>
      </div>
    </div>

    <!-- 新建/编辑弹窗 -->
    <el-dialog v-model="showCreateDialog" :title="editingAddon ? '编辑增项' : '新建增项'" width="420px" destroy-on-close>
      <el-form :model="editForm" label-position="top" size="default">
        <el-form-item label="名称" required>
          <el-input v-model="editForm.name" maxlength="50" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="editForm.category" style="width:100%">
            <el-option v-for="c in categories" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="计价方式">
          <el-radio-group v-model="editForm.priceType">
            <el-radio-button value="fixed">固定金额</el-radio-button>
            <el-radio-button value="percent">按基础价比例</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="editForm.priceType === 'fixed' ? '金额（元）' : '比例（如 0.3 = 30%）'">
          <el-input-number v-model="editForm.priceValue" :min="0" :max="editForm.priceType === 'fixed' ? 100000 : 10" :step="editForm.priceType === 'fixed' ? 10 : 0.05" :precision="editForm.priceType === 'fixed' ? 0 : 2" style="width:100%" />
          <div v-if="editForm.priceType === 'percent'" class="form-hint">基于客户所选档位的基础价计算</div>
        </el-form-item>
        <el-form-item label="选择模式">
          <el-radio-group v-model="editForm.selectMode">
            <el-radio-button value="quantity">按数量</el-radio-button>
            <el-radio-button value="toggle">开/关</el-radio-button>
            <el-radio-button value="inquiry">面议</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="editForm.selectMode === 'quantity'" label="最大数量">
          <el-input-number v-model="editForm.maxQty" :min="1" :max="99" style="width:120px" />
        </el-form-item>
        <el-form-item label="说明（客户可见）">
          <el-input v-model="editForm.description" type="textarea" :rows="2" maxlength="200" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveAddon" :loading="saving">{{ editingAddon ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import draggable from 'vuedraggable'
import { artistApi } from '../../api/index.js'
import { ElMessage } from 'element-plus'

const loading = ref(true)
const saving = ref(false)
const addons = ref([])
const tiers = ref([])
const showCreateDialog = ref(false)
const editingAddon = ref(null)
const newName = ref('')

const categories = [
  { value: 'expression', label: '🎭 表情差分' },
  { value: 'outfit', label: '👗 服装替换' },
  { value: 'background', label: '🏞 背景场景' },
  { value: 'weapon', label: '⚔️ 武器道具' },
  { value: 'other', label: '✨ 其他' }
]

const editForm = ref({
  name: '', category: 'expression', priceType: 'fixed',
  priceValue: 10, selectMode: 'quantity', maxQty: 5, description: ''
})

/** 切换计价方式时重置数值到合理默认 */
watch(() => editForm.value.priceType, (type) => {
  if (type === 'percent' && editForm.value.priceValue > 1) {
    editForm.value.priceValue = 0.3
  } else if (type === 'fixed' && editForm.value.priceValue < 1) {
    editForm.value.priceValue = 10
  }
})

function categoryLabel(cat) {
  return categories.find(c => c.value === cat)?.label?.slice(2)?.trim() || cat
}

function formatPrice(a) {
  if (a.select_mode === 'inquiry') return '面议'
  if (a.price_type === 'percent') return `+${Math.round(a.price_value * 100)}%`
  return `¥${a.price_value}/个`
}

/** 获取某档位关联的增项列表 */
function tierAddons(tierId) {
  return addons.value.filter(a => a.tierIds?.includes(tierId))
}

// ─── 拖拽事件 ───

function onLibraryDragEnd() {
  // 库内排序
  artistApi.reorderAddons(addons.value.map(a => a.id)).catch(() => {})
}

function onTierDrop(tierId, evt) {
  // 从 evt 中获取拖入的增项 ID
  const draggedId = addons.value[evt.oldIndex]?.id
  if (!draggedId) return

  const addon = addons.value.find(a => a.id === draggedId)
  if (!addon) return

  // 如果已经关联了，不重复添加
  if (addon.tierIds?.includes(tierId)) return

  const newTierIds = [...(addon.tierIds || []), tierId]
  artistApi.updateAddonTiers(draggedId, newTierIds)
    .then(updated => {
      const idx = addons.value.findIndex(a => a.id === draggedId)
      if (idx >= 0) addons.value[idx] = updated
    })
    .catch(err => ElMessage.error(err.message))
}

function unlinkAddon(tierId, addonId) {
  const addon = addons.value.find(a => a.id === addonId)
  if (!addon) return
  const newTierIds = (addon.tierIds || []).filter(id => id !== tierId)
  artistApi.updateAddonTiers(addonId, newTierIds)
    .then(updated => {
      const idx = addons.value.findIndex(a => a.id === addonId)
      if (idx >= 0) addons.value[idx] = updated
    })
    .catch(err => ElMessage.error(err.message))
}

// ─── CRUD ───

function openCreate() {
  editingAddon.value = null
  editForm.value = {
    name: newName.value.trim(), category: 'expression', priceType: 'fixed',
    priceValue: 10, selectMode: 'quantity', maxQty: 5, description: ''
  }
  showCreateDialog.value = true
}

function startEdit(a) {
  editingAddon.value = a
  editForm.value = {
    name: a.name, category: a.category, priceType: a.price_type,
    priceValue: a.price_value, selectMode: a.select_mode,
    maxQty: a.max_qty, description: a.description || ''
  }
  showCreateDialog.value = true
}

async function saveAddon() {
  if (!editForm.value.name.trim()) {
    ElMessage.warning('请输入增项名称')
    return
  }
  saving.value = true
  try {
    const payload = {
      name: editForm.value.name.trim(),
      category: editForm.value.category,
      priceType: editForm.value.priceType,
      priceValue: editForm.value.priceValue,
      selectMode: editForm.value.selectMode,
      maxQty: editForm.value.maxQty,
      description: editForm.value.description.trim() || null
    }

    if (editingAddon.value) {
      const updated = await artistApi.updateAddon(editingAddon.value.id, payload)
      const idx = addons.value.findIndex(a => a.id === updated.id)
      if (idx >= 0) addons.value[idx] = updated
      ElMessage.success('已更新')
    } else {
      const created = await artistApi.createAddon(payload)
      addons.value.push(created)
      ElMessage.success('已创建')
    }
    showCreateDialog.value = false
    editingAddon.value = null
    newName.value = ''
  } catch (err) {
    ElMessage.error(err.message)
  } finally {
    saving.value = false
  }
}

async function removeAddon(a) {
  try {
    await artistApi.deleteAddon(a.id)
    addons.value = addons.value.filter(x => x.id !== a.id)
    ElMessage.success('已删除')
  } catch (err) {
    ElMessage.error(err.message)
  }
}

async function toggleEnabled(a) {
  try {
    await artistApi.updateAddon(a.id, { enabled: !!a.enabled })
  } catch (err) {
    a.enabled = a.enabled ? 0 : 1
    ElMessage.error(err.message)
  }
}

// ─── 初始化 ───

onMounted(async () => {
  try {
    const [addonList, tierList] = await Promise.all([
      artistApi.getAddons(),
      artistApi.getTiers()
    ])
    addons.value = addonList
    tiers.value = tierList
  } catch (err) {
    ElMessage.error(err.message)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.addon-columns { display: flex; gap: 24px; align-items: flex-start; }
.col-title { font-size: 15px; font-weight: 700; margin: 0 0 12px; color: var(--text-primary); }
.col-hint { font-size: 11px; font-weight: 400; color: var(--text-muted); margin-left: 8px; }

/* 左列：增项库 */
.addon-library { flex: 1; min-width: 280px; }
.addon-list { display: flex; flex-direction: column; gap: 6px; min-height: 60px; }
.addon-card {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; border-radius: 8px;
  background: var(--bg-card); border: 1px solid var(--border-color);
  cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
}
.addon-card:hover { border-color: var(--el-color-primary-light-5); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.addon-card.disabled { opacity: 0.5; }
.drag-handle { cursor: grab; color: var(--text-muted); font-size: 14px; user-select: none; flex-shrink: 0; }
.addon-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.addon-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.addon-price { font-size: 12px; color: var(--el-color-primary); font-weight: 600; font-variant-numeric: tabular-nums; }
.addon-cat-badge { font-size: 11px; color: var(--text-secondary); background: var(--bg-inset); padding: 2px 8px; border-radius: 10px; flex-shrink: 0; }
.del-btn { opacity: 0.3; flex-shrink: 0; }
.addon-card:hover .del-btn { opacity: 1; }
.add-row { display: flex; gap: 8px; margin-top: 12px; }

/* 右列：档位货架 */
.tier-shelf { flex: 1; min-width: 280px; }
.tier-slot {
  padding: 12px; border-radius: 8px; margin-bottom: 10px;
  background: var(--bg-inset); border: 1px dashed var(--border-color);
  transition: border-color 0.2s;
}
.tier-slot:hover { border-color: var(--el-color-primary-light-5); }
.tier-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.tier-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.tier-price { font-size: 13px; font-weight: 700; color: var(--el-color-primary); }
.tier-addons { display: flex; flex-wrap: wrap; gap: 6px; min-height: 32px; }
.tier-chip { cursor: default; }
.tier-empty { font-size: 12px; color: var(--text-muted); font-style: italic; padding: 4px 0; }
.tier-empty-global { font-size: 13px; color: var(--text-muted); text-align: center; padding: 32px 0; }

.form-hint { font-size: 11px; color: var(--text-secondary); margin-top: 4px; }

@media (max-width: 700px) {
  .addon-columns { flex-direction: column; }
}
</style>
