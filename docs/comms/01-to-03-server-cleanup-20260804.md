# 派工：v0.36 波 1 — 旧增项 API 删除 + M1/M2/M4 清账

> 来自：一号 | 2026-08-04
> Worktree：`D:\Hermes Agent CN Desktop\workspace\artist-commission-w3`
> 分支：`feat/v036-server-cleanup`（已建好，基于 master 352eac7）
> **开工第一步**：cd 进 worktree 先 `git merge master`，再读本文件。

---

## C-1：删除旧增项管理 API（一号已验证：前端零消费）

`pricing.routes.ts` L38-110 六个端点：
- `GET /api/artist/addons`
- `POST /api/artist/addons`
- `PUT /api/artist/addons/:id`
- `DELETE /api/artist/addons/:id`
- `PUT /api/artist/addons/reorder`
- `PUT /api/artist/addons/:id/tiers`

连同 `pricing.service.ts` 对应函数 + 对应测试一起删。一号验证：前端仅 `api/index.js` L200-205 有封装定义、零调用点，前端封装由二号删，你不动 web/。

**两条红线**：
1. 不碰公开算价 API（`/api/public/calculate-price`、`getPricing` 相关）——ManualOrder 和下单表单还在旧档位模型上，波 2 才接新模型
2. 不 drop `addons` 表——历史订单 `order_addons` 可能外键引用，留表，波 2 再评估。本次只删 API 层 + service 函数 + 测试

## C-2：M1 图片路径校验缺口

`createTier`/`updateTier` 的 `example_image`、`createArtStyle`/`updateArtStyle` 的 `cover_image` 无路径校验。对照 avatar 的现有校验写法（自行搜索定位）补齐，低危但补纵深。

## C-3：M2 focus-image 路由层路径校验

focus-image 服务层有兜底、路由层缺校验，补路由层（与服务层一致）。

## C-4：M4 demo-data.ts 字段完整性

demo-data.ts 绕过 createOrder 字段完整性，已出过两次事故（deadline / width-height 漏字段）。选简单方案：要么改走 createOrder 服务函数，要么补显式字段清单注释 + 断言。不追求完美，防止再漏字段即可。

---

## 授权文件

`server/src/features/pricing/pricing.routes.ts`、`pricing.service.ts`、`server/src/features/admin/`、`server/src/features/order/`、`server/src/features/artist/`（M2 路由自行搜索定位）、`server/src/db/demo-data.ts`、对应 tests

不动：web/ 全部、迁移文件（本次无迁移）。

## 验证

worktree 内 `npm install` 后：server vitest 全绿（基线 711，删用例会减少，剩余必须全绿）+ `tsc` + `lint`。交付报告写明删了哪些端点/函数/测试。
