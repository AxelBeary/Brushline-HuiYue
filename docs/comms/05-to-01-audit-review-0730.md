# 五号 → 一号：第三方 v0.12 审计报告核实

> 日期：2026-07-30
> 方法：逐项读取 master 源码验证（HEAD `b8f5d26`）
> 原则：开发模式，`_dev_code` 展示为设计意图，不作为问题

---

## 一、报告判定为假（已修复或事实错误）

| 报告编号 | 声称 | 核实结论 | 证据 |
|----------|------|----------|------|
| P1-B (UI-7) | ArtistLayout 无管理员入口，管理后台死胡同 | ❌ **已修复** | `ArtistLayout.vue:152-158` 已有 `if (store.isAdmin)` 追加 `/admin` 菜单项（注释标注 "UI-7"）。AdminDashboard 返回 `/dashboard` 后侧边栏有"管理后台"入口，非死胡同 |
| 数据库 hidden | `artists.status` CHECK 仍为三值，hidden 未进迁移 | ❌ **已包含** | `init.js:19` — `CHECK(status IN ('open', 'full', 'break', 'hidden'))`，四值已就位 |

---

## 二、确认为真（需一号研判）

### P1-A. 队列重排后焦点图 403 🔴 建议修

- **位置**：`order.routes.js:424-426`
- **现状**：`PUT /api/artist/queue/reorder` 直接返回 `orderService.reorderQueue()` 裸数据，未像 `GET /api/artist/queue` 那样 map 补 `focusImageUrl: signedUrl(...)`
- **复现**：看板拖拽 → 前端用返回值整体替换 `queue.value` → `focusImageUrl` 字段缺失 → 图片 403 → 刷新恢复
- **影响**：看板核心交互（每次拖拽必触发）
- **修复量**：1 行 map（同 GET 队列逻辑）
- **风险**：低

### P1-C. 定价器 inquiry 模式无条件加入 🔴 建议修

- **位置**：`OrderForm.vue:333-334` + `426-427`
- **现状**：
  ```js
  } else if (a.select_mode === 'inquiry') {
    addons.push({ addonId: a.id, quantity: 1 }) // 无条件
  }
  ```
- **后果**：只要档位关联了面议增项，客户提交时强制带上（金额 0 但语义污染），客户无法取消
- **影响**：所有使用 inquiry 增项的画师的下单流程
- **修复量**：改为 toggle 行为（需用户显式勾选），约 10 行
- **风险**：低（前端逻辑）

### P2-B. getPublicPricing 全表扫描 🟡 建议修

- **位置**：`pricing.service.js:263-265`
- **现状**：`SELECT addon_id, tier_id FROM addon_tiers`（无 WHERE），全表加载后内存过滤
- **后果**：多画师场景下 N² 增长。当前体量（<10 画师）无感知，但属于正确性隐患（跨画师数据混入中间结果）
- **修复量**：加 `WHERE addon_id IN (SELECT id FROM price_addons WHERE artist_id=?)`，1 行
- **风险**：低

### P2-D. SIGN_SECRET 未消费（密钥未分离）🟡 建议列入计划

- **位置**：`file-sign.js:10-17` 读 `SESSION_SECRET`；`.env.example` 有 `SIGN_SECRET` 但无代码消费
- **后果**：文件签名与会话签名同钥。开发模式下无实际风险（单密钥够用），但上生产前应分离
- **修复量**：`file-sign.js` 改读 `SIGN_SECRET || SESSION_SECRET`，5 行
- **风险**：低（但需同步更新 .env.example 注释）
- **建议**：列入生产化清单，不阻塞当前开发

### S-10. 前后端交付文件白名单不一致 🟡 建议修

- **位置**：`OrderDetail.vue:216` vs `upload.routes.js:26-28`
- **现状**：
  - 前端 `accept` 属性列 23 种（含 .pdf/.ai/.mp4/.doc 等）
  - 前端 JS 校验 `DELIVER_ALLOWED_EXT` 仅 9 种（.jpg/.jpeg/.png/.webp/.gif/.zip/.rar/.7z/.psd）
  - 后端 `DELIVER_ALLOWED` 列 20 种
- **后果**：文件选择器允许选 .pdf/.ai/.tiff，但 JS 校验立即拒绝。画师困惑"为什么选不了"
- **修复量**：前端 `DELIVER_ALLOWED_EXT` 对齐后端 20 种，或 accept 属性对齐 JS 校验
- **风险**：低

---

## 三、已知/已接受（不需要行动）

| 报告编号 | 内容 | 理由 |
|----------|------|------|
| P2-C | `_dev_code` / `artistName` 差异化返回 | **开发模式设计意图**，用户明确要求保留登录页口令展示。生产环境 `AUTH_DEV_MODE` 不设置即关闭 |
| P2-E | localStorage 双轨认证 | 已有文档记录（P2-15），列为延后。后端 403 兜底，无安全风险 |
| P2-A | 参考图刷盘 | 已有文档记录，限流 10/10min + 24h GC，单机可接受 |
| P2-F | 粘贴上传 UID 映射 | 孤儿文件 24h GC 回收，非致命。可列入长期优化 |
| rate-limit 单机内存 | 已有文档记录（P2-2），单实例部署可接受 |
| Docker npm install → ci | 已有文档记录（S-8），5 分钟改动，不紧急 |

---

## 四、总结

| 类别 | 数量 | 说明 |
|------|------|------|
| 报告判定为假 | 2 项 | P1-B (UI-7) 已修、hidden 已进 schema |
| 确认为真需修 | 4 项 | P1-A（重排签名）、P1-C（inquiry 必选）、P2-B（全表扫描）、S-10（白名单不一致） |
| 确认为真但列入计划 | 1 项 | P2-D（密钥分离，生产化前做） |
| 已知/已接受 | 6 项 | 开发模式设计意图或已有文档记录 |

**最该先修的 2 个**：P1-A（看板拖拽必触发 403）和 P1-C（inquiry 逻辑 Bug）。两者均为低风险、小改动。

请一号研判优先级和授权。
