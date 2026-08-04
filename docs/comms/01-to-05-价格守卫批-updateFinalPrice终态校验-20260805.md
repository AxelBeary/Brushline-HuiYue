# 派工：五号 价格守卫批（中低风险）

> 一号派工 · 2026-08-05 · 风险等级：中低（后端守卫，收紧拦截，无新逻辑）
> 工作目录：`D:\Hermes Agent CN Desktop\workspace\artist-commission-priceguard`（worktree，分支 `v036-price-guard`，已建好）
> **开工第一步：`git merge master` 再读本文件**

## 背景（一号已实锤，不要重新侦查）

`updateFinalPrice`（order.service.ts，v0.11 R2）**后端无任何状态校验**——delivered/cancelled 订单也能通过 `PUT /api/artist/orders/:id/price` 改价，仅前端 OrderDetail 用 isTerminal 藏了按钮。前端校验只是子集，后端是底线（v0.36 L3 教训）。同类漏洞：`deleteExtraItem` 是否有终态守卫需要你自查确认。

**重要边界——done 状态本批不拦**（一号裁决）：done 订单当前唯一减价路径就是 updateFinalPrice（负增项被 schema 拦 `priceCents minimum: 0`，负收款只退钱不调总价）。done 改价守卫必须等 REQ-025 第二阶段的负条目机制一起上，否则画师减价无门。**本批只拦 delivered/cancelled。**

## 任务

### 1. updateFinalPrice 补 delivered/cancelled 守卫

- 校验位置：函数开头（getOrder 之后）
- `['delivered', 'cancelled'].includes(order.status)` → 抛 `AppError(E.ORDER_FINAL_STATE)`（**复用现有错误码，不新增**——errors.ts 有三号在改的授权区，不碰）
- 测试：delivered 改价 400 / cancelled 改价 400 / done 改价 **200**（明确断言 done 不拦，防将来误改）/ wip 改价 200（回归）

### 2. deleteExtraItem 终态守卫自查

- 读 deleteExtraItem 现状：若无 delivered/cancelled 守卫，按同款模式补上 + 同款测试（done 不拦）
- 若已有守卫，交付报告说明即可，不动

### 3. 顺手确认（只报告，不改）

- addPayment 是否有任何状态校验（预期：无——done/delivered 都能收款，这是用户拍板的 semi-terminal 语义需要的，**不要加**）
- addExtraItem 的守卫现状（预期：已拦 delivered/cancelled）

## 授权文件

- `server/src/features/order/order.service.ts`：**仅 updateFinalPrice 函数体 + deleteExtraItem 函数体**，其他区域一行不动
- `server/src/features/order/__tests__/`（或对应测试目录）：新增/追加测试

**禁碰**：errors.ts（三号授权区）、order.routes.ts、init.js、任何前端文件、addPayment。

## 验收

1. 测试全绿（新增 + server 存量 713）
2. commit 格式 `fix(order): ...`，说明含「done 不拦是有意设计（减价路径窗口期，待 REQ-025 第二阶段）」
3. 交付报告：改动清单 + 顺手确认结果 + 测试用例清单
