# 派工：五号 · Beta 冲刺批 4a —— OrderList 三标签换纸墨语义色（快速批）

> 分支：`beta/visual-od01` 续用 · worktree：`../artist-commission-w7`
> 开工第一步：`git merge master` 再读本文件。
> 只动下面「授权文件」列表内文件，不推送不合并，干完写交付报告 commit 到自己分支。

---

## 任务摘要

用户反馈（2026-08-06 口述）：订单管理列表（`OrderList.vue`）「优先级/状态/来源」三个列标签颜色太丑（EP 出厂色：红/橙/绿/蓝/灰，与纸墨盘设计系统不搭）。**换为纸墨语义色**，与 QueueBoard 优先级色条一致。其他颜色用户认可，不要动。

## 授权文件（只动这些）

- `web/src/views/artist/OrderList.vue`（scoped 样式 + 渲染微调）

**不要动**：`web/src/constants/order.js`（共享常量，QueueBoard 等在用，别改全局映射）、`web/src/styles/artist-tokens.css`、其他任何文件。

---

## 任务：三标签换纸墨语义色

**背景**：QueueBoard 已有语义色条（`QueueBoard.vue:1313-1315`）：
```css
.priority-high { border-left-color: var(--zhe); }    /* 赭石 */
.priority-medium { border-left-color: var(--th); }   /* 藤黄 */
.priority-low { border-left-color: var(--ink4); }    /* 中性灰 */
```
OrderList 的 el-tag 用的是 EP 出厂 type（`PRIORITY_TYPE`/`ORDER_STATUS_TYPE` 映射到 danger/warning/success/info/primary），与纸墨盘不统一 → 丑。

**做法**（`OrderList.vue`）：

1. **el-tag 加 class**：三个列标签（L57/L64/L69）各加业务 class：
   - 优先级：`:class="`prio-tag prio-tag--${row.priority}`"`
   - 状态：`:class="`status-tag status-tag--${row.status}`"`
   - 来源：`:class="`source-tag source-tag--${row.source === 'self' ? 'self' : 'manual'}`"`
   - ⚠️ 保留 `:type="..."` 不动（type 决定 EP 默认底色，class 用更高特异性覆盖；或去掉 type 纯用 class——**先试 class 覆盖**，若 EP 默认色盖不住再加 `!important`）

2. **scoped 样式**（`<style scoped>` 内加）——优先级三档 + 来源两档 + 状态按语义映射到纸墨色：
```css
/* 纸墨语义色标签（OrderList 专用，不污染全局） */
.prio-tag--high { background: var(--zhe); color: #fff; border-color: var(--zhe); }
.prio-tag--medium { background: var(--th); color: #fff; border-color: var(--th); }
.prio-tag--low { background: var(--ink4); color: #fff; border-color: var(--ink4); }

.source-tag--self { background: var(--hq); color: #fff; border-color: var(--hq); }
.source-tag--manual { background: var(--ink3); color: #fff; border-color: var(--ink3); }
```
- 状态列按既有 ORDER_STATUS_TYPE 语义走纸墨色：
  - pending（待确认）= `var(--th)` 藤黄
  - confirmed（已确认）/ wip（进行中）= `var(--hq)` 花青
  - revision（返修）= `var(--zhe)` 赭石
  - done / delivered（完成/已交付）= `var(--sl)` 石绿
  - cancelled（取消）= `var(--zs)` 朱砂
  ```css
  .status-tag--pending { background: var(--th); color: #fff; border-color: var(--th); }
  .status-tag--confirmed, .status-tag--wip { background: var(--hq); color: #fff; border-color: var(--hq); }
  .status-tag--revision { background: var(--zhe); color: #fff; border-color: var(--zhe); }
  .status-tag--done, .status-tag--delivered { background: var(--sl); color: #fff; border-color: var(--sl); }
  .status-tag--cancelled { background: var(--zs); color: #fff; border-color: var(--zs); }
  ```
- 字号/圆角保持 EP 默认 small（只换颜色）
- ⚠️ 白字对比度注意：藤黄 `--th #966C0A` 白字 6.28:1 ✓、花青/石绿/赭石/朱砂深色白字均达标（设计师已核）

3. ⚠️ **el-tag 默认样式特异性**：EP `.el-tag--small` 有背景色。scoped 下 `.status-tag--wip`（0,2,0）对 `.el-tag--warning`（0,1,0）**特异性够**；但若 EP 用 `!important` 或后加载压过，补 `!important`（先试不加，build 后实测 computed style 确认）。

**验证**：
- 浏览器实测 OrderList：三种优先级（高/中/低）、六种状态、两种来源标签颜色 = 纸墨语义色（computed style 取证 rgb）
- 截图 before/after 各一张（`docs/audit-screenshots/beta-tags/`）
- `npx vitest run`（web）215/215；`npx eslint web/src/views/artist/OrderList.vue`
- 交付报告：`docs/comms/05-to-01-交付-Beta冲刺批4a-标签换色.md`

**commit**：`beta: OrderList三标签换纸墨语义色(优先级赭石藤黄中性/状态五色/来源花青墨灰)`
