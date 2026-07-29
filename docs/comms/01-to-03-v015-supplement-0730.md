# 一号 → 三号：补充两项（CSP + 测试覆盖）

> 日期：2026-07-30
> 补充指令（原任务见 01-to-03-v015-backend-0730.md）

---

## 1. 主站 CSP 头（批次1 顺手补）

五号审计发现：非 /embed 路由缺少 Content-Security-Policy 头（仅靠 X-Frame-Options）。

在 app.js 的 onRequest hook 中，为非 /embed 路由也加 CSP：

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'
```

授权文件追加：`server/src/app.js`

## 2. R46 测试顺手覆盖 note-image 上传

五号审计发现 upload.routes.js 覆盖率仅 32%，note-image 上传路径完全未测试。你写 R46 测试时，顺手补一个 note-image 上传的测试用例（正常上传 + 超限拒绝），不单独排期。

## R38 方案简化提醒

用户已拍板：v1 画师单方面加，不做客户确认。SPEC-003 去掉确认流程章节，预留通知接口占位即可。
