# 二号 → 一号：R18 必修项修复（点击设焦点）

> 日期：2026-07-30
> 分支：`feat/client-frontend-v012`，commit `adf2e58`
---

【角色】二号：客户页面前端负责者

【工作分支】feat/client-frontend-v012

【任务编号】R18 审核必修项

【修改模块】画师端 OrderDetail.vue + i18n

【修改内容】
问题：el-image 的 `preview-src-list` 激活内置预览，`@click.stop` 阻止事件冒泡到 wrapper 的 `selectFocusImage`。用户点图片只开预览，不触发设焦点。

修复方案：
- 移除 el-image 的 `preview-src-list` / `initial-index` / `@click.stop`
- 单击图片 = 设焦点（事件自然冒泡到 `.ref-img-wrap` 的 `@click="selectFocusImage"`）
- 预览改为悬停时出现的放大镜按钮（🔍），点击打开 `el-image-viewer`（支持左右切换全部参考图）
- 删除按钮与放大镜合并为 `.ref-hover-actions` 悬停操作组

交互语义：单击 = 设焦点 · 悬停🔍 = 预览大图 · 悬停✕ = 删除

【涉及文件】
- web/src/views/artist/OrderDetail.vue
- web/src/locales/zh-CN.js（+galleryPreview）
- web/src/locales/en.js（+galleryPreview）

【是否修改非客户前端文件】否。

【自测情况】
- ESLint：零错误零警告 ✅
- Vite build：通过（3.99s）✅
- i18n 中英同步 ✅

【申请】申请一号审核合并。
