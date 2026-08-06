# 派工：低垂果实批（屎山 TOP10 低成本高收益项）

> 分支：`beta/low-hanging-fruit` · worktree：`../artist-commission-w16`
> 开工第一步：`git merge master` 再读本文件。
> 依据：屎山审计报告 `docs/comms/审计-屎山与不优雅代码-20260806.md`（P0-1/P0-6/P0-7/P0-9/P0-10 + P1-3 六项）
> 用户拍板：直接派子代理执行，一号审核（2026-08-06）。
> 只动授权文件，不推送不合并，干完写交付报告 commit 到自己分支。

---

## 任务摘要

六项低成本高收益修复（合计约 1 人日），全部有 930 server + 215 web 测试兜底。

## 授权文件

**server 侧**：`server/src/` 相关文件（按各任务定位）、`server/tests/`（新增回归测试）
**web 侧**：`web/src/` 相关文件、`web/src/locales/zh-CN.js`/`en.js`（新增键）

**不要动**：`web/src/views/artist/ManualOrder.vue`/`OrderDetail.vue`/`QueueBoard.vue`（巨型组件拆分是单独批，本批不碰）、`server/src/db/init.js` 的结构（P0-10 只抽备份函数，不拆迁移）、`.env`/docker-compose/Dockerfile。

---

## 任务 1：P0-1 裸 catch 吞错（server 20+ 处）

**问题**：`catch { /* ignore */ }` 把错误全吞，生产故障无日志。
**位置**（审计报告）：`server/src/app.ts:95,103,110,144,212`、`server/src/index.ts:18,47,58`、`server/src/shared/file-sign.ts:52,72`、`server/src/features/platform/platform.service.ts:36,104,182`、`server/src/shared/utils/platform.ts:68,134,142`、`server/src/features/auth/auth.service.ts:209`

**做法**：
1. 逐处读代码确认吞错场景
2. 分两类处理：
   - **非关键路径**（如加载失败静默）→ 改为 `catch (err) { app.log.warn('xxx', err) }` 或 `console.warn('xxx', err)`（记日志，保留静默行为）
   - **file-sign 签名校验失败**（file-sign.ts:52,72）→ 这是**正确性风险**：校验失败应 `throw` 或至少 log.error，不能静默返回 true（先读逻辑确认当前行为，若已 fail-closed 则只补日志）
3. ⚠️ 注意 app.ts/index.ts 已在 TS 迁移后（app.ts），错误对象是 `unknown`——用 `err instanceof Error` 收窄或 `(err as Error).message`

**验证**：`npx vitest run` 930/930；grep `catch {` 残留 <5 处（有正当理由的保留并注释）。

## 任务 2：P0-6 队列全量拉取无分页

**位置**：`server/src/features/order/order-queue.service.ts:15-23` `getArtistQueue`（无 LIMIT，`o.*` 冗余）

**做法**：
1. `getArtistQueue` 改为**显式列清单**（不 `o.*`，去掉 description 等大字段冗余——tier 已 JOIN）
2. 加可选 `LIMIT/OFFSET` 参数（默认如 200，参考 `getCompletedQueue` 的 7 天窗口模式）
3. ⚠️ **不能破坏调用方**：先 grep 谁调 `getArtistQueue`（QueueBoard/前端），确认分页默认值不影响现有 UI（队列全量展示是画师看板，若 UI 需要全量，改为"默认全量但显式列"即可——**分页是否加由你按调用方决定，显式列清单必做**）

**验证**：930/930；新增或调整测试覆盖 getArtistQueue 返回列。

## 任务 3：P0-7 v-for 无 key ×4

**位置**：`web/src/components/templates/TplTierGrid.vue:7`（`(tier, idx) in tiers`）、`TplStyleGrid.vue:8`（`(style, idx)`）、`TplGallery.vue:140`（`(art, index) in filteredArtworks`）、`TplHero.vue:74`（`(art, i) in artworks.slice(0,2)`）

**做法**：补稳定 key——`tier.id`/`style.id`/`art.id`（先确认这些对象有 id 字段，没有则用组合键）。`idx` 作 key 的错位复用会导致状态串。

**验证**：`npx vitest run`（web）215/215；eslint 相关文件。

## 任务 4：P0-9 硬编码中文 i18n

**位置**：`web/src/components/artist/MultiplierManager.vue:5-49`（"用途倍率/确定删除？/编辑倍率/新建倍率/名称/倍率值/说明（客户可见）"等全部硬编码）、`web/src/views/artist/ManualOrder.vue:38`（`aria-label="上传参考图"`）、`web/src/views/artist/Login.vue:10`（`alt="绘约"`）

**做法**：
1. `MultiplierManager.vue` 整组件模板字符串 → `$t()`（新增 `multiplier.*` 命名空间键，zh+en 双语）
2. ManualOrder L38 aria-label → `$t('manualOrder.uploadRefLabel')`
3. Login L10 alt → `$t('login.logoAlt')` 或复用现有键
4. 新增键检查：zh 含中文、en 不含中文（i18n 完整性自查）

**验证**：`node --check` locales 语法；eslint；215/215。

## 任务 5：P0-10 迁移备份逻辑复制粘贴 ×12

**位置**：`server/src/db/init.js:754,794,915,945,988,1012,1042,1073,1093,1310,1458,1533`

**做法**：
1. 读 init.js 中备份代码的重复模式（`console.log('📦 迁移 vN: 已备份…') + console.warn('⚠️ 迁移 vN: 备份失败…')`）
2. 抽 `backupDb(dbPath, version)` 工具函数（放 init.js 顶部或 `server/src/shared/db-backup.ts`——按项目惯例选，若放 shared 需注意 init.js 是 .js 文件，用 require/import 兼容）
3. 12 处替换为一行调用
4. ⚠️ **行为不变**：备份逻辑（文件名/备份方式/成功失败日志格式）保持原样，只去重复

**验证**：930/930（迁移测试全绿，尤其 migration-v38/40/41/43）；`Select-String '📦 迁移' init.js` 只剩 1 处函数定义 + 12 处调用。

## 任务 6：P1-3 SESSION_SECRET 开发默认值随机化

**位置**：`server/src/features/auth/auth.service.ts:20-30`

**做法**：开发环境 `SESSION_SECRET` 未设时，从固定 `'dev-secret-change-in-production'` 改为 `crypto.randomBytes(32).toString('hex')` 每次启动生成 + `console.warn` 提示。**生产 fail-fast 不动**（已有）。

**验证**：930/930；启动日志出现随机 secret 提示；生产未设 secret 仍抛错。

---

## 交付要求

1. 每个任务一行交付说明（改了什么 + 验证结果）。
2. 交付报告：`docs/comms/审计-低垂果实批-交付-20260806.md`，每任务标注审计报告对应编号。
3. commit 信息带「beta:」前缀，可拆多个 commit（每任务一个最清晰）。
4. server 测试 930/930 + web 测试 215/215 全绿（独立复跑）。
5. ⚠️ 任务 1/2 涉及 server 行为，**跑测试时注意隔离 DB_PATH**（既有 vitest 配置已处理，按惯例跑）。
