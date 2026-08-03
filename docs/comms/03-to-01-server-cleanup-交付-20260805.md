# 交付：v0.36 波 1 后端清账（C-1 ~ C-4）

> 来自：三号 | 2026-08-05
> 分支：`feat/v036-server-cleanup`（worktree `artist-commission-w3`，已先 merge master 至 3ddb849）
> Commit：`a109304`（C-1）、`de8ca44`（C-2/C-3）、`91ab169`（C-4）
> 等待一号审核，不推送、不合并。

---

## C-1：删除旧增项管理 API

### 删除的端点（pricing.routes.ts，6 个）

- `GET /api/artist/addons`
- `POST /api/artist/addons`
- `PUT /api/artist/addons/:id`
- `DELETE /api/artist/addons/:id`
- `PUT /api/artist/addons/reorder`
- `PUT /api/artist/addons/:id/tiers`

连同 `requireOwnAddon` preHandler（pricing.routes.ts）一并删除。

### 删除的 service 函数（pricing.service.ts，8 个）

`getAddons`、`getAddon`、`createAddon`、`updateAddon`、`deleteAddon`、`reorderAddons`、`updateAddonTiers`、内部 `syncAddonTiers`，以及只被增项使用的常量 `VALID_CATEGORIES`、`VALID_SELECT_MODES`。

### 删除的测试

- pricing.service.test.js 整个「增项 CRUD」describe 块：TC-P-01 ~ TC-P-10（10 个用例）。
- 计算引擎/公开报价用例（TC-P-15~29）保留，原依赖 `createAddon` 的测试数据改为本文件内新增的 `seedAddon` 直插辅助（price_addons + addon_tiers，tierIds 省略时关联全部档位，对齐旧默认行为）；TC-P-27 的禁用增项改用直接 SQL。

### 红线遵守确认

1. **公开算价 API 未动**：`/api/public/calculate-price`、`getPublicPricing`、`calculatePrice` 原样保留（`calculatePrice` 仍直读 `price_addons`/`addon_tiers` 表，数据面不依赖已删的 CRUD 函数）；`order.service.ts` 对 `calculatePrice` 的 import 不变。
2. **addons 表未 drop**：`price_addons`/`addon_tiers`/`addon_templates` 表结构全部保留（历史订单外键，波 2 再评估）。本次无迁移。
3. web/ 零改动（`api/index.js` 封装由二号删）。
4. 全库 grep 确认 `pricing.service` 的其余消费方只有 order.service.ts 的 `calculatePrice`（保留），admin/ 目录无旧增项引用。

## C-2：M1 图片路径校验（4 处）

对照 avatar 现有写法（artist.service.ts `updateArtist` 的 avatar 分支：`includes('..') || !startsWith('images/')` → `E.ILLEGAL_PATH`）补齐：

| 位置 | 字段 |
|------|------|
| artist.service.ts `createTier` | `example_image` |
| artist.service.ts `updateTier` | `example_image`（keyMap 归一后按 dbKey 校验，camelCase/snake_case 都覆盖） |
| style.service.ts `createArtStyle` | `cover_image` |
| style.service.ts `updateArtStyle` | `cover_image` |

空值/null 放行（清空语义）；与 style.service.ts 已有的 size 图片校验（`images/${artistId}/` 前缀）相比，此处按派工要求对齐 avatar 的 `images/` 宽前缀写法（档位示例图/画风封面历史上可存他人目录下的 images 路径，收窄前缀有破坏风险）。

## C-3：M2 focus-image 路由层校验

order.routes.ts `PUT /api/artist/orders/:id/focus-image` 路由层补：`imagePath` 非空时须 `startsWith('references/')` 且不含 `..`，否则 `E.ILLEGAL_PATH`。与同文件参考图添加路由（L726-728）及下单路由（L137-142）写法一致。服务层 `setFocusImage` 的参考图归属订单校验保留不动，形成纵深。

## C-4：M4 demo-data 字段完整性

选简单方案（字段清单注释 + 断言），未改走 createOrder：

- `seedDemoOrders` 的 INSERT 前补显式字段清单注释（22 列）。
- 新增 `assertFieldIntegrity()`，在 main 末尾（backfill 之后）执行：演示订单（ALICE-%）逐条检查 queue_position / price_snapshot / total_price_cents / final_price_cents / paid_total_cents / start_date，非 done 订单另查 deadline / current_stage_id；演示作品（alice/bob/carol 种子图）检查 width/height 非 NULL。任一缺失抛错中止，防第三次静默漏字段。
- demo-data.ts 是容器内运行脚本（`/app/...` 绝对路径 import），本地无法执行，已单独 tsc --ignoreConfig 验证：除容器路径解析（TS2307，本地预期）外无新增类型错误。

## 验证结果（worktree 内 npm install 后）

- vitest：**701 passed (701)**，41 文件全绿（基线 711 − 删除的 10 个旧增项用例 = 701，无新增无流失）
- tsc --noEmit：**0 错误**
- eslint：**0 错误**；2 个预存 warning（tier-reorder-startdate.test.js ×1、v025-route-integration.test.js ×1，均为 no-unused-vars，不在本次授权改动文件内，未引入）

## 遗留/备注

- pricing.service.test.js 用例编号 TC-P-01~10 出现空洞（11 起接），未重编号（最小变更）。
- `errors.ts` 中 ADDON_* / REORDER_* 错误码未删（REORDER_* 被档位排序等其他模块复用；ADDON_* 删除属顺手清理，留给波 2 死代码批次或五号）。
