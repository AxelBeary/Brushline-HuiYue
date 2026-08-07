<template>
  <!-- B7/#9: 档位展示柜（左菜单 + 右大图，不裁切） -->
  <div class="tpl-tier-showcase">
    <!-- 桌面端：左侧档位菜单 -->
    <div class="tpl-tier-menu">
      <button
        v-for="(tier, idx) in tiers"
        :key="tier.id"
        class="tpl-tier-menu-item"
        :class="{
          'tpl-tier-menu-item--active': idx === activeIndex,
          'tpl-tier-menu-item--showcase': tier.visibility === 'showcase'
        }"
        @click="activeIndex = idx"
      >
        <span class="tpl-tier-menu-name">{{ tier.name }}</span>
        <span class="tpl-tier-menu-price">¥{{ tier.price }}</span>
        <span v-if="tier.visibility === 'showcase'" class="tpl-tier-menu-badge">{{ $t('artistHome.tierShowcase') }}</span>
      </button>
    </div>

    <!-- 右侧展示区 -->
    <div
      class="tpl-tier-display"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <template v-if="activeTier">
        <!-- 有示例图：完整大图，不裁切 -->
        <el-image
          v-if="activeTier.example_image"
          :src="imgUrl(activeTier.example_image)"
          fit="contain"
          class="tpl-tier-display-img"
          :alt="activeTier.name"
          :preview-src-list="[imgUrl(activeTier.example_image)]"
          preview-teleported
          hide-on-click-modal
        />
        <!-- 无示例图：显示档位说明文字（不留空白框） -->
        <div v-else class="tpl-tier-display-empty">
          <p class="tpl-tier-display-desc">{{ activeTier.description || activeTier.name }}</p>
        </div>

        <!-- 档位信息 -->
        <div class="tpl-tier-display-info">
          <div class="tpl-tier-display-head">
            <h3 class="tpl-tier-display-name">{{ activeTier.name }}</h3>
            <span class="tpl-tier-display-price">¥{{ activeTier.price }}</span>
          </div>
          <p v-if="activeTier.description" class="tpl-tier-display-desc">{{ activeTier.description }}</p>
          <p v-if="activeTier.work_days" class="tpl-tier-display-days">
            {{ $t('artistHome.aboutDays', { n: activeTier.work_days }) }}
          </p>
          <!-- 价格计算器扩展点 -->
          <slot name="addons" :tier="activeTier"></slot>
          <!-- 选择此档位（showcase 或画师非 open 时禁用） -->
          <button
            class="tpl-tier-select-btn"
            :disabled="activeTier.visibility === 'showcase' || artistStatus !== 'open'"
            @click="goOrder()"
          >
            {{ activeTier.visibility === 'showcase' ? $t('artistHome.tierShowcaseBtn') : $t('artistHome.tierSelectBtn') }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useArtistData } from '../../composables/useArtistData.js'

const props = defineProps({
  tiers: { type: Array, default: () => [] },
  /** featured: 保留兼容（展示柜模式下不使用） */
  featured: { type: Boolean, default: false },
  /** 画师子域名（跳转下单用） */
  subdomain: { type: String, default: '' },
  /** 画师信息（status 决定约稿按钮是否禁用） */
  artist: { type: Object, default: null }
})

const { imgUrl } = useArtistData(props)
const router = useRouter()

/** 画师接单状态：取不到时默认 open（不误伤可约稿画师） */
const artistStatus = computed(() => props.artist?.status ?? 'open')

const activeIndex = ref(0)
const activeTier = computed(() => props.tiers[activeIndex.value] || null)

/** 移动端滑动切换（touchstart/touchend 计算 deltaX） */
let touchStartX = 0
function onTouchStart(e) {
  touchStartX = e.touches[0].clientX
}
function onTouchEnd(e) {
  const deltaX = e.changedTouches[0].clientX - touchStartX
  if (Math.abs(deltaX) < 50) return // 阈值 50px，防误触
  if (deltaX < 0 && activeIndex.value < props.tiers.length - 1) {
    activeIndex.value++ // 左滑 → 下一个
  } else if (deltaX > 0 && activeIndex.value > 0) {
    activeIndex.value-- // 右滑 → 上一个
  }
}

/** 跳转下单流程（复用现有逻辑；档位预选为后续增强，见 comms） */
function goOrder() {
  router.push(`/artist/${props.subdomain}/order`)
}
</script>

<style scoped>
/* ─── 展示柜布局：桌面左菜单 + 右大图 ─── */
.tpl-tier-showcase {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

/* 左侧档位菜单 */
.tpl-tier-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  width: 180px;
}
.tpl-tier-menu-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 12px 14px;
  border: 1px solid var(--pal-border);
  border-radius: 10px;
  background: var(--pal-surface);
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
  text-align: left;
  font-family: inherit;
}
.tpl-tier-menu-item:hover {
  border-color: var(--color-primary);
}
.tpl-tier-menu-item--active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, var(--pal-surface));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary) 15%, transparent);
}
.tpl-tier-menu-item--showcase {
  opacity: 0.55;
}
.tpl-tier-menu-item--showcase.tpl-tier-menu-item--active {
  opacity: 0.75;
}
.tpl-tier-menu-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--pal-text);
  font-family: var(--font-display);
}
.tpl-tier-menu-price {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}
.tpl-tier-menu-badge {
  font-size: 11px;
  color: var(--pal-text-dim);
  margin-top: 2px;
}

/* 右侧展示区 */
.tpl-tier-display {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--pal-border);
  border-radius: 12px;
  background: var(--pal-surface);
  overflow: hidden;
}
.tpl-tier-display-img {
  width: 100%;
  height: auto;
  display: block;
  cursor: zoom-in;
}
.tpl-tier-display-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 32px;
}
.tpl-tier-display-info {
  padding: 20px 22px 24px;
}
.tpl-tier-display-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.tpl-tier-display-name {
  font-size: clamp(16px, 2.5vw, 20px);
  font-weight: 600;
  font-family: var(--font-display);
  color: var(--pal-text);
  margin: 0;
}
.tpl-tier-display-price {
  font-size: clamp(22px, 3vw, 28px);
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}
.tpl-tier-display-desc {
  font-size: 13px;
  line-height: 1.6;
  color: var(--pal-text-dim);
  margin: 0 0 8px;
}
.tpl-tier-display-days {
  font-size: 12px;
  color: var(--pal-text-dim);
  margin: 0 0 12px;
}
.tpl-tier-select-btn {
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
.tpl-tier-select-btn:hover:not(:disabled) {
  opacity: 0.88;
  transform: translateY(-1px);
}
.tpl-tier-select-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ─── 移动端：标签横排 + 大图下方 + 滑动切换 ─── */
@media (max-width: 768px) {
  .tpl-tier-showcase {
    flex-direction: column;
    gap: 12px;
  }
  .tpl-tier-menu {
    flex-direction: row;
    width: 100%;
    overflow-x: auto;
    gap: 8px;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
  }
  .tpl-tier-menu-item {
    flex-shrink: 0;
    min-width: 100px;
    padding: 8px 12px;
  }
  .tpl-tier-display {
    /* 滑动区域 */
    touch-action: pan-y;
  }
}
</style>
