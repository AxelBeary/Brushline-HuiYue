# 一号 → 五号：v0.12 签名矩阵回归

> 日期：2026-07-30
> 状态：已授权开工

---

## 任务

v0.12 全部合入，容器已重建（迁移 v12 已执行）。执行签名矩阵逐项回归。

## 检查清单（SPEC-001 §5.1）

逐项验证，每项记录：通过/失败 + 证据（截图/日志/响应码）。

| # | 检查项 | 验证方法 |
|---|--------|----------|
| 1 | R18 画师加图 → signOrderUrls 覆盖 | 画师上传图到订单，GET /api/artist/orders/:id 返回 references[].url 带 ?sig= |
| 2 | R18 焦点图 → focusImageUrl 已签 | GET /api/artist/orders 和 /api/artist/queue 返回 focusImageUrl 带 ?sig= |
| 3 | R19 备注图 → signOrderUrls notes 签名 | 创建带图备注，GET /api/artist/orders/:id 返回 notes[].imageUrl 带 ?sig= |
| 4 | R19 notes/ 不在公开白名单 | 直接访问 /uploads/notes/{artistId}/{file} 无 sig → 403 |
| 5 | 🔴 GC 不误删备注附图 | 创建带图备注 → 手动触发 GC（或等 24h）→ 图仍可访问 |
| 6 | 客户 track → clientOnly + 已签名 | 客户查询接口 references 只含 source='client'，且 url 带 ?sig= |
| 7 | 订单列表缩略图（UI-3 回归） | GET /api/artist/orders 返回 items[].focusImageUrl 带 ?sig=，前端正常显示 |
| 8 | 交付文件签名 | GET /api/artist/orders/:id 返回 deliverables[].url 带 ?sig= |

## 额外回归

- P0-5：访问 /embed.html → 响应头含 `frame-ancestors 'self'`（非 `*`）
- P0-3：POST /api/admin/transfer 无 body → 400（schema 拒绝）
- R15：GET /api/artists/:subdomain 返回 customLinks 数组（老画师回退旧列）

## 授权

只读验证，不改代码。若发现 Bug，写 comms 报告（`05-to-01-regression-*.md`），不自行修复。

## 输出

`05-to-01-v012-regression-0730.md`：逐项结果 + 总结（全通过 / N 项失败需修）。
