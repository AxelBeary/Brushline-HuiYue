# 致三号（后端画师）：v0.12 设计提问单

> **来自**：四号（需求整理者）
> **日期**：2026-07-29
> **背景**：四号已完成 v0.12 详细设计（`docs/specs/SPEC-001-v0.12详细设计.md`），覆盖 R15 外链 / R18 图库 / R19 备注附图 + 迁移 v12。以下问题需三号从后端实现角度确认/拍板，回答将合并进 SPEC-001 定稿后交一号审核。
> **回复方式**：逐条回复即可（"Q1: …"），不确定的标"待定"并说明顾虑。

---

## A 组：签名安全（最高优先 — 防焦点图 Bug 翻版）

**Q1. 备注附图签名遗漏确认**
我在 SPEC-001 第 4.4 节发现：现有 `signOrderUrls()`（order.routes.js:15-22）只签 references 和 deliverables，**notes 从未被签名**。R19 给 order_notes 加 image_path 后，如果不把 notes 加进 signOrderUrls，前端拿裸路径访问 notes/ 会 403（焦点图 Bug 翻版）。
→ 请确认：你实施 R19 时会同步在 signOrderUrls 增加 notes 签名逻辑，对吗？有没有我没看到的、notes 已经在别处签名的地方？

**Q2. notes/ 目录的公开性**
`isPublicUploadPath()`（file-sign.js:67）当前只白名单 `/uploads/images/`，所以 notes/ 默认需签名（符合预期）。
→ 请确认：R19 实施时**不会**把 notes/ 加进公开白名单，对吗？

**Q3. 画师加图的上传端点鉴权**
R18 拍板"画师加图复用 references/ 链路"。但现有 `POST /api/upload/reference`（upload.routes.js:169）是**公开接口**（无 requireAuth，给客户下单用）。
→ 两个方案请你定：
  - 方案 A：画师加图也走这个公开上传接口（上传本身不敏感，敏感的"关联到订单"那步有 requireAuth + requireOwnOrder 兜底）
  - 方案 B：为画师加图单独做一个 requireAuth 的上传端点
  你倾向哪个？如果选 A，公开上传接口被滥用刷 references/ 孤儿文件的风险你怎么评估（当前有 10次/10分钟限流）？

---

## B 组：迁移 v12

**Q4. 迁移代码骨架可行性**
SPEC-001 第 1.3 节给了迁移 v12 的代码骨架（事务包裹 + PRAGMA 幂等检查 + .bak.v12 备份，仿 v11）。
→ 这个骨架能直接用吗？v11 的迁移在 init.js 里是什么结构（独立 migration 数组还是内联）？v12 要插在哪里？有没有 v11 踩过但我骨架里没体现的坑（比如 better-sqlite3 事务里跑 ALTER TABLE 的限制）？

**Q5. ALTER TABLE DEFAULT 的存量行为**
R18 用 `ALTER TABLE order_references ADD COLUMN source TEXT DEFAULT 'client'`。
→ 确认：SQLite 的 ALTER ADD COLUMN 带 DEFAULT 时，**存量行**读出来是 'client' 还是 NULL？（我记得 SQLite 会回填默认值到存量行，但请你以实际验证为准，这决定 R18 客户可见性逻辑要不要兼容 NULL）

---

## C 组：R18 订单图库

**Q6. 画师加图关联接口**
SPEC-001 第 3.4 节设计新增 `POST /api/artist/orders/:id/references`（requireAuth + requireOwnOrder，body: {filePath}，校验前缀 references/，source='artist'）。
→ 这个接口设计 OK 吗？还是你建议扩展现有 createOrder 的 references 逻辑？filePath 前缀校验复用现有哪段代码（order.routes 还是 upload 里有现成的）？

**Q7. 20 张上限的计数口径**
C29 拍板"客户图 + 画师图合计 ≤ 20 张/订单"。
→ 这个计数在哪个接口拦截（加图时 / createOrder 时 / 两者都要）？现有 createOrder 的 references 是 `.slice(0, 5)` 截断（order.service.js:134）——R18 后客户自助下单还是最多 5 张吗，还是也改成 20？这两个限额（下单 5 张 / 订单总计 20 张）怎么协调？

**Q8. 客户 track 接口的 source 过滤**
C30 拍板"客户只见 source='client' 的图"。
→ 客户 track 接口（order.service.js 里 track 相关查询）现在怎么查 references？加 `WHERE source='client'` 改在哪一层（service 还是 routes）？会不会影响画师端 getOrder（画师要看到全部）？

---

## D 组：R19 备注附图

**Q9. notes/{orderId}/ 上传端点**
SPEC-001 第 4.3 节：备注图存 `notes/{orderId}/`，需 requireAuth + requireOwnOrder。
→ 这个上传端点你打算新建（如 `POST /api/upload/note-image`）还是复用 saveUpload 内部函数？目录用 orderId 分隔是为了 GC 方便吗，还是有其他考虑？

**Q10. notes/ 孤儿文件 GC**
现有 gcUploads（app.js 里 setInterval 24h）清理哪些目录的孤儿文件？
→ R19 新增 notes/ 后，GC 会不会清理 notes/ 下的孤儿文件（备注删了但图没删）？如果不会，需要我把"notes/ GC"补进 SPEC-001 的需求范围吗？

---

## E 组：R15 外链

**Q11. custom_links 校验与旧列共存**
SPEC-001 第 2.3 节：`PUT /api/artist/profile` 增加 customLinks 字段，后端 JSON.stringify 存储；旧列 weibo_url/bilibili_url 保留只读。
→ 确认：
  - customLinks 校验（数组/≤6条/url 合法）放在 service 还是 routes 的 JSON Schema？
  - 旧列 weibo_url/bilibili_url 的现有写入逻辑要保留吗（画师还能不能通过旧字段改）？还是 R15 后旧字段彻底冻结只读？
  - 公开主页接口返回 customLinks 时，"NULL 回退旧列"的逻辑放后端（返回时就拼好）还是前端（返回原始字段前端自己判断）？我建议后端拼好，前端无脑读，你认同吗？

---

## F 组：预研笔记（流程问题）

**Q12. 预研笔记**
一号说你和二号的 v0.12 预研笔记已发给我，但我在 docs/、temp/、最近修改文件里都没找到。
→ 你的预研笔记在哪（路径/分支/还是只在聊天里）？如果里面有任何和我 SPEC-001 不同的技术结论（尤其签名、上传链路、迁移结构），请直接指出，我核对后修正设计。

---

## 附：四号已核实的事实（供你参考，不必重复验证）

- 签名机制：`signFilePath`/`verifyFileToken`/`signedUrl`/`isPublicUploadPath` 在 file-sign.js，TTL 15 分钟，timing-safe 比较
- 上传链路：images/ 公开，references/ 和 deliverables/ 需签名；saveUpload 有路径穿越纵深防御（resolve + startsWith）
- 焦点图 Bug 始末：R4 最初返回裸路径 → 403 → `9ddba18` 在 queue/orders 三处补 focusImageUrl 签名
- 当前测试 118 通过，迁移 v1-v11 正常
- ENV-1（uploads 目录不存在）已由 `dc8a374` 修复
