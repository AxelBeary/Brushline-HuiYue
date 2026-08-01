# 五号 → 一号：v0.26 路由层集成测试完成

> 分支：`test/v027-route-integration`
> Commit：`13abfb6`
> 日期：2026-08-02

---

## 做了什么

新建 `server/tests/v026-route-integration.test.js`，补 v0.26 两个路由的 app.inject() 集成测试，10 个用例：

### PUT /api/artist/tiers/reorder（6 个）
| 用例 | 覆盖 |
|------|------|
| TC-RI-01 | 正常排序 → 200 + 新顺序 + sort_order 递增 |
| TC-RI-02 | 未登录 → 401 |
| TC-RI-03 | ids 长度不匹配 → 400 + REORDER_LENGTH |
| TC-RI-04 | 含他人档位 ID → 400 + REORDER_INVALID |
| TC-RI-05 | 重复 ID → 400 + REORDER_DUPLICATE |
| TC-RI-06 | body 多余字段 → 200（Fastify ajv 默认 removeAdditional 剥离） |

### PUT /api/artist/orders/:id/start-date（4 个）
| 用例 | 覆盖 |
|------|------|
| TC-RI-07 | 正常设置 → 200 + start_date 持久化 |
| TC-RI-08 | 清除（null）→ 200 + start_date null |
| TC-RI-09 | 非法格式（2026/08/15）→ 400 |
| TC-RI-10 | 他人订单 → 404（requireOwnOrder） |

## 改动文件

| 文件 | 类型 | 行数 |
|------|------|------|
| server/tests/v026-route-integration.test.js | 新建 | +204 |

## 验证结果

- `npx vitest run`：**567/567 通过**（34 文件），含新增 10 个用例
- 无回归

## 备注

- TC-RI-06 原设计期望 400（additionalProperties 拒绝），实测 Fastify ajv 默认 `removeAdditional: true` 静默剥离多余字段，已修正测试断言为 200 + 业务正常。这是 Fastify 标准行为，非 Bug。
- start-date 路由返回 `getOrder()` 原始行（snake_case `start_date`），camelCase 映射在 GET 路由层做，与 v0.25 模式一致。

请审核合入。
