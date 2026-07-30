# v0.19 画师主页需求草案

> **编号**：plan-v019-artist-homepage-draft
> **作者**：四号（需求整理）
> **日期**：2026-08-01
> **状态**：用户已确认方向（Q1~Q5 全部拍板），待一号审核排期
> **关联**：plan-v018-schedule §4（v0.19 预备案）/ REQ-005 R23 / REQ-006 R29 / REQ-011 §7 / SPEC-004 §3
> **用户交流记录**：2026-08-01，四号与用户三轮交流，全部决策已拍板

---

## 0. 已拍板决策汇总

| # | 问题 | 结论 | 确认日期 |
|---|------|------|----------|
| Q1 | "看板 UI"含义 | ✅ **A 轻量**：就是 slotDisplay 补全（"开放中 · 剩 X 席"），归入 SPEC-004 前端收尾（二号补 3 个模板），**从 v0.19 清单划掉** | 2026-08-01 |
| Q2 | 点赞交互细节 | ✅ 按建议全部通过：任何人可赞（匿名）/ 可取消 / 心形+计数 / 同浏览器去重（localStorage） | 2026-08-01 |
| Q3 | C36 瀑布流方案 | ✅ **A 瀑布流（masonry）**，复用 folio 已有实现，4 模板统一 | 2026-08-01 |
| Q4 | C42 公告位置 | ✅ **C 二号按模板风格定**，约束：必须首屏可见，不能滚动才看到 | 2026-08-01 |
| Q5 | 新增需求 | ✅ **留言板**（画师审核 + 管理员兜底），详见 §5 | 2026-08-01 |

---

## 1. 点赞功能（F1）

### 1.1 来源

REQ-011 §7（H5 设计原型分析），用户原声：
> "那个点赞功能我也是超级想要"

### 1.2 交互规则（用户已拍板）

| 项 | 结论 |
|----|------|
| 谁能点赞 | 任何人（匿名），不需要登录 |
| 能否取消 | 可以，再点一下取消（符合直觉） |
| 显示内容 | 心形图标 + 计数（如 ♥ 42） |
| 防刷 | 同浏览器一次（localStorage 记录已赞作品 ID），不做账号级去重 |
| 动画 | 点击变色+填充，带微动画（参考温暖画室风 H5） |

### 1.3 验收标准

1. 当客户在画师主页点击作品的心形图标时，心形应该变色+填充（微动画），计数 +1
2. 当客户再次点击已赞的心形时，应该取消点赞，计数 -1
3. 当客户刷新页面后，之前赞过的作品心形应该保持已赞状态（localStorage）
4. 当客户换一个浏览器访问时，之前赞过的作品显示为未赞（同浏览器去重，跨浏览器不去重）
5. 当作品有 N 个赞时，心形旁应该显示计数 N
6. 当作品无赞时，计数显示 0 或不显示数字（由二号定）

### 1.4 数据模型（建议，待三号确认）

```sql
-- 方案 A：计数字段（简单，v1 够用）
ALTER TABLE artworks ADD COLUMN like_count INTEGER DEFAULT 0;

-- 方案 B：独立表（可扩展，如未来需要"谁赞了"）
CREATE TABLE artwork_likes (
  id INTEGER PRIMARY KEY,
  artwork_id INTEGER NOT NULL REFERENCES artworks(id),
  visitor_fp TEXT NOT NULL,  -- 浏览器指纹/localStorage ID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(artwork_id, visitor_fp)
);
```

建议 v1 用方案 A（计数字段）+ 前端 localStorage 控制状态。后端只需 `POST /api/public/artworks/:id/like`（+1）和 `DELETE`（-1），不存访客身份。

### 1.5 粗估工时

| 层 | 工作 | 时间 |
|----|------|------|
| 后端 | like_count 字段 + 迁移 + like/unlike API | 1h |
| 前端 | ArtworkLikeButton.vue（心形动画 + localStorage + 计数） | 2h |
| 前端 | 嵌入 TplGallery 作品卡片 | 0.5h |
| 测试 | API + 前端交互 | 0.5h |
| **小计** | | **4h** |

---

## 2. 瀑布流（F2）

### 2.1 来源

REQ-005 R23（客户侧体验反馈），C36 用户已拍板（2026-08-01）：瀑布流（masonry）。

### 2.2 现状

- folio 模板已有 masonry 实现（`TplGallery :layout="masonry"`）
- classic/gallery/atelier 仍用等高网格，`fit="cover"` 裁切
- 改 TplGallery.vue 共享组件，默认 layout 改为 masonry，4 模板统一生效

### 2.3 验收标准

