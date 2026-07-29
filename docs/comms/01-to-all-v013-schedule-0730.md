# 一号 → 全员：v0.13 正式排期

> 日期：2026-07-30
> 状态：已获实际操作人确认，开工

---

## 决策记录

| # | 决策 | 结论 |
|---|------|------|
| C43 | 电脑端左滑等效 | 不做，桌面点击即可 |
| C44 | 流程状态机排 v0.13 | 是，后期（方案先行） |
| C45 | 滑块确认范围 | 先只做取消 |
| C48 | P1-5 子域名 | **方案 B：放弃子域名，统一路径**。Caddyfile 删泛域名配置，文档统一。未来需要时 Caddy rewrite 转发，不做进应用层 |
| C49 | CSRF 方案 | SameSite=Lax 先行（一行改动），嵌入功能（R36）时再补 token |
| CVE | Docker 镜像 56 个 CVE | Dockerfile 加 `RUN npm install -g npm@latest`（v0.13 顺手），Debian OS 层接受风险 |

---

## v0.13 排期

### 第一批（并行，小快灵）

| 任务 | 指派 | 分支 | 工程量 |
|------|------|------|--------|
| R34 三模板外链补齐 | 二号 | `feat/client-frontend-r34-links` | 小 |
| R35 迁移 v13（login_codes 重建） | 三号 | `feat/backend-artist-v013` | 小 |
| CVE 修复（Dockerfile npm 升级） | 三号 | 同上 | 极小 |
| P1-5 关闭（Caddyfile 删泛域名 + 文档统一） | 三号 | 同上 | 小 |
| R33 签名刷新（后端接口） | 三号 | 同上 | 中 |

### 第二批（第一批完成后）

| 任务 | 指派 | 依赖 |
|------|------|------|
| R33 签名刷新（前端接入） | 二号 | 三号后端接口就绪 |
| R30a/b/c/e 看板增强 | 二号 | 无 |
| R37 SRI/CSRF（SameSite=Lax + Vite SRI） | 三号 | 无 |

### 第三批（方案先行）

| 任务 | 指派 | 前置 |
|------|------|------|
| R30d 流程状态机 | 三号出方案 → 用户确认 → 三号+二号实施 | 技术方案文档 |

### 延 v0.14

| 任务 | 原因 |
|------|------|
| R36 嵌入白名单 | P1-5 已定方案 B，R36 不再阻塞，但工程量中等，v0.13 排不下 |

---

## 授权

- **二号**：`web/src/views/client/templates/**`、`web/src/composables/useArtistData.js`、`web/src/views/artist/QueueBoard.vue`、`web/src/views/artist/OrderDetail.vue`（签名刷新前端）、`web/src/locales/**`（一号协调）
- **三号**：`server/src/**`、`server/tests/**`、`Dockerfile`、`Caddyfile`、`docker-compose.yml`、`docs/开发自参考.md`（P1-5 文档统一）
- **五号**：待命，v0.13 合入后回归

---

## 开工指令

- **二号**：先做 R34（三模板加 socialLinks，参考 Classic 实现），完成后接 R30a/b/c/e 看板增强。等三号 R33 接口就绪后接签名刷新前端。
- **三号**：R35 迁移 + CVE Dockerfile + P1-5 关闭（Caddyfile/文档）打包一个分支。然后 R33 签名刷新后端（方案 A：批量刷新接口 `POST /api/artist/refresh-signatures`，传文件路径数组，返回新签名 URL 数组，requireAuth + 限流）。最后 R37。
- **四号**：待命。R30d 技术方案出来后审核需求完整性。

---

## comms 纪律

老规矩：代码进 git、交接写文件、不经过操作人转达。
