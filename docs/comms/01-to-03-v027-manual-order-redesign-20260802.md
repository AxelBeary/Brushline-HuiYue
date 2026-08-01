# 一号 → 三号：v0.27 REQ-015 手动录单重设计

> 分支：`feat/v027-manual-order-redesign`
> Worktree：`D:\Hermes Agent CN Desktop\workspace\artist-commission-03`
> 日期：2026-08-02
> Spec：`docs/requirements/REQ-015-手动录单重设计.md`（用户已拍板，全文读）

---

## 任务

把手动录单从 560px 抽屉改为全屏双栏独立页面 + 三档响应式 + QQ 历史订单面板。**API 零改动**，纯前端重排。

## 布局（≥1024px 双栏）

**左栏「客户说了什么」**：
- 客户 QQ（输入后自动查历史订单，见下）
- 客户昵称
- 需求描述（textarea）
- **参考图上传（大块粘贴区，左栏最显眼位置）**
- 优先级 + 截稿日 + QQ 通知开关
- **该 QQ 历史订单面板**（输入 QQ 后自动查询显示）

**右栏「怎么录」**：
- 档位选择（**卡片式**：名称+价格+工期，替代下拉框）
- 增项（分组折叠，同现有）
- 倍率（用法/加急）
- **价格面板 sticky**（明细+总价，调任何选项实时可见）
- 最终价格（可手动覆盖）
- 提交按钮

## 响应式断点

| 断点 | 布局 |
|------|------|
| ≥1024px | 双栏，右栏价格面板 sticky |
| 600–1024px | 单栏，价格面板仍 sticky |
| <600px | 单栏 + **底部钉住价格条**（总价+提交按钮，点价格展开明细） |

## QQ 历史订单面板

- 输入 QQ 后（防抖 500ms）调已有 API 查该 QQ 的订单
- 显示：订单号 + 档位 + 状态 + 日期（最近 5 条）
- 无历史时显示"新客户"
- 后端已有按 QQ 查订单能力（`GET /api/artist/orders?clientQq=xxx` 或类似——先 search_files 确认端点）

## 路由

- 新路由 `/orders/new`（或恢复 `/manual-order` 为独立页面）
- 旧 `/orders?action=manual` 重定向改为跳转新页面
- 侧边栏菜单入口保留，指向新页面
- OrderList.vue 工具栏"手动录单"按钮改为 `router.push` 到新页面（不再开抽屉）

## 关键提醒

- ManualOrder.vue 组件逻辑（价格计算、增项、上传）**保留复用**，重排布局容器
- 参考图粘贴区用已有 `usePasteUpload` composable
- 档位卡片从 `artistApi.getProfile()` 的 tiers 数组渲染（已有）
- 价格计算走已有 `artistPublicApi.calculatePrice`（已有）
- **不要改任何后端文件**

## 授权文件

- `web/src/views/artist/ManualOrder.vue`（重排布局）
- `web/src/views/artist/OrderList.vue`（删抽屉，改路由跳转）
- `web/src/router/index.js`
- `web/src/api/index.js`（如需加查 QQ 历史的方法）
- `web/src/locales/zh-CN.js` + `en.js`
- `web/src/components/ArtistLayout.vue`（菜单入口路径更新）

## 验证标准（REQ-015 验收 8 条）

1. 桌面端（≥1024px）双栏布局，左客户信息/右定价，价格面板 sticky
2. 档位为卡片式选择（非下拉框）
3. 参考图粘贴区在左栏顶部显眼位置
4. 输入 QQ 后显示该客户历史订单
5. 600–1024px 单栏，价格面板仍 sticky
6. <600px 底部钉住价格条（总价+提交），点价格展开明细
7. 连续录单可用（提交后重置表单留在页面）
8. 旧路由重定向不断链
9. `npx eslint .` 0 错误 + `npm run build` 成功

## 交付

comms：`03-to-01-v027-manual-order-redesign-{日期}.md`
