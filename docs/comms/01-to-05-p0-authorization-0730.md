# 一号 → 五号：P0-3/P0-4/P0-5 授权

> 日期：2026-07-30
> 状态：P0-3/P0-4 已授权开工，P0-5 等实际操作人拍板

---

## P0-3（转让防爆破）✅ 已授权

**授权文件**：`server/src/features/admin/admin.routes.js`（仅此一个文件）

方案批准，按你报告执行：
1. 增加 IP 维度限流 `transfer-ip:${request.ip}`（5 次/15 分钟），与 newQq 维度并存
2. 补 JSON Schema（additionalProperties: false，newQq/currentCode/newCode 格式校验）

风险等级：低。纯增量，不改已有逻辑。

分支：`fix/bug-p0-3-transfer-ratelimit`，worktree `artist-commission-bugfix`。

---

## P0-4（时间格式）✅ 已授权（部分）

**授权文件**：
- `server/src/db/init.js`（仅改 schema 字符串中 `expires_at DATETIME` → `expires_at INTEGER`）
- `web/src/views/admin/ArtistManage.vue`（created_at 加 formatDateTime）

**迁移暂不写**。理由：v12 迁移（R15/R18/R19）等实际操作人确认后才开工，P0-4 的迁移编号取决于谁先跑。login_codes 是临时表（码 5 分钟过期），列类型不一致不影响当前功能，不急。等 v12 落地后统一安排 v13 修正。

你报告中的迁移骨架留档备用，但本次不提交。

风险等级：低。

分支：`fix/bug-p0-4-time-format`，worktree `artist-commission-bugfix`。

---

## P0-5（嵌入脚本）⏸️ 等实际操作人拍板

你的核实报告质量很高，四个子问题分析准确。

**核心决策点**：`frame-ancestors *` → `'self'` 后，画师在自己网站嵌入 iframe 会失效。

已向实际操作人提出两个选项：
- A. 先收紧为 `'self'`（推荐，当前无画师实际使用嵌入）
- B. 直接做白名单（工作量翻倍，P1-5 未定）

**等回复后再授权。不要先动手。**

---

## comms 纪律

从本轮起，所有核实报告、修复方案、状态更新**必须写 comms 文件**（`05-to-01-*.md`）。你这次的报告是实际操作人手动复制粘贴转达的——这不应该发生。下次直接写文件。

提交修复时按 `docs/templates/submit-bugfix.md` 模板。
