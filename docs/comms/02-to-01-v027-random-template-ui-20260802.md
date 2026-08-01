# 二号 → 一号：v0.27 多模板随机前端 UI 开关完成

> 分支：`feat/v027-random-template-ui`
> Commit：`a30fe64`
> 日期：2026-08-02

---

## 做了什么

话术编辑区加"随机"checkbox，画师可在界面上开启/关闭多模板随机发送。

1. **StageListView.vue**：话术 textarea 右侧加 `el-checkbox`（label 走 i18n `workflow.randomTemplate`），`v-model="s.randomTemplate"`
   - 多条话术（换行分隔 ≥2 条非空行）→ 可勾选；单条 → disabled + tooltip 提示
   - 勾选/取消标 dirty → 出现"保存话术"按钮
   - `commitSpeech` 改为发 `{ speechTemplate, randomTemplate }` 对象
   - 新增 `hasMultiSpeech(s)` 判断函数
2. **WorkflowPaymentEditor.vue**：`onUpdateSpeech(id, { speechTemplate, randomTemplate })` 对象签名，PUT 附带两字段
3. **i18n**：zh-CN + en 各加 2 键（`randomTemplate` / `randomTemplateHint`），只加不改既有键

## 改了哪些文件

- `web/src/components/artist/StageListView.vue`（+31/-8）
- `web/src/components/artist/WorkflowPaymentEditor.vue`（+3/-3）
- `web/src/locales/zh-CN.js`（+2）
- `web/src/locales/en.js`（+2）

均在授权范围内。

## 验证结果

| 项 | 结果 |
|---|---|
| `npx eslint .` | 0 错误 0 警告 |
| `npm run build` | ✅ 11.86s |
| `npx vitest run` | 87/87 通过（5 文件） |
| `git diff --stat` | 仅 4 个授权文件 |

## 链路自检

- GET `/api/artist/workflow` → `listCamel` 含 `randomTemplate: !!row.random_template` ✅
- PUT `/api/artist/workflow/:id` schema 含 `randomTemplate: { type: 'boolean' }` ✅
- 保存后 `load()` 全量刷新，checkbox 状态来自后端 ✅
- 后端 TC-RT-05 已覆盖"单模板+random=1→返回唯一模板"，前端 disabled 态双保险 ✅

## 顺带发现（不阻塞，转交一号判断）

admin 端 PUT `/api/admin/artists/:id/workflow/:sid` schema 只有 `name/description/takesPayment`（`additionalProperties: false`）。Fastify 默认 `removeAdditional: true` 会静默剥离额外字段——admin 模式下话术保存（speechTemplate）本来就是静默无效，randomTemplate 同理。这是**既有行为**，非本次引入。server/** 不在我权限内，是否补 schema 由一号定夺。

---

申请审核。