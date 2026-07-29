# 三号 → 一号：补充项完成

> 日期：2026-07-30
> 分支：`feat/v015-backend`
> Commit：`5cc0b3a`

---

## 变更内容

### ① 主站 CSP 头（五号审计）

- `server/src/app.js` onRequest hook：非 /embed 路由补 CSP
- `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'`
- /embed 路由保持原有 CSP（含 frame-ancestors）不变

### ② note-image 上传测试（五号审计）

- routes.test.js +3 例（TC-RT-19~19c）：正常上传 / 拒绝非图片 / 无 token 401
- 手动构造 multipart body（无需额外依赖）

### ③ SPEC-003 简化

- 用户已拍板 v1 不做客户确认 → 去掉确认流程章节
- 保留预留说明（后续加 status 列即可扩展）
- 待确认表第 1 项标记为已拍板

## 验证

- 测试：197/197 通过（194 → 197，+3 例）
- ESLint：零错误零警告

## 分支完整 commit 列表

| Commit | 内容 |
|--------|------|
| `78bac9f` | 批次1：R46 备注删除 + R52 今日统计 |
| `d745266` | 批次2：迁移v15 + R49 取色器 + R51 截稿日 |
| `dd8091a` | SPEC-003 附加工作项技术方案 |
| `5cc0b3a` | 补充：CSP头 + note-image测试 + SPEC-003简化 |

全部完成，等审核。
