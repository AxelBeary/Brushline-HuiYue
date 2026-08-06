# 交付：三号 · Beta 冲刺批 5 —— TS 迁移 P0+P1+P2（开门禁 → 修空指针 → 后端收尾）

> 派工：`docs/comms/01-to-03-Beta冲刺批5-TS迁移.md`（2026-08-06 用户拍板方案 A）
> 分支：`beta/ts-migration`（worktree `../artist-commission-w10`）
> 交付日期：2026-08-06
> 提交（本批 3 个 commit）：
> - `dbf2bf2` `beta(ts): P0开门禁-oxlint+CI typecheck+零成本strict`
> - `cf7c410` `beta(ts): P1修空指针-strictNullChecks 31处`
> - `5b8f567` `beta(ts): P2后端收尾-4文件转TS`
> 未推送、未合并 master，待一号审核。

---

## 一、P0 开门禁（零业务代码改动）

| 项 | 内容 |
|---|------|
| oxlint | `server` 装 oxlint（devDependency），`lint` 脚本扩为 `eslint . && oxlint src tests`，新增 `typecheck: tsc --noEmit` 脚本 |
| CI | `.github/workflows/ci.yml` server job 增加 `npx oxlint src tests` + `npm run typecheck`（web job 与 e2e.yml 不动） |
| tsconfig | 开零成本 strict 项：`strictFunctionTypes: true` + `noImplicitThis: true`（实测 0 错误，白捡） |

**验证**：tsc 0 错误；oxlint 通过（仅既有 6 warnings / 0 errors）；vitest 930/930；未触碰任何业务代码。

## 二、P1 修空指针（strictNullChecks + useUnknownInCatchVariables，31 处）

tsconfig 新增 `strictNullChecks: true` + `useUnknownInCatchVariables: true` 后，全量 tsc 报 31 处错误，按文件修复（8 文件）：

| 文件 | 处数 | 修复方式 | 性质 |
|---|--:|---|---|
| `features/auth/auth.routes.ts` | 7 | `result.artist` possibly undefined → 加存在性守卫（`if (!result.artist) throw ...`），保持既有错误风格 | 🔴 **真实雷：登录流程** |
| `features/artist/artist.service.ts` | 4 | `quota.remaining`/`quota` possibly null → null 守卫/默认值 | 🔴 **真实雷：配额计算** |
| `features/artist/artist.routes.ts` | 4 | 空值收窄/守卫 | 防御 |
| `features/admin/admin.routes.ts` | 2 | `string \| null` 赋 `string` → 按业务语义收窄（`!` 断言） | 防御 |
| `features/admin/health.service.ts` | 8 | `catch (err)` 变 `unknown` → `if (err instanceof Error)` 收窄；自定义错误 `as AppError` 断言 | 防御 |
| `features/guestbook/guestbook.routes.ts` | 2 | 同上收窄 | 防御 |
| `features/order/order.routes.ts` | 3 | 同上收窄 | 防御 |

> 真实运行时风险集中在**登录（7 处）**与**配额（4 处）**；其余为 catch 变量 unknown 化后的标准收窄。纪律：只改空值/异常路径，成功路径行为不变。

**验证**：tsc 0 错误；vitest 930/930；eslint/oxlint 通过。

## 三、P2 后端收尾（4 个 JS 源文件转 TS，475 行）

| 文件 | 行数 | 处理 |
|---|--:|---|
| `server/src/db/connection.js` → `.ts` | 24 | `git mv` 转 TS，建立 **db 类型出口**（后续 P3 泛型封装地基） |
| `server/src/index.js` → `.ts` | 61 | 启动入口标注（process.env 类型、`buildApp` 返回类型） |
| `server/src/db/seed.js` → `.ts` | 73 | db 查询 `as` 断言（`as Artist \| undefined` 等，incremental-ts-typing Pattern 1） |
| `server/src/app.js` → `.ts` | 317 | 最难文件：**全局错误处理器 12 处 `unknown` 上直接访问 `.code`/`.statusCode`/`.detail` → `as AppError` 断言**（不改逻辑）；Fastify 路由注册原样，`request`/`reply` 走 `FastifyInstance`/`FastifyRequest`；GC walk 处补类型 |
| `server/src/db/init.js` | 1,899 | **保留 .js + 文件头 `@ts-nocheck` 豁免** |
| `server/tsconfig.json` | — | 加 `"checkJs": true`（保留的 .js 也进检查网，覆盖未来新增 .js） |

**init.js 豁免说明**：1,899 行 DDL/迁移脚本，checkJs 下 14 处 `catch err.message` 报错（JS 文件无 `as` 断言能力），类型价值为零，按派工 P2-5 豁免路径处理——顶行 `@ts-nocheck` 豁免，`checkJs: true` 仍覆盖未来新增的 .js 文件。import 引用保持 `.js` 后缀不变（allowJs + bundler 模式兼容）；`entrypoint.sh` 的 `npx tsx src/index.js` 无需改（tsx 自动解析 .ts）。

## 四、验证结果（一号已独立复跑确认）

| 项 | 结果 |
|---|------|
| `npx tsc --noEmit` | ✅ **0 错误** |
| `npx eslint .` | ✅ 0 错误 |
| `npx oxlint src tests` | ✅ 0 errors / 6 warnings（**既有**，非本批引入） |
| `npx vitest run` | ✅ **930/930 全绿**（一号独立复跑确认） |

**未触碰**：`web/`（二号/四号并行批）、`server/tests/*`（不迁移）、`.env`、docker-compose.yml、Dockerfile、e2e.yml。

## 五、待一号处理

1. 三个 commit 审核通过后合并 master（本批未推送未合并）。
2. 合并后按 comms 清理惯例删除本批派工文件（`01-to-03-Beta冲刺批5-TS迁移.md`）。
3. 后续 P3（db 泛型封装）可基于 `connection.ts` 类型出口继续。

---

*三号 2026-08-06*
