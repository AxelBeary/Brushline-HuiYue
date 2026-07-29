# 二号 → 一号：R33 签名刷新前端提交审核

> 日期：2026-07-30
> 分支：`feat/client-frontend-r33-signatures`，commit `7bb6cc0`
> 依赖：三号 R33 后端（`6b0bd16`，已合入 master `c924032`）

---

【角色】二号：客户页面前端负责者

【工作分支】feat/client-frontend-r33-signatures

【任务编号】R33（签名刷新前端接入）

【修改模块】画师端 OrderDetail.vue / QueueBoard.vue + 新 composable + API 层

【修改内容】

**新 composable `useSignatureRefresh.js`**：
- 每 10 分钟（签名 TTL 15min，留 5min 余量）收集页面所有裸路径，调 `POST /api/artist/refresh-signatures` 批量换新
- 静默失败（不打扰用户，下次定时器重试）
- 防重入（多张图同时 error 只触发一次）
- onUnmounted 自动清理定时器

**OrderDetail.vue 接入**：
- collect：references[].file_path + notes[].image_path + deliverables[].file_path
- apply：新 URL 写回 r.url / n.imageUrl / d.url
- el-image / img 加 `@error="refreshNow"` 兜底（加载失败立即刷新）

**QueueBoard.vue 接入**：
- collect：queue[].focus_image_path
- apply：新 URL 写回 focusImageUrl
- 大/小模式 el-image 加 `@error="refreshNow"`

**api/index.js**：新增 `artistApi.refreshSignatures(paths)`

【涉及文件】
- web/src/composables/useSignatureRefresh.js（新增）
- web/src/api/index.js
- web/src/views/artist/OrderDetail.vue
- web/src/views/artist/QueueBoard.vue

【是否修改非客户前端文件】是。api/index.js 在授权范围内（v0.12 已改过，一号授权 web/src/ 下）。

【接口依赖】
| 接口 | 调用方式 |
|------|----------|
| POST /api/artist/refresh-signatures | body `{ paths: string[] }`（1-50 条），返回 `{ urls: { [path]: signedUrl } }` |

【自测情况】
- ESLint：零错误零警告 ✅
- Vite build：通过（3.93s）✅
- 无新增 i18n 键（静默机制，无用户可见文字）✅
- 仅 4 个授权文件 ✅

【可能影响】仅画师端 OrderDetail / QueueBoard。客户页不受影响（客户 track 页是短停留页面，签名 15min 内足够；若需要可后续用同一 composable 接入）。

【待确认问题】
1. 客户侧 DeliveryPage（交付页）也是签名 URL 页面，但客户无 requireAuth 权限调 refresh-signatures。若客户交付页也需要刷新，需三号提供客户侧刷新接口（或延长 track/delivery 接口签名 TTL）。当前未接入，等一号决策。
2. R30 分支（feat/client-frontend-r30-board）与本分支都改了 QueueBoard.vue，合并时需注意顺序（本分支基于 master，R30 合入后本分支需 rebase）。

【申请】申请一号审核合并。
