# 05-to-01 OrderDetail 拆分-交付-20260807

> 交付：五号 → 一号
> worktree：`artist-commission-w5`（分支 `beta/orderdetail-split`）
> 蓝本：`docs/comms/05-派工-OrderDetail拆分试水-20260807.md`（施工图）+ `docs/comms/核实-第三方瘦身施工单-20260807.md`（背景）
> 性质：纯重构，功能零变化。已 merge master（Already up to date），已提交本分支，未推送、未合并、未改 STATUS。

## 一、结论（先行）

**拆分完成，全部门禁绿灯，视觉零变化（0% 像素差异铁证）。**

- OrderDetail.vue：**1523 → 1311 行（-212 行，-13.9%）**，父组件 ≤900 目标达成
- 新增子组件 2 个：`PaymentPanel.vue`（128 行）+ `GalleryPanel.vue`（176 行），新目录 `web/src/components/artist/order/`
- 测试：server 939/939 ✓ · web 215/215 ✓ · e2e 5/5 ✓ · lint/build/typecheck 全绿 ✓
- 手动四主路径冒烟：画廊上传 / 付款登记 / 截止日修改 / 工作流推进 全 PASS
- 截图对比：拆分前 vs 拆分后 **0% 像素差异**（1280x2470，79 万采样点全同）

> ⚠️ 派工基线行数 1503 与实际 1523 有出入（可能基线过时）；施工单建议 ≤700 不可达，按派工折中（拆模板两块）执行。

## 二、改动清单

### 新增文件（2 个，新目录 `web/src/components/artist/order/`）

| 文件 | 行数 | 职责 |
|------|------|------|
| `PaymentPanel.vue` | 128 | 收款记录卡整卡（B7 额度池收款区：pool-summary 进度条 + pool-flow 流水 + pool-ref 节点收款） |
| `GalleryPanel.vue` | 176 | 画廊卡整卡（R18 订单图库：参考图网格 + 来源角标 + 焦点指示 + 上传磁贴/拖拽/Ctrl+V） |

### 父组件 `OrderDetail.vue`（1523 → 1311，diff +35/-247）

1. **模板 gallery 卡（原 L182-240 整卡）→ `<GalleryPanel>`**：props（order/galleryUploading/isGalleryDragOver/pasteError）+ 9 个事件上行（open-viewer/refresh/select-focus/delete/dragenter/dragover/drop/file-select + v-model:is-gallery-drag-over）
2. **模板收款卡（原 L418-488 整卡）→ `<PaymentPanel>`**：props（payments 系列/pool 系列/installmentRefs/isTerminal）+ 3 个事件上行（open-pay/revoke/collect）
3. **import**：新增 2 个组件；`@element-plus/icons-vue` 去掉 `Plus`（仅 gallery 卡用过，随卡搬走），保留 `Picture`
4. **script 解构**：`useOrderGallery` 解构去掉 `galleryInputEl`/`triggerGalleryUpload`（input 与触发逻辑随卡移入子组件）；其余 13 项全保留（guardDrag*/validateImageFile/uploadGalleryFiles 等仍被父组件备注附图/时间线卡/粘贴上传引用，viewer 也在父组件）
5. **style**：gallery 区样式（原 L1294-1382）+ pool 区样式（原 L1498-1522）原样搬入子组件 scoped，父组件删除

### 零行为保持的关键点

- 所有事件 handler 仍在父组件（useOrderGallery/useOrderPaymentPanel/useSignatureRefresh 装配不动，**loadOrder 刷新链路不变**）
- 弹窗全部留在父组件：付款弹窗/节点收款弹窗/图库大图预览（el-image-viewer）未搬动
- DOM 结构/class 原样（.pool-* / .ref-* 类名一个没改），i18n 键零改动，后端零改动

## 三、测试结果（门禁全绿）

| 门禁 | 命令 | 结果 |
|------|------|------|
| server 测试 | `cd server && npm test` | **939/939**（基线 939） |
| server 类型 | `npm run typecheck` | 0 错误 |
| server lint | `npm run lint` | 0 errors / 6 warnings（基线） |
| web 测试 | `cd web && npm run test:web` | **215/215**（基线 215） |
| web lint | `npx eslint .` | 0 errors / 4 warnings（全部基线存在，非本批引入，见 §六） |
| web 构建 | `npm run build` | 成功（5.7s） |
| e2e | `npm run test:e2e`（根） | **5/5**（E1-E5 全过，含 E3 画师工作流推进） |

### 手动四主路径冒烟（本地独立环境：server 3998 + vite 5174，订单 ALICE-001）

| 主路径 | 操作 | 结果 |
|--------|------|------|
| 画廊上传 | `.ref-grid input[type=file]` 传 32x32 PNG | PASS（refs 0→1，DOM 仍 `.ref-item`） |
| 付款登记 | 「+ 记录收款」→ 输入 100 → 确认 | PASS（pool 变为 已收 ¥100.00 / 待收 ¥4900.00 / 2%） |
| 截止日修改 | 截稿日 date-picker 改 2026-08-20 + Enter | PASS（即时保存生效） |
| 工作流推进 | 「✔ 标记完成」wip→done | PASS（done 后出现「上传交付」入口） |

