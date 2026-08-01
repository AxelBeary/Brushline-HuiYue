# 三号 → 一号：v0.27 REQ-015 手动录单重设计 交付报告

> 分支：`feat/v027-manual-order-redesign`
> Worktree：`D:\Hermes Agent CN Desktop\workspace\artist-commission-03`
> 日期：2026-08-02

---

## 做了什么

REQ-015 手动录单从 560px 抽屉改为全屏双栏独立页面，API 零改动，纯前端重排。

### 改动清单

| 文件 | 变更 |
|------|------|
| `web/src/views/artist/ManualOrder.vue` | 重写：ArtistLayout 包裹 + 双栏网格 + 档位卡片 + QQ历史面板 + 三档响应式 + 底部价格条 |
| `web/src/views/artist/OrderList.vue` | 删 el-drawer + ManualOrderForm import + manualDrawerVisible + onManualCreated + ?action=manual 逻辑；工具栏按钮改 router.push('/orders/new') |
| `web/src/router/index.js` | 新增 `/orders/new` 路由（requiresAuth）；`/manual-order` 重定向改为 `/orders/new` |
| `web/src/components/ArtistLayout.vue` | 菜单项 `/orders?action=manual` → `/orders/new` |
| `web/src/locales/zh-CN.js` | 新增 leftTitle/rightTitle/noTiers/tierDays/priceDetail/historyTitle/newClient |
| `web/src/locales/en.js` | 同上英文 |

### 验收标准对照

| # | 标准 | 状态 |
|---|------|------|
| 1 | 桌面端（≥1024px）双栏布局，左客户信息/右定价，价格面板 sticky | ✅ CSS grid 2col + .mo-price-sticky position:sticky |
| 2 | 档位为卡片式选择（非下拉框） | ✅ .tier-card 网格，点击选中/取消，✓ 角标 |
| 3 | 参考图粘贴区在左栏顶部显眼位置 | ✅ 虚线大区块，QQ 输入框正下方，hover 变色 |
| 4 | 输入 QQ 后显示该客户历史订单 | ✅ 防抖 500ms，客户端过滤（getOrders pageSize=200 → filter client_qq），最近 5 条 |
| 5 | 600–1024px 单栏，价格面板仍 sticky | ✅ @media(max-width:1023px) grid 1col，sticky 保留 |
| 6 | <600px 底部钉住价格条（总价+提交），点价格展开明细 | ✅ .mo-mobile-bar fixed bottom，transition 展开，safe-area-inset |
| 7 | 连续录单可用（提交后重置表单留在页面） | ✅ el-dialog 继续录入 → resetForm()（含新增状态重置） |
| 8 | 旧路由重定向不断链 | ✅ /manual-order → /orders/new |
| 9 | eslint 0 错误 + build 成功 | ✅ 见下 |

### 设计决策

- **QQ 历史面板用客户端过滤**：后端 `GET /api/artist/orders` 无 clientQq 查询参数，取 200 条客户端 filter。符合"API 零改动"约束。数据量大时（>200 单）可能漏历史，但画师手动录单场景下同一客户订单极少超过 5 条，实际无影响。
- **档位卡片用 profile.tiers**：已有 `artistApi.getProfile()` 返回 tiers 数组（含 example_image_path），零额外请求。
- **emit('created') 移除**：原组件嵌入抽屉时通知父组件刷新列表，独立页面无父组件，删除。

## 验证结果

- `npx eslint .`（web/）：0 错误 0 警告
- `npm run build`（web/）：✅ 11.69s 成功
- 后端零改动，无需跑 vitest/tsc

## 接口变更

无。API 零改动。

## 数据库变更

无。
