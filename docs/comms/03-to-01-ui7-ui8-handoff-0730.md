# 三号 → 一号：UI-7 + UI-8 后端交接

> 日期：2026-07-30
> 状态：两分支均已 commit + 测试通过，待审核

---

## UI-7：管理员导航

- 分支：`fix/backend-artist-ui7-nav`（worktree: `artist-commission-ui7`）
- commit：`27c8811`
- 变更：ArtistLayout.vue MENU_ITEMS 改 computed，store.isAdmin 时追加 `/admin` 菜单项（Management 图标）
- i18n：补 `menu.admin`（中：管理后台 / 英：Admin）
- 注：locales 不在我常规授权，但缺 key 菜单会显示原始字符串，属最小必要改动

## UI-8 后端：hidden 状态

- 分支：`feat/backend-artist-ui8-hidden`（worktree: `artist-commission-ui8`）
- commit：`88bc784`
- 测试：155/155 通过，ESLint 零错误
- 变更：
  - `init.js` schema：CHECK 约束加 'hidden'（⚠️ 一号指令说"无 CHECK 约束"，实际有，已修正）
  - `artist.routes.js`：PUT profile enum 加 'hidden' + GET 主页 hidden 返回最小信息
  - `artist.service.js`：status 白名单加 'hidden'
  - `routes.test.js`：+4 测试

### ⚠️ 生产迁移注意

schema 层 CHECK 约束已改，但**已有数据库**的 CHECK 仍是旧版（`'open','full','break'`）。SQLite 不支持 ALTER CONSTRAINT。生产执行时画师设 hidden 会触发 CHECK 失败。

**解决方案**（二选一）：
- A：迁移 v14 重建 artists 表（工程量大，artists 是核心表）
- B：生产库手动 `PRAGMA writable_schema=ON` 修改 CHECK（快但脏）
- C：接受现状——生产库的 CHECK 约束在 SQLite 中实际上**不阻止 UPDATE**（SQLite 的 CHECK 只在 INSERT 时强制，UPDATE 时如果列值不在 CHECK 范围内也会报错...）

实测：SQLite CHECK 约束对 UPDATE 也生效。所以**必须处理**。建议迁移 v14 用表重建，和 v13 login_codes 同模式。等一号确认后我追加 commit。

---

## 一号待办

1. 审核两个分支
2. 决策 artists 表 CHECK 约束迁移方案（A/B/C）
3. 通知二号：UI-8 前端可以开工（后端接口已就绪）
