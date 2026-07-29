# 二号 → 一号：worktree 冲突事故报告 + 两个需求发现

> 日期：2026-07-30
> 严重度：中（已完全修复，无数据损失，未推送污染）

---

## 一、事故：R39 commit 误入三号分支

### 经过

1. 我在主 worktree（`workspace/artist-commission`）切出 `feat/client-frontend-v014` 后开始编辑文件
2. 编辑期间，三号在同一主 worktree 操作，将分支切换到他的 `feat/backend-artist-v014`（track-on 接口开发）
3. 我完成编辑后执行 commit——此时 HEAD 已是三号的分支，且三号有 7 个已 staged 的 docs 文件
4. 我的 `git add` + `git commit` 把他的 7 个 docs 文件和我的 4 个前端文件一起提交到了他的分支（commit `92f69f7`，11 files）

### 修复（非破坏性，三号分支未推送，已完整恢复）

1. `git reset --soft 66c3bd2`（三号分支回到事故前 HEAD）
2. `git restore --staged .`（所有文件回到工作区，三号 7 个 docs 改动完好保留）
3. 我的 4 个文件复制到新建的专属 worktree 后重新 commit（`6ad6815`，仅 4 files）
4. 主 worktree 中我的 4 个文件已清理（`git restore` + 删除新文件），三号的工作区恢复原状

### 根因

**多角色共享主 worktree**。worktree 列表显示项目已有 8 个角色专属 worktree，但主 worktree 仍在被多角色同时使用。

### 预防措施（已执行 + 建议）

- ✅ 我已创建专属 worktree：`workspace/artist-commission-client-v014`（分支 `feat/client-frontend-v014`），后续所有操作只在这里进行
- **建议一号定规则**：主 worktree 仅供一号合并使用，其他角色一律在自己的 worktree 操作。共享 worktree 下 `git checkout` 会静默改变所有人的工作基底，本次事故只是时间问题

---

## 二、需求发现 1：R46 备注删除 API 不存在

核实后端全部路由：**没有 DELETE notes 接口**，前端也没有删除备注按钮。REQ-008 R46 现状表写的"删除备注：无确认（直接删除）"不准确——实际是**删除功能本身不存在**。

R46 原需求"删除备注加轻量行内确认"的前置条件不成立。两个选项：

- **选项 1（推荐）**：R46 扩展为"备注删除功能 + 轻量行内确认"——需要三号加 DELETE notes 接口（`DELETE /artist/orders/:id/notes/:noteId`），前端加删除按钮 + 行内确认
- **选项 2**：R46 本轮跳过，等 v0.15 有删除 API 后再做确认交互

请拍板。选 1 的话需要给三号追加指令。

---

## 三、需求发现 2：R42 链式影响 Dashboard.vue

R42a 删除 `/manual-order` 路由后，`Dashboard.vue` 有两处引用会受影响：

- 46 行：快捷按钮 `$router.push('/manual-order')`
- 82 行：默认面板配置 `manual: { route: '/manual-order' }`

**我的处理方案**（不越权改 Dashboard.vue）：路由重定向 `/manual-order → /orders?action=manual` 已保证这两处**功能不断**（点击后跳转订单页并自动打开录单抽屉）。Dashboard.vue 的文案/路由更新建议一号安排（或授权我顺手改，2 行代码）。

---

## 四、好消息：track-on 后端已就绪

三号已将 `PUT /artist/orders/:id/track-on` 合入（`enableTracking`：设第一节点，status 保持不变，409/400 防御完整）。R39 的"启用跟踪"按钮**已直接接线，无需 mock**。

---

## 当前进度

- ✅ R39 已 commit（`6ad6815`，feat/client-frontend-v014，eslint 零错误）
- 🔵 继续 R42a（等一号对 R46 拍板，不阻塞 R42a/R42b/R44/R43/R45/R41）
