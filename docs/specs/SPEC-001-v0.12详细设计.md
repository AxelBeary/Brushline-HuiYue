# v0.12 详细设计：订单图库 / 外链列表 / 备注附图 + 迁移 v12

> **文档编号**：SPEC-001
> **目标版本**：v0.12
> **整理人**：四号（需求整理者）
> **日期**：2026-07-29
> **状态**：定稿（已合并三号后端答复，2026-07-29），待一号审核
> **需求来源**：REQ-003（R15 / R18 / R19）
> **技术约束**：一号已拍板 + 三号后端答复（见各章节标注）

> 📌 **预研笔记下落（已查明，Q12）**：三号确认预研笔记**未写成文件**，是口头汇报给一号的，在"三号→一号→四号"交接链里丢了。核心结论已体现在三号对 Q4/Q5/Q10/Q11 的答复中，本设计已据此定稿。无遗留分歧。

> ⚠️ **四号自纠（基于代码核实）**：定稿时发现原设计两处与现状不符，已修正：
> 1. R18 原写"新增 `POST /api/artist/orders/:id/references` 端点"——**该端点已存在**（order.routes.js:478-502，含 references/ 前缀校验）。R18 实为**扩展现有端点 + service 加 source 参数**，非新增。
> 2. R19 原写备注图存 `notes/{orderId}/`——三号指出**上传时备注尚未创建、没有 orderId**，改为 `notes/{artistId}/`（与 deliverables/{artistId}/ 模式一致）。

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

> ✅ **三号 Q4 确认**：骨架可直接用。v11 在 init.js 的结构 = `MIGRATIONS` 数组末尾追加 `{version, name, up(database)}`，运行器（init.js:512-518）自动用 `database.transaction()` 包裹每个 up() + 写 schema_migrations。v12 照抄 v11 模式。
> ⚠️ **三号 Q4 关键提醒**：SQLite 的 ALTER TABLE 是**隐式提交**的，WAL 模式下事务包裹 ALTER 时，若 ALTER 成功但后续 INSERT schema_migrations 失败，**ALTER 不会回滚**。所以 **PRAGMA 幂等检测才是真正的安全网**（v11 已这么做），事务主要保护 schema_migrations 记录一致性。骨架里的 PRAGMA 检查不可省。

> ✅ **三号 Q5 已实测**（better-sqlite3 内存库，四号已复现验证）：
> | 场景 | 读出值 |
> |------|--------|
> | 存量行（ALTER 前插入） | `'client'`（字符串，非 NULL） |
> | 新插入行（不指定 source） | `'client'` |
> | 显式 `INSERT ... source = NULL` | `null` |
>
> **结论**：R18 客户可见性逻辑**不需要兼容 NULL**——只要迁移用 DEFAULT 'client'，存量行读出来就是 'client'。但 service 层插入时**务必显式传值**（不要写 NULL），否则会是 null。

### 1.4 回滚方案

- 迁移前已备份 `.bak.v12`，回滚 = 停服 → 恢复备份 → 降级代码
- 三个新列均为**可空/有默认值**，旧代码读到它们不会报错（向后兼容）
- `custom_links` 为 NULL 时**后端**回退拼好旧 `weibo_url`/`bilibili_url` 返回（见 R15，前端无感知）

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

### 2.3 读写逻辑（三号 Q11 已定）

**写（画师设置页）**：
- `PUT /api/artist/profile` 增加 `customLinks` 字段（数组），后端 `JSON.stringify` 存入
- **格式校验放 routes 的 JSON Schema**（三号 Q11①，与现有所有写入路由一致：additionalProperties:false + 类型/长度/枚举约束）；service 层只做业务校验（数量 ≤6）
- **旧列彻底冻结只读**（三号 Q11②）：从 `updateArtist` 的 allowed 白名单**移除** weibo_url/bilibili_url，迁移后不再接受写入。列保留不删（过渡期旧读取路径可能还有人用），新写入全走 custom_links

