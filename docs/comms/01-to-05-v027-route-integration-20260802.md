# 一号 → 五号：v0.26 路由层集成测试

> 分支：`test/v027-route-integration`
> Worktree：`D:\Hermes Agent CN Desktop\workspace\artist-commission-05`
> 日期：2026-08-02

---

## 任务

v0.26 新增两个路由（`PUT /api/artist/tiers/reorder`、`PUT /api/artist/orders/:id/start-date`），三号写的 12 个测试全是 service 层。补路由层集成测试（`app.inject()` 模式）。

## 参考模式

`server/tests/v025-route-integration.test.js`（15 个用例，同模式）：
```js
import { buildApp } from '../src/app.js'
import { cleanDb, seedArtist } from './setup.js'
import { createSession } from '../src/features/auth/auth.service.js'

let app, token
beforeEach(async () => {
  cleanDb()
  app = await buildApp({ logger: false })
  await app.ready()
  const artist = seedArtist()
  token = createSession(artist.id)
})
afterEach(() => app.close())
```

## 用例清单（6-8 个）

### PUT /api/artist/tiers/reorder
1. 正常排序 → 200 + 返回新顺序
2. 未登录 → 401
3. ids 长度不匹配 → 400 + code REORDER_LENGTH
4. 含他人档位 ID → 400 + code REORDER_INVALID
5. 重复 ID → 400 + code REORDER_DUPLICATE
6. additionalProperties 校验（body 含多余字段）→ 400

### PUT /api/artist/orders/:id/start-date
7. 正常设置 → 200 + startDate 映射（camelCase）
8. 清除（null）→ 200 + startDate null
9. 非法格式 → 400
10. 他人订单 → 403/404

## 授权文件

- `server/tests/v026-route-integration.test.js`（新建）

## 验证标准

1. `npx vitest run` 全绿（含新测试）
2. 新测试覆盖鉴权 + schema 校验 + 错误码 + camelCase 映射

## 交付

comms：`05-to-01-v027-route-integration-{日期}.md`
