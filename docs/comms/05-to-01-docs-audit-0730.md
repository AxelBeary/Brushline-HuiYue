# 五号 → 一号：文档审计完成

> 日期：2026-07-30
> 分支：`fix/docs-audit-v014`（worktree: `artist-commission-docs-audit`）
> commit：`cd69a5f`

---

## 做了什么

按一号指令（`01-to-05-docs-audit-0730.md`）逐项检查 6 类文档，修正所有与 v0.13 现状不一致的内容。

## 改了哪些文件

| 文件 | 修改内容 |
|------|----------|
| docs/待修复问题清单.md | 头部 v0.12→v0.13；UI-2/UI-3(重复)/UI-4/UI-7/UI-8/P1-5 标关闭（精简为修复摘要）；测试数 145→165；补 v0.13 修复批次 |
| docs/开发自参考.md | 测试数 118→165；迁移 v1~v11→v1~v14；DB schema 补 custom_links/source/image_path/current_stage_id/hidden；API 补 stage/stage-back/references 端点；补 useSignatureRefresh composable；注意事项 69~76 条（v0.12/v0.13） |
| docs/specs/SPEC-002-R30d-流程状态机.md | 状态"待用户确认"→"已实施" |
| docs/requirements/REQ-005-客户侧体验反馈批次.md | 状态标注"已审核，全部延期" |
| docs/requirements/REQ-006-画师侧反馈批次.md | 状态标注"已审核，部分实施"；R27/R30 标 ✅ |
| docs/requirements/REQ-007-v0.13规划.md | 状态标注"已审核，核心项已实施" |
| README.md | 测试数 114→165；changelog 范围 v0.11→v0.13；Caddyfile"泛解析"→"路径访问"；待修复清单描述更新；功能列表补 v0.12/v0.13 共 7 项 |

## changelog.md

已核实 v0.13 条目完整覆盖所有合入内容，格式与历史一致，**无需改动**。

## 验证结果

- [x] 只改文档，未动代码
- [x] git diff --stat 确认 7 个文件全在授权列表内
- [x] 无授权外文件（OrderDetail.vue 工作区残留未被 add）

## 事故记录

首次 commit 误落在 `feat/backend-artist-v014`（三号分支），原因是主 worktree 当时 checkout 在该分支而非 `fix/docs-audit-v014`。已立即 `git reset --soft HEAD~1` 撤销，为 `fix/docs-audit-v014` 建独立 worktree（`artist-commission-docs-audit`），cherry-pick 恢复。三号分支无残留。

## 备注

- 工作区有 `web/src/views/artist/OrderDetail.vue` 未提交改动（223 行），非五号产生，未触碰
- REQ-008/REQ-009 为四号新写（v0.14/v0.15 规划），格式合规，无需修改
