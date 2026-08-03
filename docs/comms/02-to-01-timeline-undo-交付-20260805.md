# 交付报告：二号 v0.36 波 1 — 时间条四档缩放 + 拖拽撤销 toast + L0/L1/L3/L5

> 角色：二号（客户/画师页面前端）
> 分支：`feat/v036-web-timeline-undo`（worktree `artist-commission-02`，基于 master，已 merge 至 a108f4d）
> 提交：
> - `f64e793` feat(queue): 时间条缩放四档（两周/一个月/三个月/半年）+ 刻度密度适配 + localStorage 旧档 fallback
> - `e0eed4e` feat(queue): 时间条拖拽撤销 toast（TL-2 三种拖拽软撤销）+ L0 删旧增项封装 + L1 静默吞错补 warn + L3 收款金额前置校验

---

## 逐条任务完成情况

### TL-1 时间条四档缩放 ✅（commit f64e793）
- `TL_ZOOMS` 改为 2w(14天/48px) / 1m(30天/32px) / 3m(90天/12px) / 6m(182天/7px)，删除旧 2m 档。画布宽度分别 672/960/1080/1274px，均 ≤2000px。
- 刻度密度四档适配（`tlTicks`）：dayWidth≥32 显示 M/D；16~32 仅日号；8~16（3m）仅周一出日号；<8（6m）仅每月 1 号出短月名（Intl.DateTimeFormat 跟随 locale）且跳过周末染色。
- 模板 radio 按钮 3→4 个；localStorage 兼容：老值 `2m` fallback 到 `3m`，其余未知值回落到 `2w`。

### TL-2 拖拽撤销 toast ✅（commit e0eed4e）
- 新增 `web/src/components/artist/UndoToast.vue`：Teleport 到 body、fixed 居中偏下、深色背景白字、5 秒自动消失、一次性「撤销」按钮（undoing 态防重复点）。
- `tlMakeDrag` 拖拽前记录 `oldStartDate` / `oldDeadline`（未设时记 null，支持撤销时清除）。
- 三种拖拽（move/deadline/start）成功后 `showTlUndoToast` 替代原 `ElMessage.success`；点「撤销」→ `onTlUndo` 恢复旧值。move 的两次 PUT 按 `oldStartDate > newEnd` 定序（与拖拽时 dayDelta 正负分支对称）；deadline/start 支持 null 清除；恢复成功刷新队列 + 轻提示「已恢复」；API 失败走 catch 不弹 toast。

### L0 删旧增项封装 ✅
`api/index.js` 删除 getAddons/createAddon/updateAddon/deleteAddon/reorderAddons/updateAddonTiers 六个封装（grep 确认零调用点）；保留 addonTemplate 系列（L213-215，在用）。

### L1 静默吞错补 warn ✅
`api/index.js` 两处裸 `} catch {`（i18n 错误消息翻译、401 兜底硬跳转）补 `console.warn`，行为不变。

### L3 收款金额前置校验 ✅
`OrderDetail.vue` 两处收款提交（池收款 submitPayment + 节点收款 submitNodePayment）加前端范围校验：金额 ≤0 或超剩余应付 → `ElMessage.warning` 拦截；`el-input-number` 同步加 `:max` 上限。新增 i18n 键 `payAmountInvalid` / `payAmountExceed`（双语）。

### L5 i18n 空字符串 ✅（确认无需修改）
全量扫描 zh-CN.js / en.js，空字符串值 **0 个**；中英键集各 1310 键完全对齐。

---

## 自测结果

### 自动化门禁
- `npx vitest run`：**144/144 passed**（7 文件）
- `npx eslint .`：**0 错误 0 警告**（exit 0）
- `npm run build`：✓ built in 5.68s

### 浏览器实测（vite dev :5173 + 容器后端 :3000，画师 Alice QQ 10001 登录）
1. **四档缩放**：切「时间条」视图，radio 显示 两周/一个月/三个月/半年 四档 ✓；「半年」档 182 个刻度仅渲染 6 个月份标签（6月/7月/8月/9月/10月/11月），密度适配生效 ✓
2. **拖拽→撤销 toast**：拖 ALICE-002 右端 handle 改截稿日 → PUT /deadline 返回 200 → 弹出深色 toast「截稿日已改为 8/5」+「撤销」按钮 ✓
3. **撤销恢复**：点「撤销」→ PUT /deadline 恢复旧值返回 200 → toast 消失 + 「已恢复」提示 ✓

---

## 遗留 / 说明

1. **浏览器实测仅覆盖 deadline 一种拖拽**：move（整条平移）与 start（改开工日）的撤销走同一 `onTlUndo` 逻辑且代码已审，但未在浏览器逐一点测（合成 PointerEvent 对 move handle 的触发较繁琐）。建议用户终验时顺手拖一下整条与左端。
2. **合成事件说明**：浏览器工具用 `dispatchEvent(PointerEvent)` 模拟拖拽，需先 patch `setPointerCapture`（合成 pointerId 无真实指针）。真机触摸/鼠标交互不受影响。
3. **未推送、未合并**，等待一号审核。

【申请】请一号审核本波前端改动。