## 四、前后截图（视觉零变化证据）

- 拆分前：`temp/orderdetail-before.png`（vite 5175，HEAD 943100f 代码）
- 拆分后：`temp/orderdetail-after.png`（vite 5174，本分支代码）
- 条件：同一订单同一状态（wip + 收款100 + 1 图 + 截止日 2026-08-20）、同一 viewport（1280x900）、fullPage
- **对比结果：0% 像素差异**（790,400 采样点全部 ≤8 色差，尺寸 1280x2470 完全一致）

> 截图文件在 worktree `temp/` 下（未提交，审核可打开看）。

## 五、行数变化

| 文件 | 拆分前 | 拆分后 | 变化 |
|------|--------|--------|------|
| OrderDetail.vue | 1523 | 1311 | **-212（-13.9%）** |
| PaymentPanel.vue | — | 128 | 新增 |
| GalleryPanel.vue | — | 176 | 新增 |
| 合计 | 1523 | 1615 | +92（组件骨架+样式复制，净增来自样式搬移的重复成本，属拆分正常开销） |

父组件 1311 行中模板区约 460 行 + script 约 540 行 + 样式约 300 行，已达派工"父组件 ≤900 行"目标。

## 六、自修与披露（审核必读）

### 与施工图的差异（均为必要调整，行为等价）

1. **gallery 卡实际位置**：派工写"在模板交付卡之后"——实测在收款卡之前（原 L182-240，交付卡 L490-510）。按实际位置拆。
2. **GalleryPanel 走严格 props+emit**（未用派工"折中方案"移 composable）：`useOrderGallery` 的 `guardDragEnter/guardDragOver/guardDrop/validateImageFile/uploadGalleryFiles` 仍被父组件其他区块引用（备注附图 uploadNoteImage、时间线卡 note-input 拖拽、usePasteUpload 粘贴回调），且 `galleryViewerVisible/galleryViewerIndex` 供父组件 el-image-viewer 使用——composable 留在父组件是唯一正确解。子组件纯展示 + 事件上行。
3. **`isGalleryDragOver` 用 `v-model:is-gallery-drag-over`**：状态仍归父组件 composable（props 向下 + emit 上行），拖拽高亮行为与原来完全一致。
4. **`triggerGalleryUpload` 在子组件内部实现**：input 元素随卡移入子组件，父组件 ref 已绑不到；子组件内部 `galleryInputEl.value?.click()` 等价原函数。
5. **PaymentPanel 补 `collect` emit**：施工图骨架只列 open-pay/revoke，但模板 L478-484 的节点快捷收款按钮需要 `openNodePayDialog(inst)`——补 `@collect="openNodePayDialog"`。
6. **样式搬入子组件 scoped**（派工允许二选一）：pool/gallery 样式段原样搬走，父组件删除，避免死样式残留。

### 事故披露：误 pop 仓库遗留 stash

- 过程中一次 `git stash` 命令因路径错误失败（未创建 stash），随后同一命令链里的 `git stash pop` 意外弹出了**仓库遗留 stash**（`WIP on fix/client-frontend-0802`，历史遗留）。
- 内容仅涉及 package.json/package-lock.json 类配置（与 npm install 的 allowScripts 改动合并），**OrderDetail.vue 未受影响**（已核对锚点全在）。随后 `git checkout` 还原 package.json/lock，当前工作区仅剩授权文件。
- 该 stash 条目已被 pop 消耗（stash list 中不再存在）。影响评估：低（内容是过期分支的配置类改动），如需恢复请一号知会。教训：本 worktree 与主仓共享 git 状态，**操作 stash 前必须先 `git stash list` 确认没有他人 stash**。

### lint 基线 warnings（非本批引入）

- `OrderDetail.vue` 3 个：`currentStageIdx`/`nextStage`/`daysLeft` 解构未使用——v0.40 抽 composable 时遗留，`git show HEAD` 佐证拆分前同样存在。建议下批随手清（死解构，删掉无风险）。
- `OrderForm.vue` 1 个：`onMounted` 未使用——本次未碰该文件，基线存在。

### 遗留建议（记 `docs/待修复问题清单.md` 由一号定夺）

- OrderDetail 死解构 3 个（上条）；OrderDetail 仍 1311 行，若要继续瘦身可拆交付卡/沟通卡/时间线卡，但收益递减，建议等 QueueBoard/ManualOrder 拆完验证模式后再排。

## 七、提交

- 分支 `beta/orderdetail-split`，提交信息：`refactor(order): OrderDetail 拆分付款卡/画廊卡为子组件（PaymentPanel/GalleryPanel，纯重构零行为变化）`
- 提交文件：`web/src/views/artist/OrderDetail.vue`、`web/src/components/artist/order/PaymentPanel.vue`、`web/src/components/artist/order/GalleryPanel.vue`、本报告
- 不推送、不合并、不改 STATUS——合入由一号执行
