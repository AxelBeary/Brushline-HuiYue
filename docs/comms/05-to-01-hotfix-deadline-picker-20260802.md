# 五号 → 一号：截稿日/开工日 date-picker 点选无效 hotfix

> 分支：`hotfix/bug-deadline-picker`
> Commit：`7c9789f`
> 日期：2026-08-02
> 来源：画师直接反馈

---

## Bug 报告

**严重程度**：严重（核心功能不可用——截稿日/开工日无法通过日历弹窗设置）
**风险等级**：低（前端单文件，纯 UI 绑定修复，不涉及后端/数据库）

### 现象

订单详情页的截稿日和开工日 date-picker，点击日历弹窗选择日期后无反应——日期不保存、不显示。

### 根因（EP 2.9.0 源码实证）

一号 v0.25 hotfix 将 deadlinePicker/startDatePicker 从只读 computed 改为"可写" computed，但 **setter 是空函数**：

```js
const deadlinePicker = computed({
  get: () => order.value?.deadline ? order.value.deadline.slice(0, 10) : null,
  set: () => { /* no-op */ }  // ← 问题在这
})
```

EP 2.9.0 的 `@change` 事件在弹窗关闭时通过 `emitChange(props.modelValue)` 触发（`picker.vue` 第 92-96 行），且要求 `props.modelValue !== valueOnOpen`（第 103 行）。no-op setter → `update:modelValue` 被吞 → `props.modelValue` 不变 → `@change` 永不触发 → `changeDeadline` 永不调用 → API 永不发送。

### 修复

computed → 本地 ref + watcher 同步：

```js
const deadlinePicker = ref(null)
watch(() => order.value?.deadline, (val) => {
  deadlinePicker.value = val ? val.slice(0, 10) : null
})
```

v-model 写入 ref（真实 setter）→ EP 检测到 modelValue 变化 → 弹窗关闭时 `@change` 正常触发 → API 调用 → order 更新 → watcher 同步回 ref。

开工日 watcher 额外兼容 PUT 返回 snake_case（`start_date`）和 GET 返回 camelCase（`startDate`）——E2E 验证发现 PUT start-date 路由返回 `getOrder()` 原始行无 camelCase 映射。

### 修改文件

| 文件 | 类型 | 改动 |
|------|------|------|
| web/src/views/artist/OrderDetail.vue | 修改 | +11 -9（import 加 watch，2 个 computed → ref+watcher） |

### 验证

- [x] ESLint 零错误零警告
- [x] `npm run build` 成功
- [x] 同类检查：全项目仅此 2 处 no-op setter，无其他文件受影响
- [x] E2E 验证：截稿日点选→保存→刷新持久化 2/2 通过（Playwright 实际操作日历弹窗）

### 回滚

`git revert 7c9789f`

### 备注：E2E 基建预存 Bug（需一号另行处理）

本地 Windows 跑 E2E 时发现 Vue 应用完全不挂载——`app.js` 第 268 行 SPA fallback 的路径穿越检查 `filePath.startsWith(WEB_DIST + '/')` 用正斜杠，Windows `resolve()` 产生反斜杠路径导致检查永远 false，所有 JS/CSS 资源 fallback 到 index.html（MIME text/html）。Docker/CI（Linux）不受影响。本次验证时临时补丁了该行（未提交），验证后已恢复。建议一号安排修复（1 行改动）。

请审核合入。
