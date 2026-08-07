# 数据库模式设计

> 本文按 `artist-commission` master 当前代码重写（2026-08-07，四号）。
> 原「price_tiers 画风×尺寸模型、orders 含 base_price/final_price、order_references 为 url、deliverables 为 title/file_url、artist_workflow_stages 为 stage_name/is_default」等描述全部与当前 DDL 不符，已按 `server/src/db/init.js` 实际 DDL 重写。
> 重写依据：`repowiki-核对报告-20260806.md` 🔴 4-7 项过时点 + ⚪ 缺失 11 张表。

<cite>
**本文引用的文件**
- [server/src/db/init.js](file://server/src/db/init.js)（schema 建表 + MIGRATIONS 迁移数组，最新 v45）
- [server/src/types/entities.ts](file://server/src/types/entities.ts)（TS 类型定义）
- [server/src/utils/order-status.ts](file://server/src/utils/order-status.ts)（订单状态常量）
- [server/src/features/order/order-workflow.service.ts](file://server/src/features/order/order-workflow.service.ts)（订单工作流服务）
- [server/src/features/pricing/style-pricing.service.ts](file://server/src/features/pricing/style-pricing.service.ts)（画风计价服务）
- [server/src/features/artist/workflow.service.ts](file://server/src/features/artist/workflow.service.ts)（画师工作流服务）
- [server/tests/migration-v38.test.js](file://server/tests/migration-v38.test.js)
- [server/tests/migration-v40.test.js](file://server/tests/migration-v40.test.js)
- [server/tests/migration-v41.test.js](file://server/tests/migration-v41.test.js)
- [server/tests/migration-v43.test.js](file://server/tests/migration-v43.test.js)
- [server/tests/migration-v45.test.js](file://server/tests/migration-v45.test.js)
</cite>

## 目录
1. [人话总览](#人话总览)
2. [迁移机制（MIGRATIONS 数组）](#迁移机制migrations-数组)
3. [29 张表总览](#29-张表总览)
4. [画师域](#画师域)
5. [订单域](#订单域)
6. [计价域](#计价域)
7. [工作流域](#工作流域)
8. [支付域](#支付域)
9. [内容域](#内容域)
10. [平台域](#平台域)
11. [埋点域](#埋点域)
12. [已删除表](#已删除表)
13. [关键迁移里程碑](#关键迁移里程碑)
14. [索引](#索引)
15. [常见问题与维护要点](#常见问题与维护要点)

## 人话总览

**一句话**：数据存在 SQLite 单文件里（`data/commission.db`），schema 常量一次性建出 **29 张表**（v44 迁移另建 `events` / `anon_tokens` 两张埋点表，启动后实际 31 张）。所有表结构由 `server/src/db/init.js` 的 `schema` 常量建出（`CREATE TABLE IF NOT EXISTS`），**表结构演进靠「版本化迁移」**——`MIGRATIONS` 数组里按版本号排列的迁移脚本，当前最新版本 **v45**。

**三大模型变化**（与旧文档完全不同的地方）：

1. **价格档位是「档位」模型，不是「画风×尺寸」模型**。`price_tiers` 就是一张简单的档位表（名称+价格+说明+示例图+工作日+排序）；真正的「画风×尺寸」多级定价在独立的 `art_styles` / `style_sizes` / `style_addons` / `size_addon_overrides` 四张表里（v36 多画风模型，REQ-023）。
2. **订单金额全部用「整数分」（cents）**，不是小数。`total_price_cents` / `final_price_cents` / `paid_total_cents` / `discount_amount_cents`（避免浮点误差）。
3. **附件上传模型**：`order_references` 存的是文件路径（`file_path / original_name / file_size / mime_type`），不是外部 URL；`deliverables` 是交付文件（`file_path / original_name / file_size`），没有 `title` 也没有 `file_url` 列。

**价格真相源**：订单最终总价 = `order_price_entries`（价格条目账本，v39，REQ-025）里所有条目的 `delta_cents` 之和；只追加、不删不改。

## 迁移机制（MIGRATIONS 数组）

`init.js` 的 `initDatabase()` 启动流程：

1. `exec(schema)`：建全部 29 张表（`IF NOT EXISTS`，幂等）。
2. 从 `schema_migrations` 表读出已应用的版本号集合。
3. 按 `version` 升序遍历 `MIGRATIONS` 数组，跳过已应用的，执行未应用的 `up(database)`。
4. 每次迁移前自动备份：文件数据库复制为 `data/commission.db.bak.v<N>`（`backupDbBeforeMigration`）。
5. 索引单独在迁移之后执行（`schemaIndexes`），避免老库升级时因列不存在而崩溃。

`schema_migrations` 表：`version`（主键）/ `name` / `applied_at`，记录每个已执行迁移。

**两条历史事故教训**（迁移脚本注释里明确标注，改迁移时必读）：

- **v38**（重建 artists 表补 `hidden` 状态）：SQLite 改 CHECK 约束只能重建表。重建时 DROP 父表会触发子表 `ON DELETE CASCADE` 清空全部子表数据——所以 v38 必须**事务外**执行，且先 `PRAGMA foreign_keys = OFF` 并**回读校验真的关了**才 DROP（2026-08-04 事故根因：PRAGMA foreign_keys 在事务内是 no-op）。
- **v43**（DROP 旧增项表）：同样必须事务外 + 关 FK + 回读校验；DROP 后跑 `foreign_key_check` 确认零悬空才恢复 FK。

## 29 张表总览（schema 常量建表）

| # | 表名 | 一句话职责 | 引入版本 |
|---|------|-----------|----------|
| 1 | `artists` | 画师账号与店铺配置（登录/展示/配额/模板） | 初始 |
| 2 | `price_tiers` | 价格档位（名称+价格+说明） | 初始 |
| 3 | `artworks` | 作品集（图片/标题/排序/点赞/封面） | 初始 |
| 4 | `commission_rules` | 约稿须知（每画师一条） | 初始 |
| 5 | `orders` | 订单主表（状态机/价格/队列/进度） | 初始 |
| 6 | `order_references` | 订单参考附件（客户/画师上传的文件） | 初始 |
| 7 | `order_notes` | 订单备注（文字+图片） | 初始 |
| 8 | `deliverables` | 交付文件 | 初始 |
| 9 | `order_extra_items` | 订单附加工作项（SPEC-003） | 初始 |
| 10 | `artist_workflow_stages` | 画师工作流节点（收款节点+话术模板） | v5 |
| 11 | `default_workflow_template` | 默认工作流模板 | v5 |
| 12 | `order_payment_installments` | 订单付款分期（含锁价列） | v5 / v40 |
| 13 | `order_payments` | 收款流水（额度池） | v24 |
| 14 | `greeting_templates` | 问候语模板（分时段） | v6 |
| 15 | `price_multipliers` | 价格倍率（用途/加急） | v9 |
| 16 | `order_price_breakdown` | 订单价格明细快照 | v9 |
| 17 | `platform_config` | 平台配置键值对 | 初始 |
| 18 | `schema_migrations` | 迁移版本跟踪 | 初始 |
| 19 | `guestbook_messages` | 留言板消息 | v22 |
| 20 | `discount_codes` | 折扣码 | v32 |
| 21 | `order_activity_logs` | 订单操作日志（永久保留） | v35 |
| 22 | `addon_templates` | 增项库模板（画师级） | v36 |
| 23 | `art_styles` | 画风（多画风模型） | v36 |
| 24 | `style_sizes` | 尺寸档位（挂在画风下，带图/描述/天数） | v36 / v37 |
| 25 | `artwork_size_tags` | 作品↔尺寸多对多标注 | v37 |
| 26 | `style_addons` | 画风增项（从增项库导入，可改价/禁用） | v36 |
| 27 | `size_addon_overrides` | 尺寸级增项覆盖 | v36 |
| 28 | `order_price_entries` | 订单价格条目账本（价格真相源） | v39 |
| 29 | `social_platforms` | 社交平台字典（外链展示） | v42 |

## 画师域

### artists —— 画师账号表

**一句话**：一个画师 = 一个账号 + 一个店铺（子域名）。

关键字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `qq_number` | TEXT UNIQUE | **QQ 号，登录凭证**（TOTP 登录用） |
| `name` | TEXT | 画师名称 |
| `subdomain` | TEXT UNIQUE | 店铺子域名 |
| `artist_code` | TEXT UNIQUE | 身份码 |
| `status` | TEXT CHECK | `open` / `full` / `break` / `hidden`（v38 补 hidden） |
| `token_version` | INTEGER | 会话失效版本（登出递增，旧 Cookie 全失效） |
| `totp_secret` | TEXT | TOTP 密钥（v41） |
| `totp_verified` | INTEGER | 是否已绑定（v41） |
| `totp_failed_attempts` | INTEGER | 连续错码计数（v41） |
| `totp_locked_until` | INTEGER | 锁定截止毫秒时间戳（v41） |
| `deleted_at` | DATETIME | 软删除时间（非空 = 已删/停用） |
| `monthly_quota` | INTEGER | 月接单配额（v23） |
| `batch_limit` / `buffer_limit` | INTEGER | 批次上限/缓冲池上限（v19 批次缓冲系统） |
| `template_id` / `palette_id` | TEXT | 前端页面模板 / 配色 |
| `discount_enabled` / `multi_style_enabled` | INTEGER | 折扣开关 / 多画风开关（v37，默认关） |
| `created_at` | DATETIME | 创建时间 |

### price_tiers —— 价格档位表

**一句话**：简单的档位（名称+价格+说明+示例图+工作天数），**不是**画风×尺寸矩阵。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `artist_id` | INTEGER FK | 画师（CASCADE） |
| `name` | TEXT | 档位名称（如「头像」「半身」「全身」） |
| `price` | REAL | 档位价格 |
| `description` | TEXT | 说明 |
| `example_image` | TEXT | 示例图路径 |
| `work_days` | INTEGER | 工作天数 |
| `sort_order` | INTEGER | 排序 |

### artworks —— 作品集表

**一句话**：画师店铺的作品展示（可设封面、可点赞）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `artist_id` | INTEGER FK | 画师（CASCADE） |
| `image_path` | TEXT | 作品图路径 |
| `title` | TEXT | 标题 |
| `sort_order` | INTEGER | 排序 |
| `like_count` | INTEGER | 点赞数（v21） |
| `is_cover` / `cover_order` | INTEGER | 是否封面 / 封面排序（v27/v31） |
| `description` | TEXT | 自由描述（v37 F6） |
| `created_at` | DATETIME | 创建时间 |

### commission_rules —— 约稿须知表

**一句话**：每个画师一份约稿须知（`artist_id` 唯一）。字段：`content`、`updated_at`。

## 订单域

### orders —— 订单主表

**一句话**：订单核心状态机 + 价格汇总 + 排队位置。**金额全部整数分**。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `order_no` | TEXT UNIQUE | 订单号 |
| `artist_id` | INTEGER FK | 画师（CASCADE） |
| `tier_id` | INTEGER FK | 价格档位（SET NULL） |
| `client_qq` / `client_name` | TEXT | 客户 QQ / 称呼 |
| `description` | TEXT | 约稿需求描述 |
| `priority` | TEXT CHECK | `high` / `medium` / `low` |
| `status` | TEXT CHECK | **状态机**：`pending`(待确认) / `confirmed`(进行中) / `wip`(制作中) / `revision`(修改) / `done`(完成) / `delivered`(已交付) / `cancelled`(已取消) |
| `source` | TEXT CHECK | `self`(客户自助下单) / `manual`(画师手动录单) |
| `queue_position` | INTEGER | 排队位置 |
| `queue_zone` | TEXT | 排队区（默认 `formal`） |
| `current_stage_id` | INTEGER | 当前工作流节点（v14） |
| `deadline` | DATETIME | 交付截止 |
| `start_date` | TEXT | 开工日期（v29） |
| `completed_at` | DATETIME | 完成时间 |
| `price_snapshot` | REAL | 价格快照（下单时档位价） |
| `total_price_cents` | INTEGER | 总价（分） |
| `final_price_cents` | INTEGER | 最终价（分，含倍率/附加项/折扣后） |
| `paid_total_cents` | INTEGER | 已收总额（分，v24 额度池） |
| `discount_amount_cents` | INTEGER | 折扣金额（分） |
| `usage_multiplier_id` / `rush_multiplier_id` | INTEGER | 用途倍率 / 加急倍率（v9） |
| `quote_snapshot` | TEXT | 报价快照 JSON（v11） |
| `focus_image_path` / `focus_image_mode` | TEXT | 焦点图（v11） |
| `discount_code_id` | INTEGER | 使用的折扣码（v32） |
| `created_at` / `updated_at` | DATETIME | 创建/更新时间 |

### order_references —— 订单参考附件表

**一句话**：客户/画师上传的参考文件（**附件模型**，不是外部链接）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `order_id` | INTEGER FK | 订单（CASCADE） |
| `file_path` | TEXT | 文件路径 |
| `original_name` | TEXT | 原始文件名 |
| `file_size` | INTEGER | 文件大小（字节） |
| `mime_type` | TEXT | MIME 类型 |
| `source` | TEXT | `client` / `artist`（谁传的） |

### order_notes —— 订单备注表

**一句话**：订单交流备注（文字 + 可选图片）。字段：`content`、`created_by`（默认 artist）、`image_path`、`created_at`。

### deliverables —— 交付文件表

**一句话**：画师交付给客户的成品文件。字段：`file_path`、`original_name`、`file_size`、`created_at`。**没有 `title`、没有 `file_url` 列**（旧文档错误）。

### order_extra_items —— 订单附加工作项表（SPEC-003）

**一句话**：订单级临时附加工作项。字段：`name`、`description`、`price_cents`（整数分）、`created_at`。

## 计价域

### price_multipliers —— 价格倍率表（v9）

**一句话**：两类倍率——`usage`(用途) 和 `rush`(加急)，对基础价乘系数。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `artist_id` | INTEGER FK | 画师（CASCADE） |
| `type` | TEXT CHECK | `usage` / `rush` |
| `name` | TEXT | 倍率名 |
| `multiplier` | REAL | 倍率系数 |
| `description` / `sort_order` / `enabled` | - | 说明/排序/开关 |

### order_price_breakdown —— 订单价格明细快照表（v9）

**一句话**：下单时算价结果的明细快照（档位/增项/用途倍率/加急倍率各占多少）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `order_id` | INTEGER FK | 订单（CASCADE） |
| `item_type` | TEXT CHECK | `tier`(档位) / `addon`(增项) / `usage`(用途) / `rush`(加急) |
| `item_name` | TEXT | 明细名 |
| `amount_cents` | INTEGER | 金额（分） |
| `multiplier` | REAL | 倍率 |
| `quantity` / `sort_order` | INTEGER | 数量/排序 |

### order_price_entries —— 订单价格条目账本表（v39，REQ-025）

**一句话**：**订单价格真相源**——订单总价 = 本表所有条目 `delta_cents` 之和。只追加、不删不改（服务层不提供 UPDATE/DELETE 路径）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `order_id` | INTEGER FK | 订单（CASCADE） |
| `type` | TEXT CHECK | `base` / `manual_adjust` / `extra_item` / `discount_item` / `refund_item` / `extra_charge_after_close` / `extra_refund_after_close` |
| `delta_cents` | INTEGER | 金额变动（分，正=加价 负=减价） |
| `name` / `note` | TEXT | 名称/备注 |
| `created_by` | TEXT | 操作者（默认 artist） |
| `created_at` | DATETIME | 创建时间 |

### addon_templates —— 增项库模板表（v36，替代 price_addons）

**一句话**：画师级增项库（如「加复杂背景」「加急」），可按画风导入。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `artist_id` | INTEGER FK | 画师（CASCADE） |
| `name` | TEXT | 增项名 |
| `control_type` | TEXT CHECK | `switch`(开关) / `quantity`(数量) / `radio`(单选) |
| `pricing_mode` | TEXT CHECK | `fixed`(固定价) / `per_unit`(按单位) / `per_option`(按选项) |
| `default_price` | REAL | 默认价 |
| `options` / `unit_label` / `sort_order` | - | 选项 JSON / 单位标签 / 排序 |

### art_styles / style_sizes / style_addons / size_addon_overrides —— 多画风定价模型（v36，REQ-023）

**一句话**：这才是旧文档想写的「画风×尺寸」模型——在独立 4 张表里实现。

- **art_styles（画风）**：`name` / `description` / `cover_image` / `sort_order` / `is_active`（挂在画师下）。
- **style_sizes（尺寸）**：挂在画风下（`art_style_id` FK），`name` / `base_price`（基础价）/ `image`（独立上传图）/ `image_artwork_id`（从作品集挑，删作品自动置空）/ `description` / `work_days`（v37 补图/描述/天数）。
- **style_addons（画风增项）**：`art_style_id` + `addon_template_id` 联合，从增项库导入；`is_enabled` / `price_override`（改价）/ `options_override`；`UNIQUE(art_style_id, addon_template_id)`。
- **size_addon_overrides（尺寸覆盖）**：某尺寸对某增项的价格覆盖/隐藏；`UNIQUE(style_size_id, style_addon_id)`。

### artwork_size_tags —— 作品↔尺寸多对多标注表（v37 F6）

**一句话**：作品集图片可以标注「适用于哪些尺寸档位」，双向 CASCADE 删除。复合主键 `(artwork_id, style_size_id)`。

## 工作流域

### artist_workflow_stages —— 画师工作流节点表（v5 + v20）

**一句话**：画师自定义的接单流程节点（需求确认→草稿→修改→交付），**收款节点 + 话术模板**模型。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `artist_id` | INTEGER FK | 画师（CASCADE） |
| `name` | TEXT | 节点名（如「需求确认」「草稿」） |
| `description` | TEXT | 说明 |
| `sort_order` | INTEGER | 排序 |
| `takes_payment` | INTEGER | 是否收款节点（该节点触发收款） |
| `basis_points` | INTEGER | 收款比例（万分之几） |
| `speech_template` | TEXT | 通知话术模板（默认 `{客户名}，你的订单已{节点名}。`） |
| `random_template` | INTEGER | 是否随机话术（v28） |

### default_workflow_template —— 默认工作流模板表（v5）

**一句话**：平台级默认流程模板（新画师可复制）。字段：`name` / `description` / `sort_order` / `takes_payment` / `basis_points`。**注意：该表不挂在画师下**（旧文档画了 `artist_id FK`，实际没有）。

## 支付域

### order_payment_installments —— 订单付款分期表（v5 + v40 锁价）

**一句话**：一笔订单分几个阶段收款（如定金/尾款）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `order_id` | INTEGER FK | 订单（CASCADE） |
| `label` | TEXT | 分期名 |
| `basis_points` | INTEGER | 占总价比例（万分之几） |
| `amount_cents` | INTEGER | 金额（分） |
| `paid_cents` | INTEGER | 已付（分，v33） |
| `status` | TEXT CHECK | `pending`(待付) / `paid`(已付) / `overdue`(逾期) |
| `sort_order` / `requested_at` / `paid_at` | - | 排序/发起时间/支付时间 |
| `locked` | INTEGER | 是否锁价（v40，REQ-025 节点完成/付清即锁，回退不解锁） |
| `locked_reason` | TEXT CHECK | `completed`(节点完成) / `paidOff`(已付清) / `prev`(前置) |

### order_payments —— 收款流水表（v24 额度池）

**一句话**：每一笔实际收款记录，累加形成 `orders.paid_total_cents`（额度池）。字段：`order_id`、`installment_id`（可选关联分期）、`amount_cents`、`note`、`created_at`、`created_by`（默认 artist）。

**旧文档的 `amount / method / paid_at` 字段不存在**——收款流水没有「支付方式」列（核对报告存疑项已对照 DDL 确认）。

## 内容域

### greeting_templates —— 问候语模板表（v6）

**一句话**：分时段自动问候语（早上/下午/晚上/夜间/任意）。字段：`artist_id`（可空）、`text`、`time_slot`（CHECK：morning/afternoon/evening/night/any）、`is_enabled`。

### guestbook_messages —— 留言板表（v22）

**一句话**：店铺留言板，需要审核。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `artist_id` | INTEGER FK | 画师（CASCADE） |
| `nickname` / `content` | TEXT | 昵称/内容 |
| `language` | TEXT | 语言（默认 zh-CN，v34） |
| `status` | TEXT CHECK | `pending`(待审) / `approved`(通过) / `rejected`(拒绝) |
| `artist_reply` / `replied_at` | - | 画师回复/时间 |
| `deleted_by_admin` | INTEGER | 管理员删除标记 |

### discount_codes —— 折扣码表（v32）

**一句话**：画师级折扣码。`UNIQUE(artist_id, code)`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `artist_id` | INTEGER FK | 画师（CASCADE） |
| `code` | TEXT | 折扣码 |
| `discount_type` | TEXT CHECK | `percent`(百分比) / `fixed`(固定金额) |
| `discount_value` | REAL | 折扣值 |
| `max_uses` / `used_count` | INTEGER | 上限/已用次数 |
| `expires_at` / `enabled` | - | 过期时间/开关 |

### social_platforms —— 社交平台字典表（v42，REQ-022 F2）

**一句话**：画师外链展示的平台字典（约 24 个平台种子：微博/Bilibili/小红书/LOFTER/Pixiv/X/抖音/快手/豆瓣/QQ空间/YouTube/Instagram/Twitch/ArtStation/米画师/TikTok/DeviantArt/站酷/爱发电/Weasyl/Threads/Tumblr/Behance/网易云音乐）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `name` | TEXT | 平台名 |
| `icon_key` | TEXT | simple-icons slug（无图标的为 NULL） |
| `fallback_char` | TEXT | 无图标平台的单字兜底（如 LOFTER→L、抖音→抖、米画师→米、QQ空间→空） |
| `match_domains` | TEXT | 匹配域名 JSON 数组 |
| `sort_order` / `enabled` | INTEGER | 排序/开关 |

## 平台域

### platform_config —— 平台配置表

**一句话**：全局键值对配置（如 `admin_qq` 管理员 QQ）。主键 `key`。

### schema_migrations —— 迁移版本表

**一句话**：记录已应用的迁移。字段：`version`（PK）/ `name` / `applied_at`。

### order_activity_logs —— 订单操作日志表（v35，永久保留）

**一句话**：订单全生命周期审计日志（状态变更/价格变更/附加项/收款/节点推进/备注更新）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `order_id` | INTEGER FK | 订单（CASCADE） |
| `action_type` | TEXT CHECK | `status_change` / `price_change` / `extra_item` / `payment` / `stage_advance` / `note_update` |
| `actor` | TEXT | 操作者（默认 artist） |
| `detail_json` | TEXT | 变更详情 JSON |
| `created_at` | DATETIME | 时间 |

## 埋点域

### events —— 业务事件表（v44，REQ-033）

**一句话**：业务埋点事件（页面访问/操作行为），画师/管理员统计看板数据源（TrackingAnalytics.vue）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `name` | TEXT | 事件名（如 `page_view`） |
| `ts` | INTEGER | 事件时间戳（毫秒） |
| `version` | INTEGER | 事件版本（默认 1，预留结构演进） |
| `artist_id` | INTEGER | 画师 id（可空，未登录/匿名事件为 NULL） |
| `anon_id` | INTEGER | 匿名凭证 id（未登录时关联 anon_tokens） |
| `payload_json` | TEXT | 事件载荷 JSON（默认 `{}`） |
| `created_at` | DATETIME | 创建时间 |

索引：`idx_events_name_ts ON events(name, ts)`（v44 建）、`idx_events_artist_ts ON events(artist_id, ts)`（v45 建，画师/管理员统计防全表扫描）。

### anon_tokens —— 匿名凭证表（v44，REQ-033）

**一句话**：未登录访客的匿名身份凭证，让匿名事件也能按「同一访客」聚合。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `token` | TEXT UNIQUE | 匿名凭证值 |
| `created_at` | DATETIME | 创建时间 |
| `last_seen_at` | DATETIME | 最近活跃时间 |

## 已删除表

历史上存在、当前 schema **已删除**（迁移里 DROP 掉了）：

| 表名 | 生命周期 | 删除原因 |
|------|----------|----------|
| `login_codes` | v13 建 → **v41 DROP** | 旧「登录码」机制废止（REQ-027 R7 一刀切）。初始 schema 里保留注释占位仅为维持迁移链完整 |
| `price_addons` | v9 建 → **v43 DROP** | 旧增项模型冻结（v36 被 addon_templates/style_addons 取代，零写路径、零订单引用，用户拍板 DROP） |
| `addon_tiers` | v9 建 → **v43 DROP** | 同上 |

## 关键迁移里程碑

| 版本 | 名称 | 做了什么 |
|------|------|----------|
| v5 | workflow_stages_and_default_template | 工作流节点 + 默认模板 + 付款分期 |
| v6 | greeting_templates | 问候语模板 |
| v9 | price_calculator | 价格计算器：倍率表 + 价格明细快照 + 旧增项表 |
| v19 | batch_buffer_system | 批次/缓冲池系统 |
| v20 | stage_speech_template | 节点话术模板 |
| v22 | guestbook_messages | 留言板 |
| v24 | quota_pool_paid_total | 收款额度池（paid_total_cents） |
| v32 | discount_codes | 折扣码 |
| v35 | order_activity_logs | 操作审计日志 |
| v36 | multi_style_model | **多画风模型**：5 张新表 + 老数据迁移（price_tiers→style_sizes、price_addons→addon_templates、addon_tiers→style_addons） |
| v37 | style_unify_sizes_artwork_tags_f5 | 尺寸补图/描述/天数、作品↔尺寸多对多、旧模型画师迁移 |
| v38 | artists_status_check_add_hidden | 重建 artists 表补 hidden 状态（**事务外**，2026-08-04 事故教训） |
| v39 | order_price_entries | **价格条目账本**（REQ-025 动态节点计价） |
| v40 | installments_locked_columns | 分期锁价列（REQ-025 节点锁价） |
| v41 | totp_login | **TOTP 登录**：artists 加 4 个 TOTP 列 + DROP login_codes（REQ-027） |
| v42 | social_platforms | 社交平台字典 + 24 平台种子（REQ-022 F2） |
| v43 | drop_addon_tables | DROP price_addons / addon_tiers（**事务外**，用户拍板） |
| v44 | tracking_events_anon_tokens | **业务埋点**（REQ-033）：events + anon_tokens 表 + idx_events_name_ts |
| v45 | tracking_events_artist_index | 埋点统计索引：events(artist_id, ts)（REQ-033 统计页防全表扫描） |

## 索引

`schemaIndexes` 在迁移之后执行（避免老库升级崩溃；埋点表两个索引在 v44/v45 迁移内创建，见埋点域）：

- 订单高频查询：`orders(artist_id, status)`、`orders(artist_id, queue_position)`、`orders(artist_id, deadline)`、`orders(artist_id, queue_zone)`、`orders(client_qq)`
- 子表外键：`order_references(order_id)`、`deliverables(order_id)`、`order_notes(order_id)`、`order_extra_items(order_id)`、`order_payments(order_id)`、`order_price_entries(order_id, created_at)`
- 画师/作品/留言：`artists(qq_number)`、`artworks(artist_id)`、`guestbook_messages(artist_id, status)`
- 多画风模型：`addon_templates(artist_id, sort_order)`、`art_styles(artist_id, sort_order)`、`style_sizes(art_style_id, sort_order)`、`style_addons(art_style_id)`、`size_addon_overrides(style_size_id)`、`artwork_size_tags(style_size_id)`
- 埋点表（v44/v45 迁移内建，不在 schemaIndexes）：`events(name, ts)`、`events(artist_id, ts)`

## 常见问题与维护要点

- **金额为什么不都是整数分？** 大部分金额列已用 `*_cents` 整数分；`price_tiers.price`、`price_snapshot`、`price_multipliers.multiplier` 等仍是 REAL（展示/系数用）。改价相关代码优先看 `order_price_entries`。
- **改表结构怎么做？** 新增迁移（version 46+）追加到 `MIGRATIONS` 数组，不要改历史迁移（已应用的库不会重跑）。加列用 `ALTER TABLE ADD COLUMN`（事务内安全）；改 CHECK / DROP 父表必须事务外 + 关 FK + 回读校验（对照 v38/v43 教训）。
- **价格对不上？** 先查 `order_price_entries`（真相源），再看 `order_price_breakdown`（下单快照）与 `order_payment_installments`（收款计划）。
- **迁移测试**：`migration-v38/v40/v41/v43/v45.test.js` 覆盖重建表、加列、DROP 表等边界场景，新增迁移应配套测试。
