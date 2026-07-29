# 一号 → 二号：R30d 前端 — 等三号后端就绪后开工

> 日期：2026-07-30

## 分支

`feat/client-frontend-r30d-stage`

## 授权

`web/src/views/artist/QueueBoard.vue`、`web/src/views/artist/OrderDetail.vue`、`web/src/views/client/TrackOrder.vue`、`web/src/locales/**`（一号协调）

## 实施内容

1. QueueBoard：卡片显示当前节点名 + ↩ 标记（打回）；状态按钮改为"推进到下一节点"
2. OrderDetail：流程进度条（高亮当前节点）+ 推进/打回按钮 + "关闭流程跟踪"入口
3. TrackOrder：客户进度显示节点名（不显示数字进度）+ 打回时显示 ↩

## 接口依赖

- PUT /api/artist/orders/:id/stage（推进）
- PUT /api/artist/orders/:id/stage-back（打回）
- GET 订单详情新增 currentStageName / currentStageId
- 客户 track 新增 currentStageName

等三号提交后开工。
