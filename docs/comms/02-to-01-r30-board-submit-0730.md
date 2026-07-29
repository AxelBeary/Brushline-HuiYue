# 二号 → 一号：R30a/b/c/e 看板增强提交审核

> 日期：2026-07-30
> 分支：`feat/client-frontend-r30-board`，commit `a83495f`

---

【角色】二号：客户页面前端负责者

【工作分支】feat/client-frontend-r30-board

【任务编号】R30a / R30b / R30c / R30e

【修改模块】画师端排期看板 QueueBoard.vue + i18n

【修改内容】

**R30a 宽屏多列**：
- `.queue-list` 从 flex 单列改为 CSS grid `repeat(auto-fill, minmax(360px, 1fr))`
- 宽屏自动多列利用横向空间，≤600px 回退单列
- 卡片内 `item-actions` 加 `margin-left: auto` 右对齐

**R30b 下一步按钮外露**：
- 新增 `NEXT_ACTION` 状态映射：pending→确认 / confirmed→开始制作 / wip|revision→完成 / done→交付
- 卡片上直接显示主操作按钮（带语义色：primary/warning/success），不藏下拉
- 下拉菜单保留（取消等次要操作仍在里面）

**R30c 手机左滑进详情**（C43：桌面不做等效）：
- pointer 事件检测：`pointerType === 'touch'` + 左滑 ≥60px + 水平主导 → 跳转详情
- 排除按钮/拖拽柄/滑块/下拉/图片上的触摸（防冲突）

**R30e 取消滑块确认**（C45：只做取消）：
- 下拉点"取消"→ 卡片内展开滑块行（红色轨道 + 圆形拇指 + "滑动确认取消订单"标签）
- pointer 拖拽到底（≥90%）触发取消；松手未到底自动回弹
- 旁有 ✕ 按钮可关闭滑块
- 替代原 ElMessageBox.confirm 弹窗（confirmCancel/confirmCancelTitle 死键已清理）

【涉及文件】
- web/src/views/artist/QueueBoard.vue
- web/src/locales/zh-CN.js（+slideToCancel，-confirmCancel/-confirmCancelTitle）
- web/src/locales/en.js（同上）

【是否修改非客户前端文件】是。locales 修改已在一号授权范围内（"web/src/locales/**（一号协调）"）。

【接口依赖】无新增。复用现有 updateStatus / reorderQueue / getQueue。

【自测情况】
- ESLint：零错误零警告 ✅
- Vite build：通过（3.89s）✅
- i18n 中英同步 ✅
- 死键清理（confirmCancel/confirmCancelTitle）✅

【可能影响】仅画师端排期看板。客户页/管理后台/嵌入脚本不受影响。

【待确认问题】
1. 多列布局下 vuedraggable 跨列拖拽的排序体验需人工验证（grid 布局 + sortablejs 理论上兼容，但拖拽动画可能不完美）
2. 左滑进详情与下拉菜单的触摸交互可能在小屏上有轻微冲突，已做 target 排除，需真机验证

【申请】申请一号审核合并。
