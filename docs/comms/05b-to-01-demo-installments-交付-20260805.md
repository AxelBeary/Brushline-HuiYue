# 交付报告：五号-B 演示订单分期节点缺口修复

> 来自：五号-B | 2026-08-05
> 分支：`fix/v036-demo-installments`（基于 merge 后 master 8fe5050）
> Commit：`d779361`（未推送未合并，等一号审核）

## 方案选择：复用现有函数（任务书方案 1 的更省力变体）

任务书说「若 order.service.ts 没有现成导出，可从 createOrder L279-300 抽函数」——实际 **L799 已有私有函数 `generateInstallmentsForOrder(orderId)`**（SPEC-004 递补场景写的），幂等检查、工作流节点过滤、金额公式都与 createOrder 一致。所以实际改动只有：

1. `function` → `export function`
2. 补 `queue_zone !== 'formal'` 守卫（对齐 createOrder L279 条件；promoteOrder 在 L839 先 UPDATE zone 再调用，守卫不影响递补路径）
3. demo-data 直插订单后调用之

**不选直插补齐（方案 2）**：那是分期生成逻辑的第三份拷贝（createOrder 一份、该函数一份），公式变更要同步三处。

**未动 createOrder L279-301 内联段**：那是核心下单路径，与导出函数去重超出本任务授权，列为清账建议（见遗留 2）。

## 修改文件（3 个，均在授权内）

| 文件 | 改动 |
|------|------|
| `server/src/features/order/order.service.ts` | 导出 + queue_zone 守卫 + 注释（净 +10/-4） |
| `server/scripts/demo-data.ts` | import + 插单后调 generateInstallmentsForOrder + assertFieldIntegrity 加分期断言（C-4 延伸） |
| `server/tests/order.service.test.js` | TC-O-38/38b/38c/38d（生成/幂等/buffer 守卫/无报价跳过） |

## 验证结果

- tsc ✓ · eslint 零警告 ✓ · vitest 全量 41 文件 **699/699** ✓（基线 695 + 新增 4）
- **容器实跑**（commission-web，派工可选项，已做）：
  - 修前复现：ALICE-001~004 分期全空（0 行）✓
  - 修后：每单 3 行，金额合计 = 总价 ✓
  - 幂等：复跑一次脚本仍 12 行不重复 ✓（脚本开头 DELETE 订单走 FK CASCADE 清旧节点，双保险）
  - E2E：`/api/orders/track/ALICE-001?qq=99001` 返回完整分期明细（paid/partial/pending 状态正确）✓
  - 验证后容器代码已从备份还原，临时文件已清

**注意金额差异不是 bug**：单测用默认模板（排期确认 3000 + 交付 7000），容器里 alice 的工作流是管理员自定义的 3 收款节点（3000/3500/3500）。函数按画师实际工作流生成，两者都对。

## 事故记录（环境工具副作用）

`npm approve-scripts` 把 allowScripts 配置写进了 `server/package.json`（授权外），commit 前发现并 `git checkout` 还原。教训：**本机 npm 有 install-script 审计，worktree 首次 npm install 后必须 git status 检查 package.json 是否被污染**。

## 遗留 / 提请注意

1. **STATUS.md「已知遗留」BUG-1 方案 b 条目疑似过期**：git 已有 `18bab37 fix(order): BUG-1方案b——getOrderInstallments改读额度池…` 合入 master，但 STATUS 仍写「v0.36 第一个任务（五号）」。请一号核实更新。本任务（补分期节点）正是方案 b 池子推算的前置——现在演示数据上节点已可推。
2. createOrder 内联分期段与 generateInstallmentsForOrder 逻辑重复，建议 v0.36 清账池合并（本任务未动）。
3. done/delivered 终态订单也生成了分期（任务书要求正式区工作流订单全生成，未排除终态，与 createOrder 条件一致）。若认为终态不该有分期，是需求调整，需一号拍板。
