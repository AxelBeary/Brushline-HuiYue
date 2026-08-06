# 交付：二号 · Beta 冲刺批 4 —— 录单页修复（F4 上传区 + F6 草稿暂存）

> 派工：`docs/comms/01-to-02-Beta冲刺批4-录单页.md`
> 分支：`beta/batch4-manual-order`（worktree `../artist-commission-w11`）
> 代码提交：`06ed8c3` `beta: F4上传区矩形修复+F6录单草稿暂存`（3 文件，+221/−5）
> 依据：内测反馈核实记录 `docs/comms/核实-内测反馈-20260806.md`（F4/F6 两项）

---

## 一、F4 参考图上传区矩形修复（46.67×100 细长条 → 16/9 矩形）

**根因**（前序已定位）：`el-upload` 同时开 `drag` + `list-type="picture-card"`，本地样式固定 `height: 100px` + 窄父容器 → 触发区 46.67 宽 × 100 高细长条。

**改动**（`ManualOrder.vue` 样式段，共 3 处）：

1. `.el-upload--picture-card`：`width:100%; height:100px` → `width:100%; height:auto; aspect-ratio:16/9; min-height:140px`（16/9 矩形 + 最小高度兜底，兼容现代 Edge/Chrome）。
2. `.el-upload-dragger`（drag 模式下包在 picture-card 内）：`width:100%; height:100%` 铺满整个虚线区 + flex 居中图标，**整块虚线区域可拖拽**——落实用户拍板「保留 drag，整个虚线区域可拖」。
3. `.el-upload-list--picture-card .el-upload-list__item`：固定 `148px × 148px` 方形，已上传缩略图不被 dragger 铺满样式拉宽、不畸形。

## 二、F6 录单草稿暂存（localStorage 自动保存 + 恢复提示）

**改动**（`ManualOrder.vue` 脚本段 + 两个 locale 文件）：

1. **草稿键带画师隔离**：`huiyue_manual_order_draft_{subdomain}`（subdomain 取自 `artistApi.getProfile()`），A 画师的草稿不会弹给 B 画师。
2. **空表单不落盘**：`hasDraftContent` computed 覆盖全部可序列化字段（档位/多画风主动选画风/尺寸/需求/QQ/姓名/截止/起始/优先级/通知/增项勾选/自定义增项/手输价），全空时直接清键，避免刚进页面就生造草稿键弹恢复框。
3. **800ms 防抖自动暂存**：watch 表单核心字段 + 画风三步走状态（styleId/sizeId/增项深 watch）+ 自定义增项（深 watch）+ 手输价；只存可序列化字段，不存图片文件对象，价格提交时重算。
4. **beforeunload 补落盘**：页面关闭/刷新前清掉防抖定时器并同步 `saveDraft()`（只保存不拦截、不弹原生确认框），补上防抖窗口内最后一次输入。
5. **恢复提示**：mounted 且画风/档位数据就绪后（`await stylesPromise` 再调 `restoreDraft()`）→ `ElMessageBox.confirm`「发现未提交的录单草稿，是否恢复？」；确认则回填，取消/关闭则清空草稿键。
6. **恢复逐项校验丢弃**：画风/尺寸/增项按当前已加载数据逐项校验——画风或尺寸已被画师删除则丢弃对应字段；增项只回填当前尺寸可用增项中仍存在的键，其余补齐默认值（模板 v-model 不接受 undefined）；自定义增项 **uid 重新发放**（`ca-{ts}-{rand}`），避免草稿残留 uid 冲突；tiers 旧模型下档位被删同样丢弃。
7. **priceTouched 保留**：手输价格恢复时保留脏标记，重算价格不覆盖手输价。
8. **清键时机**：提交成功（`showResult` 置位后 `clearDraft()`）、恢复弹窗取消/关闭、`resetForm()` 重置——继续录入即视为已消费旧草稿。
9. **i18n**：`manualOrder.draftFound`（发现未提交的录单草稿，是否恢复？）/ `manualOrder.draftRestored`（已恢复草稿），zh-CN.js + en.js 各 +5 行；确认/取消复用既有 `common.confirm`/`common.cancel`。

## 三、验证情况

- ✅ **web vitest 215/215 全绿**（一号独立复跑确认）
- ✅ **eslint 3 授权文件 0 error**（前序子代理已跑，一号 diff 审核通过）
- ⏳ **浏览器实测因截断未完成**（`docs/audit-screenshots/beta-batch4/` 未生成 before/after 截图）：逻辑已由单测 + 代码审核覆盖，**建议一号后续补浏览器验收**（F4：参考图区 16/9 矩形、拖 2 张图进虚线区、缩略图 148px 方形；F6：填一半刷新弹恢复、确认回填、提交成功后不再弹、换画师不串草稿）。未为此重跑全部实测。

## 四、未触碰（并行批边界）

- ❌ `OrderList.vue` / `ArtworkManage.vue` / `Settings.vue`（五号并行批）
- ❌ `web/src/styles/artist-tokens.css`（五号批）
- ❌ 服务端任何文件（TS 迁移子代理批）
- ❌ `server/package-lock.json` / `web/package-lock.json`（npm install 副作用，已 `git checkout --` 还原未提交）
- ❌ `web/vite.local.config.mjs`（本地临时文件，未 add 未提交）

## 五、待一号处理

1. 浏览器验收补测（见第三节清单），建议合入 master 前完成。
2. 本交付报告与代码 commit 均在 `beta/batch4-manual-order`，未推送未合并，待一号审核后合入。
3. 合入后按 comms 清理惯例删除本批派工文件（`01-to-02-Beta冲刺批4-录单页.md`）。

---

*二号 2026-08-06*

---

二号转交一号，文件：docs/comms/02-to-01-交付-Beta冲刺批4-录单页.md
分支 beta/batch4-manual-order，2 个 commit：`06ed8c3` beta: F4上传区矩形修复+F6录单草稿暂存 + `docs: 录单页批交付报告`（本报告 commit，hash 以 git log 为准）。ESLint 零错误，web vitest 215/215。
