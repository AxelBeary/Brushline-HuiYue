# 交付：二号 D 路——ManualOrder 接新画风模型（完成）

> 二号交付 · 2026-08-05 · 分支 `v037-manual-style` · commit `670192e` · 请一号审核，勿自行 merge

## 做了什么

ManualOrder.vue 画风模式接入（派工文件 01-to-02-D路-ManualOrder接画风-20260805.md 全部完成）：

1. **三级选择**：多画风时右栏「档位」区升级为 画风→尺寸→增项 三级选择，交互逐句对照 OrderForm/useOrderForm（选画风重置尺寸+增项+价格、选尺寸重置增项并防抖算价、增项 switch/quantity/radio 三形态）
2. **单画风**：自动选中唯一画风，跳过选画风直接选尺寸
3. **无画风（旧档位模式）**：完全不动（v-if 隔离，回归已验证）
4. **算价**：接 `calculateStylePrice`，300ms 防抖（对齐旧 doCalc 模式），价格面板显示 基础价/增项/倍率后/总价
5. **G2 脏标记**：语义保留——未手输时跟随计算价（直接写 finalPriceYuan 不置脏），手输价优先；updatePrice 的计算价来源按模式取（stylePricePreview vs pricePreview）
6. **提交**：画风模式传 `tierId: null + styleSizeId + styleAddons`（addons 空数组），未选尺寸拦截提示；F4 初始节点状态自查确认与计价模式无关（零改动）
7. **locales**：新增 9 键（styleTitle/sizeTitle/sizeDays/noSizes/styleAddonsEmpty/addonOptionPrice/selectSizeFirst/afterMultiplier），zh-CN + en 同步，只加不改

## 后端透传自查结论

**无需后端改动**。createManualOrder（order.routes.ts）schema 已含 styleSizeId/styleAddons（466-480 行）并透传 createOrder（511-512 行），且后端已有 styleSizeId 与 tierId 互斥校验。禁碰文件未动。

## 改动文件

- `web/src/views/artist/ManualOrder.vue`（主体：模板三级选择 + script 画风状态/算价/提交）
- `web/src/locales/zh-CN.js`、`web/src/locales/en.js`（新增 9 键）
- `web/src/views/artist/__tests__/ManualOrder.stylemode.test.js`（新增 6 用例）

## 验证结果

| 项 | 结果 |
|---|---|
| web vitest 全量 | **179/179 通过**（基线 173 + 新增 6：多画风透传/单画风退化/旧档位回归/未选尺寸拦截/切画风重置/radio optionLabel） |
| ESLint | 零错误零警告 |
| 浏览器实测·多画风（Alice） | 3 画风卡片→选厚涂插画→3 尺寸→选半身像¥180→佳人×2→价格面板 ¥460 跟随→提交 ALICE-005→详情 total_price_cents=46000、tier_id=null、quote 画风明细正确，**分期 13800+15180+17020=46000 守恒** |
| 浏览器实测·单画风（Carol） | 无画风选择区，直接选尺寸提交 CAROL-001，total=6000 |
| 浏览器实测·旧档位（Bob） | 禁默认画风后回退档位卡片，提交 BOB-001，total=35000、tier_id=243，不受影响 |

实测过程：Hermes 浏览器 localStorage 被拒（自动化环境问题，非代码）→ 降级本地 Playwright 完成全部实测。测试订单全部取消、测试增项已删、Bob 画风已恢复 is_active=1、临时脚本已删（git 干净）。

## 已知说明

- 实测时给 Alice「厚涂插画」临时挂了一个增项（正规 API）用于验证增项路径，测完已删除恢复原状
- Browserbase 崩坏症状（localStorage Access denied）在本次实测再次出现，已按 skill 配方降级 Playwright
