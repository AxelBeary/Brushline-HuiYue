# 派工：三号 · Beta 冲刺批 5 —— TS 迁移 P0+P1+P2（开门禁 → 修空指针 → 后端收尾）

> 分支：`beta/ts-migration` · worktree：`../artist-commission-w10`
> 开工第一步：`git merge master` 再读本文件。
> 依据：中立 AI 评估报告（`workspace/temp/ts-migration-report/TS-JS统一迁移评估报告.md`，一号已核实断言全部成立）+ `incremental-ts-typing` 技能（只加类型不改运行时行为的核心纪律）。
> 用户已拍板：**方案 A——P0+P1+P2 一个批全做**（2026-08-06）。
> 只动授权文件，不推送不合并，干完写交付报告 commit 到自己分支。

---

## 任务摘要（三步，按序执行，每步独立验证）

**P0 开门禁**（~1h，零业务代码改动）→ **P1 修空指针**（~半天，strictNullChecks 31 处）→ **P2 后端收尾**（~1天，4 个 JS 源文件转 TS）。

**核心纪律（不可违背）**：
- P0/P2 = **只加类型信息，不改运行时行为**（禁止 `?? null` 改返回值、禁止改控制流、禁止新副作用）
- P1 = 修真实空指针 bug（允许加防御逻辑，这是目的）
- 每步结束 `npx tsc --noEmit` 目标零错误 + `npx vitest run` 全绿（当前基线 930/930）

---

## P0：开门禁（零业务代码改动）

### P0-1. 装 oxlint（TS lint 覆盖）

```bash
cd server && npm i -D oxlint
```

### P0-2. server/package.json 脚本

```json
"lint": "eslint . && oxlint src tests",
"typecheck": "tsc --noEmit"
```
（保留 ESLint 管 JS；oxlint 补 TS。web/ 不用动。）

### P0-3. CI 加检查（.github/workflows/ci.yml server job）

现状（L23-24 附近）：
```yaml
      - run: npx eslint .
      - run: npm test
```
改为：
```yaml
      - run: npx eslint .
      - run: npx oxlint src tests
      - run: npm run typecheck
      - run: npm test
```
（web job 的 eslint 不动。e2e.yml 不动。）

### P0-4. tsconfig 开零成本 strict 项

`server/tsconfig.json` compilerOptions 加：
```json
"strictFunctionTypes": true,
"noImplicitThis": true
```
（实测 0 错误，白捡。）

**P0 验证**：`npx oxlint src tests` 通过（或仅剩可接受 warnings）；`npm run typecheck` 通过；`npx vitest run` 930/930；**此时不碰任何业务代码**。

---

## P1：修空指针（strictNullChecks + useUnknownInCatchVariables）

### P1-1. tsconfig 加严格项

```json
"strictNullChecks": true,
"useUnknownInCatchVariables": true
```

### P1-2. 修 31 处错误（报告实测 18 strictNullChecks + 13 useUnknownInCatchVariables，以你实际 tsc 输出为准）

**重点区域（报告指明，均有真实运行时风险）**：
- `auth.routes.ts`：约 7 处 `result.artist` possibly undefined（**登录流程**）——加存在性守卫（`if (!result.artist) throw ...` 或安全回退），保持既有错误风格
- `artist.service.ts`：约 4 处 `quota.remaining`/`quota` possibly null（**配额计算**）——加 null 守卫/默认值
- `admin.routes.ts`：`string | null` 赋给 `string`——按实际语义收窄（若业务上必非 null 用 `!`，否则空值处理）
- 各处 `catch (err)` 变 `unknown`：先 `if (err instanceof Error)` 收窄再取 `.message` 等；访问 `.code`/`.statusCode` 的自定义错误类型用现有 AppError 类型断言（`as AppError`）

**纪律**：P1 允许加防御逻辑（这是修 bug），但**不许改变成功路径的行为**——只改空值/异常路径的处理。

**P1 验证**：`npm run typecheck` 0 错误（含新开 strictNullChecks 后全量）；`npx vitest run` 930/930；eslint/oxlint 通过。

---

## P2：后端源码收尾（4 个 JS 源文件转 TS，475 行）

