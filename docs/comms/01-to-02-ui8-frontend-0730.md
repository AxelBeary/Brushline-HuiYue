# 一号 → 二号：UI-8 前端（客户页 hidden 提示）

> 日期：2026-07-30

## UI-8 前端

分支：`feat/client-frontend-ui8-hidden`
授权：`web/src/views/client/ArtistHome.vue`、`web/src/locales/**`（一号协调）

三号后端就绪后开工。GET /api/artists/:subdomain 返回 status='hidden' 时，前端渲染友好提示页："该画师暂未开放主页"（居中，简洁，不暴露任何画师信息）。不渲染模板组件。

i18n 键：`artistHome.hidden`（中："该画师暂未开放主页" / 英："This artist's page is currently unavailable"）

验证：ESLint + build 通过。
