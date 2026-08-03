# 交付：v0.36 波 2-A — 客户画廊画册翻页

> 交付人：二号-B（子代理）+ 一号收尾
> 分支：`feat/v036-gallery-album`（worktree -w2b）
> 代码 commit：`5eb3220`

---

## 改动内容（7 文件，+402/-159）

1. **TplGallery.vue**：网格/瀑布流 → 画册模式（一次一张大图居中 + 左右箭头、键盘 ←/→、pointer 滑动翻页、页码、淡入过渡、筛选重置、lightbox 保留、单张隐藏箭头）。新增 `peek` prop（Gallery 模板侧露）
2. **四模板区分度**：Gallery=大小交错侧露（用户点名）/ Classic=细边框题注 / Folio=沉浸压角 / Atelier=纸片旋转
3. **i18n**：galleryDesc 中英更新为翻页画廊描述；Folio 历史注释修正
4. grid/editorial/masonry CSS 已删（grep 确认无残留引用）

## 一号验证记录（不信 self-report，全部重做）

### 自动化门禁（一号重跑）
- vitest **144/144** · eslint **0** · build ✓

### 代码审核（读 diff）
- 键盘监听让位逻辑正确（lightbox 打开/输入框聚焦时不抢按键）
- swipe 防误触正确（justSwiped + 微任务复位吞 click）
- 边界钳制正确（goPrev/goNext 边界、filteredArtworks 变长钳制、peek 越界返回 null）
- F6 档位标签跳下单功能**保留在 lightbox 内**（从 hover 浮层移到点开大图后）——非回归，交互路径变更已知

### 浏览器实测（一号亲自，vite dev + 容器真数据）
- ✅ 四模板（classic/gallery/folio/atelier）画廊全部渲染
- ✅ 箭头翻页：1/5 → 2/5 → 3/5，首页 prev 禁用
- ✅ 键盘 ←/→ 翻页正常
- ✅ Gallery peek 侧露：第 1 页仅 next 侧露（符合逻辑）
- ✅ 筛选重置：空档位筛选 → 空态 → 切回全部 → 1/5
- ✅ 视觉确认：居中大图 + 右侧缩小侧露 + 箭头 + 页码，协调无 bug（截图留档）

## 已知说明（非阻塞）

- alice 作品 size_tags 全空（真实状态，STATUS 有记录），筛选档位后为空是预期行为
- seed.js 的 TS 导入报错为预存在问题（二号-B 发现，不在授权范围）
- 二号-B 的临时脚本 `server/_tmp-*.cjs` 和 `server/data/` 已由一号清理

## 待用户验收

画廊翻页为替换式改动（用户拍板），上线后四个模板的客户主页画廊全部变为翻页。用户可访问任意画师主页验收，Gallery 模板看大小交错效果。
