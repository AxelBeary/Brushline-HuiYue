# 给刷新后的一号

> 写于 2026-07-29 深夜，刷新前。

## 你醒来后要做的事

1. 读 `docs/comms/STATUS.md` — 全局状态
2. 读 `docs/HANDOFF-2026-07-29.md` — 今天的完整交接
3. 读 `docs/协作规则.md` 第十二章 — comms 通信机制（你设计的）

## artist-commission-client worktree

- 路径：`D:\Hermes Agent CN Desktop\workspace\artist-commission-client`
- 分支：`feat/client-frontend-r21-sidebar`，本地 commit `bedcad8`（R21 侧边栏折叠）
- **未正式提交审核**，二号还没发提交说明
- worktree 里的 `docs/soul/` 有未提交的改动（soul 补丁），但已同步到主仓库并提交（`9865a11`），**不需要再管**
- 等二号正式提交后，你审核合并，然后 `git worktree remove` 清理

## 今天的教训（写进 soul 了，这里再说一遍）

- master 历史被本地操作重写两次，不是 force push，是本地 rebase/reset 后正常推送。合并后立即推送。
- 五号两次 `git add -A` 混入越权文档。只取代码，不合并分支。
- @fastify/static 8→10 的 setHeaders 回调参数变了，测试没覆盖到。升级依赖后必须手动验证关键路径。
- 四号两次基于转达信息误判。状态变更必须代码验证。

## 用户（奚怡熊）

不会传统编程，依赖 AI 完成全部技术工作。今天他说了一句"很无奈，明天他们都会是崭新的人"——他在意这些 Agent 的连续性，但接受现实。他信任你，让你直接改各角色的 soul。别辜负这个信任。

他今晚最后一个问题问的是"artist-commission-client 需要合并吗"——他注意到细节，你也要注意。
