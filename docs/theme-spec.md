# 绘约后台主题规格 v1.1

> 状态：设计已确认，准备开工
> 范围：**仅画师后台 + 管理员后台**（客户公开页留下一轮）
> 日期：2026-07-27

---

## 一、内置配色（5 色）

| 编号 | 色值 | 名称 | 说明 |
|------|------|------|------|
| 1 | `#34dbcb` | 青 | 默认色 |
| 2 | `#34c2db` | 碧 | |
| 3 | `#3498db` | 蓝 | |
| 4 | `#346edb` | 靛 | |
| 5 | `#3445db` | 紫 | |

用户未选择时默认 #1（`#34dbcb`）。选择存 localStorage，跨会话保持。

---

## 二、色板

### 2.1 语义变量

```css
:root {
  /* 底色 */
  --bg-page:      #f5f5f5;
  --bg-card:      #ffffff;
  --bg-elevated:  #ffffff;
  --bg-inset:     #f0f0f0;
  --bg-hover:     rgba(0, 0, 0, 0.04);

  /* 文字 */
  --text-primary:   #303133;
  --text-secondary: #909399;
  --text-muted:     #c0c4cc;

  /* 线条 */
  --border-color:        #e4e7ed;
  --border-color-strong: #dcdfe6;

  /* 主色（由 data-accent 覆写，见 §2.3） */
  --color-primary:       #34dbcb;
  --color-primary-hover: #2ec4b6;
  --color-primary-soft:  rgba(52, 219, 203, 0.10);

  /* 功能色（固定，不跟随主色） */
  --color-danger:  #f56c6c;
  --color-warning: #e6a23c;
  --color-success: #67c23a;
  --color-info:    #909399;
  --color-gold:    #b08d1e;   /* 金额专用 */

  /* 阴影 */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-card-hover: 0 4px 12px rgba(0,0,0,0.10);
  --shadow-pop: 0 8px 24px rgba(0,0,0,0.12);
}
```

### 2.2 暗色模式

```css
html.dark {
  --bg-page:      #141414;
  --bg-card:      #1d1e1f;
  --bg-elevated:  #262727;
  --bg-inset:     #0d0d0d;
  --bg-hover:     rgba(255, 255, 255, 0.06);

  --text-primary:   #e5eaf3;
  --text-secondary: #a3a6ad;
  --text-muted:     #6c6e72;

  --border-color:        #414243;
  --border-color-strong: #4c4d4f;

  --color-danger:  #f89898;
  --color-warning: #eebe77;
  --color-success: #95d475;
  --color-info:    #a3a6ad;
  --color-gold:    #d9b44a;

  --shadow-card: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-card-hover: 0 4px 12px rgba(0,0,0,0.4);
  --shadow-pop: 0 8px 24px rgba(0,0,0,0.5);
}
```

暗色下卡片靠边框 + 亮度差浮起（阴影在黑底上不可见）。

### 2.3 主色覆写（data-accent）

`html[data-accent="N"]` 覆写 `--color-primary` 系列 + EP primary 链。5 色 × 2 模式 = 10 组，全部预计算写死在 CSS 里：

```css
/* ── 亮色 ── */
html[data-accent="1"] { --color-primary: #34dbcb; --color-primary-hover: #2ec4b6; --color-primary-soft: rgba(52,219,203,0.10); }
html[data-accent="2"] { --color-primary: #34c2db; --color-primary-hover: #2eaec4; --color-primary-soft: rgba(52,194,219,0.10); }
html[data-accent="3"] { --color-primary: #3498db; --color-primary-hover: #2e88c4; --color-primary-soft: rgba(52,152,219,0.10); }
html[data-accent="4"] { --color-primary: #346edb; --color-primary-hover: #2e62c4; --color-primary-soft: rgba(52,110,219,0.10); }
html[data-accent="5"] { --color-primary: #3445db; --color-primary-hover: #2e3ec4; --color-primary-soft: rgba(52,69,219,0.10); }

/* ── 暗色（提亮） ── */
html.dark[data-accent="1"] { --color-primary: #4de8d9; --color-primary-hover: #63ece0; --color-primary-soft: rgba(77,232,217,0.12); }
html.dark[data-accent="2"] { --color-primary: #4dd0e8; --color-primary-hover: #63d8ec; --color-primary-soft: rgba(77,208,232,0.12); }
html.dark[data-accent="3"] { --color-primary: #4da8e8; --color-primary-hover: #63b4ec; --color-primary-soft: rgba(77,168,232,0.12); }
html.dark[data-accent="4"] { --color-primary: #4d82e8; --color-primary-hover: #6392ec; --color-primary-soft: rgba(77,130,232,0.12); }
html.dark[data-accent="5"] { --color-primary: #4d5ce8; --color-primary-hover: #636eec; --color-primary-soft: rgba(77,92,232,0.12); }
```

