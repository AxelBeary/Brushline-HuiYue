# 五号交付：Beta 冲刺批4a —— OrderList 三标签换纸墨语义色

> 分支 `beta/visual-od01` 续用 · worktree `../artist-commission-w7`
> 开工前已 `git merge master`（master 已含批3 合入 `1df1181`/`4997737`，分支续用干净）
> 验证环境：隔离 server 3999（DB_PATH/UPLOAD_DIR/AUTH_DEV_MODE 隔离）+ vite 5175，seed + 标签矩阵 13 订单，已清理
> 视觉验收 = 量化证据 + before/after 截图，**用户口述判定**

---

## 任务：三标签换纸墨语义色 ✅

**改动**（仅 `web/src/views/artist/OrderList.vue`，单文件）：
1. **模板**：优先级/状态/来源三个 el-tag 各加业务 class（`:class="`prio-tag prio-tag--${row.priority}`"` / `` `status-tag status-tag--${row.status}` `` / `` `source-tag source-tag--${row.source === 'self' ? 'self' : 'manual'}` ``），`:type` 保留不动（EP 兜底）
2. **scoped 样式**（OrderList 专用，不污染全局，与 QueueBoard 色条语义一致）：
   - 优先级：高=`--zhe` 赭石 / 中=`--th` 藤黄 / 低=`--ink4` 中性灰
   - 来源：自助=`--hq` 花青 / 手动=`--ink3` 墨灰
   - 状态：pending=`--th` / confirmed+wip=`--hq` / revision=`--zhe` / done+delivered=`--sl` 石绿 / cancelled=`--zs` 朱砂
   - 全部实底 + 白字；字号/圆角保持 EP small（只换颜色）

**验证（浏览器实测 computed style，13 订单矩阵全覆盖）**：
| 标签 | after bg (rgb) | 纸墨变量 | 预期 |
|---|---|---|---|
| 高 | 138,90,51 | --zhe 赭石 | ✓ |
| 中 / 待确认 | 150,108,10 | --th 藤黄（批3 调深值自动联动）| ✓ |
| 低 | 179,174,159 | --ink4 中性灰 | ✓ |
| 已确认 / 制作中 / 自助 | 51,82,110 | --hq 花青 | ✓ |
| 修改中 | 138,90,51 | --zhe 赭石 | ✓ |
| 已完成 / 已交付 | 47,125,84 | --sl 石绿 | ✓ |
| 已取消 | 188,58,43 | --zs 朱砂 | ✓ |
| 手动 | 141,136,122 | --ink3 墨灰 | ✓ |

**全部 12 个标签组实底 + 白字，scoped 特异性 0,2,0 压过 EP 0,1,0，无需 !important**（派工预判的 fallback 未启用）。

**before 实况说明（重要）**：实测 before 并非纯 EP 出厂色——后台主题已把 `--el-color-*` 映射到纸墨变量（artist-tokens.css L102-105），EP light 变体标签实际呈现「浅底深字」（danger 已是朱砂色系、success 已是石绿色系、primary 浅底花青文字）。用户嫌弃的「丑」= **浅底深字的 EP light 变体形式**与纸墨盘不协调；after = 实底白字色块，与 QueueBoard 一致，正是派工意图。

---

## 验证门禁

| 项 | 结果 |
|---|---|
| ESLint（OrderList.vue） | ✅ 零错误 |
| web vitest | ✅ **215/215**（与基线一致） |
| build | ✅ 成功（5.81s） |
| server 测试 | 未跑（纯前端，server 零改动） |

## 截图（`docs/audit-screenshots/beta-tags/`，供用户口述验收）

- `orderlist-after.png`：13 订单矩阵，全部纸墨实底标签（高=赭石/中=藤黄/低=灰、状态五色、来源花青墨灰）
- `orderlist-before.png`：同一列表旧样式（EP light 浅底深字）

## 清理

隔离进程已停、测试库/uploads/日志已删、临时脚本（造数/TOTP）已删、vite 临时配置已删。`git status` 仅剩 OrderList.vue + 截图目录。
