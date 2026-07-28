# v0.12 详细设计：订单图库 / 外链列表 / 备注附图 + 迁移 v12

> **文档编号**：SPEC-001
> **目标版本**：v0.12
> **整理人**：四号（需求整理者）
> **日期**：2026-07-29
> **状态**：待一号审核
> **需求来源**：REQ-003（R15 / R18 / R19）
> **技术约束**：一号已拍板（见各章节标注）

> ⚠️ **预研笔记缺失说明**：一号提到"三号和二号的预研笔记已发给你"，但四号在 `docs/`、`temp/`、最近 24h 修改文件中**均未找到**二号/三号署名的预研文档（仅 `temp/审计预研判-呈一号-2026-07-29.md` 一份旧审计文件）。本设计基于：① 一号拍板的技术约束；② REQ-003 需求；③ 四号对实际代码的逐行核实（签名机制/上传链路/DB schema）。**若预研笔记后续找到，请一号告知路径，我核对后补充或修正本设计。** 不假装引用未读到的内容。

---

## 一、迁移 v12 总体方案

### 1.1 设计原则（一号已拍板）

- **合并为一次迁移**：R15 / R18 / R19 的 schema 变更合并为迁移 v12，一次执行
- **事务包裹**：全部 DDL 在单个事务内，任一失败整体回滚
- **幂等**：每个 `ALTER TABLE` 前用 `PRAGMA table_info` 检查列是否已存在，已存在则跳过（与迁移 v11 的写法一致）
- **备份**：执行前自动备份 `commission.db → commission.db.bak.v12`（与 v11 一致）

### 1.2 迁移内容

| # | 表 | 变更 | 类型 | 默认值 | 来源 |
|---|-----|------|------|--------|------|
| 1 | artists | 新增 `custom_links` | TEXT | NULL | R15 |
| 2 | order_references | 新增 `source` | TEXT | `'client'` | R18 |
| 3 | order_notes | 新增 `image_path` | TEXT | NULL | R19 |

> 注：R20 的看板焦点模式已定 localStorage（C33），**不进迁移**。

### 1.3 迁移代码骨架（供三号参考）

```js
// server/src/db/init.js — migrations 数组追加 v12
{
  version: 12,
  name: 'order_gallery_links_note_image',
  up(database) {
    // 备份（与 v11 同款）
    try {
      if (dbPath && dbPath !== ':memory:') {
        copyFileSync(dbPath, `${dbPath}.bak.v12`)
        console.log(`📦 迁移 v12: 已备份 → ${dbPath}.bak.v12`)
      }
    } catch (err) {
      console.warn(`⚠️ 迁移 v12: 备份失败（${err.message}），继续执行`)
    }

    // 事务包裹全部 DDL
    database.transaction(() => {
      // R15: artists.custom_links
      const artistCols = database.prepare('PRAGMA table_info(artists)').all()
      if (!artistCols.some(c => c.name === 'custom_links')) {
        database.exec('ALTER TABLE artists ADD COLUMN custom_links TEXT')
      }

      // R18: order_references.source（DEFAULT 'client' 兼容存量）
      const refCols = database.prepare('PRAGMA table_info(order_references)').all()
      if (!refCols.some(c => c.name === 'source')) {
        database.exec("ALTER TABLE order_references ADD COLUMN source TEXT DEFAULT 'client'")
      }

      // R19: order_notes.image_path
      const noteCols = database.prepare('PRAGMA table_info(order_notes)').all()
      if (!noteCols.some(c => c.name === 'image_path')) {
        database.exec('ALTER TABLE order_notes ADD COLUMN image_path TEXT')
      }
    })()
  }
}
```

### 1.4 回滚方案

- 迁移前已备份 `.bak.v12`，回滚 = 停服 → 恢复备份 → 降级代码
- 三个新列均为**可空/有默认值**，旧代码读到它们不会报错（向后兼容）
- `custom_links` 为 NULL 时前端回退读旧 `weibo_url`/`bilibili_url`（见 R15）

---

## 二、R15：外链列表（custom_links）

### 2.1 技术约束（一号已拍板）

- `custom_links` 为 **JSON TEXT 列**
- **旧列 `weibo_url` / `bilibili_url` 保留只读**，不删除、不迁移数据进新列（避免破坏存量）

### 2.2 数据结构

`custom_links` 存储 JSON 数组：

