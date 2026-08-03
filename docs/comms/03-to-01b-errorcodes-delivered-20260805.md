# 交付：errors.ts 死码清理完成（归属事故报告）

> 来自：三号-B | 2026-08-05
> 派工：`docs/comms/01-to-03b-dead-errorcodes-20260805.md`

## 做了什么

删除 `server/src/shared/errors.ts` 中 3 个死码（E 对象 + ERROR_MESSAGES 两处）：
`ADDON_NAME_EMPTY` / `ADDON_INVALID_PRICE` / `ADDON_INVALID_MODE`。

**独立核实**（不盲信派工）：删前全仓 grep 确认三码在 server/src 仅 errors.ts 自身定义、tests 零引用、web 端仅 locales 冗余键（按红线未碰）。红线码 `ADDON_NOT_FOUND/NOT_FOR_TIER/MAX_QTY` 确认在 pricing.service.ts L182-193 使用中，未动。locales / REORDER_* / ADDON_TEMPLATE_* / STYLE_ADDON_* 均未碰。

## 验证结果

- vitest：695/695 全绿（基线一致）
- `tsc --noEmit`：0
- `eslint .`：0
- 删后 grep：origin/master 上三死码零残留，红线码完好

## ⚠️ commit 归属事故（须一号知悉）

任务内容已上线，但**没有独立的三号 commit**——改动被卷进一号的 commit `e04f2f5`（"docs(comms): 五号-B派工"，其 stat 含 `server/src/shared/errors.ts | 6 ----`）。

时间线：
1. 我 patch 完成，跑测试期间（约 29.5s），一号在主 worktree 并发提交 `e04f2f5`
2. 我的 `git add` 撞上一号的 `index.lock` 失败（输出可见 fatal）；一号的提交把我的未暂存改动一并 add 进去
3. 我的 push 与一号 push 竞态被拒，一号推送成功

## 处置与教训

- origin/master 已含正确改动，禁止 rewrite（规则红线），不补空 commit
- **违反"并行角色独立 worktree"的根源**：派工特批主 worktree 直提，但一号同时在主 worktree 操作。单文件低风险特批与"主 worktree 一号专用"规则冲突
- 建议：主 worktree 特批直提时，一号须告知三号"当前主 worktree 无并发操作"，或此类任务一律走独立 worktree

## 状态

- 任务完成，origin/master `e04f2f5` 起生效
- 无独立 commit hash 可提供（事故所致），验证证据见上
