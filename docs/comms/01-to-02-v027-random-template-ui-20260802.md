# 一号 → 二号：v0.27 多模板随机前端 UI 开关

> 分支：`feat/v027-random-template-ui`
> Worktree：`D:\Hermes Agent CN Desktop\workspace\artist-commission-02`
> 日期：2026-08-02

---

## 任务

后端 v0.25 已实现多模板随机（`random_template` 字段 + `resolveSpeechTemplate` 随机选取），但前端没有开关 UI——画师无法在界面上开启/关闭。在话术编辑区加"随机"checkbox。

## 后端 API 契约（已合入 master，零改动）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/artist/workflow/stages | 返回数组，每项含 `randomTemplate: boolean` |
| PUT | /api/artist/workflow/stages/:id | body 可含 `randomTemplate: boolean`，更新开关 |

## 实现要点

1. **StageListView.vue**（话术编辑区，~L69-90）：每个节点的话术 textarea 旁加 `el-checkbox`，label "随机"，`v-model="s.randomTemplate"`
2. 保存话术时（`onUpdateSpeech` / `saveSpeech`）：PUT 调用附带 `randomTemplate: s.randomTemplate`（对照 WorkflowPaymentEditor.vue L149-152 的 `onUpdateSpeech` 模式）
3. 仅当话术含多行（`\n` 分隔 ≥2 条）时 checkbox 才有意义——单行时 disabled + tooltip "多条话术时可开启随机"
4. i18n：zh-CN + en 各加 1-2 键（如 `workflow.randomTemplate: '随机'` / `'Random'`）

## 授权文件

- `web/src/components/artist/StageListView.vue`
- `web/src/components/artist/WorkflowPaymentEditor.vue`（如需改保存逻辑）
- `web/src/locales/zh-CN.js` + `en.js`

## 验证标准

1. 话术编辑区每节点显示"随机"checkbox
2. 多行话术 → checkbox 可勾选 → 保存 → 刷新后状态保持
3. 单行话术 → checkbox disabled
4. `npx eslint .` 0 错误 + `npm run build` 成功

## 交付

comms：`02-to-01-v027-random-template-ui-{日期}.md`