### 2.4 Element Plus 覆写

```css
:root {
  --el-color-primary: var(--color-primary);
  --el-color-primary-light-3: color-mix(in srgb, var(--color-primary) 70%, white);
  --el-color-primary-light-5: color-mix(in srgb, var(--color-primary) 50%, white);
  --el-color-primary-light-7: color-mix(in srgb, var(--color-primary) 30%, white);
  --el-color-primary-light-8: color-mix(in srgb, var(--color-primary) 20%, white);
  --el-color-primary-light-9: color-mix(in srgb, var(--color-primary) 10%, white);
  --el-color-primary-dark-2:  color-mix(in srgb, var(--color-primary) 80%, black);

  --el-color-success: var(--color-success);
  --el-color-warning: var(--color-warning);
  --el-color-danger:  var(--color-danger);
  --el-color-info:    var(--color-info);

  --el-border-radius-base: 8px;
  --el-border-radius-small: 6px;

  --el-bg-color: var(--bg-card);
  --el-bg-color-overlay: var(--bg-elevated);
  --el-text-color-primary: var(--text-primary);
  --el-text-color-regular: var(--text-secondary);
  --el-border-color: var(--border-color);
  --el-border-color-light: var(--border-color);
  --el-fill-color-light: var(--bg-inset);
}
```

> `color-mix()` 现代浏览器全支持（Chrome 111+ / Safari 16.2+ / Firefox 113+），不需要预计算 50 个色值。主色变了，EP 全链自动跟。

---

## 三、主题选择器（替换 ThemeToggle）

### 3.1 按钮

现有 🌙/☀️ 按钮位置，换成一个 **20px 圆形色块**，显示当前主色。点击弹出 Popover。

```
侧边栏底部 / 登录页右上角：
  (●)  中/EN
   ↑
   当前主色圆点，点击展开
```

### 3.2 Popover 内容

```
┌────────────────────────────┐
│  底色                       │
│  [随系统]  [亮]  [暗]       │
│                            │
│  主色                       │
│  (●) (●) (●) (●) (●)      │
│   ✓                        │
└────────────────────────────┘
```

- **底色行**：三个文字按钮（随系统 / 亮 / 暗），当前项高亮
- **主色行**：五个 20px 圆形色块，当前项外圈细环 + ✓
- 无动画、无花哨效果，选了就生效，300ms CSS 过渡

### 3.3 状态管理

`stores/theme.js` 扩展：

```js
// localStorage keys
'huiyue-theme-base'   → 'auto' | 'light' | 'dark'
'huiyue-theme-accent' → '1' | '2' | '3' | '4' | '5'

// applyTheme(base, accent)
//   base: 'auto' → matchMedia 检测 → html.classList.toggle('dark')
//   accent: html.setAttribute('data-accent', accent)
//   监听 matchMedia change 事件（auto 模式下实时跟随系统）
```

### 3.4 语言切换

保持独立按钮（中/EN），不塞进 Popover。

---

## 四、字体

### 4.1 双字体体系

| 用途 | 字体 | 场景 |
|------|------|------|
| 展示体 | 霞鹜文楷 (LXGW WenKai) | Logo「绘约」、页面大标题、问候语、登录页标题 |
| 正文体 | 系统字体栈 | 所有界面文字 |
| 数字 | 系统栈 + `tabular-nums` | 统计数字、金额 |

```css
--font-display: 'LXGW WenKai', 'KaiTi', 'STKaiti', serif;
--font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
             'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
```

### 4.2 字体加载：cn-font-splitter 分包

```bash
npx cn-font-splitter -i LXGWWenKai-Regular.ttf -o web/src/assets/fonts/wencai/ \
  --target-format woff2 --css "web/src/assets/fonts/wencai/font.css"
```

浏览器只下载当前页面用到的分包（典型 60-150KB）。`font-display: swap`。

字体来源：GitHub `lxgw/LxgwWenKai` Releases（SIL OFL）。

### 4.3 字号层级

| 层级 | 字号/字重 | 字体 | 场景 |
|------|----------|------|------|
| 问候语 | 28px / 400 | 文楷 | Dashboard 顶部 |
| 页面标题 | 22px / 600 | 文楷 | 各页 h2 |
| 区块标题 | 16px / 600 | 正文 | 卡片 header |
| 正文 | 14px / 400 | 正文 | 默认 |
| 辅助 | 12px / 400 | 正文 | 时间戳 |
| 统计数字 | 32px / 700 + tabular-nums | 正文 | Dashboard |