1. 当画师上传竖图（如 1:2 立绘）时，4 个模板的作品展示都应该保留竖图形态，不裁成正方形
2. 当画师上传横幅/长条图时，应该保留横幅形态，关键内容不被裁掉
3. 当多种比例的作品混排时，瀑布流排列应该整齐不凌乱
4. 当客户点击作品时，仍然能全屏预览原图（与 UI-6 联动）
5. 当 4 个模板切换时，作品展示区都应该是瀑布流布局

### 2.4 粗估工时

| 层 | 工作 | 时间 |
|----|------|------|
| 前端 | TplGallery 默认 masonry + 回归 4 模板 | 1.5h |
| 测试 | 4 模板 × 多种图片比例 | 0.5h |
| **小计** | | **2h** |

---

## 3. 小公告（F3）

### 3.1 来源

REQ-006 R29（画师侧反馈），C41 已拍板（2026-07-30），C42 已拍板（2026-08-01）。

### 3.2 规则

| 项 | 结论 |
|----|------|
| 内容 | 一条短文字（一两句话的便签），不是文章系统 |
| 模式 | 顶掉模式（永远一条公告，新的覆盖旧的） |
| 过期 | 默认永不过期 + 可选过期时间（`announcement_expires_at`） |
| 位置 | 二号按每个模板风格定，约束：必须首屏可见 |
| 视觉 | 📢 图标 + 底色区分，有"公告感" |

### 3.3 验收标准

1. 当画师在后台编辑公告（一两句话）时，应该能保存并即时生效
2. 当画师设置了公告时，客户访问主页应该在首屏醒目位置看到公告内容
3. 当画师清空/关闭公告时，客户主页不应该再显示
4. 当公告存在时，应该有视觉上的"公告感"（📢 图标 + 底色区分），不混入普通页面文字
5. 当画师设置了可选过期时间且已过期时，客户主页不应该再显示（自动消失）
6. 当 4 个模板分别展示公告时，位置应该符合各自模板风格（由二号定），且都在首屏

### 3.4 数据模型

```sql
ALTER TABLE artists ADD COLUMN announcement TEXT DEFAULT NULL;
ALTER TABLE artists ADD COLUMN announcement_expires_at DATETIME DEFAULT NULL;
```

### 3.5 粗估工时

| 层 | 工作 | 时间 |
|----|------|------|
| 后端 | 字段 + 迁移 + 设置 API 扩展 + 公开 API 返回（含过期判断） | 1h |
| 前端 | 画师设置页编辑入口 + TplAnnouncement.vue + 4 模板适配 | 1.5h |
| 测试 | 过期逻辑 + 4 模板渲染 | 0.5h |
| **小计** | | **3h** |

---

## 4. 看板 UI → 已归入 SPEC-004 收尾（不在 v0.19）

用户确认（2026-08-01）：看板 UI = slotDisplay 补全（A 轻量方案）。

**现状**：后端 `computeSlotDisplay` 已完成，classic 模板已渲染。gallery/folio/atelier 3 个模板缺 slotDisplay 渲染。

**处理**：归入 SPEC-004 前端收尾（二号，~0.5h），不单独排 v0.19。

---

## 5. 留言板（F4，新增）

### 5.1 来源

用户新需求（2026-08-01 交流中提出）：
> "要不要加一个可以后台审核的留言板？"

### 5.2 核心规则（用户已拍板）

| 项 | 结论 |
|----|------|
| 谁能留言 | 任何人，填个昵称即可，不需要登录/下单 |
| 审核模式 | 先审后显（默认隐藏，画师批准才显示） |
| 审核人 | **画师审**（画师的主页画师做主）+ 管理员兜底（强制删除违规内容） |
| 内容 | 纯文字，200 字以内 |
| 画师回复 | 可以回复（画师回复也显示在留言下方） |
| 显示位置 | 画师主页底部"留言墙"区域 |
| 显示数量 | 主页显示最近 N 条已审核留言（N 做出来再定，建议 10~20） |

### 5.3 验收标准

1. 当客户在画师主页底部填写昵称 + 留言内容并提交时，应该提示"留言已提交，等待画师审核"
2. 当留言未审核时（pending），客户主页不应该显示该留言
3. 当画师在后台点击"通过"时，该留言应该立即显示在客户主页留言墙
4. 当画师在后台点击"拒绝"时，该留言不应该显示（静默处理，不通知留言者）
5. 当画师回复某条留言时，回复应该显示在该留言下方（带"画师"标识）
6. 当留言超过 200 字时，应该拦截提交并提示字数限制
7. 当管理员在后台强制删除某条留言时，该留言应该立即从客户主页消失
8. 当无已审核留言时，留言墙区域应该显示空状态（如"还没有留言，来说点什么吧 💬"）
9. 当客户不填昵称时，应该拦截提交（昵称为必填）

