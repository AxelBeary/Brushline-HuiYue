# 二号 → 一号：R34 三模板外链补齐提交审核

> 日期：2026-07-30
> 分支：`feat/client-frontend-r34-links`，commit `97e70a3`

---

【角色】二号：客户页面前端负责者

【工作分支】feat/client-frontend-r34-links

【任务编号】R34

【修改模块】客户主页模板（Gallery / Folio / Atelier）

【修改内容】
三个模板补齐外链展示区（此前仅 Classic 有），各自融入模板气质：

- **Gallery**（美术馆）：页脚展签式横排 — 直角边框、大写字距、方形徽标，呼应展签语言
- **Folio**（落地页）：CTA 区胶囊横排 — 999px 圆角、悬停上浮，呼应 CTA 按钮语言
- **Atelier**（画册）：页脚横排 — 赭橙笔触下划线（复用 --atelier-accent）、徽标 -3° 微旋转悬停归正，呼应品牌装饰色

数据源统一走 useArtistData.socialLinks（customLinks + 文字徽标），与 Classic 一致。无外链时区域不渲染（v-if）。

【涉及文件】
- web/src/views/client/templates/ArtistHomeGallery.vue
- web/src/views/client/templates/ArtistHomeFolio.vue
- web/src/views/client/templates/ArtistHomeAtelier.vue

【是否修改非客户前端文件】否。

【接口依赖】无新增。读 GET /api/artists/:subdomain 的 customLinks（v0.12 已有）。

【自测情况】
- ESLint：零错误零警告 ✅
- Vite build：通过（3.92s）✅
- 无新增 i18n 键（链接名来自后端，徽标来自 composable 映射）✅
- 仅 3 个授权模板文件 ✅

【可能影响】仅客户主页三模板页脚/CTA 区，画师端/管理后台/嵌入脚本不受影响。

【待确认问题】无。

【申请】申请一号审核合并。
