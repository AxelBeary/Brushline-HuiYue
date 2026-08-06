# 派工：二号 · Beta 冲刺批 4 —— 录单页修复（F4 上传区 + F6 草稿暂存）

> 分支：`beta/batch4-manual-order` · worktree：`../artist-commission-w11`
> 开工第一步：`git merge master` 再读本文件。
> 依据：内测反馈核实记录 `docs/comms/核实-内测反馈-20260806.md`（F4/F6 两项）。
> 只动授权文件，不推送不合并，干完写交付报告 commit 到自己分支。

---

## 任务摘要

两个内测反馈修复，都在 `ManualOrder.vue`（手动录单页）：① F4 参考图上传区 46.67×100 细长条修复（用户拍板：**保留 drag，整个虚线区域可拖拽**）；② F6 录单草稿暂存（localStorage 自动保存 + 恢复提示）。**纯前端，单文件为主。**

## 授权文件（只动这些）

- `web/src/views/artist/ManualOrder.vue`（主）
- `web/src/locales/zh-CN.js`、`web/src/locales/en.js`（仅新增键）
- 必要时 `web/src/composables/usePasteUpload.js`（只读参考，F4 若需复用拖拽能力先看它，尽量不改）

**不要动**：`web/src/views/artist/OrderList.vue`/`ArtworkManage.vue`/`Settings.vue`（五号并行批在改）、`web/src/styles/artist-tokens.css`（五号批）、服务端任何文件（TS 迁移子代理在改）、`web/src/components/*`（除非确需）。

---

## 任务 1：F4 参考图上传区修复（46.67×100 细长条）

**根因（已定位）**：`ManualOrder.vue` L28-42 `el-upload` 同时开 `drag` + `list-type="picture-card"`——EP 组合冲突：drag 渲染 `.el-upload-dragger` 整块，picture-card 要求方形 `.el-upload--picture-card`；本地样式 L1221-1222 `.mo-ref-upload :deep(.el-upload--picture-card) { width: 100%; height: 100px }` 固定 100px 高 + 窄父容器 → 触发区 46.67 宽 × 100 高。

**用户拍板**（2026-08-06）：**drag 必须保留**，且**整个参考图的虚线区域都可以拖拽进去**。

**做法**：
1. 保留 `el-upload drag multiple list-type="picture-card"` 不动
2. 改 `.mo-ref-upload :deep(.el-upload--picture-card)` 样式：**正方形或合理宽高比**，让虚线拖拽区好看且整块可拖：
   ```css
   .mo-ref-upload :deep(.el-upload--picture-card) {
     width: 100%;
     height: auto;
     aspect-ratio: 16 / 9;   /* 或按父容器宽度合理比例 */
     min-height: 140px;
   }
   ```
   ⚠️ 先看 `.el-upload-dragger` 和 `.el-upload--picture-card` 在 drag 模式下的实际 DOM 结构（`.el-upload-dragger` 是否包在 picture-card 里），把 dragger 也铺满（`width: 100%; height: 100%`）——确保**整个虚线框内都能拖拽**，不只是中间小按钮。
   ⚠️ 若 `aspect-ratio` 在目标浏览器兼容性有顾虑（Edge/Chrome 现代版支持），可用固定 `height: 140px` 替代。
3. 上传后的缩略图区（picture-card 已上传项）样式保持正常（不畸形）——加 `:deep(.el-upload-list--picture-card)` 相关检查，若缩略图也被拉宽需单独修正。

**验证**：dev server 打开录单页 → 参考图区为合理矩形（非细长条）→ 拖 2 张图进虚线区成功、点击上传成功、缩略图正常 → before/after 截图（`docs/audit-screenshots/beta-batch4/`）。

---

## 任务 2：F6 录单草稿暂存（localStorage 自动保存 + 恢复提示）

**背景**：`ManualOrder.vue` 录单表单（客户 QQ、档位/画风、需求、价格等）无暂存——误关页面数据全丢（内测反馈 F6，真实缺失）。

**做法（最小可靠实现）**：
1. **自动暂存**：`watch` 表单核心字段（`form.clientQq` + 所选档位/画风/尺寸/增项/需求文本/价格相关），防抖（如 800ms）写 `localStorage` 键 `huiyue_manual_order_draft`（JSON）。
   ⚠️ **先读 ManualOrder.vue 的 form 结构**（`form` 对象有哪些字段、各字段类型），按实际写 watch 源；**不要暂存**：上传中的图片文件对象（只存可序列化字段）、价格计算中间态（提交时重算）。
2. **恢复提示**：页面 mounted 时检测 localStorage 有草稿 → `ElMessageBox.confirm`（或 ElMessage 带按钮）提示「发现未提交的录单草稿，是否恢复？」→ 确认则回填 form（把存下的字段赋值），取消则清空草稿键。
   - i18n 键：`manualOrder.draftFound`（`发现未提交的录单草稿，是否恢复？`）/ `manualOrder.draftRestored`（`已恢复草稿`）/ 确认取消用既有 `common.confirm`/`common.cancel`。
3. **清空时机**：录单**提交成功**后删除草稿键（`showResult` 成功后）；手动取消（若有清空按钮）也清。
4. **边界**：多个画师账号同浏览器——草稿键建议带 subdomain 后缀（`huiyue_manual_order_draft_${subdomain}`），避免 A 画师的草稿弹给 B 画师。先确认页面能否拿到当前画师 subdomain（store 有）。

**验证**：填一半表单 → 刷新页面 → 弹恢复提示 → 确认后字段回填；提交成功后刷新不再弹；带 subdomain 隔离（换画师不串）。

---

## 交付要求

1. 每个任务交付说明（改了什么 + 验证结果 + 截图）。
2. 交付报告：`docs/comms/02-to-01-交付-Beta冲刺批4-录单页.md`。
3. commit 信息带「beta:」前缀，如 `beta: F4上传区矩形修复+F6录单草稿暂存`。
4. eslint + web vitest 215/215 + build 通过。
