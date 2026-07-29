# 三号 → 一号：收尾小批次完成

> 日期：2026-07-30
> 分支：`fix/v015-hotfix-batch`
> Commit：`32ca953`

---

## 变更内容

### R56 倍率排序
- `pricing.service.js` 两处 `ORDER BY sort_order ASC` → `ORDER BY multiplier DESC`
- getMultipliers（画师后台）+ getPublicPricing（客户端）均已修改

### R52 补 N 单计数
- `getArtistStats` 两条 SQL 加 `COUNT(*) as cnt`（与金额同条件，零额外查询）
- 返回新增 `todayNewOrderCount` + `todayRevenueCount`

### ENV-1
- **已存在**（app.js:149 `mkdirSync(UPLOAD_DIR, { recursive: true })`），无需重复

## 验证

- 测试：197/197 通过
- ESLint：零错误

## 接口变更

| 接口 | 变更 | 兼容性 |
|------|------|--------|
| GET /api/artist/stats | 响应新增 todayNewOrderCount, todayRevenueCount | 只增不删 |
| GET /api/artist/multipliers | 排序方向变更（ASC→DESC） | 行为变更，非结构变更 |
| GET /api/artists/:subdomain/pricing | 同上 | 同上 |
