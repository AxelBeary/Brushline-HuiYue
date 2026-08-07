# repowiki 外部知识库归档

> 归档日期：2026-08-06 · 归档人：一号
> 来源：A 测用户贡献的整套项目 wiki（`C:\Users\qly19\Desktop\repowiki\`，约 118 篇，原目录保留不删除）

## 为什么归档

A 测用户为本项目编写了整套 wiki（架构/API/数据库/前端/后端/故障排查），是**外部贡献**。已抽样核对 6 篇核心文档（报告见 `repowiki-核对报告-20260806.md`）：

- 🟢 4 篇正确（订单管理接口 35 端点仅缺 1 个、样式系统/错误处理/技术栈）
- 🔴 2 篇严重过时（**认证接口**——仍写旧用户名密码+JWT，实际是 TOTP+httpOnly cookie；**数据库模式设计**——price_tiers/orders 等核心表字段全错）

## 归档内容

| 文件 | 说明 |
|------|------|
| `repowiki-核对报告-20260806.md` | 6 篇核对结论 + 🔴7 项/🟡5 项/⚪6 项清单 + 建议 |
| `wiki-认证接口.md` | 已按 master 重写（2026-08-07，四号）：TOTP 动态口令登录 + httpOnly Cookie 会话 + 管理员绑定路由 |
| `wiki-数据库模式设计.md` | 已按 master 重写（2026-08-07，四号）：29 张表实际 DDL + 迁移 v1..v45 |
| `wiki-快速开始指南.md` | 已按 master 重写（2026-08-07，四号）：入口修正 index.ts / 种子命令 seed.ts / 删除 SIGN_SECRET 虚构项 / compose 端口现状 |
| `wiki-生产部署.md` | 已按 master 重写（2026-08-07，四号）：SIGN_SECRET→SESSION_SECRET / 端口映射现状与生产切换步骤 / Caddyfile 单主域（无泛解析） |
| `wiki-环境配置管理.md` | 已按 master 重写（2026-08-07，四号）：纯 SQLite（无 PG/MySQL）/ 虚构变量对照表 / SENTRY_DSN_BACKEND 命名 |
| `repowiki-重写批交付.md` | 重写批交付报告（`docs/comms/02-to-01-repowiki重写-交付.md`，2026-08-07） |

> 注：原「待重写」文件已 `git mv` 去掉后缀并整体重写，保留历史。

## 处置建议

1. **不直接改 wiki 原文**——外部产物，改它不如在仓库内维护正确版本（已按此原则在仓库内重写正确版本）
2. **P0 已完成**：「认证接口」「数据库模式设计」及 P0 批「快速开始指南」「生产部署」「环境配置管理」共 5 篇已按当前 master 重写（TOTP 登录 / cookie 会话 / 29 张表实际 DDL / index.ts+seed.ts 入口 / 删虚构变量 / 纯 SQLite），交付报告见 `docs/comms/02-to-01-repowiki重写-交付.md` 与 `docs/comms/04-to-01-repowiki-P0重写-交付-20260807.md`
3. **P2 待办**：外部 13 处 🟡 已汇总成表（认证 6 + 非认证 7），路线（A 转贡献者 / B 仓库内维护）待一号拍板——见 `docs/comms/04-to-01-repowiki-P0重写-交付-20260807.md` 第三节
4. 若用户贡献者愿意，可把核对报告反馈给 ta 供修订
