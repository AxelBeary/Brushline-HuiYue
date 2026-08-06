# 派工：四号 · Beta 冲刺批 1 —— 文档同步更新

> 分支：`docs/beta-sync` · worktree：`../artist-commission-w4`
> 开工第一步：`git merge master` 再读本文件。
> 只动 docs/ 下文档文件，不推送不合并，干完写交付报告 commit 到自己分支。

---

## 任务摘要

仓库近期发生多项事实变化，维护文档未同步。把 `docs/维护说明书.md` 和 `docs/开发自参考.md`（及任何明显过时的文档）更新到与现状一致。**纯文档批，零代码改动。**

## 授权文件（只动这些）

- `docs/维护说明书.md`
- `docs/开发自参考.md`
- `docs/README.md`（如有过时段落，顺手核对）
- `docs/comms/STATUS.md`（**只读，不写**——STATUS 是一号维护）

**不要动**：`web/`、`server/`、`docs/soul/`、`docs/requirements/`（REQ 文档各自版本管理）、`docs/comms/` 除交付报告外。

---

## 需要同步的事实清单（2026-08-06 已发生的变更）

1. **开源协议**：主仓库 MIT → GPL-3.0 → **AGPL-3.0**（`LICENSE` 已改，README 已重写）。文档里凡提到 MIT/GPL-3.0 的地方改为 AGPL-3.0。
2. **开源仓库**：主仓库 [Brushline-HuiYue](https://github.com/AxelBeary/Brushline-HuiYue)（AGPL-3.0）+ 方法论仓库 [huiyue-multi-agent-playbook](https://github.com/AxelBeary/huiyue-multi-agent-playbook)（5 soul + 8 skills，CC BY-SA 4.0）。
3. **第三方署名**：`THIRD-PARTY-NOTICES.md` 已新增（字体 OFL / 图标 CC0 / 依赖许可）。
4. **登录方式**：QQ 登录 → **TOTP 动态口令**（RFC 6238，`npm run totp:rebind -- <QQ号>` 管理员自助重置）。文档中 QQ 登录相关段落更新。
5. **测试基线**：server **925/925**（58 文件）· web **215/215**（`docs/README.md` 已更新为 925+215，核对其他文档数字）。
6. **角色协作模式**：执行角色由用户在外部窗口开启、一号只做 master 门禁（2026-08-05 起）。文档中「子代理自拉」「一号代执行」相关描述更新。
7. **soul 体系**：`docs/soul/soul-0N-*.md` 已重写为红线制（身份/职责/权限/标准/协作/边界）。文档若引用旧 soul 结构需更新。

## 做法

1. 先读 `docs/维护说明书.md` 和 `docs/开发自参考.md` 全文，找出与上述事实冲突的段落。
2. 逐处更新；**没有冲突的段落不动**（避免无谓 diff）。
3. 发现文档里提到「A 测待启动」「未上线」等已过时阶段描述，按当前阶段（Beta 冲刺，目标几天内发布）更新或标注。
4. 输出一份「文档过时核对清单」附在交付报告：改了哪几处、依据是哪个 commit/文件。

## 交付要求

1. 交付报告：`docs/comms/04-to-01-交付-Beta冲刺批1-文档同步.md`，含核对清单。
2. commit 信息带「docs:」前缀，如 `docs: 维护说明书/开发自参考同步AGPL+TOTP+Beta阶段`。
