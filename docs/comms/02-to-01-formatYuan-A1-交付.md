# formatYuan A1 批交付记录（一号代录——执行会话上下文耗尽未及自写）

- 分支 refactor/format-yuan，基于 b746371
- 施工图：docs/comms/formatYuan-施工图.md（侦察批产出，含等价性证明与 A2/addon-utils 冻结清单）
- 提交：3eca32d（批1 money.js formatYuan + 2 私有 fmtYuan 清除）/ ece23a8（批2 OrderForm 26 点位）/ 3fe0c3e（批3 ManualOrderRight 分源+混合源）
- 范围控制：仅 A1；A2 元源/addon-utils/B 解析/C 非金额 toFixed/D 类全部未动
- 混合源处理：Math.round(yuan*100) 合成整数分后走 formatCents/formatYuan，数学等价
- 一号独立验收：lint exit 0 · vitest 254/254 · build 通过 · 收敛断言：分源 /100).toFixed 残留 0（余 5 处均 basisPoints 百分比，属 C 类正确保留）
- 待拍板遗留（施工图已列）：A2 元源是否收进 formatYuanValue · addon-utils 私有实现迁移 · 千分位（现 0 需求）
