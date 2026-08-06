# 交付：三号 · Beta 冲刺批 1 —— 后端数据修复（T4 seed 幂等 + T8 封面上限）

> 分支：`beta/backend-data-fix` · worktree：`../artist-commission-w3`
> 已 `git merge master`（df26d7d，fast-forward）后开工。
> 只动授权文件，未推送未合并。

---

## 任务 1：T4【P2】seed 幂等性修复 —— ✅ 完成

**改动**：`server/src/db/seed.js` —— 采用派工方案 A（零 schema 变更）：取 alice/bob id 之后、插入 price_tiers 之前，先清空本 seed 画师的已有档位：

```js
// T4 幂等修复：price_tiers 无唯一约束，先清空本 seed 画师已有档位，避免重复插入
db.prepare('DELETE FROM price_tiers WHERE artist_id IN (?, ?)').run(alice.id, bob.id)
```

**验证**（临时 DB `workspace/temp/seed-idem-test/commission.db`，未碰生产库）：
- 连跑两遍 `npx tsx src/db/seed.js`
- 重复查询 `SELECT artist_id, name, price, COUNT(*) FROM price_tiers GROUP BY artist_id, name, price HAVING COUNT(*) > 1` → **0 行**
- 每画师档位：alice 3 条、bob 2 条，数量正确

**补充确认**：`commission_rules` 表 `artist_id` 带 `UNIQUE` 约束（init.js L85），seed 对其 `INSERT OR IGNORE` 幂等安全，无需处理；**唯一隐患确为 price_tiers**，与派工研判一致。

## 任务 2：T8【P1】封面上限 6 张 —— ✅ 完成

**端点定位**：`PUT /api/artist/artworks/:id/cover`（`artist.routes.ts` L430）→ `artistService.setCover()`（`artist.service.ts` L489）。公开 API 无改动（上限仅管理端限制）。

**改动**：
1. `server/src/shared/errors.ts`：新增错误码 `COVER_LIMIT_REACHED` + 中文文案 `'封面最多 6 张'`（与既有错误码风格一致）。
2. `server/src/features/artist/artist.service.ts`：`setCover()` 开头加校验——`SELECT COUNT(*) ... WHERE artist_id = ? AND is_cover = 1 AND id != ?`（不含当前作品），`>= COVER_LIMIT(6)` 则 `throw new AppError(E.COVER_LIMIT_REACHED, 400)`。已封面作品重复设置**幂等放行**（不重新计数，避免已达上限时重复设置误报）。新增 `export const COVER_LIMIT = 6`。
3. `server/tests/cover.test.js`：新增 3 条回归测试：
   - **TC-CV-09**：设满 6 张后第 7 张设封面被拦截（抛 COVER_LIMIT_REACHED），第 7 张保持非封面，原有 6 张不受影响
   - **TC-CV-10**：取消一张封面后第 7 张可设成功（删后可再设）
   - **TC-CV-11**：已达上限时对已封面作品重复设置幂等通过（不误报）

**错误流转**：路由层无需改动——service 抛出的 AppError 经全局 `setErrorHandler`（app.js L225，注册于所有 register 之前）转 `400 + { code: 'COVER_LIMIT_REACHED', error: '封面最多 6 张' }`，前端可按 `code` 做 i18n 提示。

⚠️ **前端提示（派工要求写明）**：本批未改 `web/`（二号/五号并行批在改）。前端需在下批加 ElMessage 展示 `COVER_LIMIT_REACHED` 错误（「封面最多 6 张」）。

## 测试跑分

| 项目 | 结果 |
|------|------|
| `npx vitest run tests/cover.test.js` | 11/11 通过（原 8 + 新 3） |
| `npx vitest run`（server 全量） | **928/928 通过**（58 文件；基线 925 + 新增 3） |
| `npx eslint .` | 0 错误 0 警告 |
| `npx tsc --noEmit` | 通过 |

## 其他说明

- worktree 首次运行需 `npm install`（新 worktree 无 node_modules）；npm install 自动把 `package-lock.json` 的 `license` 从残留的 `MIT` 同步为 `AGPL-3.0`——**该改动非本批任务，已 `git checkout` 还原，未夹带**（master 上 package.json 已 AGPL，lock 残留可留给一号顺手清）。
- 改动文件仅授权范围内 4 个：`server/src/db/seed.js`、`server/src/shared/errors.ts`、`server/src/features/artist/artist.service.ts`、`server/tests/cover.test.js`（55 行新增，0 删除）。
