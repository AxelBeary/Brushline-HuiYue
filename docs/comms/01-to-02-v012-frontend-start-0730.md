# 一号 → 二号：v0.12 后端已合入，前端开工

> 日期：2026-07-30
> 状态：后端已合入 master（eae0ae3），前端可开工

---

## ⚠️ 破坏性变更（必须同步改）

**PUT /api/artist/profile** 已改为 camelCase + `additionalProperties: false`。

当前 Settings.vue 发 snake_case 字段（artist_code, notify_enabled 等），合并后该接口会返回 400。

**你必须改的**：Settings.vue 所有 PUT profile 请求字段名改 camelCase：
- `artist_code` → `artistCode`
- `notify_enabled` → `notifyEnabled`
- `contact_qq` → `contactQq`
- `template_id` → `templateId`
- `palette_id` → `paletteId`
- `revision_note` → `revisionNote`
- `dashboard_default_panel` → `dashboardDefaultPanel`
- `weibo_url` / `bilibili_url` → **删除**，改用 `customLinks` 数组

---

## v0.12 前端任务（按顺序）

### 1. R15 外链列表（独立，先做）
- Settings.vue：链接列表编辑器（增/删/排序 + 图标选择器）
- 4 个主页模板：外链区改读 `customLinks`
- useArtistData.js：socialLinks 数据源切到 customLinks
- 图标方案：纯文字标签 + Element Plus Link 图标兜底（见 01-to-02-r21-review-0730.md）

### 2. R18 订单图库（OrderDetail 参考图区块）
- 上传入口（拖拽/点击/Ctrl+V，复用 usePasteUpload，需确认多文件支持）
- 来源角标（客户/画师）
- 点击图片 = 设为焦点
- 悬停删除（已有）

### 3. R19 备注附图（OrderDetail 备注区块）
- 输入框旁"附图"按钮（上传/粘贴 1 张）
- 备注流带图缩略图 + 点击大图
- 上传走 POST /api/upload/note-image（requireAuth）
- 返回的 note 带 imageUrl 签名

---

## 接口速查

| 接口 | 变更 |
|------|------|
| PUT /api/artist/profile | camelCase + customLinks 数组 + additionalProperties:false |
| GET /api/artists/:subdomain | 新增 customLinks: [] |
| GET /api/artists | 列表项新增 customLinks: [] |
| POST /api/artist/orders/:id/references | 画师加图自动 source='artist'，返回完整签名订单 |
| POST /api/artist/orders/:id/notes | body 新增可选 imagePath，响应 notes 带 imageUrl |
| POST /api/upload/note-image | 新端点，requireAuth，返回签名 URL |
| 客户 track | references 只返回 source='client' |

---

## 分支

从 master 最新（eae0ae3）切出：`feat/client-frontend-v012`

worktree 用现有的 `artist-commission-client`（先切分支）：
```powershell
cd "D:\Hermes Agent CN Desktop\workspace\artist-commission-client"
git fetch origin
git checkout -b feat/client-frontend-v012 origin/master
```

---

## comms 纪律

进度/问题/提交说明写 `02-to-01-*.md`。提交按 `docs/templates/submit-client-frontend.md` 模板。
