<template>
  <!-- v0.32 REQ-023 Phase3: 画风展示柜（与 TplTierGrid 布局语言一致；单画风退化为纯尺寸列表） -->

  <!-- ── 多画风：左菜单 + 右展示（复用 TplTierGrid 展示柜交互：桌面左菜单 / 移动端滑动） ── -->
  <div v-if="styles.length > 1" class="tpl-style-showcase">
    <div class="tpl-style-menu">
      <button
        v-for="(style, idx) in styles"
        :key="style.id"
        class="tpl-style-menu-item"
        :class="{ 'tpl-style-menu-item--active': idx === activeIndex }"
        @click="activeIndex = idx"
      >
        <span class="tpl-style-menu-name">{{ style.name }}</span>
        <span class="tpl-style-menu-price">{{ fromLabel(style) }}</span>
      </button>
    </div>

    <div
      class="tpl-style-display"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <template v-if="activeStyle">
        <!-- v0.35 F3: 大图 = 选中尺寸图（有图）→ 画风封面兜底（未选/尺寸无图），切换带淡入淡出 -->
        <Transition name="tpl-style-img-fade" mode="out-in">
          <el-image
            v-if="displayImageUrl"
            :key="displayImageUrl"
            :src="displayImageUrl"
            fit="contain"
            class="tpl-style-display-img"
            :alt="activeStyle.name"
            :preview-src-list="[displayImageUrl]"
            preview-teleported
            hide-on-click-modal
          />
        </Transition>
        <!-- 信息区 -->
        <div class="tpl-style-display-info">
          <div class="tpl-style-display-head">
            <h3 class="tpl-style-display-name">{{ activeStyle.name }}</h3>
          </div>
          <!-- v0.35 F3: 选中带描述尺寸 → 尺寸描述+天数；未选中 → 画风描述 -->
          <p v-if="displayDesc" class="tpl-style-display-desc">{{ displayDesc }}</p>
          <p v-if="displayWorkDays != null" class="tpl-style-display-days">
            {{ $t('artistHome.aboutDays', { n: displayWorkDays }) }}
          </p>
          <!-- 尺寸价格列表 -->
          <div class="tpl-style-sizes">
            <button
              v-for="sz in activeStyle.sizes" :key="sz.id"
              class="tpl-style-size-row"
              :class="{ 'tpl-style-size-row--active': sz.id === selectedSizeId }"
              @click="toggleSize(sz.id)"
            >
              <span class="tpl-style-size-name">{{ sz.name }}</span>
              <span class="tpl-style-size-price">¥{{ sz.base_price }}</span>
              <span v-if="sz.id === selectedSizeId" class="tpl-style-size-check">✓</span>
            </button>
          </div>
          <button class="tpl-style-order-btn" @click="goOrder()">
            {{ $t('artistHome.styleOrderBtn') }}
          </button>
          <p v-if="orderHint" class="tpl-style-order-hint">{{ orderHint }}</p>
        </div>
      </template>
    </div>
  </div>

  <!-- ── 单画风退化：只显示尺寸列表，不显示"选画风"概念（与 OrderForm 退化逻辑一致） ── -->
  <div v-else-if="styles.length === 1" class="tpl-style-single">
    <!-- v0.35 F3: 与多画风一致的切图逻辑（选中尺寸图 → 封面兜底） -->
    <div v-if="displayImageUrl" class="tpl-style-single-cover">
      <Transition name="tpl-style-img-fade" mode="out-in">
        <el-image
          :key="displayImageUrl"
          :src="displayImageUrl"
          fit="contain"
          class="tpl-style-single-img"
          :alt="singleStyle.name"
          :preview-src-list="[displayImageUrl]"
          preview-teleported
          hide-on-click-modal
        />
      </Transition>
    </div>
    <p v-if="displayDesc" class="tpl-style-single-desc">{{ displayDesc }}</p>
    <p v-if="displayWorkDays != null" class="tpl-style-single-days">
      {{ $t('artistHome.aboutDays', { n: displayWorkDays }) }}
    </p>
    <div class="tpl-style-sizes">
      <button
        v-for="sz in singleStyle.sizes" :key="sz.id"
        class="tpl-style-size-row"
        :class="{ 'tpl-style-size-row--active': sz.id === selectedSizeId }"
        @click="toggleSize(sz.id)"
      >
        <span class="tpl-style-size-name">{{ sz.name }}</span>
        <span class="tpl-style-size-price">¥{{ sz.base_price }}</span>
        <span v-if="sz.id === selectedSizeId" class="tpl-style-size-check">✓</span>
      </button>
    </div>
    <button class="tpl-style-order-btn" @click="goOrder()">
      {{ $t('artistHome.styleOrderBtn') }}
    </button>
    <p v-if="orderHint" class="tpl-style-order-hint tpl-style-order-hint--single">{{ orderHint }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
// v0.35 联调：resolveSizeImagePath 尺寸图解析纯函数（artwork_image_path > image > 封面兜底由 displayImageUrl 处理）
import { useArtistData, resolveSizeImagePath } from '../../composables/useArtistData.js'

const props = defineProps({
  /** 画风列表（GET /api/public/styles/:subdomain，只含 is_active=1，按 sort_order 排序） */
  styles: { type: Array, default: () => [] },
  /** 画师子域名（跳转下单用） */
  subdomain: { type: String, default: '' }
})

const { imgUrl } = useArtistData(props)
const router = useRouter()
const { t } = useI18n()

const activeIndex = ref(0)
const activeStyle = computed(() => props.styles[activeIndex.value] || null)
const singleStyle = computed(() => props.styles[0] || null)

/** v0.34 任务B：当前展示柜已选尺寸（点选高亮，再点取消；切换画风/滑动切换时清空） */
const selectedSizeId = ref(null)

/** v0.35 F3: 当前选中尺寸对象（多画风=activeStyle 下；单画风=singleStyle 下） */
const currentStyle = computed(() => (props.styles.length > 1 ? activeStyle.value : singleStyle.value))
const selectedSize = computed(() =>
  (currentStyle.value?.sizes || []).find(sz => sz.id === selectedSizeId.value) || null
)

/**
 * v0.35 F3: 大图 URL——选中尺寸有图→尺寸图（artwork_image_path 引用作品实时路径 > image 独立上传）；
 * 未选尺寸/尺寸无图→画风封面兜底，不留空白。
 */
const displayImageUrl = computed(() => {
  const sizePath = resolveSizeImagePath(selectedSize.value)
  return imgUrl(sizePath || currentStyle.value?.cover_image || '')
})

/** v0.35 F3: 描述联动——选中带描述尺寸→尺寸描述；否则→画风描述 */
const displayDesc = computed(() => selectedSize.value?.description || currentStyle.value?.description || '')

/** v0.35 F3: 工作天数联动——仅选中尺寸带天数时显示 */
const displayWorkDays = computed(() => selectedSize.value?.work_days ?? null)

/** 尺寸行点击：选中/取消选择（toggle） */
function toggleSize(sizeId) {
  selectedSizeId.value = selectedSizeId.value === sizeId ? null : sizeId
}

/** v0.34 任务B：点击尺寸行后出现下单按钮提示，引导跳转预选 */
const orderHint = computed(() => {
  if (selectedSizeId.value == null) return ''
  const list = (activeStyle.value?.sizes || [])
  const size = list.find(sz => sz.id === selectedSizeId.value)
  if (!size) return ''
  return t('artistHome.styleSizeHint', { size: size.name, price: size.base_price })
})

/** v0.34 任务B：切换画风（菜单/滑动）→ 清空尺寸选择（尺寸列表随画风变） */
function onStyleChange() {
  selectedSizeId.value = null
}

/** 起步价标签（¥最低尺寸基础价起） */
function fromLabel(style) {
  const prices = (style.sizes || []).map(s => s.base_price)
  if (!prices.length) return '—'
  return `¥${Math.min(...prices)}${'+'}`
}

/** 移动端滑动切换（与 TplTierGrid 一致的 touchstart/touchend 逻辑） */
let touchStartX = 0
function onTouchStart(e) {
  touchStartX = e.touches[0].clientX
}
function onTouchEnd(e) {
  const deltaX = e.changedTouches[0].clientX - touchStartX
  if (Math.abs(deltaX) < 50) return // 阈值 50px，防误触
  if (deltaX < 0 && activeIndex.value < props.styles.length - 1) {
    activeIndex.value++ // 左滑 → 下一个
    onStyleChange()
  } else if (deltaX > 0 && activeIndex.value > 0) {
    activeIndex.value-- // 右滑 → 上一个
    onStyleChange()
  }
}

/** v0.34 任务B：跳转下单流程，带画风/尺寸 query（OrderForm 读 query 预选） */
function goOrder() {
  const query = {}
  const style = activeStyle.value || singleStyle.value
  if (style) query.styleId = style.id
  if (selectedSizeId.value != null) query.sizeId = selectedSizeId.value
  router.push({ path: `/artist/${props.subdomain}/order`, query })
}
</script>

<style scoped>
/* ─── 多画风展示柜：布局与 TplTierGrid 一致（左菜单 + 右展示），全部设计系统变量 ─── */
.tpl-style-showcase {
  display: flex;
  gap: 16px; /* v0.34 任务G：左菜单与右展示柜高度差过大时收紧 */
  align-items: flex-start;
}

/* 左侧画风菜单 */
.tpl-style-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  width: 180px;
}
.tpl-style-menu-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px; /* v0.34 任务G：菜单项收紧，减少左菜单下方空白感 */
  border: 1px solid var(--pal-border);
  border-radius: 10px;
  background: var(--pal-surface);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  font-family: inherit;
}
.tpl-style-menu-item:hover {
  border-color: var(--color-primary);
}
.tpl-style-menu-item--active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, var(--pal-surface));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary) 15%, transparent);
}
.tpl-style-menu-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--pal-text);
  font-family: var(--font-display);
}
.tpl-style-menu-price {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

/* 右侧展示区 */
.tpl-style-display {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--pal-border);
  border-radius: 12px;
  background: var(--pal-surface);
  overflow: hidden;
}
.tpl-style-display-img {
  width: 100%;
  height: auto;
  display: block;
  cursor: zoom-in;
}
.tpl-style-display-info {
  padding: 18px 20px 22px; /* v0.34 任务G：信息区收紧 */
}
.tpl-style-display-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.tpl-style-display-name {
  font-size: clamp(16px, 2.5vw, 20px);
  font-weight: 600;
  font-family: var(--font-display);
  color: var(--pal-text);
  margin: 0;
}
.tpl-style-display-desc {
  font-size: 13px;
  line-height: 1.6;
  color: var(--pal-text-dim);
  margin: 0 0 12px;
}
/* v0.35 F3: 尺寸工作天数（选中尺寸带 work_days 时显示） */
.tpl-style-display-days {
  font-size: 12px;
  color: var(--pal-text-dim);
  margin: -6px 0 12px;
}
/* v0.35 F3: 大图切换淡入淡出（共享逻辑，各模板可覆盖时长） */
.tpl-style-img-fade-enter-active,
.tpl-style-img-fade-leave-active {
  transition: opacity 0.18s ease;
}
.tpl-style-img-fade-enter-from,
.tpl-style-img-fade-leave-to {
  opacity: 0;
}