---

## 五、Logo

文件：`web/src/assets/logo.webp`（400×400，白底）

| 位置 | 处理 |
|------|------|
| 侧边栏顶部 | 36px 圆形裁切 + 右侧「绘约」文楷 18px；暗色下加 1px 边框环 |
| 登录页 | 64px 圆形 + 下方「绘约」文楷 28px + 副标题 |
| favicon | 从 logo.webp 生成 |

---

## 六、侧边栏

```
┌──────────────────────┐
│ [logo] 绘约           │  ← 36px 圆形 logo + 文楷
│ ──────────────────── │
│ 📊 仪表盘             │  ← EP 图标
│ 📋 排期队列           │     激活项：左侧 3px 主色条 + 主色 soft 底
│ 📦 订单管理           │
│ ✏️ 手动录单           │
│ 💰 价格档位           │
│ 🖼️ 作品管理           │
│ 📝 约稿须知           │
│ ⚙️ 设置               │
│                      │
│ ──────────────────── │
│ [A] Alice            │  ← 首字圆形色块（主色底白字）
│ ● 接单中              │  ← 状态点：open=success / full=warning / break=danger
│ (●) 中/EN  退出登录   │  ← 主题选择器 + 语言 + 退出
└──────────────────────┘
```

---

## 七、问候系统

### 7.1 规则

| # | 规则 |
|---|------|
| G1 | Dashboard 顶部显示问候语：「夜深了，Alice」「记得多喝水，Alice」 |
| G2 | 问候语 = 时段匹配 + 随机抽取 + `{name}` 替换 |
| G3 | 两级库：**通用库**（管理员维护）+ **画师专属库**（管理员为单画师定制），等概率混合抽取 |
| G4 | 每条模板可设时段（morning/afternoon/evening/night/any）+ 启用/停用 |
| G5 | 无匹配时回退：「你好，{name}」 |
| G6 | Dashboard 有「换一句」按钮 |
| G7 | 时段：morning 05-10 / afternoon 11-17 / evening 18-22 / night 23-04 |

### 7.2 数据模型（迁移 v6）

> ⚠️ v4 = `add_token_version`（v0.7.0 已占用），v5 = workflow 三表（流程与比例计划）。问候系统排 v6。

```sql
CREATE TABLE greeting_templates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id  INTEGER,            -- NULL = 通用库
  text       TEXT NOT NULL,
  time_slot  TEXT NOT NULL DEFAULT 'any'
             CHECK(time_slot IN ('morning','afternoon','evening','night','any')),
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_greeting_artist ON greeting_templates(artist_id, time_slot);
```

种子（通用库）：

| text | time_slot |
|------|-----------|
| 早上好，{name}，新的一天从一张好画开始 | morning |
| 早呀{name}，今天的灵感准备好了吗 | morning |
| 午安，{name}，别忘了吃午饭 | afternoon |
| 记得多喝水，{name} | afternoon |
| {name}，画画别忘了活动手腕 | any |
| 晚上好，{name}，今天辛苦了 | evening |
| 夜深了，{name}，早点休息 | night |
| {name}，熬夜伤身，画可以明天再画 | night |

### 7.3 API

**画师端**：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/artist/greeting` | `{ text, slot }`，服务端按时段随机 |

**管理员端**：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/greetings` | 通用库列表 |
| POST | `/api/admin/greetings` | 添加 |
| PUT | `/api/admin/greetings/:id` | 编辑 |
| DELETE | `/api/admin/greetings/:id` | 删除 |
| GET | `/api/admin/artists/:id/greetings` | 画师专属库 |
| POST | `/api/admin/artists/:id/greetings` | 添加专属 |
| PUT | `/api/admin/artists/:id/greetings/:gid` | 编辑专属 |
| DELETE | `/api/admin/artists/:id/greetings/:gid` | 删除专属 |

抽取 SQL：`WHERE is_enabled=1 AND (artist_id IS NULL OR artist_id=?) AND time_slot IN (?, 'any') ORDER BY RANDOM() LIMIT 1`

### 7.4 Dashboard 问候区

```
┌─────────────────────────────────────────┐
│  🌙 夜深了，Alice            [↻ 换一句]  │
│  7月27日 周日 · 深夜                      │
└─────────────────────────────────────────┘
```

- 问候语：文楷 28px
- 时段图标：☀️ / 🌤️ / 🌆 / 🌙
- 「换一句」：text 按钮，点击 fade 切换
- 不用 el-card，直接渲染 + 主色 soft 底色晕染