```json
[
  { "name": "我的Pixiv", "url": "https://pixiv.net/users/xxx", "icon": "pixiv" },
  { "name": "微博", "url": "https://weibo.com/xxx", "icon": "weibo" }
]
```

| 字段 | 类型 | 约束 |
|------|------|------|
| name | string | 必填，≤20 字 |
| url | string | 必填，http/https 开头，≤500 字 |
| icon | string | 可选，枚举：weibo/bilibili/pixiv/x/xiaohongshu/lofter/douyin/link，缺省 `link` |

- 数量上限：**6 条**（C26）
- 后端校验：JSON 解析失败 / 超 6 条 / url 非法 → 拒绝

### 2.3 读写逻辑

**写（画师设置页）**：
- `PUT /api/artist/profile` 增加 `customLinks` 字段（数组），后端 `JSON.stringify` 存入
- 校验：`Array.isArray` + 长度 ≤6 + 每项 url 合法

**读（客户主页）**：
- 公开主页接口返回 `customLinks`（已解析的数组）
- **兼容逻辑**：若 `custom_links` 为 NULL（老画师未设置），前端回退展示旧的 `weibo_url`/`bilibili_url`（有值才显示）
- 若 `custom_links` 已设置（哪怕空数组），以新列为准，**不再读旧列**

### 2.4 前端改动

- Settings.vue 基本资料 tab：移除写死的微博/B站输入框，改为**链接列表编辑器**（增/删/排序 + 图标选择器）
- 4 个主页模板（classic/gallery/folio/atelier）：外链展示区改读 `customLinks`，按 icon 渲染图标
- 复用 `composables/useArtistData.js` 增加 `socialLinks` 适配（已有此函数，扩展数据源）

### 2.5 验收要点

- 老画师（custom_links=NULL）主页仍显示原微博/B站链接
- 画师保存空数组后，主页外链区消失（不再回退旧列）
- 非法 url / 超 6 条被后端拒绝

---

## 三、R18：订单图库

### 3.1 技术约束（一号已拍板）

- `order_references.source` 列 **DEFAULT 'client'**
- **画师加图复用 `references/` 上传链路**（不新建目录）

### 3.2 数据模型

复用现有 `order_references` 表，新增 `source` 列区分来源：

| source 值 | 含义 | 上传方 |
|-----------|------|--------|
| `client` | 客户下单时上传（默认） | 客户 |
| `artist` | 画师后续补充 | 画师 |

### 3.3 上传链路（复用 references/）

画师加图走**现有 `POST /api/upload/reference`** 链路：
- 文件存入 `references/` 目录（与客户参考图同目录，nanoid 命名不冲突）
- 返回 `filePath` + 签名 URL
- 然后调用订单接口把 `filePath` 关联到订单，**source 标记为 'artist'**

> ⚠️ **安全注意**：`POST /api/upload/reference` 当前是**公开接口**（客户下单用，无 requireAuth）。画师加图复用此链路时，需确认：画师端调用也走这个公开接口是可以的（上传本身不敏感，敏感的是关联到订单——那一步有 requireAuth + requireOwnOrder）。**三号实施时需确认此判断，或为画师加图单独走 requireAuth 的上传端点。**

### 3.4 关联接口改动

**新增画师加图到订单**（或扩展 createOrder 的 references 逻辑）：
- `POST /api/artist/orders/:id/references`（requireAuth + requireOwnOrder）
- body: `{ filePath }`
- 后端：校验 filePath 前缀为 `references/`（防路径穿越，复用现有校验）→ 插入 order_references，`source='artist'`
- 数量上限：客户图 + 画师图合计 ≤ **20 张/订单**（C29）

**删除参考图**：现有 `DELETE /api/artist/orders/:id/references/:refId` 已支持（UI-1 已修），画师可删任意来源的图。

**焦点图设置**：现有 `PUT /api/artist/orders/:id/focus-image` 不变，可从任意来源的图中选。

### 3.5 读取与签名（关键 — 防焦点图 Bug 翻版）

`getOrder` 返回的 references 由 `signOrderUrls()` 统一签名（order.routes.js:15-22），**画师图与客户图走同一签名链路，无需额外处理**。

但需新增/确认：
- references 返回时**带上 `source` 字段**，前端据此渲染"客户"/"画师"角标
- 焦点图 `focusImageUrl` 已在队列/列表端点签名（order.routes.js:266/282），不变

