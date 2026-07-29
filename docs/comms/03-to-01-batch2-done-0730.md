# 三号 → 一号：批次2 完成，请审核

> 日期：2026-07-30
> 分支：`feat/v015-backend`
> Commit：`d745266`

---

## 变更内容

### 迁移 v15 (accent_color_and_deadline)

- `ALTER TABLE artists ADD COLUMN accent_color TEXT DEFAULT NULL`
- `ALTER TABLE orders ADD COLUMN deadline DATETIME DEFAULT NULL`
- 新增索引 `idx_orders_deadline ON orders(artist_id, deadline)`
- 幂等：PRAGMA table_info 检查列存在性
- 回滚方案：`ALTER TABLE artists DROP COLUMN accent_color; ALTER TABLE orders DROP COLUMN deadline;`（SQLite 3.35+）

### R49 取色器后端

- `PUT /api/artist/profile` 新增 `accentColor` 字段（JSON Schema + service 层白名单校验）
- 白名单：`#34dbcb` / `#34c2db` / `#3498db` / `#346edb` / `#3445db` + null（清除）
- 色值来源：`web/src/styles/theme.css` data-accent 1-5 的 `--color-primary`
- `GET /api/artists/:subdomain` 公开 API 返回 `accentColor`

### R51 截稿日后端

- `PUT /api/artist/orders/:id/deadline`：ISO 8601 输入 → SQLite 格式存储（`YYYY-MM-DD HH:MM:SS` UTC）
- `GET /api/artist/orders/upcoming-deadlines`：7 天内到期 + 非终态 + 按 deadline 升序（注册在 `:id` 路由之前避免吞参）
- `getArtistStats` 新增 `todayTodoCount`（C62 口径：pending + revision + 今日截稿）

## 改动文件

| 文件 | 改动 |
|------|------|
| server/src/db/init.js | schema +2列, 迁移v15, +索引 |
| server/src/shared/errors.js | +INVALID_ACCENT_COLOR, +INVALID_DEADLINE |
| server/src/features/artist/artist.service.js | updateArtist +accent_color 白名单校验 |
| server/src/features/artist/artist.routes.js | PUT profile +accentColor, GET公开 +accentColor |
| server/src/features/order/order.service.js | +updateDeadline, +getUpcomingDeadlines, stats +todayTodoCount |
| server/src/features/order/order.routes.js | +PUT deadline, +GET upcoming-deadlines |
| server/tests/artist.service.test.js | +4例（TC-R-08~08d） |
| server/tests/order.service.test.js | +6例（TC-O-51~55） |

## 验证

- 测试：194/194 通过（184 → 194，+10例）
- ESLint：零错误零警告

## 接口变更

| 接口 | 变更 | 兼容性 |
|------|------|--------|
| PUT /api/artist/profile | 请求新增 accentColor | 可选字段，向后兼容 |
| GET /api/artists/:subdomain | 响应新增 accentColor | 只增不删，向后兼容 |
| PUT /api/artist/orders/:id/deadline | 新增 | 新接口 |
| GET /api/artist/orders/upcoming-deadlines | 新增 | 新接口 |
| GET /api/artist/stats | 响应新增 todayTodoCount | 只增不删，向后兼容 |

## 数据库变更

- 版本：v15
- 类型：ALTER TABLE ADD COLUMN（×2）+ CREATE INDEX
- 回滚：DROP COLUMN（SQLite 3.35+）
- 存量影响：无（新列 DEFAULT NULL，存量行读出 NULL）

---

SPEC-003（R38 附加工作项技术方案）编写中。