**顺序执行（每步 tsc+测试独立验证）**：

### P2-1. `server/src/db/connection.js` → `.ts`（24 行）
- `git mv` 改名，加导出类型（db 实例类型由 better-sqlite3 推断）
- 目的：**建立 db 类型出口**（后续 P3 泛型封装的地基）

### P2-2. `server/src/index.js` → `.ts`（61 行）
- 启动入口，简单标注（process.env 类型、buildApp 返回类型）

### P2-3. `server/src/db/seed.js` → `.ts`（73 行）
- 参考 `incremental-ts-typing` Pattern 1：db 查询 `as` 断言（`as Artist | undefined` 等）

### P2-4. `server/src/app.js` → `.ts`（317 行，最难）
- ⚠️ 全局错误处理器有 12 处 `unknown` 上直接访问 `.code`/`.statusCode`/`.detail`——**类型断言 `as AppError`**（或对应错误类型），不改逻辑
- Fastify 路由注册保持原样；`request`/`reply` 类型走 `FastifyInstance`/`FastifyRequest`（参考既有 .ts 路由文件的写法）
- 参考 `incremental-ts-typing` Pattern 2/4/8

### P2-5. `server/src/db/init.js` **保留 .js**（1,899 行 DDL 脚本，豁免）
- 文件头加 `// @ts-check`（注释级检查，不强转）
- tsconfig 加 `"checkJs": true`，让保留的 .js 也进检查网（init.js 若 @ts-check 报错太多，先加 `// @ts-nocheck` 顶行豁免，交付报告说明）

### 连带更新
- 所有 import 引用这些文件的 .ts/.js 路径按实际调整（`import ... from './connection.js'` 在 TS 里指向 .ts 文件——**TS 的 bundler 解析下保持 .js 后缀引用不变**，因为 allowJs + bundler 模式兼容；若 tsc 报错按 incremental-ts-typing Pattern 3 边界处理）
- `entrypoint.sh` 的 `npx tsx src/index.js` 无需改（tsx 自动解析 .ts）

**P2 验证**：`npm run typecheck` 0 错误；`npx vitest run` 930/930；`npm run lint`（eslint+oxlint）通过；启动冒烟（`npm run dev` 或起 server 打 /api/health 200）。

---

## 授权文件（只动这些）

- `server/package.json`（脚本 + oxlint 依赖）
- `server/tsconfig.json`
- `.github/workflows/ci.yml`
- `server/src/db/connection.js` → `.ts`（重命名）
- `server/src/index.js` → `.ts`（重命名）
- `server/src/db/seed.js` → `.ts`（重命名）
- `server/src/app.js` → `.ts`（重命名）
- `server/src/db/init.js`（仅加 @ts-check 头注释）
- P1 涉及的 TS 源文件（auth.routes.ts / artist.service.ts / admin.routes.ts 等按 tsc 报错清单）
- `package-lock.json`（oxlint 安装产生，正常提交）

**不要动**：`web/` 任何文件（二号/四号并行批可能动）、`server/tests/*`（不迁移，仅确保仍通过）、`.env`、docker-compose.yml、Dockerfile。

---

## 交付要求

1. 交付报告：`docs/comms/03-to-01-交付-Beta冲刺批5-TS迁移.md`，写清：
   - P0/P1/P2 每步的 tsc 错误数变化（基线 → 各步 → 最终 0）
   - strictNullChecks 修了哪些文件多少处（尤其登录/配额的真实雷）
   - 哪些文件转了 .ts、init.js 豁免说明
   - 测试跑分（930/930）+ lint 结果
2. commit 建议拆 3 个：`beta(ts): P0开门禁-oxlint+CI typecheck+零成本strict` / `beta(ts): P1修空指针-strictNullChecks 31处` / `beta(ts): P2后端收尾-4文件转TS`（每步独立可验证）
3. ⚠️ 若 P1/P2 遇到 `typescript-eslint` 不兼容 TS7 的问题——**不要装 typescript-eslint**，oxlint 已覆盖；报告已确认 tsc --noEmit 在 TS7 下正常
4. 若中途卡住超 20 分钟无产出，停下在交付报告标注卡点，不硬磨。