### 3.6 客户可见性（C30）

- **客户查询页只显示 source='client' 的图**（画师图不泄露给客户）
- track 接口（客户用）查询 references 时加 `WHERE source='client'`
- 画师端 getOrder 返回全部（含 source）

### 3.7 前端改动

- OrderDetail.vue：参考图区块升级为"订单图库"
  - 增加上传入口（拖拽/点击/Ctrl+V 粘贴，复用 R5 的 usePasteUpload）
  - 每张图显示来源角标（客户/画师）
  - 点击图片 = 设为焦点（替代独立"设为焦点"按钮，REQ-003 R18 设计）
  - 悬停删除按钮（已有）
- QueueBoard.vue：焦点图展示不变（已签名）

### 3.8 验收要点

- 画师上传的图标记 source='artist'，客户查询页不可见
- 客户图 + 画师图合计超 20 张被拒绝
- 画师图能设为焦点并显示在看板（签名正常，不 403）
- 删除焦点图后焦点自动失效

---

## 四、R19：备注附图

### 4.1 技术约束（一号已拍板）

- **单图**（一条备注最多 1 张，C32）
- 新目录 **`notes/{orderId}/`**
- **必须走签名 URL**（notes/ 不在公开目录）

### 4.2 数据模型

`order_notes` 表新增 `image_path TEXT`（可空）：
- 纯文字备注：`image_path = NULL`
- 带图备注：`image_path = 'notes/{orderId}/{nanoid}.ext'`

### 4.3 上传链路（新目录 notes/）

**新增上传端点**或复用 saveUpload 逻辑：
- 文件存入 `notes/{orderId}/` 目录
- 需 requireAuth + requireOwnOrder（备注是画师私有）
- 白名单：图片格式（同 references，JPG/PNG/WebP/GIF，10MB）

> ⚠️ **签名关键**：`notes/` 目录**必须不在 `isPublicUploadPath` 白名单内**（当前白名单只有 `/uploads/images/`，notes/ 默认需签名，符合预期）。三号实施时**不要**把 notes/ 加进公开目录。

### 4.4 读取与签名（关键 — 防焦点图 Bug 翻版）

`getOrder` 返回 notes 时，**必须为每条带图备注签名**：

```js
// order.routes.js — signOrderUrls 扩展
function signOrderUrls(order) {
  if (order.references) {
    order.references = order.references.map(r => ({ ...r, url: signedUrl(r.file_path) }))
  }
  if (order.deliverables) {
    order.deliverables = order.deliverables.map(d => ({ ...d, url: signedUrl(d.file_path) }))
  }
  // R19 新增：备注附图签名
  if (order.notes) {
    order.notes = order.notes.map(n =>
      n.image_path ? { ...n, imageUrl: signedUrl(n.image_path) } : n
    )
  }
  return order
}
```

> 这是本设计**最容易遗漏的点**：notes 当前在 signOrderUrls 里**没有被签名**。若只加 image_path 列忘了在这里签名，前端拿裸路径 → 403，就是焦点图 Bug 的翻版。**三号实施时务必把 notes 加进 signOrderUrls。**

### 4.5 接口改动

- `POST /api/artist/orders/:id/notes`：body 增加可选 `imagePath`，校验前缀 `notes/{orderId}/`
- 返回的 note 带签名 imageUrl

### 4.6 前端改动

- OrderDetail.vue 备注区：输入框旁加"附图"按钮（上传/粘贴 1 张）
- 备注流：带图备注显示缩略图，点击看大图
- 附图可选，纯文字照常

### 4.7 验收要点

- 带图备注的 imageUrl 是签名 URL，能正常显示（不 403）
- 一条备注超过 1 张图被拒绝
- 非本订单画师无法访问备注图（requireOwnOrder + 签名双重防护）

---

## 五、文件访问签名矩阵（防焦点图 Bug 翻版）

> 一号特别要求：每个文件访问点标注签名需求。以下是 v0.12 后**全平台文件访问点清单**。