/* 尺寸价格列表（多画风/单画风共用） */
.tpl-style-sizes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 4px;
}
/* v0.34 任务B：尺寸行可点击选择（button 元素，选中高亮复用菜单 active 语言） */
.tpl-style-size-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  width: 100%;
  border: 1px solid var(--pal-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-primary) 4%, var(--pal-surface));
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: all 0.2s;
}
.tpl-style-size-row:hover {
  border-color: var(--color-primary);
}
.tpl-style-size-row--active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, var(--pal-surface));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary) 15%, transparent);
}
.tpl-style-size-check {
  color: var(--color-primary);
  font-weight: 700;
  font-size: 13px;
  margin-left: 8px;
}
.tpl-style-size-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--pal-text);
}
.tpl-style-size-price {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

/* 下单按钮 */
.tpl-style-order-btn {
  display: inline-block;
  margin-top: 12px;
  padding: 10px 28px;
  border: none;
  border-radius: 8px;
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
  font-family: inherit;
}
.tpl-style-order-btn:hover {
  opacity: 0.88;
  transform: translateY(-1px);
}
/* v0.34 任务B：选中尺寸后的下单引导提示 */
.tpl-style-order-hint {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--pal-text-dim);
}
.tpl-style-order-hint--single {
  margin-left: 22px;
  margin-right: 22px;
}

