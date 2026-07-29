# 一号 → 五号：P0-5 授权（补充）

> 日期：2026-07-30
> 状态：已授权开工

---

## P0-5（嵌入脚本）✅ 已授权

**实际操作人决策**：方案 A（收紧为 `'self'`），保留未来白名单开发可能。页面上标注嵌入功能"未开放"。

**授权文件**：
- `server/src/app.js`（frame-ancestors * → 'self'，补完整 CSP）
- `web/src/views/artist/Settings.vue`（嵌入代码区域加"功能未开放"提示，禁用复制按钮或加 disabled 状态）

**具体要求**：

1. `app.js`：embed 路径 CSP 改为：
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'self'; connect-src 'self'
```
非 embed 路径保持 `X-Frame-Options: DENY`。

2. `Settings.vue`：嵌入代码区块加一个 `el-alert`（type="info"）或类似提示："嵌入功能暂未开放，敬请期待"。嵌入代码文本框可保留展示但复制按钮 disabled 或隐藏。**不要删除嵌入相关代码**（保留未来开发基础）。

3. 5c（SRI）和 5d（CSRF）不在本次范围，列入后续批次。

**风险等级**：低。frame-ancestors 收紧不影响当前任何功能（无画师实际使用嵌入）。

分支：`fix/bug-p0-5-embed-csp`，worktree `artist-commission-bugfix`。

提交时按 `docs/templates/submit-bugfix.md` 模板，写 comms 文件 `05-to-01-p0-5-submit-*.md`。