### 5.4 数据模型（建议，待三号确认）

```sql
CREATE TABLE guestbook_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id INTEGER NOT NULL REFERENCES artists(id),
  nickname TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  artist_reply TEXT DEFAULT NULL,
  replied_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_by_admin INTEGER DEFAULT 0  -- 管理员强制删除标记
);
CREATE INDEX idx_guestbook_artist ON guestbook_messages(artist_id, status);
```

### 5.5 API 设计（建议，待三号确认）

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | /api/public/artist/:subdomain/messages | 公开（限流） | 客户提交留言 |
| GET | /api/public/artist/:subdomain/messages | 公开 | 获取已审核留言（分页，最近 N 条） |
| GET | /api/artist/messages | requireAuth | 画师获取所有留言（含 pending） |
| PUT | /api/artist/messages/:id/approve | requireAuth + requireOwn | 画师通过 |
| PUT | /api/artist/messages/:id/reject | requireAuth + requireOwn | 画师拒绝 |
| PUT | /api/artist/messages/:id/reply | requireAuth + requireOwn | 画师回复 |
| DELETE | /api/admin/messages/:id | requireAdmin | 管理员强制删除 |

### 5.6 粗估工时

| 层 | 工作 | 时间 |
|----|------|------|
| 后端 | 建表 + 迁移 + 7 个 API + 限流 | 3h |
| 前端（客户端） | 留言墙组件 + 提交表单 + 4 模板适配 | 2h |
| 前端（画师端） | 留言审核列表 + 通过/拒绝/回复操作 | 2h |
| 前端（管理端） | 管理员留言管理（查看/强制删除） | 1h |
| 测试 | API + 审核流程 + 限流 | 1h |
| **小计** | | **9h** |

---

## 6. 功能清单总览

| # | 功能 | 工时 | 优先级 | 状态 |
|---|------|------|--------|------|
| F1 | 点赞 | 4h | P2 | 用户已拍板交互细节 |
| F2 | 瀑布流 | 2h | P1 | C36 已拍板 |
| F3 | 小公告 | 3h | P1 | C41/C42 已拍板 |
| F4 | 留言板 | 9h | P2 | 用户已拍板核心规则 |
| ~~F5~~ | ~~看板 UI~~ | ~~0.5h~~ | — | 归入 SPEC-004 前端收尾，不在 v0.19 |
| **合计** | | **~18h** | | |

> 注：粗估仅供排期参考，实际工时以三号/二号评估为准。

---

## 7. 与现有客户主页的关系

### 7.1 现有架构

```
ArtistHome.vue（路由容器，根据 template_id 动态加载）
├── ArtistHomeClassic.vue    ← classic 布局
├── ArtistHomeGallery.vue    ← gallery 布局
├── ArtistHomeFolio.vue      ← folio 布局（已有 masonry）
└── ArtistHomeAtelier.vue    ← atelier 布局

共享层：
├── composables/useArtistProfile.js  ← 数据获取
├── TplGallery.vue                   ← 作品展示组件（4 模板共用）
├── TplTiers.vue                     ← 档位展示
├── TplRules.vue                     ← 约稿须知
└── WorkflowOverviewStrip.vue        ← 流程预览条
```

### 7.2 新增共享组件

| 组件 | 用途 | 嵌入方式 |
|------|------|----------|
| ArtworkLikeButton.vue | 点赞心形按钮 | 嵌入 TplGallery 作品卡片内 |
| TplAnnouncement.vue | 公告便签 | 4 模板各自决定插入位置（首屏约束） |
| TplGuestbook.vue | 留言墙 | 4 模板底部统一引入 |

**结论**：全部走共享组件路线，不需要独立页面。与现有模板系统（布局 × 配色）完全兼容。

---

## 8. 待三号/二号确认

| # | 问题 | 需谁确认 |
|---|------|----------|
| T1 | 点赞数据模型：计数字段（方案 A）还是独立表（方案 B）？ | 三号 |
| T2 | 留言板限流策略（同 IP 每分钟 N 条？） | 三号 |
| T3 | 公告在 4 个模板的具体位置 | 二号 |
| T4 | 留言墙主页显示条数（建议 10~20） | 做出来再定 |
| T5 | 点赞计数为 0 时是否显示数字 | 二号 |

---

## 9. 下一步

1. 一号审核本草案，确认是否可进入 v0.19 正式排期
2. 三号确认 T1/T2（数据模型 + 限流），评估实际工时
3. 二号确认 T3/T5（公告位置 + 点赞显示），评估实际工时
4. 四号根据三号/二号反馈整理正式 spec（如需要）
