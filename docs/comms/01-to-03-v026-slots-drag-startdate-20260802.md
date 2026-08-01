# 三号 v0.26 派工：档位拖动 + 开工日 + 开稿管理独立页

> 分支：`feat/v026-slots-drag`
> Worktree：`D:\Hermes Agent CN Desktop\workspace\artist-commission-03`
> 日期：2026-08-02

---

## 任务 A：档位卡片拖动排序（~1h）

### 需求

价格管理的档位卡片支持拖拽排序（用户拍板"很想加"）。

### 实现要点

1. TierManage.vue 卡片网格加 vuedraggable（参考 QueueBoard.vue 的用法，项目已装）
2. 新增批量排序 API：`PUT /api/artist/tiers/reorder`，body `{ ids: [3, 1, 2] }`（按数组顺序重写 sort_order）
3. 后端：artist.routes.ts 加路由（requireAuth + 归属校验：所有 id 必须属于当前画师）+ artist.service.ts 加 `reorderTiers(artistId, ids)`（事务内逐个 UPDATE sort_order）
4. 拖拽结束 → 调 API → 失败则回滚前端顺序 + ElMessage 报错

### 授权文件

- `web/src/views/artist/TierManage.vue`
- `server/src/features/artist/artist.routes.ts`
- `server/src/features/artist/artist.service.ts`
- `server/tests/`（reorder 测试）

---

## 任务 B：开工日 + 截稿日自动建议（~3h）

### 需求

画师设开工日 → 系统按"开工日 + 档位工期(work_days)"自动填截稿日（仅截稿日为空时）。日历/时间条带子起点改为开工日（无则确认日）。

### 迁移 v29

```sql
ALTER TABLE orders ADD COLUMN start_date TEXT DEFAULT NULL;
```

### API

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | /api/artist/orders/:id/start-date | body `{ startDate: 'YYYY-MM-DD' | null }`，对照 deadline 路由实现 |

**⚠️ snake_case 映射**：GET 订单返回必须含 `startDate`（对照已有 `currentStageId` 映射模式，v0.19 Queue API 漏映射事故）。

### 前端（OrderDetail.vue）

1. 截稿日旁边加"开工日" date-picker（同样用可写 computed——刚修的截稿日 bug 就是只读 computed 导致的，别重蹈覆辙）
2. 设开工日时：若 `order.deadline` 为空且档位有 work_days → 自动填 deadline = startDate + work_days，调 updateDeadline API，toast"已按工期自动设置截稿日"
3. 若 deadline 已有值 → 不动，不提示

### QueueBoard.vue

日历/时间条带子起点：`order.start_date || order.created_at`（后端 GET queue 返回需含 start_date）。

### 授权文件

- `server/src/db/init.js`（迁移 v29）
- `server/src/features/order/order.service.ts`（updateStartDate + GET 返回映射）
- `server/src/features/order/order.routes.ts`（PUT start-date 路由）
- `web/src/views/artist/OrderDetail.vue`
- `web/src/views/artist/QueueBoard.vue`
- `web/src/api/index.js`
- `web/src/locales/zh-CN.js` + `en.js`
- `server/tests/`（start-date 测试）

---

## 任务 C：开稿管理独立页（~3h）

### 需求

侧边栏新增「开稿管理」（排期看板后面），把设置页中开稿相关配置移出。

### 移出清单（Settings.vue → 新页面）

- 名额 N+M（batchLimit / bufferLimit）+ N+M≥1 校验逻辑
- 月度额度（monthlyQuota）
- 自动递补（autoPromote）
- 队列显示开关（hideQueuePosition / hidePromoteNotify / bufferShortForm）

### 不动的

- 仪表盘 StatusSwitch（状态切换留原处）
- 仪表盘 SlotOverview（概览卡留原处）
- 设置页其余内容（基本资料/模板/须知/快捷按钮/封面管理）

### 实现要点

1. 新路由 `/slots`（router/index.js，requiresAuth）
2. 新组件 `web/src/views/artist/SlotManage.vue`：
   - 顶部：当前状态只读卡片（open/full/break/hidden + 一句话说明 + "去仪表盘切换"链接）
   - 名额区：N+M 输入 + 实时合计提示
   - 月度额度区
   - 队列行为区：三个开关
   - 保存走已有 `PUT /api/artist/profile`（字段已全支持，零后端改动）
3. ArtistLayout.vue 侧边栏加菜单项（图标 📋 或 el-icon，i18n 键 menu.slots）
4. Settings.vue 删除移出的字段和保存逻辑
5. i18n 中英对齐

### 授权文件

- `web/src/views/artist/SlotManage.vue`（新建）
- `web/src/views/artist/Settings.vue`（删移出字段）
- `web/src/components/ArtistLayout.vue`（侧边栏）
- `web/src/router/index.js`
- `web/src/locales/zh-CN.js` + `en.js`

---

## 执行顺序建议

A（独立，最快）→ B（迁移+API+前端）→ C（纯前端重构）

## 验证标准

1. `npx vitest run` 全绿 + `npx tsc --noEmit` 零错误（server/ 目录）
2. `npx eslint .` + `npm run build`（web/ 目录）
3. 拖拽排序刷新后顺序保持
4. 设开工日 → 空截稿日自动填充 → 日历带子起点变化
5. 开稿管理页保存 → 设置页无残留 → 仪表盘概览卡数据一致

## 交付

comms：`03-to-01-v026-slots-drag-{日期}.md`
