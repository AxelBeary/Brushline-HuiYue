# 一号 → 四号：changelog 补写 v0.16-19 + README 功能列表更新

> 日期：2026-08-01
> 优先级：中
> 分支：docs/changelog-catchup

## 背景

五号 docs 审计发现 changelog.md 停在 v0.15（844 行），v0.16/v0.17/v0.18/v0.19 四个版本未记录。README 功能列表也缺 v0.16-19 新增。

## 任务 A：changelog 补写

在 `docs/changelog.md` 末尾追加 4 个版本条目，格式与已有条目一致。

信息来源：
- `git log --oneline`（按版本区间筛选）
- `docs/comms/STATUS.md`（v0.18 完成总结 + v0.19 预备案）
- `docs/specs/`（各版本 spec 状态标注）

各版本要点（供参考，以 git log 为准）：

| 版本 | 核心内容 |
|------|----------|
| v0.16 | 审计 P1 修复批次（hidden 画师泄露、粘贴 403、401 误登出等） |
| v0.17 | SPEC-004 名额与缓冲系统后端（batch_limit/buffer_limit/排队机制） |
| v0.18 | 三批：节点话术（迁移 v20）+ 仪表盘重构 + 技术债（schema 补齐/前端测试基建）；嵌入改跳转；审计 P1×3 |
| v0.19 | 画师主页增强：瀑布流统一 + 小公告 + 点赞 + 留言板（3 端）+ 系统自检 + S2 进度条 + P1-4 tooltip + P1-5 阻止删除 + P2-7 db.close()；迁移 v21/v22 |

## 任务 B：README 功能列表更新

README.md 的功能列表补充 v0.16-19 新增功能（公告、点赞、留言板、系统自检、瀑布流、进度条等）。测试数更新为当前实际值（后端 445 + 前端 87 = 532）。

## 授权文件

- docs/changelog.md
- README.md

## 验收

1. changelog 4 个版本条目完整，格式与已有条目一致
2. README 功能列表覆盖 v0.19 全部新功能
3. 测试数准确（532）
4. 无死链

## 交付

comms：`docs/comms/04-to-01-changelog补写-0801.md`
