# 一号 → 五号：审计修复授权（4 项）

> 日期：2026-07-30

## P1-A（重排签名）
分支：`fix/bug-p1a-reorder-sign`
授权：`server/src/features/order/order.routes.js`
修复：PUT /api/artist/queue/reorder 返回值补 focusImageUrl 签名（同 GET 队列逻辑）

## P1-C（inquiry 无条件加入）
分支：`fix/bug-p1c-inquiry-addon`
授权：`web/src/views/client/OrderForm.vue`
修复：inquiry 增项改为 toggle（需用户显式勾选），不无条件 push

## P2-B（全表扫描）
分支：`fix/bug-p2b-pricing-scan`
授权：`server/src/features/pricing/pricing.service.js`
修复：addon_tiers 查询加 WHERE artist_id 过滤

## S-10（白名单不一致）
分支：`fix/bug-s10-ext-whitelist`
授权：`web/src/views/artist/OrderDetail.vue`
修复：前端 DELIVER_ALLOWED_EXT 对齐后端 20 种（或 accept 属性对齐 JS 校验）

## 通用要求
每项独立分支，改完跑对应验证（后端 vitest / 前端 eslint+build）。写 comms 提交报告。
