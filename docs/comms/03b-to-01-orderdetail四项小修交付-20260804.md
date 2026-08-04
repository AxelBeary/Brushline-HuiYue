# 三号-B 交付：OrderDetail 四项健壮性小修（T 批 task-0）

> 分支：`v036-w2-odfix`（worktree: artist-commission-wt-03b2）
> commit：`ad85d2d` — fix(artist): 订单详情四项健壮性——picker回滚+备注防重+推进防连点+滑块pointercancel
> 派工：`01-to-03b-orderdetail四项小修-20260804.md`
> **合入协调：五号在改收款弹窗区，交付后未自行 merge，等一号安排合入顺序。**

## 改动文件

- `web/src/views/artist/OrderDetail.vue`（唯一文件，+33/-9；只动了授权的四块区域：picker 区 / 备注区 / 操作条按钮 / 滑块区；**收款弹窗区一行未动**）

## 四项修复内容

| 项 | 修法 |
|----|------|
| T1 picker 保存失败回滚 | `changeDeadline` catch 中把 `deadlinePicker` 从 `order.deadline` 重新取值（与 watcher 同款 `.slice(0,10)` 逻辑）；`changeStartDate` catch 中同时回弹 `startDatePicker` 和 `deadlinePicker`（第二个 PUT 失败时第一个可能已成功，从 order 同步最安全） |
| T2 备注 Enter 防重 | `addNote` 开头加 `if (noteSubmitting.value) return`——按钮已有 :loading，Enter 路径是唯一漏网点 |
| T3 推进防连点 | 新增 `statusAction` ref（记录飞行动作：''/'advance'/'back'/目标状态值），`changeStatus`/`advanceStage`/`backStage` 三处共用守卫；模板上飞行中本按钮 :loading、兄弟按钮 :disabled。守卫放在 try 外（backStage 的 confirm 之后），避免 try 内 return 触发 finally 误清飞行锁 |
| T4 滑块 pointercancel | thumb 元素加 `@pointercancel="closeSlideCancel"`——复用 composable 的 close()（progress 归零 + 行收起），composables/useSlideConfirm.js 未动 |

## 验证结果

- web 全量测试：**144/144 passed**（7 files，与派工基线一致）
- `npx eslint .`：**0 错误 0 警告**
- `npm run build`：通过（6.17s）
- 后端零改动，无需 vitest/tsc（server）

### 浏览器实测（worktree dev server + 容器后端，订单 ALICE-002/id=802）

- **T1 实锤**：XHR patch 让 PUT deadline 返回 500，picker 点选 25 号 → 显示值回弹原值 2026-10-29 ✓
- **T2 实锤**：XHR patch 让 addNote 延迟 2s，提交中连发 3 次 Enter → 实际只发出 **1 个** POST，且备注正常提交 ✓
- **T3 实锤**：推进按钮连点，后端权威证据显示 5/7→6→7/7 恰好两次推进（每批连点只放行一次），守卫未失效时不可能只前进两步 ✓（注：两批连点分别对应两次独立测试，非一次连点跳两步）
- **T4**：pointercancel 由系统中断触发（通知弹窗/触摸取消），浏览器自动化无法手动触发；以代码审查 + build 通过为准（一行模板绑定，复用既有 close 逻辑，风险极低）
- 实测后已恢复演示数据：订单 802 回到 wip / 5-7 节点（stage 6337）、deadline 2026-10-29、开工日 2026-08-04；T2 测试备注已删除。恢复过程产生的系统备注（状态变更记录）3 条为后端自动行为，未清理。

## 顺手发现的预存问题（未修，报一号）

1. **deleteNote 返回的订单对象缺 `currentStageId`**：实测删备注后页面 `hasWorkflow` 计算退化，操作条从工作流分支（推进/打回）跳到固定状态分支（需要修改/标记完成），刷新后恢复。GET /api/artist/orders/802 单独请求返回 currentStageId=6337 正常，说明 DELETE notes/:id 的响应序列化漏了 camelCase 字段。五号若在收款弹窗区也遇到 deleteNote/响应缺字段问题，可能同源。
2. **浏览器会话**：本平台登录态依赖 localStorage 标记 + httpOnly cookie，`browser_navigate` 开新 tab 会丢 localStorage 上下文导致跳回登录页——同 tab `location.href` 跳转无此问题（已在 skill 记录，本次反复登录 4 次）。

## 风险评估

低。四项均为交互守卫，无业务语义变更、无 API 变更、无数据变更。T3 的 statusAction 守卫在请求失败时 finally 释放，不会死锁。
