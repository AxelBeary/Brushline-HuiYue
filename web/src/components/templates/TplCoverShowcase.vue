<template>
  <!-- v0.25 A: 封面展示区（共享逻辑，不共享皮肤）
       单张封面 → 静态大图；多张 → 自动轮播（可手动滑动）
       本组件不写任何装饰性 CSS，视觉由各模板的外层 class + :deep() 控制 -->
  <div v-if="covers.length" class="tpl-cover">
    <!-- 多张：轮播 -->
    <el-carousel
      v-if="covers.length > 1"
      :interval="interval"
      :autoplay="autoplay"
      arrow="hover"
      indicator-position="outside"
      height="100%"
      class="tpl-cover-carousel"
    >
      <el-carousel-item v-for="art in covers" :key="art.id">
        <img :src="imgUrl(art.image_path)" :alt="art.title || ''" class="tpl-cover-img" />
      </el-carousel-item>
    </el-carousel>
    <!-- 单张：静态大图 -->
    <img v-else :src="imgUrl(covers[0].image_path)" :alt="covers[0].title || ''" class="tpl-cover-img tpl-cover-img--single" />
  </div>
</template>

<script setup>
import { useArtistData } from '../../composables/useArtistData.js'

const props = defineProps({
  /** 封面作品数组（is_cover=1 的 artworks） */
  covers: { type: Array, default: () => [] },
  /** 轮播间隔（毫秒），默认 4 秒 */
  interval: { type: Number, default: 4000 },
  /** 是否自动播放 */
  autoplay: { type: Boolean, default: true }
})

// 复用数据适配层的 URL 拼接（模板不碰路径）
const { imgUrl } = useArtistData(props)
</script>

<style scoped>
/* 结构性样式（非装饰）：撑满容器 + 图片覆盖 */
.tpl-cover { width: 100%; height: 100%; }
.tpl-cover-carousel { width: 100%; height: 100%; }
.tpl-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
