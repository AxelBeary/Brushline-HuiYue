# 01-to-04：repowiki 待重写原文批（C）（施工图）

> 转交一号 · 派工时间：2026-08-07 · 执行角色：四号（文档） · worktree：`../artist-commission-w19` · 分支：`docs/wiki-rewrite`
> **开工第一步：`git merge master` 再读本文件**
> 只动授权文件；不推送、不合并、不改 STATUS。

## 〇、任务理解（人话）

外部知识库归档时发现 2 篇 wiki 原文严重过时（核对报告已落档 `docs/external-wiki/repowiki-核对报告-20260806.md`），本批按当前代码重写，消灭过时信息。纯文档任务。

## 一、授权文件

| # | 文件 | 动作 |
|---|------|------|
| 1 | `docs/external-wiki/wiki-认证接口-待重写.md` | 按当前代码重写（认证/登录/TOTP） |
| 2 | `docs/external-wiki/wiki-数据库模式设计-待重写.md` | 按当前代码重写（schema/迁移） |
| 3 | `docs/external-wiki/README.md` | 更新（若目录/文件清单有变化） |

**不要动**：其他任何文件；`docs/requirements/`、`docs/comms/`、源码。

## 二、重写依据（先读这些，再动笔）

1. `docs/comms/核实-第三方报告-20260806.md` 或 `docs/external-wiki/repowiki-核对报告-20260806.md` —— 核对报告的过时点清单（哪节错、为什么）
2. **认证接口**：`server/src/features/auth/`（auth.routes.ts / auth.service.ts / totp.ts）——当前实现为准；含 TOTP 动态口令（REQ-027）、QQ 号登录、管理员 bootstrap、匿名凭证（若后端批已合入 tracking，可不提或标注"见 tracking 文档"——**以 master 实际代码为准**）
3. **数据库模式**：`server/src/db/init.js` 的 MIGRATIONS 数组（当前最新版本号）+ `server/src/types/entities.ts`——列出所有表 + 关键字段 + 最新迁移版本（现为 v43，若后端批合入 v44 则更新为 v44——**以 master 实际为准**）
4. 重写后文件名去掉"待重写"后缀（`wiki-认证接口.md` / `wiki-数据库模式设计.md`）——**若 README 引用了旧文件名，同步改**。git mv 保留历史。

## 三、写作要求

- 面向**非程序员**可读（用户不会写代码）：人话 + 表格 + 必要术语解释
- 认证接口：登录流程（QQ 号 + TOTP 动态口令）、管理员绑定/重置（`npm run totp:rebind`）、AUTH_DEV_MODE 开关语义、匿名凭证（如存在）
- 数据库：每张表一句话职责 + 关键字段表；迁移机制说明（MIGRATIONS 数组 + schema_migrations）；最新版本号醒目
- 过时点必须消除：核对报告点名的每处都要对照当前代码修正
- 不编造：不确定的查代码；代码里没有的不要写

## 四、验证门禁

```powershell
cd D:\Hermes Agent CN Desktop\workspace\artist-commission-w19
# 文档核对：重写后的两个文件 + README 都提交
git status --short
```

**验证断言**：
- 两个"待重写"文件已重命名（无"待重写"后缀）且内容重写完成
- 核对报告点名的过时点逐条消除（对照代码核实至少 5 处：登录方式/TOTP/迁移版本/表结构/字段名）
- README 引用同步

## 五、交付物

1. 改动 commit 到 `docs/wiki-rewrite`（message：`docs(wiki): 重写认证接口+数据库模式设计(消除核对报告过时点),去待重写后缀`）
2. 交付报告 `docs/comms/02-to-01-repowiki重写-交付.md`（commit 进分支，抬头「**四号转交一号，文件：docs/comms/02-to-01-repowiki重写-交付.md**」）：过时点清单逐条→处置→重写后文件路径

## 六、红线

- 只动授权 3 文件（+git mv 改名）；源码/其他文档一律不动
- 内容以当前 master 代码为准，不写代码里没有的
- 不推送、不合并、不改 STATUS
