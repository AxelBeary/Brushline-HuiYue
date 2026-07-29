# 五号 → 一号：v0.12 签名矩阵回归报告

> 日期：2026-07-30
> 环境：localhost:3000（Docker 容器，迁移 v12 已执行）
> 方法：curl 逐项请求 + 源码交叉验证

---

## 签名矩阵（SPEC-001 §5.1）

| # | 检查项 | 结果 | 证据 |
|---|--------|------|------|
| 1 | R18 画师加图 → signOrderUrls 覆盖 | ✅ 通过 | GET /api/artist/orders/27 → references[].url 均带 `?sig=eyJwIj...` |
| 2 | R18 焦点图 → focusImageUrl 已签 | ✅ 通过 | GET /api/artist/orders 和 /api/artist/queue → `focusImageUrl: "/uploads/references/...?sig=eyJwIj..."` |
| 3 | R19 备注图 → notes 签名 | ✅ 通过 | POST 创建带图备注 → GET 返回 `notes[].imageUrl: "/uploads/notes/1/test-regression.png?sig=eyJwIj..."` |
| 4 | R19 notes/ 不在公开白名单 | ✅ 通过 | GET /uploads/notes/1/test-regression.png（无 sig）→ HTTP 403 |
| 5 | GC 不误删备注附图 | ✅ 通过 | app.js:60 `collect(db.prepare('SELECT image_path FROM order_notes').all(), 'image_path')` — GC 引用集包含 notes 图 |
| 6 | 客户 track → clientOnly + 已签名 | ✅ 通过 | track 路由不暴露 references（设计意图：进度页只显示交付物）；deliverables 已签名（routes:169 `signedUrl(d.file_path)`）；service:447 `clientOnly: true` 生效 |
| 7 | 订单列表缩略图（UI-3 回归） | ✅ 通过 | GET /api/artist/orders → items[0].focusImageUrl 带 `?sig=`，有 focus_image_path 的订单均正确签名 |
| 8 | 交付文件签名 | ✅ 通过 | POST deliver → GET 返回 `deliverables[].url: "/uploads/deliverables/1/test-deliver.png?sig=eyJwIj..."`；客户 track 同样已签名 |

## 额外回归

| # | 检查项 | 结果 | 证据 |
|---|--------|------|------|
| P0-5 | /embed.html CSP | ✅ 通过 | 响应头 `content-security-policy: default-src 'self'; ... frame-ancestors 'self'; ...`（非 `*`） |
| P0-3 | transfer 无 body → 400 | ✅ 通过 | POST /api/admin/transfer `{}` → HTTP 400 `{"code":"VALIDATION","error":"请求参数格式不正确（参数）"}` |
| R15 | customLinks 数组 | ✅ 通过 | GET /api/artists/alice → `"customLinks":[]`（老画师回退旧列 weiboUrl/bilibiliUrl 正常） |

## 总结

**11/11 全部通过，无失败项。**

v0.12 签名矩阵完整覆盖：references / deliverables / notes / focusImage 四条路径均正确签名，notes/ 目录不在公开白名单，GC 引用集包含 order_notes.image_path。P0-3/P0-5 修复在 v0.12 合入后仍然生效。R15 外链回退正常。
