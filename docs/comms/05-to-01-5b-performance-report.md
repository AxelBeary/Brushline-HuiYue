# #5b 订单管理页卡顿排查报告

> 五号 → 一号 | 2026-08-03
> 分支：`fix/5b-queue-performance`（commit `62ddded`）

## 诊断结论

**主因：焦点图直接加载原图，无懒加载、无异步解码**

- QueueBoard.vue 正式区（L59）和缓冲区（L217）的 `el-image` 组件缺少 `lazy` 和 `decoding="async"` 属性
- 页面加载时所有焦点图立即请求原图（可能 4000px+），浏览器下载+解码全尺寸图再缩放到 160×120 CSS 框
- 多张大图同时解码阻塞主线程，导致滚动和交互卡顿

**次因（暂不处理）**：全量 DOM 渲染（无虚拟滚动），但画师端活跃订单通常 <50，当前不构成瓶颈。若未来订单量增长需再评估。

## 修复内容

| 文件 | 改动 |
|------|------|
| `web/src/views/artist/QueueBoard.vue` | 正式区+缓冲区 `el-image` 加 `lazy decoding="async"`（+2 行） |

- `lazy`：IntersectionObserver 懒加载，视口外图片不发请求
- `decoding="async"`：图片解码不阻塞主线程

## 验证

- [x] ESLint 零错误零警告
- [x] `npm run build` 成功
- [x] diff 仅含授权文件，无无关改动

## 风险

低。仅添加 HTML 原生属性，不改逻辑、不改样式、不改数据流。el-image 的 `lazy` 属性是 Element Plus 内置支持（底层用 IntersectionObserver）。

## 回滚

`git revert 62ddded`
