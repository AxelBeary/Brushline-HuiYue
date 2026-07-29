# 二号 → 一号：v0.12 前端提交审核（R15 + R18 + R19）

> 日期：2026-07-30
> 分支：`feat/client-frontend-v012`（worktree: artist-commission-client）
> 基于：origin/master（eae0ae3）

---

【角色】
二号：客户页面前端负责者

【工作分支】
feat/client-frontend-v012

【任务编号】
R15（外链列表）+ R18（订单图库）+ R19（备注附图）

【修改模块】
画师端页面（Settings / OrderDetail）+ 客户主页模板（Classic）+ composable + API 层 + i18n

【修改内容】

**R15 外链列表**（commit 92bb2a6）：
- Settings.vue：PUT profile 全量 camelCase 迁移（破坏性变更同步）；微博/B站输入框 → 链接列表编辑器（增/删/排序 + 8 种图标选择器，上限 6 条）
- useArtistData.js：socialLinks 数据源从 weiboUrl/bilibiliUrl 切到 customLinks 数组（后端拼好含旧列回退，前端不碰旧字段）
- ArtistHomeClassic.vue：外链区增加文字徽标（微/B/P/X/红/L/抖/🔗）
- i18n：新增 linksLabel/linkName/addLink/linksHint，删除 weiboLabel/bilibiliLabel

**R18 订单图库**（commit 9269376）：
- OrderDetail.vue 参考图区块升级为"订单图库"：
  - 上传磁贴（拖拽/点击/Ctrl+V 三种方式，复用 usePasteUpload）
  - 来源角标（客户=半透明黑底白字 / 画师=主色底白字）
  - 点击图片 = 设为焦点（替代独立"设为焦点"按钮）
  - 焦点指示器（左上角 ✓ 圆标）
  - 悬停删除（保留）
  - 计数显示（N / 20）
- api/index.js：addNote 签名改为对象参数（兼容 R19 imagePath）

**R19 备注附图**（commit 9269376）：
- OrderDetail.vue 备注区：
  - 输入框旁附图按钮（文件选择器，单张）
  - Ctrl+V 焦点路由：备注输入框聚焦时粘贴 → 备注附图（单张）；否则 → 图库（多张）
  - 待发送附图预览（缩略图 + 取消按钮）
  - 备注流：带图备注显示 80px 缩略图，点击 el-image-viewer 看大图
- api/index.js：新增 uploadApi.noteImage()（POST /api/upload/note-image）

**死键清理**（commit 5579757）：
- 删除 setFocus/focusSelected/focusSelectFirst/focusMode/focusOff/focusSmall/focusLarge（R18 移除焦点按钮 + R20 迁移后无引用）

【涉及文件】
- web/src/views/artist/Settings.vue
- web/src/views/artist/OrderDetail.vue
- web/src/views/client/templates/ArtistHomeClassic.vue
- web/src/composables/useArtistData.js
- web/src/api/index.js
- web/src/locales/zh-CN.js
- web/src/locales/en.js

【是否修改非客户前端文件】
是。修改了 web/src/api/index.js（addNote 签名变更 + noteImage 新增）和 web/src/locales/*.js（i18n 键增删）。
原因：R19 需要新上传端点封装；R15 需要新 i18n 键。均在一号开工指令授权范围内（"授权文件：web/src/ 下"）。

【接口依赖】
| 接口 | 前端调用方式 |
|------|-------------|
| PUT /api/artist/profile | camelCase 字段 + customLinks 数组（已同步破坏性变更） |
| GET /api/artist/profile | 读 custom_links JSON 字符串，前端 JSON.parse |
| GET /api/artists/:subdomain | 读 customLinks 数组（后端拼好） |
| POST /api/upload/reference | 画师加图上传，返回 { filePath, url, originalName, size } |
| POST /api/artist/orders/:id/references | 关联到订单，后端自动 source='artist'，返回完整签名订单 |
| POST /api/upload/note-image | 备注附图上传（requireAuth），返回 { filePath, url } |
| POST /api/artist/orders/:id/notes | body: { content, imagePath? }，返回签名订单（notes 带 imageUrl） |

【自测情况】
| 检查项 | 结果 |
|--------|------|
| ESLint `npx eslint .` | ✅ 零错误零警告 |
| Vite build | ✅ 通过（4.09s） |
| Rebase origin/master | ✅ 无冲突（基于 eae0ae3） |
| console.log / TODO / v-html | ✅ 无残留 |
| i18n 键中英同步 | ✅ 所有新增键双语 |
| 死键清理 | ✅ 已删除 7 个无引用键 |
| 改动文件范围 | ✅ 仅 web/src/ 下 7 文件 |

**需人工验证项**（无浏览器环境）：
- Settings：链接编辑器增/删/排序/保存/回显
- Settings：camelCase 迁移后保存不 400
- Classic 模板：外链徽标渲染 + 老画师回退显示
- OrderDetail 图库：拖拽/点击/粘贴上传、来源角标、点击设焦点、删除
- OrderDetail 备注：附图上传/粘贴、缩略图、大图查看、纯文字备注照常

【可能影响】
- 画师端 Settings.vue：camelCase 迁移是破坏性变更，不改则 PUT profile 400
- 画师端 OrderDetail.vue：参考图区块 UI 大改（焦点按钮移除，改为点击图片）
- 客户端 Classic 模板：外链区渲染逻辑变更（读 customLinks）
- Gallery/Folio/Atelier 模板：不受影响（未使用 socialLinks）
- 管理后台/嵌入脚本：不受影响

【待确认问题】
1. `usePasteUpload` 的焦点路由依赖 `document.activeElement?.closest('.note-input')`——若 Element Plus 的 el-input 内部 focus 事件导致 activeElement 不是 .note-input 子元素，粘贴路由可能失效。需人工验证。
2. Gallery/Folio/Atelier 三个模板当前不展示外链（原本就没有），R15 未新增。若四号要求四个模板都展示，需追加任务。

【申请】
申请一号审核合并。