/* ─── 单画风退化：纯尺寸列表（无"选画风"概念） ─── */
.tpl-style-single {
  border: 1px solid var(--pal-border);
  border-radius: 12px;
  background: var(--pal-surface);
  overflow: hidden;
  padding-bottom: 20px;
}
.tpl-style-single-img {
  width: 100%;
  height: auto;
  display: block;
  cursor: zoom-in;
}
.tpl-style-single-desc {
  font-size: 13px;
  line-height: 1.6;
  color: var(--pal-text-dim);
  margin: 16px 22px 12px;
}
/* v0.35 F3: 单画风尺寸天数 */
.tpl-style-single-days {
  font-size: 12px;
  color: var(--pal-text-dim);
  margin: -6px 22px 12px;
}
.tpl-style-single .tpl-style-sizes {
  margin: 0 22px;
}
.tpl-style-single .tpl-style-order-btn {
  margin-left: 22px;
}

/* ─── 移动端：标签横排 + 展示区下方 + 滑动切换 ─── */
@media (max-width: 768px) {
  .tpl-style-showcase {
    flex-direction: column;
    gap: 12px;
  }
  .tpl-style-menu {
    flex-direction: row;
    width: 100%;
    overflow-x: auto;
    gap: 8px;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
  }
  .tpl-style-menu-item {
    flex-shrink: 0;
    min-width: 100px;
    padding: 8px 12px;
  }
  .tpl-style-display {
    touch-action: pan-y;
  }
}
</style>
