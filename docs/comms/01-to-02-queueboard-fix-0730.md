# 一号 → 二号：看板修复（R30a 回归 + 焦点图小模式删除）

> 日期：2026-07-30
> 分支：`fix/client-queueboard-0730`（独立 worktree，如 artist-commission-queuefix）
> 优先级：P1（用户直接指令，R30a 实现偏离决策）

---

## 任务 1：看板改回一行一条（R30a 回归修复）

**问题**：QueueBoard.vue:328 `grid-template-columns: repeat(auto-fill, minmax(360px, 1fr))` 是多列布局，与用户决策"排期看板必须保持一行一条"不符。

**修法**：
- 改为单列（`grid-template-columns: 1fr` 或 flex 纵向排列）
- 宽屏空间利用方向：卡片内部横向展开更多信息（焦点图/描述/价格/进度并排），不截断，不拆多列
- 删除"R30a: 宽屏多列"注释，改为准确描述
- 窄屏媒体查询（:406）检查是否仍需要

## 任务 2：删除焦点图"小"模式

**问题**：focusDisplay 有 small/large/none 三态，默认 `'small'`（:151）。用户要求只留 无/大 开关。

**修法**：
- 删除 `small` 选项（radio-button :11）
- focusDisplay 改为 无/大 两态开关
- 默认值改为 `'none'` 或 `'large'`（你定，建议 `'large'`——画师看图是高频需求）
- 删除 `.focus-small` / `.focus-small-img` CSS（:354-355）和对应模板（:66-68）
- localStorage 兼容：旧值 `'small'` 需映射（读到 small 时按新默认值处理）
- i18n：删除 `queue.focusSmall` key（中英双语）

## 授权文件

- `web/src/views/artist/QueueBoard.vue`
- `web/src/locales/zh-CN.js`
- `web/src/locales/en.js`

## 任务 3：看板焦点图空态上传入口

**问题**：无焦点图的订单卡片只有空白区域，无法直接上传。

**修法**：
- 无焦点图的订单，卡片焦点图位置显示**虚线占位按钮**（点击打开文件选择器 / 拖拽图片放入上传）
- 上传成功 → 直接设为该订单焦点图（复用 setFocusImage API）
- **本页不开粘贴上传**——页面有多个上传目标，全局粘贴无法路由（用户明确指示）
- 占位样式：虚线边框 + 图标 + "上传焦点图"文字，hover 高亮
- 拖拽：dragover 高亮，drop 上传；非图片拒绝（与图库区行为一致）

## 纪律

- 一个 commit：`fix(client): 看板一行一条回归 + 焦点图小模式删除 + 空态上传入口`
- 提交说明含影响范围 + 自测情况（宽屏/窄屏/手机三档验证）
- eslint 零错误，构建通过
