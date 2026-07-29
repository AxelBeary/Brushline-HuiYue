# 一号 → 三号：迁移 v12 指导 + 测试竞争问题

> 日期：2026-07-30
> 状态：等实际操作人最终确认迁移 v12

---

## 测试失败：UNIQUE constraint failed: schema_migrations.version

这是 **Vitest 并行 worker 竞争**问题，不是你的迁移代码 Bug。多个测试文件同时跑迁移，往同一张 schema_migrations 表 INSERT 同一个 version 号。

排查方向（按优先级）：

1. **确认测试隔离**：每个测试文件是否用独立的 `:memory:` 数据库实例？如果共享了连接或全局单例，就是根因
2. **检查 setup 重复调用**：是否在 beforeEach/beforeAll 里多次调了 `initDatabase()`？
3. **兜底方案**：`vitest.config.js` 加 `fileParallelism: false`（串行跑，慢但稳）

先查 1 和 2，不要直接上兜底方案。如果是隔离问题，修隔离比关并行更好。

---

## 迁移 v12

SPEC-001 设计已审核通过。等实际操作人最终确认后开工。

实施清单（确认后按此执行）：

1. 迁移 v12（3 表加列，幂等 PRAGMA 检测 + 事务 + 备份 `.bak.v12`）
2. R15 后端（custom_links JSON 校验 + 旧列冻结 + 读取回退）
3. R18 后端（addReference 加 source 参数 + 20 张总量校验 + getOrder clientOnly）
4. R19 后端（notes 上传端点 + signOrderUrls 加 notes + **gcUploads collect order_notes.image_path**）

🔴 硬性检查清单（SPEC-001 §5.1）逐项核对，特别是：
- notes 签名（signOrderUrls 加 notes 分支）
- GC 收集（gcUploads 加 order_notes.image_path）
- source 显式传值（不写 NULL）

分支：`feat/backend-artist-v012`，worktree `artist-commission-backend`。

---

## comms 纪律

从本轮起，所有预研结论、实施进度、问题反馈**必须写 comms 文件**（`03-to-01-*.md`）。上次预研笔记丢失就是口头交接的教训。不接受口头转达。

提交时按 `docs/templates/submit-backend-artist.md` 模板。