| 目录 | 内容 | 公开? | 签名机制 | 涉及需求 |
|------|------|:-----:|----------|----------|
| `images/{artistId}/` | 作品集/头像/档位例图 | ✅ 公开 | 无需签名（isPublicUploadPath 白名单） | — |
| `references/` | 客户参考图 + 画师加图 | ❌ 需签名 | `signOrderUrls()` 统一签 | R18（画师加图复用） |
| `deliverables/{artistId}/` | 交付文件 | ❌ 需签名 | `signOrderUrls()` + track 接口单独签 | — |
| `notes/{orderId}/` | 备注附图（**v0.12 新增**） | ❌ 需签名 | **必须在 signOrderUrls 新增 notes 签名** | R19 |
| 焦点图（指向 references/ 内文件） | 订单焦点图 | ❌ 需签名 | 队列/列表端点 `focusImageUrl` 已签（9ddba18 修复） | R18 复用 |

### 5.1 签名检查清单（三号实施时逐项核对）

- [ ] R18 画师加图：存入 references/ → 走 signOrderUrls，✅ 自动覆盖
- [ ] R18 焦点图：指向 references/ → focusImageUrl 已签，✅ 不变
- [ ] R19 备注图：存入 notes/ → **必须手动在 signOrderUrls 加 notes 签名**，⚠️ 易遗漏
- [ ] R19 notes/ 目录：**不得**加入 isPublicUploadPath 白名单
- [ ] 客户 track 接口：references 只返回 source='client'，且已签名

### 5.2 历史教训（焦点图 Bug 始末）

- R4 焦点图最初返回裸 `focus_image_path`，前端 `<img src>` 直接访问 → references/ 需签名 → **403**
- 修复提交 `9ddba18`：在 queue/orders 三处补 `focusImageUrl: signedUrl(...)`
- **规律**：任何新增"返回给前端的文件路径字段"，必须在 routes 层签名后再返回。service 层存裸路径，routes 层签名——这个分层不能破。

---

## 六、老数据兼容

| 场景 | 处理 |
|------|------|
| 老画师 custom_links=NULL | 前端回退读 weibo_url/bilibili_url |
| 老订单 references 无 source 列值 | DEFAULT 'client'，存量图自动归为客户图 |
| 老备注 image_path=NULL | 纯文字备注，前端不显示图 |
| 旧列 weibo_url/bilibili_url | 保留只读，不删不改，新设置走 custom_links |

---

## 七、测试计划（供三号/五号）

| 测试项 | 类型 | 覆盖 |
|--------|------|------|
| 迁移 v12 幂等性 | 单元 | 跑两次不报错，列只加一次 |
| 迁移 v12 事务回滚 | 单元 | 中途失败整体回滚 |
| custom_links JSON 校验 | 单元 | 非法 JSON/超 6 条/非法 url 拒绝 |
| custom_links 老数据回退 | 集成 | NULL 时读旧列 |
| order_references.source 默认值 | 单元 | 存量图 source='client' |
| 画师加图 source='artist' | 集成 | 客户 track 不可见 |
| 参考图合计 ≤20 张 | 单元 | 超限拒绝 |
| 备注附图签名 | 集成 | imageUrl 可访问不 403 |
| 备注单图限制 | 单元 | 超 1 张拒绝 |
| notes/ 非公开 | 安全 | 无签名访问 notes/ 返回 403 |

预计新增测试 ~12-15 个，总数 118 → ~132。

---

## 八、实施顺序建议

```
1. 迁移 v12（三号，高风险，需实际操作人确认）
   ↓
2. R15 外链（三号后端 + 二号前端，独立）
   R18 图库（三号后端 + 二号前端，依赖迁移）
   R19 备注附图（三号后端 + 二号前端，依赖迁移）
   ↓
3. 五号回归：签名矩阵逐项核对 + 焦点图/备注图不 403
```

R15 / R18 / R19 后端接口互不依赖，可并行；前端都改 OrderDetail/Settings，二号需协调避免冲突。

---

## 九、风险与待确认

| # | 风险/待确认 | 说明 |
|---|-------------|------|
| 1 | **预研笔记缺失** | 二号/三号预研笔记未找到，本设计基于代码核实。若笔记有不同结论，需核对 |
| 2 | R18 画师加图走公开上传接口 | `POST /api/upload/reference` 无 requireAuth，需三号确认是否可接受或单独加鉴权端点 |
| 3 | notes/ 目录 GC | 现有 gcUploads 是否清理 notes/ 孤儿文件？需三号确认 GC 覆盖新目录 |
| 4 | 签名 15 分钟过期 | 备注图/参考图签名 15min 失效，长时间停留页面图片会 403。现有问题，非 v0.12 引入，但图库图多了之后更明显。建议后续考虑刷新机制 |