**读（客户主页）**：
- **后端拼好，前端无脑读**（三号 Q11③，四号建议被采纳）：`GET /api/artists/:subdomain` 在 service 层拼好 customLinks 数组——先读 custom_links，**为空则回退旧列**（weibo_url → `{icon:'weibo', url:...}`，bilibili_url → `{icon:'bilibili', url:...}`）
- 前端只读 customLinks，不碰旧字段
- 若 custom_links 已设置（哪怕空数组），以新列为准，后端不回退旧列

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

### 3.3 上传链路（复用 references/，三号 Q3 已定：方案 A）

画师加图走**现有 `POST /api/upload/reference`** 链路（三号拍板方案 A）：
- 文件存入 `references/` 目录（与客户参考图同目录，nanoid 命名不冲突）
- 返回 `filePath` + 签名 URL
- 然后调用订单关联接口把 `filePath` 关联到订单，**source 标记为 'artist'**

> ✅ **方案 A 理由（三号）**：上传和关联是两步——上传时文件还没归属任何订单，鉴权没有锚点（不知道校验哪个订单的权限）。现有公开接口已有限流（10次/10分钟/IP），孤儿文件 24h 后被 gcUploads 回收。
> **风险评估**：恶意刷孤儿文件最坏 = 每 IP 每 10 分钟 10 个 × 10MB = 100MB/10min/IP，24h 后自动回收，可接受。若一号觉得不够，可把公开上传限流从 10 次降到 5 次（一行改动）。

### 3.4 关联接口改动（⚠️ 四号自纠：端点已存在，是扩展不是新增）

**`POST /api/artist/orders/:id/references` 已存在**（order.routes.js:478-502，requireAuth + requireOwnOrder，含 references/ 前缀校验，调 `orderService.addReference`）。R18 只需**扩展**：

- **service 层**：`addReference(orderId, filePath, fileName, fileSize)` 增加 `source` 参数（order.service.js:423），INSERT 时显式写入 `source`（**务必显式传值，不要依赖 DEFAULT**——三号 Q5 实测：显式传 NULL 会写成 null）
- **画师加图调用处**：现有路由调 `addReference` 时传 `source='artist'`
- **createOrder 调用处**：客户自助下单的参考图传 `source='client'`（order.service.js:132-134 的循环）
- **20 张总量校验（三号 Q7）**：在 addReference service 函数里加 `SELECT COUNT(*) FROM order_references WHERE order_id = ?`，≥20 拒绝。自助下单的 `.slice(0,5)` 保持不变（单次上传限制），20 张是订单生命周期总量限制，两者不冲突

**删除参考图**：现有 `DELETE /api/artist/orders/:id/references/:refId` 已支持（UI-1 已修），画师可删任意来源的图。

**焦点图设置**：现有 `PUT /api/artist/orders/:id/focus-image` 不变，可从任意来源的图中选。

### 3.5 读取与签名（关键 — 防焦点图 Bug 翻版）

`getOrder` 返回的 references 由 `signOrderUrls()` 统一签名（order.routes.js:15-22），**画师图与客户图走同一签名链路，无需额外处理**。

但需新增/确认：
- references 返回时**带上 `source` 字段**，前端据此渲染"客户"/"画师"角标
- 焦点图 `focusImageUrl` 已在队列/列表端点签名（order.routes.js:266/282），不变

### 3.6 客户可见性（C30，三号 Q8 已定：service 层过滤）

- **客户查询页只显示 source='client' 的图**（画师图不泄露给客户）
- **实现方式（三号）**：service 层 `getOrder(id, { clientOnly: true })` 加参数，内部对 references 过滤 `source === 'client'`。routes 层不管过滤逻辑
  - 画师端 `GET /api/artist/orders/:id` 调 `getOrder(id)`（不传 clientOnly）→ 看全部
  - 客户 track 接口调 `getOrder(id, { clientOnly: true })` → 只看客户图
- ⚠️ 不要在 getOrder() 里无条件加 WHERE source='client'——会连画师端也过滤掉

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
- 新目录 **`notes/{artistId}/`**（⚠️ 四号自纠：原写 `{orderId}`，三号 Q9 指出上传时备注尚未创建、无 orderId 可用，改为 artistId，与 deliverables/{artistId}/ 模式一致）
- **必须走签名 URL**（notes/ 不在公开目录）

### 4.2 数据模型

