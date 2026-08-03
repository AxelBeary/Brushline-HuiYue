# 派工：v0.36 波 1 — 时间条缩放四档 + 拖拽撤销 + 前端小修批

> 来自：一号 | 2026-08-04
> Worktree：`D:\Hermes Agent CN Desktop\workspace\artist-commission-02`
> 分支：`feat/v036-web-timeline-undo`（已建好，基于 master 352eac7）
> **开工第一步**：cd 进 worktree 先 `git merge master`，再读本文件（一号可能中途追加条目）。

---

## TL-1：时间条缩放改四档（用户拍板：两周 / 一个月 / 三个月 / 半年）

现状：`QueueBoard.vue` L635 `TL_ZOOMS = { '2w': {days:14,dayWidth:48}, '1m': {days:30,dayWidth:32}, '2m': {days:60,dayWidth:18} }`

1. 改为四档：`2w` / `1m` / `3m`（90 天）/ `6m`（182 天），删掉 `2m`
2. dayWidth 自定，基准：画布宽度不超过约 2000px、订单横条仍可读（参考：3m≈12px/天、6m≈7px/天）
3. **刻度密度适配**（关键，别漏）：`tlTicks`（L662-669）目前每天一个刻度+标签，低缩放下必重叠。规则：dayWidth < 16 → 只在周一出标签；dayWidth < 8 → 只在每月 1 号出标签（格式 `M月`）。周末染色在低缩放可跳过
4. 模板 L329-331 radio 按钮 3 个 → 4 个
5. i18n：`zh-CN.js` L460 与 `en.js` 对应处，删 `tlZoom2m`，加 `tlZoom3m`（三个月 / 3 months）、`tlZoom6m`（半年 / 6 months）
6. localStorage 兼容：老用户存的 `2m` 要 fallback（L636 校验处改，建议落到 `3m`）
7. 拖拽吸附、整条平移、"回到今天"在新缩放下都要正常，自测

## TL-2：时间条拖拽撤销 toast（本波重点，用户点名要的功能）

现状：`onTlHandleUp`（L850）拖拽成功立即提交，无撤销。改开工日 `updateStartDate`、改截稿日 `updateDeadline`、整条平移两次 PUT。

依据：视觉提案 v2（`docs/画师工作台视觉提案-v2.html` L766/L1099-1102）用户拍板"破坏性操作（拖拽改期/挪单）一律提供撤销"。

方案（软撤销，不建全局 undo 栈）：
1. 拖拽提交成功后，把现在的 `ElMessage.success` 换成带「撤销」按钮的 toast，5 秒自动消失。ElMessage 不支持 action 按钮——自写一个 fixed 定位的小组件（如 `web/src/components/artist/UndoToast.vue`），样式跟现有消息提示协调即可，不用照搬提案 HTML
2. 文案：改截稿「截稿日已改为 {d}」、改开工「开工日已改为 {d}」、平移「档期已移动 {s} → {e}」，右侧「撤销」按钮
3. 拖拽开始前记录旧值（oldStartDate / oldDeadline），点「撤销」→ 调同样的 API 恢复旧日期，恢复成功后刷新队列数据并轻提示；撤销按钮一次性，点过或超时即失效
4. 三种拖拽都要撤销；整条平移的撤销 = 两个日期一起恢复（注意两次 PUT 的顺序问题，参考现有代码里 dayDelta 正负决定顺序的写法）
5. API 失败时走现有 catch 回滚逻辑，不显示撤销 toast
6. i18n 双语（queue.* 键）

## L0：删除旧增项 API 的前端封装（与三号后端删除配套）

`api/index.js` L200-205 六个封装（getAddons/createAddon/updateAddon/deleteAddon/reorderAddons/updateAddonTiers）零调用点，三号在删后端对应端点，你把这六行封装删掉。不动 L213-215 的 addonTemplate 系列（新模型增项库，在用）。

## L1：api/index.js 静默吞错

现状至少 L39、L59 两处裸 `} catch {`（旧清单说 5 处，行号已漂移）。全文搜索，所有静默 catch 至少补 `console.warn`（签名刷新失败可保留静默行为但加 warn）。

## L3：支付金额前端范围前置校验

OrderDetail 收款弹窗提交处：金额 ≤ 0 或超剩余应付时前端直接报错提示（后端 schema 是兜底，此层只补 UX）。

## L5：i18n 空字符串

旧行号（zh-CN.js:438/475/738）已失效。自行扫描 `zh-CN.js` + `en.js` 全部空字符串值，按上下文语义补齐。

---

## 授权文件

`web/src/views/artist/QueueBoard.vue`、`web/src/views/artist/OrderDetail.vue`、`web/src/api/index.js`、`web/src/locales/zh-CN.js`、`web/src/locales/en.js`、新增 `web/src/components/artist/UndoToast.vue`（名字可自定）

不动：server/ 全部、其他 views。

## 验证

worktree 内 `npm install` 后：`npm run test`（web vitest）+ `npm run lint` + `npm run build` 全绿再交付。时间条四档缩放 + 三种拖拽撤销需手动自测（vite dev + 浏览器）。
