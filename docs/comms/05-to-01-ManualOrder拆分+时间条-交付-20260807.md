# 05-to-01-ManualOrder拆分+时间条-交付-20260807

> 派工：一号 → 五号（bugfix/重构）
> worktree：`artist-commission-w5`（分支 `beta/manualorder-split`）
> 交付：两个 commit 已落分支，未推送、未合并、未改 STATUS；合入由一号执行

## 任务①：ManualOrder 拆分（三巨头之三）

### 改动清单（commit `e90224c`）

| 文件 | 变化 | 行数 |
|------|------|------|
| `web/src/views/artist/ManualOrder.vue` | 重写为表单骨架（原 1650 行） | **385 行**（目标 ≤800 ✓） |
| `web/src/components/artist/order/ManualOrderLeft.vue` | **新增**：左栏客户信息+参考图上传+QQ历史 | 318 行 |
| `web/src/components/artist/order/ManualOrderRight.vue` | **新增**：右栏档位/画风/尺寸/增项/价格/初始状态/提交+移动端价格条 | 1122 行 |

### 设计要点

1. **模板原样搬移、事件等价、i18n 零改**：左右栏 `<section class="mo-col">` 整块搬入子组件，DOM 类名（`.mo-field/.tier-card/.mo-price-sticky/.mo-submit-btn/.style-addon-item/.mo-show-images/.mo-final-row`）一个未动——`ManualOrder.stylemode.test.js` 13/13 全过即证据。
2. **props/emit 模式**：子组件收原始数据（`tiers/styles/pricingData/subdomain/workflowStages` 等只读 props），交互事件 `submit-success`/`dirty` 向上发。
3. **表单字段走字段级 `v-model`（defineModel）**：10 个表单字段由父 `v-model:xxx="form.xxx"` 双向绑定。最初试过传整个 form 对象，被 ESLint `vue/no-mutating-props` 拦下（16 errors）——按项目红线不新增 eslint-disable，改用 Vue 3.5 官方 `defineModel`，lint 归零。
4. **参考图上传逻辑随卡移入 Left**（handleRefUpload/guardDrag*/usePasteUpload 原样搬），提交用路径数组经 `emit('update:uploadedRefs')` 同步父组件。
5. **档位/画风/算价/提交联动整体移入 Right**（派工允许"耦合深移入子组件"）；提交成功副作用（结果弹窗/埋点/清草稿）留在父 `onSubmitSuccess`。
6. **草稿/重置跨组件协作**：Right `defineExpose({ getDraftState, setDraftState, reset })`，Left `defineExpose({ reset })`；F6 草稿保存时父调 `getDraftState()` 取右栏快照，恢复时 `setDraftState()` 回填（含删除校验）。
7. **校验跨组件**：`el-form-item prop="clientQq"` 在 Left 内仍被父 `el-form` 的 `validate()` 收集（provide/inject 穿透组件边界）；提交校验用**函数 prop** `validate-form`（传 ref 对象会被模板解包成 null 快照——这是拆分中踩到的坑，实测 10 个用例失败后定位，改函数形式解决）。

### 验证（拆分后）

- `web`: test **215/215**（含 ManualOrder 专项 13/13）、lint **0 errors**（4 条 warning 在 OrderDetail/OrderForm，非本次文件，基线遗留）、build ✓
- 行为等价：多画风三级选择/单画风退化/旧档位回归/未选尺寸拦截/G2 脏标记/自定义增项/图片开关 localStorage 记忆/提交透传 全部通过

## 任务②：QueueBoard 时间条 Excel 式滚动（用户第 6 条反馈）

### 改动清单（commit `7a1c53a`）

`web/src/components/artist/queue/QueueBoardCalendar.vue`（+65/-14），纯前端视图逻辑，零依赖零 API 改动：

1. **`tl-canvas` 宽度覆盖订单实际日期范围**：新增 `tlOrderRange`（遍历全部订单的开工日/截稿日取最早/最晚），`tlCanvasStart/End` = 窗口范围与（订单范围 ±7 天余量）取更早/更晚；宽度上限 **2000px** 防极端数据（原四档 672/960/1080/1274px 仍为下限）。
2. **`tl-scroll` 已 `overflow-x: auto`**：进入时间条视图 `scrollLeft` 定位今天（`x - clientWidth/3`，原逻辑保留，坐标基准改为画布起点）；`tlGoToday` 增加同步滚动。
3. **刻度/横条/今天线全部改以画布起点为基准**：`tlTicks` 数量 = 画布天数（刻度密度逻辑不变），`tlRows` 裁剪窗口改为画布（未设截稿订单画满到画布末端），`tlTodayX` 滚动时正确显示。
4. 选跨度不再"直接掐断"：订单在窗口外的部分可通过横向滚动查看（Excel 式）。

### 验证

- `web`: test **215/215**、lint **0 errors**、build ✓
- `server`: test **953/953**、typecheck ✓、lint 0 errors（6 条 oxlint warning 为基线，未动 server 代码）

## 截图情况（如实披露）

- ✅ `web/temp/manualorder-after.png`（123KB）：拆分后 /orders/new 全页截图（已登录画师 alice，空表单）
- ❌ **before 截图缺失**：本地实测环境（独立 DB 3998 + vite 5174）拉起时遇到 Windows 后台进程回收（Hermes background 进程约 1 分钟后被系统终止），首次 verify 后环境即断；按用户指示跳过本地服务器验证，不再纠结截图。任务②时间条滚动截图同样缺失。
- 补偿：行为等价性由 `ManualOrder.stylemode.test.js` 13/13 全过 + 全量 215/215 保证；时间条逻辑有 computed 纯函数可复核（`tlCanvasStart/End` 计算在 `QueueBoardCalendar.vue` L370-411）。

## 门禁汇总

| 门禁 | 结果 |
|------|------|
| web test:web | 215/215 ✓（基线 215/215） |
| web lint | 0 errors（4 基线 warning）✓ |
| web build | ✓ |
| server test | 953/953 ✓（基线 953/953） |
| server typecheck | ✓ |
| server lint | 0 errors ✓ |

## 纪律确认

- 两个任务分开 commit（`e90224c` 先拆分 → `7a1c53a` 时间条）✓
- 未推送、未合并、未改 STATUS ✓
- 未新增依赖（web package.json 还原；@playwright/test 仅用于截图临时安装，已还原且不提交）✓
- 临时文件已清理（vite.local.config.mjs / e2e 脚本已删），git status 干净 ✓
- 工作树 3000 端口 Docker 生产容器未动 ✓