`order_notes` 表新增 `image_path TEXT`（可空）：
- 纯文字备注：`image_path = NULL`
- 带图备注：`image_path = 'notes/{artistId}/{nanoid}.ext'`

### 4.3 上传链路（新目录 notes/，三号 Q9 已定）

**复用 `saveUpload()`（upload.routes.js:64），新建端点 `POST /api/upload/note-image`**：
- `subDir = join('notes', String(request.artist.id))`（用 artistId 分目录）
- 需 requireAuth（备注是画师私有）
- 白名单：图片格式（同 references，JPG/PNG/WebP/GIF，10MB）

> ⚠️ **签名关键（三号 Q2 确认）**：`notes/` 目录**不在 `isPublicUploadPath` 白名单内**（当前白名单只有 `/uploads/images/`，notes/ 默认需签名，符合预期）。R19 实施**不会**把 notes/ 加进公开目录。

### 4.4 读取与签名（关键 — 防焦点图 Bug 翻版，三号 Q1 已确认）

三号全局搜索确认：**notes 从未在任何地方被签名**，不存在"已在别处签名"的情况。R19 必须把 notes 加进 `signOrderUrls()`（三号将统一所有返回 order 的路由——GET orders/:id、PUT focus-image、POST notes、PUT price——走这个函数）：

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

> 这是本设计**最容易遗漏的点**：notes 当前在 signOrderUrls 里**没有被签名**。若只加 image_path 列忘了在这里签名，前端拿裸路径 → 403，就是焦点图 Bug 的翻版。三号已确认会补。

### 4.5 接口改动

- `POST /api/artist/orders/:id/notes`：body 增加可选 `imagePath`，校验前缀 `notes/{artistId}/`（⚠️ 用 artistId，与 4.3 一致）
- 返回的 note 带签名 imageUrl

### 4.6 前端改动

- OrderDetail.vue 备注区：输入框旁加"附图"按钮（上传/粘贴 1 张）
- 备注流：带图备注显示缩略图，点击看大图
- 附图可选，纯文字照常

### 4.7 GC 硬性前置条件（🔴 三号 Q10 揪出的数据丢失风险）

> ⚠️ **这是 R19 的硬性前置条件，不是建议。漏做 = 数据丢失。**

现有 `gcUploads`（app.js:47-99）收集 5 张表的引用作为"在用文件"白名单：
```js
collect(db.prepare('SELECT image_path FROM artworks').all(), 'image_path')
collect(db.prepare('SELECT example_image FROM price_tiers').all(), 'example_image')
collect(db.prepare('SELECT file_path FROM order_references').all(), 'file_path')
collect(db.prepare('SELECT file_path FROM deliverables').all(), 'file_path')
collect(db.prepare('SELECT avatar FROM artists').all(), 'avatar')
```
GC 逻辑（app.js:74-80）：遍历 uploads/ 下所有文件，**不在白名单且超过 24h 的一律删除**。

**风险**：`order_notes` 当前没有 image_path 列，GC 不知道要收集它。R19 加完列后，如果**不同步在 GC 加一行收集**，正在使用的备注附图会被 GC 当成孤儿删掉——**这是数据丢失，不是磁盘膨胀**。

**必须同步修改**（R19 实施时一并提交，不可拆分）：
```js
// app.js gcUploads 的 collect 列表追加
collect(db.prepare('SELECT image_path FROM order_notes').all(), 'image_path')
```

**验收硬指标**：带图备注创建 24h 后，触发 GC，备注附图**仍然存在且可访问**。

### 4.8 验收要点

- 带图备注的 imageUrl 是签名 URL，能正常显示（不 403）
- 一条备注超过 1 张图被拒绝
- 非本订单画师无法访问备注图（requireAuth + 签名双重防护）
- **（硬指标）带图备注 24h 后不被 GC 误删**

---

## 五、文件访问签名矩阵（防焦点图 Bug 翻版）

> 一号特别要求：每个文件访问点标注签名需求。以下是 v0.12 后**全平台文件访问点清单**。

