# 派工：二号 D 路——ManualOrder 接新画风模型（中风险）

> 一号派工 · 2026-08-05 · 风险等级：中（前端录单页，用户已确认需求）
> 工作目录：`D:\Hermes Agent CN Desktop\workspace\artist-commission-manualstyle`（worktree，分支 `v037-manual-style`，已建好）
> **开工第一步：`git merge master` 再读本文件**
> 需求来源：用户 2026-08-05 确认「手动录单接画风是需要的」。交互参照客户端 OrderForm 画风模式（已成熟实现）。

## 背景（一号已实锤，不要重新侦查）

**ManualOrder.vue 现状**：只有档位（tier）计价——`form.tierId` + `availableAddons`（tier.addons）+ `pricePreview`（旧 calculatePrice）。无画风入口。

**OrderForm.vue 画风模式（参照）**：`isStyleMode`（styles.length>0）→ 选画风（styles 列表）→ 选尺寸（style.sizes，带图/描述/天数）→ 增项（style.addons，select_mode: quantity/toggle/inquiry）→ `calculateStylePrice` 算价。多画风 4 步 / 单画风 3 步。

**后端 createOrder 已支持**：`styleSizeId` + `styleAddons` 参数（画风模式分支已接引擎 allocateInitial 生成分期）。ManualOrder 提交走 createManualOrder → createOrder，需确认该 API 已透传 styleSizeId/styleAddons（自查，若路由未透传需补，属授权内最小后端改动，声明）。

## 任务

### 1. ManualOrder.vue 画风模式接入（核心）

- 多画风开关开启（styles.length>0）时，录单页左栏「选择档位」区域升级为**画风→尺寸→增项**三级选择，交互对齐 OrderForm：
  - 选画风卡片（风格名 + 封面）
  - 选尺寸（价格/天数，对齐 ManualOrder 现有卡片式选择风格）
  - 增项勾选（select_mode 三种形态，复用 OrderForm 增项交互逻辑）
- 算价预览接 `calculateStylePrice`（实时算价，对齐现有 doCalc 防抖模式）
- G2 脏标记语义不变：手输价优先于计算价（priceTouched 逻辑保留）
- 单画风（styles.length===1）跳过选画风步直接选尺寸；无画风（旧档位模式）完全不动
- 提交时传 styleSizeId + styleAddons（替代 tierId/addons）

### 2. 初始节点状态（F4）在画风模式下的兼容自查

useStageStatus 与工作流节点绑定，与计价模式无关——自查确认画风模式下初始节点状态选择行为一致（预期零改动，报告说明即可）。

### 3. locales

新增键（zh-CN + en）：录单页画风/尺寸/增项相关文案，风格对齐 manualOrder.* 既有键。

## 授权文件

- `web/src/views/artist/ManualOrder.vue`（主体）
- `web/src/locales/zh-CN.js`、`web/src/locales/en.js`
- `web/src/composables/`（如需提取共享逻辑，声明）
- `server/src/features/order/order.routes.ts`（仅 createManualOrder 透传 styleSizeId/styleAddons，若现状未透传；最小改动，声明）

**禁碰**：order.service.ts / pricing-engine.ts / init.js / demo-data.ts（五号 C 路在改）。

## 验收

1. web 测试全绿（基线 173）+ 新增覆盖画风模式录单提交（styleSizeId/styleAddons 透传断言）
2. 浏览器实测：多画风画师录单页选画风→选尺寸→加增项→算价跟随→提交成功→订单详情价格/分期正确；旧档位模式录单回归不受影响
3. 交付报告：改动清单 + 后端透传是否需补 + 实测证据
4. commit `feat(artist): ...`，**交付后不要自行 merge**，转交一号
