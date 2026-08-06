# 交付：三号 · Beta 冲刺批 3 —— U1 查单响应补需求字段（后端）

> 分支：`beta/backend-track-fields` · worktree：`../artist-commission-w8`
> 交付时间：2026-08-07 · 基线 merge：`49c7824`（master fast-forward）
> 状态：**完成，测试全绿，未推送未合并**

---

## 一、改动总览（3 文件）

| 文件 | 改动 |
|------|------|
| `server/src/features/order/order.service.ts` | `getClientQueuePosition` 返回物补 `description` + `references`（两个 return 分支都补） |
| `server/src/features/order/order.routes.ts` | track 路由响应对象透出 `description` + `references`（映射为 url/originalName） |
| `server/tests/track-references.test.js` | **新增** 2 条回归测试（TC-TR-01 / TC-TR-02） |

未动：`web/` 任何文件、`server/src/features/artist/*`、`server/src/db/*`、生产数据库。

---

## 二、references 每项最终形状（二号前端区块据此联调）

```jsonc
// GET /api/orders/track/:orderNo?qq=xxx 响应新增字段
"description": "想要一张星空主题的立绘",   // string | null
"references": [
  {
    "url": "/uploads/references/client-star.png?sig=eyJwIj...",  // string，已签名（15 分钟时效）
    "originalName": "客户参考图.png"                              // string | null
  }
]
```

- **字段名**：`url` + `originalName`（与 deliverables 的 `url` + `fileName` 风格同源，但按 order_references 表列名 original_name 命名）
- 无参考图订单 → `references: []`（空数组）；无需求订单 → `description: null`

## 三、source 过滤逻辑

**不在 route 层新写过滤**，复用既有 R18 clientOnly 机制：

1. `order.routes.ts` track 路由 → `orderService.getClientQueuePosition()`
2. service 层调用 `getOrderByNo(orderNo, { clientOnly: true })` → `getOrder(id, { clientOnly: true })`
3. `getOrder` 内 L322：`clientOnly` 时 `SELECT * FROM order_references WHERE order_id = ? AND source = 'client'` —— **画师图（source='artist'）在查询层已剔除**
4. service 返回物 `references: order.references || []`（已过滤），route 层仅做字段映射

一句话：**过滤发生在 getOrder 的 SQL 层（既有 R18 机制），service/route 只是透传**。冒烟实测确认 artist 图不出现（`has artist leak: false`）。

## 四、服务层返回物（getClientQueuePosition）

两个 return 分支统一通过 `base` 携带新字段：

```ts
const base = {
  order,
  description: order.description ?? null,
  references: order.references || []
}
if (['delivered', 'cancelled'].includes(order.status)) {
  return { ...base, position: null, total: null }
}
// ... 活跃队列查询
return { ...base, position, total: queue.length }
```

delivered/cancelled 订单同样透出 description/references（已交付订单客户更需要回顾参考图）。

## 五、测试

**全量：930/930 通过（基线 928 + 新增 2）** · 59 test files

| 用例 | 断言 |
|------|------|
| TC-TR-01 | 带 description + 1 client 图 + 1 artist 图 → description 透出、references 仅 1 条 client（url 带 sig、originalName 正确）、artist 图字符串不出现在响应体 |
| TC-TR-02 | 无需求订单 → description null、references `[]` |

lint：`npx eslint` 0 错误 0 警告（track-references.test.js）；`npx tsc --noEmit` 0 错误。
冒烟：真实 app.inject 调 `/api/orders/track/SMK-001?qq=99001` → STATUS 200，字段形状与上述一致。

## 六、备注

- npm install 后 package-lock.json license 字段被 npm 同步（MIT→AGPL-3.0），已 `git checkout` 还原（非本批改动）。
- 交付后二号前端区块可按上述字段形状联调；已确认 track 响应现含 `description` + `references`，其余既有字段未动（向后兼容，字段只增不改）。
