# 03-to-01 交付报告：批3 后端 E2 修复——parseInt 缺 radix 统一补齐

> 执行：三号（后端）｜分支：fix/batch3-server（基于 master 4e3eae2）｜日期：2026-08-09
> 依据：%TEMP%\audit-E\report-e.md 第 3.1 节（27 处）＋派工要求「单参数 parseInt(x) 全部补为 parseInt(x, 10)」

## 一、任务理解

代码质量考古报告 3.1 节：`server/src` 存在 27 处单参数 `parseInt(...)`（无 radix）。对路由 `:id` 与 query 等不可信输入，字符串带 `0x` 前缀会被按 16 进制解析，属隐患。修复方式统一为补 `, 10`，与同文件其他已带 radix 的调用保持一致；不改任何其他逻辑、不加注释。

## 二、改动清单（3 个文件，27 行 / 29 处调用）

| 文件 | 行号（修复后） | 处数 |
|------|------|------|
| server/src/features/admin/admin.routes.ts | 145, 179, 200, 334, 341, 348, 366, 385, 386, 399, 400, 452, 468, 487（2 处）, 492（2 处）, 505, 529 | 19 |
| server/src/features/artist/artist.routes.ts | 442, 447, 530, 540 | 4 |
| server/src/features/guestbook/guestbook.routes.ts | 51, 52, 80, 87, 107, 130 | 6 |

> 说明：审计清单按「行号」计 27 处；其中 admin.routes.ts 487/492 两行各含 2 个 `parseInt` 调用，实际共修复 29 个调用。

## 三、核对过程（无遗漏证明）

1. 修复前全量 grep：单参数 `parseInt` 命中即上述 27 行（含 487/492 双调用），与审计清单逐条一致，无偏移。
2. 批量机械替换带负向断言 `(?!\s*,\s*10)`，确保已带 `, 10` 的行（如 admin 107/108/220/221、artist 242/243/278…352）零触碰。
3. 修复后复核：
   - `server/src` + `web/src` 单参数 `parseInt` = 0；
   - 无 `parseInt(..., 10, 10)` 双重注入；
   - `git diff` 逐行人审：27 行 diff 全部仅为补 `, 10`，无逻辑改动、无注释增删、无行尾/编码变化（CRLF/UTF-8 无 BOM 保持原样）。
4. 全仓其余单参数 `parseInt` 命中均为 docs 归档/技能文档（如 docs/archive/*.html、docs/external-wiki、docs/soul/skills），非运行代码，不在本批范围，未改动。

## 四、验收结果（server 目录）

| 验收项 | 结果 |
|--------|------|
| npx tsc --noEmit | ✅ 0 错误 |
| npm test（vitest run） | ✅ 69 文件 / 1012 用例全过 |
| npx oxlint src tests | ✅ 0 错误（2 条存量 warning 与本次改动无关：artist.service.ts 未用导入、admin.routes.ts:543 未用变量） |
| 单参数 parseInt grep | ✅ 0 |

## 五、其他

- 未 push、未合并、未触碰 master；commit 仅落在本分支 fix/batch3-server。
- 无 any / @ts-ignore 新增。
