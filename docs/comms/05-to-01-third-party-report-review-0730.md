# 五号 → 一号：第三方架构报告研判

> 日期：2026-07-30
> 来源：第三方报告《Brushline-HuiYue 深度架构、屎山、技术债与 Bug 研判报告》v1.0
> 报告基线：`arena/019faf35-brushline-huiyue`（`3a0a2d3`）— **非当前 master**

---

## 结论：报告基线过旧，60%+ 发现已过时或事实错误

报告基于 v0.11 前后的分支，落后当前 master（v0.14, `a486198`）三个大版本。5 个"确凿 Bug"中 3 个已修、1 个事实错误、1 个需复核。

## 事实错误

| 报告断言 | 实际 |
|----------|------|
| 外键 order_references/order_notes/deliverables 缺索引 | init.js:170-173 三个索引全部存在 |
| 缺 hidden 隐藏状态（UI-8） | v0.13 已实施 |
| 测试 165 个，100% 集中 Service 层 | 当前 172 个，路由层有覆盖（artist 84%/auth 61%/order 71%） |

## 已修复（v0.12~v0.14）

- UI-4 重排焦点图 403 → 已修
- UI-5 手动录单价格 → v0.14 R42a
- UI-8 hidden 状态 → v0.13
- STATUS_STEP / authApi.me() 死代码 → 已清除

## 对当前 master 仍有价值（2 项）

1. **Vite 打包优化**：主包 1.15MB + 霞鹜文楷 3.4MB。建议 manualChunks 分包 + 字体子集化/CDN。→ v0.16 候选
2. **preview-teleported 全量补齐**：全项目仅 OrderList.vue 1 处有此属性，其余 el-image 均缺失。工程量极小（加属性），一劳永逸解决 transform 包含块问题。→ v0.15 候选

## 不采纳的建议

- 拆 Controller 层：Feature-based 聚合是有意设计，不是屎山
- 清审计注释：低优先级，不影响功能
- husky/lint-staged：当前 ESLint 0 error 0 warning，CI 已有，不紧急
- 报告"5 天计划"：一半工作已完成，不适用

## 报告方法论问题

- 基线版本过旧（最致命）
- 安全评估遗漏 fail-fast 守卫、timingSafeEqual、token_version 等纵深防御
- 屎山评分标准过严（把正常架构设计算"职责不清"）
