# 派工：三号 · Beta 冲刺批 1 —— 后端数据修复（T4 seed 幂等 + T8 封面上限）

> 分支：`beta/backend-data-fix` · worktree：`../artist-commission-w3`
> 开工第一步：`git merge master` 再读本文件。
> 只动下面「授权文件」列表内文件，不推送不合并，干完写交付报告 commit 到自己分支。

---

## 任务摘要

两个后端小任务：① seed 幂等性修复（price_tiers 重复插入）② 画师作品「封面上限 6 张」新规则（用户 2026-08-06 拍板）。**都是服务端改动，不动 web/ 前端。**

## 授权文件（只动这些）

- `server/src/db/seed.js`
- `server/src/db/init.js`（仅 T8 需要时加索引/约束，谨慎）
- `server/src/features/artist/dashboard.routes.ts` 或对应作品管理路由（T8 封面设置端点，先定位再改）
- `server/tests/*`（新增回归测试）

**不要动**：`web/` 下任何文件（二号/五号并行批在改）、`server/src/features/order/*`（除非 T8 必需）、生产数据库文件。

---

## 任务 1：T4【P2】seed 幂等性修复（档位重复展示）

**现状**：`server/src/db/seed.js` L29 用 `INSERT OR IGNORE INTO price_tiers ...`，但 price_tiers **无唯一约束** → 第二次跑 seed 再插一份，主页档位区重复展示（bob 主页「全身插画 ¥350」「双人插画 ¥500」各出现 2 次；alice 6 条重复）。

**修复方案（二选一，选简单可靠的那个）**：
- **方案 A（推荐，零 schema 变更）**：seed 函数开头、插入 price_tiers 前，先清掉本 seed 画师已有档位：
  ```js
  // seed 幂等：先清空本 seed 画师的档位，避免重复插入
  db.prepare('DELETE FROM price_tiers WHERE artist_id IN (SELECT id FROM artists WHERE subdomain IN (?, ?))').run('alice', 'bob')
  ```
  放在取 alice/bob id 之后、插入 tiers 之前。
- **方案 B**：给 price_tiers 加 (artist_id, name, price) 唯一索引（init.js 迁移 + 存量去重）——涉及迁移，成本高，**除非用户拍板否则不选**。

**交付**：跑两遍 `npm run db:seed`（或 `npx tsx src/db/seed.js`），第二遍后 `SELECT artist_id, name, price, COUNT(*) FROM price_tiers GROUP BY artist_id, name, price HAVING COUNT(*) > 1` 应零行。

---

## 任务 2：T8【P1】封面上限 6 张（用户拍板新规则）

**规则**（用户 2026-08-06 拍板）：作品管理封面星标处——**当画师已设 6 张封面、再对第 7 张作品点「设为封面」时，应提示「封面最多 6 张」且该操作不生效**（第 7 张保持非封面）。

**做法**：
1. **定位封面设置端点**：搜索作品/封面相关 API（`server/src/features/artist/dashboard.routes.ts` 或 upload/作品管理路由，grep `is_cover` / `cover` / `setCover` 找端到端路径）。公开 API 无改动（上限只是管理端限制）。
2. **加校验**：设置封面时先 `SELECT COUNT(*) FROM artworks WHERE artist_id = ? AND is_cover = 1`（不含当前作品），`>= 6` 则拒绝，返回业务错误（参考现有 AppError/E 用法，如 `throw new AppError(E.COVER_LIMIT_REACHED, 400)` 并加对应错误码/文案——先看现有错误枚举放哪，保持风格一致）。
3. **前端提示**：本批**不改 web/**（并行批在改前端）；在交付报告写明「前端需在下批加 ElMessage 展示该错误」。
4. **回归测试**：`server/tests/` 加一条——设 6 张封面后第 7 张失败返回业务错误；删一张后可再设。

**验证**：`npx vitest run`（server 目录）全绿；手工/测试脚本走一遍 6→7 张拦截。

---

## 交付要求

1. 每个任务一行交付说明（改了什么 + 验证结果 + 测试跑分）。
2. 交付报告：`docs/comms/03-to-01-交付-Beta冲刺批1-后端数据.md`。
3. commit 信息带「beta:」前缀，如 `beta: seed幂等修复+封面上限6张校验`。
4. ⚠️ 跑测试前先 `git merge master`；测试隔离 DB_PATH（vitest 已处理，按既有惯例跑）。
