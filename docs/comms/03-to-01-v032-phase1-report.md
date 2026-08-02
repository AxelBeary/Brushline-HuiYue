# 交付报告：v0.32 Phase 1 后端（三号）

> 日期：2026-08-03
> 分支：`feat/v032-phase1-backend`
> commit：`d592796`

---

## 做了什么

REQ-023 Phase 1 后端全部完成：迁移 v36（5 表 + 老数据迁移）+ 13 个 CRUD API + 公开配置接口 + 46 个测试。

## 改了哪些文件

| 文件 | 变更 |
|------|------|
| `server/src/db/init.js` | schema 加 5 表 + 索引 + 迁移 v36（建表 + 老数据迁移逻辑） |
| `server/src/shared/errors.ts` | 新增 13 个错误码 + 中文消息 |
| `server/src/features/pricing/style.service.ts` | **新建** — 增项库/画风/尺寸/覆盖 CRUD + getPublicStyles |
| `server/src/features/pricing/style.routes.ts` | **新建** — 13 个端点，全部带 JSON Schema（additionalProperties: false） |
| `server/src/app.js` | 注册 style.routes.js |
| `server/tests/setup.js` | cleanDb 加 5 张新表 |
| `server/tests/style.test.js` | **新建** — 46 个测试（迁移/CRUD/权限/公开配置/路由集成） |

## 接口清单

画师端（requireAuth）：
- GET/POST `/api/artist/addon-templates`，PUT/DELETE `/api/artist/addon-templates/:id`
- GET/POST `/api/artist/art-styles`，PUT/DELETE `/api/artist/art-styles/:id`
- POST `/api/artist/art-styles/:id/sizes`，PUT/DELETE `/api/artist/art-styles/:id/sizes/:sizeId`
- PUT `/api/artist/art-styles/:id/addons`（批量设置）
- PUT `/api/artist/art-styles/:id/sizes/:sizeId/overrides`（尺寸覆盖）

客户端公开：
- GET `/api/public/styles/:subdomain`（限流 30次/5分钟）

## 数据库变更

- 迁移版本：v36（multi_style_model）
- 新建 5 表：addon_templates / art_styles / style_sizes / style_addons / size_addon_overrides
- 老数据迁移：每个画师 → 默认画风 + price_tiers→style_sizes + price_addons→addon_templates + addon_tiers→style_addons
- 不删旧表（price_tiers / price_addons / addon_tiers 保留）
- 幂等：IF NOT EXISTS + 已有 art_styles 数据则跳过
- 回滚方案：DROP 5 表 + DELETE FROM schema_migrations WHERE version=36

## 验证结果

- 后端测试：**622/622 通过**（37 文件，含 46 个新增）
- ESLint：零错误零警告
- 现有 576 测试全部通过，无回归

## 踩坑记录

- init.js 模板字符串含中文全角括号（`（`）在 vite 解析时报 "missing ) after argument list"，改用字符串拼接修复
