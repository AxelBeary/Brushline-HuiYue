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
        <!-- 封面图 -->
        <el-image
          v-if="activeStyle.cover_image"
          :src="imgUrl(activeStyle.cover_image)"
          fit="cover"
          class="tpl-style-display-img"
          :alt="activeStyle.name"
        />
        <!-- 信息区 -->
        <div class="tpl-style-display-info">
          <div class="tpl-style-display-head">
            <h3 class="tpl-style-display-name">{{ activeStyle.name }}</h3>
          </div>
          <p v-if="activeStyle.description" class="tpl-style-display-desc">{{ activeStyle.description }}</p>
          <!-- 尺寸价格列表 -->
          <div class="tpl-style-sizes">
            <div v-for="sz in activeStyle.sizes" :key="sz.id" class="tpl-style-size-row">
              <span class="tpl-style-size-name">{{ sz.name }}</span>
              <span class="tpl-style-size-price">¥{{ sz.base_price }}</span>
            </div>
          </div>
          <button class="tpl-style-order-btn" @click="goOrder()">
            {{ $t('artistHome.styleOrderBtn') }}
          </button>
        </div>
      </template>
    </div>
  </div>

  <!-- ── 单画风退化：只显示尺寸列表，不显示"选画风"概念（与 OrderForm 退化逻辑一致） ── -->
  <div v-else-if="styles.length === 1" class="tpl-style-single">
    <div v-if="singleStyle.cover_image" class="tpl-style-single-cover">
      <el-image
        :src="imgUrl(singleStyle.cover_image)"
        fit="cover"
        class="tpl-style-single-img"
        :alt="singleStyle.name"
      />
    </div>
    <p v-if="singleStyle.description" class="tpl-style-single-desc">{{ singleStyle.description }}</p>
    <div class="tpl-style-sizes">
      <div v-for="sz in singleStyle.sizes" :key="sz.id" class="tpl-style-size-row">
        <span class="tpl-style-size-name">{{ sz.name }}</span>
        <span class="tpl-style-size-price">¥{{ sz.base_price }}</span>
      </div>
    </div>
    <button class="tpl-style-order-btn" @click="goOrder()">
      {{ $t('artistHome.styleOrderBtn') }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useArtistData } from '../../composables/useArtistData.js'

const props = defineProps({
  /** 画风列表（GET /api/public/styles/:subdomain，只含 is_active=1，按 sort_order 排序） */
  styles: { type: Array, default: () => [] },
  /** 画师子域名（跳转下单用） */
  subdomain: { type: String, default: '' }
})

const { imgUrl } = useArtistData(props)
const router = useRouter()

const activeIndex = ref(0)
const activeStyle = computed(() => props.styles[activeIndex.value] || null)
const singleStyle = computed(() => props.styles[0] || null)

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
  } else if (deltaX > 0 && activeIndex.value > 0) {
    activeIndex.value-- // 右滑 → 上一个
  }
}

/** 跳转下单流程（OrderForm 三步走，客户端自行选画风/尺寸） */
function goOrder() {
  router.push(`/artist/${props.subdomain}/order`)
}
</script>

<style scoped>
/* ─── 多画风展示柜：布局与 TplTierGrid 一致（左菜单 + 右展示），全部设计系统变量 ─── */
.tpl-style-showcase {
  display: flex;
  gap: 20px;
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
  padding: 12px 14px;
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
  height: 220px;
  display: block;
}
.tpl-style-display-info {
  padding: 20px 22px 24px;
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

/* 尺寸价格列表（多画风/单画风共用） */
.tpl-style-sizes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 4px;
}
.tpl-style-size-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 1px solid var(--pal-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-primary) 4%, var(--pal-surface));
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
  height: 200px;
  display: block;
}
.tpl-style-single-desc {
  font-size: 13px;
  line-height: 1.6;
  color: var(--pal-text-dim);
  margin: 16px 22px 12px;
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