### 7.5 管理员 UI

- 通用库：AdminDashboard 新增入口，表格管理（文字/时段 tag/启停开关/操作）
- 专属库：ArtistDetailDrawer 新增「问候语」Tab，UI 同通用库

---

## 八、登录页

```
          背景 + 纸纹
    ┌─────────────────────────┐
    │        [logo 64px]       │
    │         绘 约            │  ← 文楷 28px
    │   画师约稿管理平台        │  ← 12px secondary
    │                         │
    │   [QQ 号输入框]          │
    │   [获取登录码]           │  ← 主色 primary
    │                         │
    │              (●) 中/EN  │  ← 主题选择器 + 语言
    └─────────────────────────┘
```

---

## 九、动效（从简）

| 场景 | 动效 |
|------|------|
| 主题/主色切换 | 全局 CSS 变量 300ms 过渡 |
| 卡片悬停 | translateY(-2px) + 阴影加深，180ms |
| 侧边栏激活项 | 左侧 3px 主色条 + soft 底色（无动画，直接状态） |
| 问候语换一句 | 旧句 fade-out 150ms → 新句 fade-in 200ms |
| 弹窗/抽屉 | EP 默认 |

不做：页面切换动画、count-up、hover 旋转、循环动画。

---

## 十、实施任务拆分

### T1：主题基础层（预计 2 小时）

| # | 任务 | 文件 |
|---|------|------|
| T1-1 | 新建 `web/src/styles/theme.css`：语义变量 + 5 色 data-accent 覆写 + EP 覆写 | 新文件 |
| T1-2 | App.vue 引入 theme.css，删除内联 :root | `App.vue` |
| T1-3 | 霞鹜文楷下载 + cn-font-splitter 分包 + font.css | `web/src/assets/fonts/wencai/` |
| T1-4 | 扩展 `stores/theme.js`：base(auto/light/dark) + accent(1-5) + matchMedia 监听 | `stores/theme.js` |

### T2：主题选择器 + 布局（预计 2-3 小时）

| # | 任务 | 文件 |
|---|------|------|
| T2-1 | 新建 ThemePicker.vue 替换 ThemeToggle.vue（Popover：底色三选 + 主色五选） | 新组件 |
| T2-2 | 侧边栏重设计：logo + 图标菜单 + 激活指示条 + 身份区（画师名+状态） | `ArtistLayout.vue` |
| T2-3 | 登录页重设计：logo + 文楷标题 + ThemePicker | `Login.vue` |
| T2-4 | 管理员布局同步 | admin 视图 |

### T3：问候系统后端（预计 2 小时）

| # | 任务 | 文件 |
|---|------|------|
| T3-1 | 迁移 v6：greeting_templates + 种子 | `init.js` |
| T3-2 | greeting service：抽取 + CRUD | `features/artist/greeting.service.js`（新） |
| T3-3 | 画师端 + 管理员端路由 | `artist.routes.js` / `admin.routes.js` |

### T4：问候系统前端（预计 2 小时）

| # | 任务 | 文件 |
|---|------|------|
| T4-1 | Dashboard 问候区 | `Dashboard.vue` |
| T4-2 | 管理员通用库管理 | `GreetingManage.vue`（新） |
| T4-3 | ArtistDetailDrawer 问候语 Tab | 抽屉组件 |
| T4-4 | i18n（中英各 ~20 条） | locales |

### T5：打磨（预计 1-2 小时）

| # | 任务 | 文件 |
|---|------|------|
| T5-1 | Dashboard 统计卡片主题化（金箔金额、hover） | `Dashboard.vue` |
| T5-2 | 硬编码颜色扫描替换 | 全部视图 |
| T5-3 | 暗色 + 5 色逐页走查 | 全部视图 |

**总计约 9-11 小时**。与流程与比例计划无代码依赖（迁移号：workflow=v4，greeting=v5）。

---

## 十一、验收标准

- [ ] 5 色切换即时生效，EP 组件全链跟随
- [ ] 底色三选（随系统/亮/暗）正确，auto 模式跟随系统实时切换
- [ ] 选择持久化到 localStorage，刷新不丢
- [ ] 文楷只在展示场景出现
- [ ] 金额数字使用 `--color-gold` + tabular-nums
- [ ] 问候语按时段抽取，换一句可用，{name} 替换正确
- [ ] 管理员可管理通用库 + 任意画师专属库
- [ ] 侧边栏显示 logo + 画师名 + 状态
- [ ] 无硬编码颜色残留
