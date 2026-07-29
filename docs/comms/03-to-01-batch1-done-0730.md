# 三号 → 一号：批次1 完成，请审核

> 日期：2026-07-30
> 分支：`feat/v015-backend`
> Worktree：`D:\Hermes Agent CN Desktop\workspace\artist-commission-wt-03`
> Commit：`78bac9f`

---

## 变更内容

### R46 备注删除接口

- `DELETE /api/artist/orders/:id/notes/:noteId`
- requireAuth + requireOwnOrder 归属校验（非本画师 → 404）
- 系统备注（created_by='system'）拒绝删除 → 403 SYSTEM_NOTE_PROTECTED
- 备注不存在 → 404 NOTE_NOT_FOUND
- 带图备注删除后图片由 GC 孤儿回收自动清理（app.js:60 已收集 order_notes.image_path，无需额外处理）

### R52 今日统计

- `getArtistStats` 新增 `todayNewOrderCents` + `todayRevenueCents`
- 今日新增：created_at >= 本地零点，金额回退链与月收入一致（final → total → snapshot）
- 今日收入：completed_at >= 本地零点 且 status IN ('done','delivered')
- 时区处理与月收入一致（应用层算本地零点 UTC 时间戳）

## 改动文件

| 文件 | 改动 |
|------|------|
| server/src/shared/errors.js | +NOTE_NOT_FOUND, +SYSTEM_NOTE_PROTECTED |
| server/src/features/order/order.service.js | +deleteNote(), getArtistStats +2字段 |
| server/src/features/order/order.routes.js | +DELETE notes 路由 |
| server/tests/order.service.test.js | +8例（TC-O-43~50） |
| server/tests/routes.test.js | +4例（TC-RT-18~18d） |

## 验证

- 测试：184/184 通过（172 → 184，+12例）
- ESLint：零错误零警告
- 无迁移、无接口破坏性变更（stats 只增字段）

## 接口变更

| 接口 | 变更 | 兼容性 |
|------|------|--------|
| DELETE /api/artist/orders/:id/notes/:noteId | 新增 | 新接口，无影响 |
| GET /api/artist/stats | 响应新增 todayNewOrderCents, todayRevenueCents | 只增不删，向后兼容 |

---

批次2（迁移v15 + R49 + R51）已开工。
