# 四号→一号：文档维护审计完成（2026-08-02）

## 结论

全面检查完毕，10 个文件已更新，commit `154a637` 已推送。

## 改动明细

| 文件 | 改了什么 |
|------|----------|
| **README.md** | ① 功能列表补 v0.20-v0.24 共 16 条新功能 ② 技术栈表补 TS/tsx/Sentry/Playwright ③ 测试数 445→489 ④ 文档链接区 changelog 版本范围 + 待修复清单描述更新 |
| **docs/changelog.md** | 补写 v0.20~v0.24 共 5 个版本条目（从 git log 还原） |
| **docs/CONTEXT.md** | 测试数 482→489 |
| **docs/soul/soul-01-lead.md** | L93 "五色主题"→"四色主题"（实际 4 配色） |
| **docs/soul/soul-03-backend-artist.md** | L22 "v1–v23"→"v1–v24" |
| **docs/specs/plan-v023-schedule.md** | 状态→"📦 已归档" |
| **docs/specs/plan-v023-quota-pool.md** | 状态→"📦 已归档（v0.23 已实现）" |
| **docs/requirements/REQ-013-画师反馈批次** | 状态→"✅ 已整理，见 REQ-013-整理.md" |
| **docs/requirements/REQ-013-整理.md** | 状态→"✅ 一号已审核排期（v0.24-A/B 已合入）" |
| **docs/待修复问题清单.md** | 补 P0 三项（✅ 已修复）+ P1 四项（🔵 修复中）状态 |

## 未改（无需改）

- soul-02 / soul-04 / soul-05：无过时内容
- SPEC-005：状态"待一号审核"正确（尚未排期）
- REQ-012：状态正确（D1-D3 已拍板，F5 日历视图→SPEC-005）

## 备注

- changelog v0.20-v0.24 从 git log 还原，个别日期可能有一天偏差（标的是 commit 日期）
- 未移动 plan-v023 文件到 archive/（只标了归档状态，物理位置不动，避免链接失效）