| 目录 | 内容 | 公开? | 签名机制 | 涉及需求 |
|------|------|:-----:|----------|----------|
| `images/{artistId}/` | 作品集/头像/档位例图 | ✅ 公开 | 无需签名（isPublicUploadPath 白名单） | — |
| `references/` | 客户参考图 + 画师加图 | ❌ 需签名 | `signOrderUrls()` 统一签 | R18（画师加图复用） |
| `deliverables/{artistId}/` | 交付文件 | ❌ 需签名 | `signOrderUrls()` + track 接口单独签 | — |
| `notes/{artistId}/` | 备注附图（**v0.12 新增**） | ❌ 需签名 | **必须在 signOrderUrls 新增 notes 签名** + **GC 必须收集 order_notes.image_path** | R19 |
| 焦点图（指向 references/ 内文件） | 订单焦点图 | ❌ 需签名 | 队列/列表端点 `focusImageUrl` 已签（9ddba18 修复） | R18 复用 |

### 5.1 签名检查清单（三号实施时逐项核对）

- [ ] R18 画师加图：存入 references/ → 走 signOrderUrls，✅ 自动覆盖
- [ ] R18 焦点图：指向 references/ → focusImageUrl 已签，✅ 不变
- [ ] R19 备注图：存入 notes/ → **必须手动在 signOrderUrls 加 notes 签名**，⚠️ 易遗漏
- [ ] R19 notes/ 目录：**不得**加入 isPublicUploadPath 白名单
- [ ] **R19 GC：gcUploads 必须 collect order_notes.image_path**，🔴 漏做=数据丢失（三号 Q10）
- [ ] 客户 track 接口：references 只返回 source='client'，且已签名（getOrder clientOnly 参数）

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
| custom_links 老数据回退 | 集成 | NULL 时后端拼好旧列返回 |
| custom_links 旧列冻结 | 单元 | updateArtist 不再接受 weibo_url/bilibili_url 写入 |
| order_references.source 默认值 | 单元 | 存量图 source='client'（三号 Q5 已实测） |
| addReference 显式传 source | 单元 | 画师图 'artist'，客户图 'client'，不写 NULL |
| 画师加图 source='artist' | 集成 | 客户 track（clientOnly）不可见 |
| getOrder clientOnly 过滤 | 单元 | 画师端看全部，客户端只看 client |
| 参考图合计 ≤20 张 | 单元 | addReference 超限拒绝 |
| 备注附图签名 | 集成 | imageUrl 可访问不 403 |
| 备注单图限制 | 单元 | 超 1 张拒绝 |
| notes/ 非公开 | 安全 | 无签名访问 notes/ 返回 403 |
| **GC 不误删备注附图** | 集成 | 🔴 带图备注 24h 后触发 GC，图仍存在 |

预计新增测试 ~14-16 个，总数 118 → ~133。

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

## 九、风险与待确认（三号答复后更新）

| # | 风险/待确认 | 状态 | 说明 |
|---|-------------|:----:|------|
| 1 | 预研笔记缺失 | ✅ 已解决 | 三号 Q12：笔记是口头汇报给一号的，交接链里丢了。核心结论已体现在 Q4/Q5/Q10/Q11 答复中，无遗留分歧 |
| 2 | R18 画师加图走公开上传接口 | ✅ 已定方案 A | 三号 Q3：上传无锚点鉴权，公开接口+限流+24h GC 可接受。若一号觉得不够，公开上传限流 10→5 次（一行改动） |
| 3 | notes/ 目录 GC | 🔴 升级为硬性前置条件 | 三号 Q10：不是"是否清理孤儿"，而是"不 collect order_notes.image_path → 在用备注附图被误删 = 数据丢失"。已写入 4.7 节，R19 实施必须同步改 gcUploads |
| 4 | 签名 15 分钟过期 | 🟡 遗留（非 v0.12 范围） | 备注图/参考图签名 15min 失效，长停留页面图片会 403。现有问题，图库图多后更明显。建议 v0.13 考虑签名刷新机制 |
| 5 | ALTER TABLE 隐式提交 | ⚠️ 已知限制 | 三号 Q4：WAL 下事务包 ALTER，ALTER 成功但 schema_migrations 写入失败时 ALTER 不回滚。PRAGMA 幂等检测是真正安全网，骨架已包含 |
