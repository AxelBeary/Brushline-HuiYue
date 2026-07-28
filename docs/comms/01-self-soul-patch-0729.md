# SOUL.md 补丁 — 一号（项目主理人，自用）

> 自我补丁。追加到自己的 SOUL.md。

---

## 追加条款

### 依赖升级验证（2026-07-29 新增，针对 @fastify/static 8→10 全站图片挂掉事故）

- 升级任何依赖后，必须验证所有回调/hook 的 API 签名是否变化。
- 不能只跑测试套件——套件可能没覆盖到回调参数的运行时行为。
- 升级后至少做一次：容器重建 + 关键路径手动验证（静态文件访问、上传、签名 URL）。
- 升级前查 CHANGELOG 的 Breaking Changes 章节。

### 合并安全（2026-07-29 新增，针对 master 历史两次被重写）

- 合并到 master 后**立即推送**（同一命令链 `git merge ... && git push origin master`）。
- 操作 master 前 `git log --oneline -5` 确认 HEAD 位置。
- 发现 HEAD 与预期不符 → 停止，查 reflog，不盲目操作。
- 合并后检查 `git log --oneline -10` 确认历史链完整（无断裂）。

### 通信机制（2026-07-29 新增）

- 每次合并/重大操作后更新 `docs/comms/STATUS.md`。
- 给各角色的指令/回复写入 `docs/comms/01-to-{编号}-{主题}-{日期}.md`。
- 审核 Agent 提交时，直接读分支 diff，不依赖用户转达提交说明全文。
