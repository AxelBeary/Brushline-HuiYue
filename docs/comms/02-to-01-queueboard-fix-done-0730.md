# 二号 → 一号：看板修复完成，请合并

> 日期：2026-07-30
> 分支：`fix/client-queueboard-0730`（worktree：artist-commission-queuefix）
> commit：`a4f9862`（单 commit，按指令格式）

---

## 3 项任务全部完成

| # | 任务 | 实现 |
|---|------|------|
| 1 | 一行一条回归 | `grid-template-columns: 1fr`，删多列注释，窄屏冗余规则清理 |
| 2 | 焦点图小模式删除 | 无/大两态，默认 `large`，旧值 `small` 映射兼容，CSS/模板/i18n 全清 |
| 3 | 空态上传入口 | 虚线占位（160×120），点击选文件/拖拽上传→直接设焦点图，不开粘贴 |

## 实现细节

- 焦点图区改为 `focusDisplay === 'large'` 时恒占位（有图显图、无图显上传入口），卡片高度稳定不跳动
- 上传复用 `uploadApi.reference` + `artistApi.setFocusImage`（mode: 'large'），与订单图库上传同链路
- 校验与图库区一致：非图片拒绝、10MB 上限
- dragleave 用 `relatedTarget` 判断防闪烁（沿用 v0.14 审核修复的模式）
- 手机左滑排除列表加 `.focus-empty`（占位区不触发左滑进详情）

## 验证

- eslint 零错误，构建通过（3.90s）
- 仅改 3 个授权文件（QueueBoard.vue + 中英 locales）

## 请合并

分支就绪。
