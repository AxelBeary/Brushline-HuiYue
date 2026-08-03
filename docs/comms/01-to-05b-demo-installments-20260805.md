# 派工：五号-B — 演示订单分期节点缺口修复（容器验证发现）

> 来自：一号 | 2026-08-05
> Worktree：`D:\Hermes Agent CN Desktop\workspace\artist-commission-w5b`
> 分支：`fix/v036-demo-installments`（已建好，基于 master 9fe02d8）
> **开工第一步**：cd 进 worktree 先 `git merge master`（四号/三号-B 可能有直提），再读本文件。

---

## 问题（一号容器验证时发现）

`docker exec` 查真库：4 个演示订单（ALICE-001~004）的 `order_payment_installments` 表**全空**，但订单有 `paid_total_cents`（14000/6000/4000）、有 `current_stage_id`。根因：`demo-data.ts` 直插 orders 绕过了 createOrder 的分期生成逻辑（order.service.ts L279-300，工作流订单从 takes_payment 节点生成分期）。后果：客户端跟踪页分期明细空白，五号 BUG-1 方案 b 的池子推算在演示数据上无节点可推。

## 任务

`server/scripts/demo-data.ts`：`seedDemoOrders()` 之后为演示订单补分期节点生成。

方案（择一，报告里写清选了哪个及理由）：
1. **复用服务函数**：demo-data 里 import createOrder 相关逻辑或抽一个 `generateInstallmentsForOrder(orderId, artistId)`（若 order.service.ts 没有现成导出，可小范围重构把 L279-300 的分期生成段抽成独立导出函数）
2. **直插补齐**：按画师工作流的 takes_payment 节点（basis_points）直接 INSERT，金额按 `round(total_price_cents * basis_points / 10000)`——与 createOrder 同公式

要求：
1. 只在正式区（queue_zone='formal'）的工作流订单生成分期（对齐 createOrder L279 条件）
2. 分期金额合计与订单 total_price_cents 的关系遵循现有公式即可（createOrder 本身不保证整除，不强加新约束）
3. **幂等**：重复跑演示脚本不重复插分期（先查该订单有无分期行，有则跳过）
4. `assertFieldIntegrity()` 补一条：正式区工作流订单必须有 ≥1 条分期行，否则抛错（C-4 断言的延伸）
5. demo-data.ts 是容器内脚本（`/app/...` import），本地无法执行——验证方式：tsc 类型检查 + 代码走查；能起容器就在容器里跑一次验证（可选，不强求）

## 授权文件

`server/scripts/demo-data.ts`、`server/src/features/order/order.service.ts`（仅限抽函数的最小重构）、对应 tests（若抽函数需补测试）

不动：web/、迁移文件、其他服务。

## 完工

commit（`fix(demo): 中文描述` 单行）+ `docs/comms/05b-to-01-demo-installments-交付-20260805.md` 交付报告。不推送不合并。返回摘要：commit hash、方案选择、验证结果、遗留。
