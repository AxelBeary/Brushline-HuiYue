# 派工：三号-B — errors.ts 死错误码清理（C-1 遗留项）

> 来自：一号 | 2026-08-05
> 工作目录：**主 worktree**（`artist-commission`，master 直接提交——单文件低风险，特批直提）
> 背景：你 C-1 交付报告里的遗留项"ADDON_* 错误码未删"，一号已核实消费方，缩小为精确清单。

---

## 任务：删除 errors.ts 中 3 个真死码

`server/src/shared/errors.ts` 中删除以下 3 个错误码（E 对象定义 + ERROR_MESSAGES 文案，两处都要删）：

- `ADDON_NAME_EMPTY`
- `ADDON_INVALID_PRICE`
- `ADDON_INVALID_MODE`

**一号已验证**（2026-08-05 全项目 grep）：这三个码的消费方就是被你 C-1 删掉的旧增项 CRUD，server/src 内已零引用。

## 红线

1. **ADDON_NOT_FOUND / ADDON_NOT_FOR_TIER / ADDON_MAX_QTY 不许删**——算价引擎 pricing.service.ts L182-193 还在用（旧 calculatePrice 链路读 price_addons 表，波 2 手动录单改造时才动）
2. **REORDER_* 不碰**（档位/画风/增项排序多处复用）
3. **ADDON_TEMPLATE_* / STYLE_ADDON_* 不碰**（新模型增项库在用）
4. **不碰 web/src/locales/**——locales 里这三个键冗余但无害；locales 正被子代理修改，碰了必冲突
5. 不动其他任何文件

## 验证

`cd server`：`npx vitest run`（基线 695 全绿）+ `npx tsc --noEmit` + `npx eslint .` 三件套全绿。

## 完工

git add 只加 `server/src/shared/errors.ts`（禁 git add -A）→ commit（`chore(server): errors.ts清死码——ADDON_NAME_EMPTY/INVALID_PRICE/INVALID_MODE`）→ 直接推 master（特批直提）。返回摘要：commit hash + 测试结果。
