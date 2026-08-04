# 派工：三号-B T 批 — OrderDetail task-0 四项小修

> 分支：新建 worktree。工作目录：`D:\Hermes Agent CN Desktop\workspace\artist-commission-wt-03b2`（不存在则自建：在主仓 `git worktree add D:\...\artist-commission-wt-03b2 -b v036-w2-odfix master`）。**开工第一步 `git merge master` 再读本文件。**
> 风险等级：低（交互健壮性，无业务语义变更）
> ⚠️ **合入协调（重要）**：五号本轮也在改 OrderDetail.vue（收款弹窗区域）。你正常开发测试，但**交付后不要自行 merge master，等一号安排合入顺序**（五号先合，你再 merge 最新 master 确认无冲突后合）。

## 四项（一号已逐项核实行号）

### T1 picker 保存失败回滚（OrderDetail.vue 869-876 / 885-903）

`changeDeadline` / `changeStartDate` 的 catch 只弹错误，picker 停留在未保存的值（el-date-picker 已更新 v-model，order 没变 → 界面与实际数据不一致）。
修：catch 里把 picker 值恢复为 order 中的原值（deadlinePicker/startDatePicker 重新从 order.value 取）。

### T2 备注 Enter 重复提交（263 行 + addNote 1092-1109）

`@keyup.enter="addNote"` 与按钮共用 addNote，但 Enter 路径不看 `noteSubmitting`。提交中再按 Enter 会重复发请求。
修：addNote 开头 `if (noteSubmitting.value) return`（按钮已有 :loading 防连点，Enter 是漏网点）。

### T3 状态推进防连点

操作条的推进/打回等状态变更按钮（grep `advanceStage` / `sendBackStage` / updateStatus 调用点）无提交中守卫，快速连点可能重复推进。
修：加 loading ref 包住调用，或统一 :disabled/:loading。保持现有 ElMessage 反馈不变。

### T4 滑块 pointercancel（116-129）

取消滑块 thumb 只绑 pointerdown/move/up（123-125 行）。拖动中被系统打断（通知弹窗/触摸中断）触发 pointercancel，滑块卡在中间态。
修：加 `@pointercancel` 重置进度与激活态（复用现有重置逻辑）。

## 授权文件

- web/src/views/artist/OrderDetail.vue（只许动：picker 区 / 备注区 / 操作条按钮 / 滑块区）
- 测试文件（如需）

**收款弹窗区域（payDialog 相关）一行都不许动**——五号在改。上传区别碰（二号-B 在改）。

## 验收

- web 全量测试绿（基线 144）
- 浏览器实测：picker 改日期时后端报错（可临时改坏 URL 模拟或断网）→ picker 回弹原值；备注提交中狂按 Enter 不重复；滑块拖到一半按 Esc/切窗口后状态复位
- 提交格式：`fix(artist): 订单详情四项健壮性——picker回滚+备注防重+推进防连点+滑块pointercancel`
