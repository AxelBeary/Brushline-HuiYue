# fix/eslint 分支说明

## 概述

修复 `npx eslint .` 报告的全部 13 条问题 + 修复过程中暴露的额外 17 条警告。
最终结果：**0 errors, 0 warnings**。

## 修改清单（12 个文件）

| 文件 | 修改内容 |
|------|----------|
| `web/vite.config.js` | `__dirname` → `dirname(fileURLToPath(import.meta.url))`，ESM 标准写法 |
| `web/src/views/artist/Settings.vue` | 模板字符串 `<\/script>` 转义改为字符串拼接，消除 `no-useless-escape` |
| `web/src/views/client/OrderForm.vue` | 循环变量 `t` → `tier`（消除上层 `t` 遮蔽）；v-html 加 eslint-disable 注释 |
| `web/src/views/artist/RulesEditor.vue` | v-html 加 eslint-disable 注释 |
| `web/src/views/artist/OrderDetail.vue` | 循环变量 `ref` → `reference`（消除上层 `ref` 遮蔽） |
| `web/src/views/artist/ManualOrder.vue` | 循环变量 `t` → `tier` |
| `web/src/views/admin/ArtistDetailDrawer.vue` | 循环变量 `t` → `tier`（4 处引用同步更新） |
| `web/src/embed/EmbedOrderPage.vue` | `mounted()` 移到 `methods` 前面（Vue 选项顺序规范） |
| `web/src/components/artist/WorkflowPaymentEditor.vue` | 删除未使用的 `watch` 导入；未使用参数 `d` → `_d` |
| `web/src/views/client/templates/ArtistHomeDarkGallery.vue` | 按钮属性换行格式化；删除未使用的 `ARTIST_STATUS_TYPE` 导入和 `props` 赋值；v-html 加 eslint-disable |
| `web/src/views/client/templates/ArtistHomeDefault.vue` | `const props = defineProps` → `defineProps`（props 未在 JS 中引用）；v-html 加 eslint-disable |
| `web/src/views/client/templates/ArtistHomeSinglePage.vue` | 3 处按钮属性换行格式化；删除未使用的 `ref` 导入和 `props` 赋值；v-html 加 eslint-disable |

## 需要合并者研判的事项

### 1. v-html 的 eslint-disable 注释（5 处）

以下 5 处 `v-html` 使用了 `<!-- eslint-disable-next-line vue/no-v-html -->` 抑制警告：

- `OrderForm.vue` — 渲染 `sanitizedRules`（经 `sanitizeHtml()` 消毒）
- `RulesEditor.vue` — 渲染 `sanitizedPreview`（经 `sanitizeHtml()` 消毒）
- `ArtistHomeDarkGallery.vue` — 渲染 `sanitizedRules`（由父组件传入，已消毒）
- `ArtistHomeDefault.vue` — 同上
- `ArtistHomeSinglePage.vue` — 同上

**当前判断**：内容均经过 `sanitizeHtml()`（DOMPurify）处理，XSS 风险已控制，
逐行 disable 比全局关闭规则更精确。但如果未来 `sanitizeHtml` 实现变更或
有新的未经消毒的内容源，这些注释可能掩盖真实风险。

**可选方案**：在 `eslint.config.js` 中全局关闭 `vue/no-v-html`（不推荐，
会失去对未来新增 v-html 的提醒）。

### 2. Settings.vue 嵌入代码的写法

原来用模板字符串 + `<\/script>` 转义，ESLint 报 `no-useless-escape`。
改为字符串拼接：

```js
'<script src="/embed.js" data-artist="' + (form.subdomain || 'your-subdomain') + '"></' + 'script>'
```

`'</' + 'script>'` 拆分是必要的——Vue SFC 解析器遇到完整的 `</script>`
会提前关闭脚本块。这个写法功能完全等价，但可读性略差。
如果合并者有更好的方案（如用 `String.raw` 或提取为常量），欢迎调整。

### 3. CI 的 Node.js 20 弃用警告（未处理）

GitHub Actions 报告 `actions/checkout@v4` 和 `actions/setup-node@v4`
被强制从 Node 20 升到 Node 24。这不影响功能，但未来可升级到 `@v5` 消除警告。
此问题不属于 ESLint 范畴，未在本分支处理。

### 4. vue-i18n v9 弃用警告（未处理）

`npm install` 时提示 `vue-i18n@9.14.5` 已不再维护，建议迁移到 v11。
这是依赖升级事项，需单独评估兼容性，未在本分支处理。

## 验证

```bash
cd web && npx eslint .
# 输出为空，exit code 0 — 零错误零警告
```
