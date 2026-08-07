# 四号转交一号，文件：docs/comms/02-to-01-repowiki重写-交付.md

> 派工：`docs/comms/01-to-04-repowiki重写批.md`（repowiki 待重写原文批 C）
> 执行：四号（文档）· worktree：`artist-commission-w19` · 分支：`docs/wiki-rewrite`
> 完成时间：2026-08-07 · 状态：✅ 已按施工图完成，未推送、未合并、未改 STATUS

## 一、交付物清单

| # | 文件 | 动作 | 状态 |
|---|------|------|------|
| 1 | `docs/external-wiki/wiki-认证接口-待重写.md` → `docs/external-wiki/wiki-认证接口.md` | git mv 去后缀 + 整篇重写 | ✅ |
| 2 | `docs/external-wiki/wiki-数据库模式设计-待重写.md` → `docs/external-wiki/wiki-数据库模式设计.md` | git mv 去后缀 + 整篇重写 | ✅ |
| 3 | `docs/external-wiki/README.md` | 同步（文件清单 + 处置状态） | ✅ |
| 4 | `docs/comms/02-to-01-repowiki重写-交付.md` | 本报告 | ✅ |

commit：`docs(wiki): 重写认证接口+数据库模式设计(消除核对报告过时点),去待重写后缀`

## 二、过时点逐条处置（对照核对报告 + master 代码）

### 认证接口（核对报告 🔴 1-3、🟡 1、⚪ 5-6）

| # | 过时点 | 当前代码依据 | 处置 |
|---|--------|--------------|------|
| 🔴1 | 旧文档称「用户名/密码 POST /api/auth/login → JWT + mfaRequired」 | `auth.routes.ts`：唯一登录端点是 `POST /api/auth/verify`（`{qqNumber, code}`，同 IP 10 次/5 分钟）；`/api/auth/login` 不存在 | 已重写为「QQ 号 + TOTP 动态口令登录」，附录明示不存在的端点 |
| 🔴2 | 旧文档称客户端可调 `/api/auth/totp/bind`、`/api/auth/totp/verify` | 认证路由只有 verify/me/logout 3 个端点；TOTP 绑定/确认/重置在 `admin.routes.ts`（bind-init/bind-confirm/reset，requireAdmin） | 已重写为「管理员路由」章节 |
| 🔴3 | 旧文档称 JWT Bearer + 刷新令牌 + 登出黑名单 | `auth.service.ts` + `middleware/auth.ts`：会话 = httpOnly cookie `artist_token`（7 天/lax/生产 secure），Bearer 仅兜底；登出 = 递增 `token_version`；错误码 NOT_LOGGED_IN/SESSION_EXPIRED/TOKEN_REVOKED 等 | 已重写「会话机制（Cookie，不是 JWT）」章节 |
| 🟡1 | file:// 引用 `app.js`/`index.js`（已改 app.ts/index.ts） | JS→TS 渐进迁移已完成 | 引用改为 `app.ts` |
| ⚪5 | 未描述 TOTP 失败锁定 | `auth.service.ts`：`TOTP_MAX_ATTEMPTS=5`、锁定 15 分钟、`detail.remainingLockMs` | 已补「防爆破与失败锁定」章节 |
| ⚪6 | 未描述 `/api/auth/me` 含 isAdmin | `auth.routes.ts` me 端点 | 已补 |

### 数据库模式设计（核对报告 🔴 4-7、🟡 5、⚪ 2、存疑项）

| # | 过时点 | 当前代码依据 | 处置 |
|---|--------|--------------|------|
| 🔴4 | 旧文档称 price_tiers 为 `style_name/size_name/start_date/end_date/visible` | `init.js:72` 实际 DDL：`name/price/description/example_image/work_days/sort_order`（档位模型）；画风×尺寸在独立 4 表 | 已按实际 DDL 重写 |
| 🔴5 | 旧文档称 orders 含 `base_price/final_price`（decimal） | `init.js:109` 实际 25 列：`total_price_cents/final_price_cents/paid_total_cents/discount_amount_cents`（整数分）+ `price_snapshot/quote_snapshot/queue_zone/queue_position/current_stage_id/source/deadline/start_date/completed_at` + status CHECK 状态机（7 态） | 已按实际 DDL 重写 |
| 🔴6 | 旧文档称 order_references 为 `url`、deliverables 为 `title/file_url` | 实际为附件模型：`file_path/original_name/file_size/mime_type/source('client'|'artist')`；deliverables = `file_path/original_name/file_size`，无 title/file_url | 已按实际 DDL 重写，明确标注「无 title、无 file_url 列」 |
| 🔴7 | 旧文档称 artist_workflow_stages 为 `stage_name/sort_order/is_default` | `init.js:192` 实际 DDL：`name/description/sort_order/takes_payment/basis_points/speech_template/random_template`（收款节点+话术模板） | 已按实际 DDL 重写 |
| 🟡5 | 未说明当前最高迁移版本 | MIGRATIONS 数组 v1..v43，最新 v43（drop_addon_tables） | 人话总览 + 迁移机制 + 里程碑表醒目标注 v43 |
| ⚪2 | 缺失 11 张表 | artworks/commission_rules/order_notes/greeting_templates/order_price_breakdown/login_codes(已删)/artwork_size_tags/style_addons/size_addon_overrides/order_price_entries/social_platforms | 全部补入 29 张表总览 + 分域详解；login_codes 归入「已删除表」 |
| 存疑 | order_payments 的 amount/method/paid_at 未逐列比对 | 实际 DDL：`installment_id/amount_cents/note/created_at/created_by`，无 method/paid_at | 已对照 DDL 确认并明确标注「amount/method/paid_at 字段不存在」 |

## 三、写作说明

- 面向非程序员：人话总览 + 表格 + 术语解释（如「TOTP 动态口令 = 验证器 App 里每 30 秒变的 6 位数字」）
- 认证篇新增章节：AUTH_DEV_MODE 语义、管理员 bootstrap/transfer、`npm run totp:rebind` CLI 自救、错误码表、客户端对接要点、端点速查附录
- 数据库篇按业务域组织（画师/订单/计价/工作流/支付/内容/平台），每张表一句话职责 + 关键字段表
- 特别标注两处旧文档张冠李戴的纠正：default_workflow_template **无 artist_id 外键**；order_payments 无支付方式列
- 匿名凭证：代码搜索确认不存在（未写入文档，避免编造）

## 四、验证门禁

```powershell
# 已在 w19 执行：
git status --short
# 结果：README.md M + 两文件 RM（rename+modify，git mv 保留历史）
# 断言（全部通过）：
# ① 两「待重写」文件已无后缀且内容重写 ✓
# ② 核对报告点名过时点逐条消除（见上表，对照代码核实 >5 处）✓
# ③ README 引用同步 ✓
```

## 五、待一号注意

- 本批为纯文档任务，无源码改动、无测试影响
- README 中 P2 待办（其余 112 篇抽样检查认证系文档）仍挂起，建议后续派工
- 核对报告存疑项「auth.service.test.js 是否存在」已确认**存在**（server/tests/auth.service.test.js），原 wiki 引用有效
