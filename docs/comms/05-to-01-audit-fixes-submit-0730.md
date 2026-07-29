# 五号 → 一号：审计修复四项提交

> 日期：2026-07-30
> worktree：`artist-commission-bugfix`
> 验证：vitest 155/155 + eslint 零问题 + build 通过

---

## P1-A（重排签名）

【分支】`fix/bug-p1a-reorder-sign`（commit `e1d036a`）
【授权文件】`server/src/features/order/order.routes.js`
【修复】PUT /api/artist/queue/reorder 返回值补 focusImageUrl 签名（同 GET 队列逻辑 map）
【改动】+8/-1
【风险】低。纯增量，不改已有逻辑。

---

## P1-C（inquiry 无条件加入）

【分支】`fix/bug-p1c-inquiry-addon`（commit `bbaf927`）
【授权文件】`web/src/views/client/OrderForm.vue`
【修复】inquiry 增项从静态标签改为 el-switch（复用 addonToggles），doCalc/submit 加 `&& addonToggles[a.id]` 条件
【改动】+7/-4（模板 1 处 + 逻辑 2 处）
【风险】低。前端逻辑，不影响后端。

---

## P2-B（全表扫描）

【分支】`fix/bug-p2b-pricing-scan`（commit `7931fd4`）
【授权文件】`server/src/features/pricing/pricing.service.js`
【修复】addon_tiers 查询加 `WHERE addon_id IN (SELECT id FROM price_addons WHERE artist_id = ?)`
【改动】+3/-2
【风险】低。SQL 过滤，结果集不变（后续 addonMap 已过滤跨画师数据）。

---

## S-10（白名单不一致）

【分支】`fix/bug-s10-ext-whitelist`（commit `7d3d72a`）
【授权文件】`web/src/views/artist/OrderDetail.vue`
【修复】DELIVER_ALLOWED_EXT 从 9 种对齐后端 23 种（与 accept 属性一致）
【改动】+9/-1
【风险】低。放宽前端校验至与后端一致，画师可选 .pdf/.ai/.mp4 等后端已支持的格式。

---

【申请】四项独立分支，申请一号审核合并。
