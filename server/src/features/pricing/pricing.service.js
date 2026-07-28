import db from '../../db/connection.js'
import { AppError, E } from '../../shared/errors.js'

// ============================================
// 价格计算器服务 - 增项/倍率 CRUD + 计算引擎
// ============================================

const VALID_CATEGORIES = ['expression', 'outfit', 'background', 'weapon', 'other']
const VALID_SELECT_MODES = ['quantity', 'toggle', 'inquiry']

// ─── 增项 CRUD ───

/**
 * 获取画师的增项列表（含关联的 tierIds）
 */
export function getAddons(artistId) {
  const addons = db.prepare(
    'SELECT * FROM price_addons WHERE artist_id = ? ORDER BY sort_order ASC'
  ).all(artistId)

  const tierStmt = db.prepare('SELECT tier_id FROM addon_tiers WHERE addon_id = ?')
  return addons.map(a => ({
    ...a,
    tierIds: tierStmt.all(a.id).map(r => r.tier_id)
  }))
}

/**
 * 获取单个增项（含归属校验）
 */
export function getAddon(artistId, addonId) {
  const addon = db.prepare(
    'SELECT * FROM price_addons WHERE id = ? AND artist_id = ?'
  ).get(addonId, artistId)
  if (!addon) throw new AppError(E.ADDON_NOT_FOUND, 404)

  addon.tierIds = db.prepare(
    'SELECT tier_id FROM addon_tiers WHERE addon_id = ?'
  ).all(addonId).map(r => r.tier_id)

  return addon
}

/**
 * 创建增项
 * tierIds 为空时默认关联画师所有档位
 */
export function createAddon(artistId, { category, name, priceType, priceValue, selectMode, maxQty, description, tierIds }) {
  if (!name || !name.trim()) throw new AppError(E.ADDON_NAME_EMPTY)
  if (!VALID_CATEGORIES.includes(category)) throw new AppError(E.VALIDATION, 400, { field: 'category' })
  if (priceValue == null || priceValue < 0) throw new AppError(E.ADDON_INVALID_PRICE)
  if (priceType === 'percent' && priceValue > 10) throw new AppError(E.ADDON_INVALID_PRICE, 400, { hint: '百分比上限1000%' })
  if (selectMode && !VALID_SELECT_MODES.includes(selectMode)) throw new AppError(E.ADDON_INVALID_MODE)

  const maxOrder = db.prepare(
    'SELECT MAX(sort_order) AS m FROM price_addons WHERE artist_id = ?'
  ).get(artistId).m ?? -1

  const result = db.prepare(`
    INSERT INTO price_addons (artist_id, category, name, price_type, price_value, select_mode, max_qty, description, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    artistId,
    category,
    name.trim(),
    priceType || 'fixed',
    priceValue,
    selectMode || 'quantity',
    maxQty ?? 5,
    description || null,
    maxOrder + 1
  )

  const addonId = result.lastInsertRowid
  syncAddonTiers(artistId, addonId, tierIds)

  return getAddon(artistId, addonId)
}

/**
 * 更新增项
 */
export function updateAddon(artistId, addonId, fields) {
  getAddon(artistId, addonId) // 存在性校验

  if (fields.name !== undefined) {
    if (!fields.name.trim()) throw new AppError(E.ADDON_NAME_EMPTY)
    db.prepare('UPDATE price_addons SET name = ? WHERE id = ?').run(fields.name.trim(), addonId)
  }
  if (fields.category !== undefined) {
    if (!VALID_CATEGORIES.includes(fields.category)) throw new AppError(E.VALIDATION, 400, { field: 'category' })
    db.prepare('UPDATE price_addons SET category = ? WHERE id = ?').run(fields.category, addonId)
  }
  if (fields.priceType !== undefined) {
    db.prepare('UPDATE price_addons SET price_type = ? WHERE id = ?').run(fields.priceType, addonId)
  }
  if (fields.priceValue !== undefined) {
    if (fields.priceValue < 0) throw new AppError(E.ADDON_INVALID_PRICE)
    db.prepare('UPDATE price_addons SET price_value = ? WHERE id = ?').run(fields.priceValue, addonId)
  }
  if (fields.selectMode !== undefined) {
    if (!VALID_SELECT_MODES.includes(fields.selectMode)) throw new AppError(E.ADDON_INVALID_MODE)
    db.prepare('UPDATE price_addons SET select_mode = ? WHERE id = ?').run(fields.selectMode, addonId)
  }
  if (fields.maxQty !== undefined) {
    db.prepare('UPDATE price_addons SET max_qty = ? WHERE id = ?').run(fields.maxQty, addonId)
  }
  if (fields.description !== undefined) {
    db.prepare('UPDATE price_addons SET description = ? WHERE id = ?').run(fields.description || null, addonId)
  }
  if (fields.enabled !== undefined) {
    db.prepare('UPDATE price_addons SET enabled = ? WHERE id = ?').run(fields.enabled ? 1 : 0, addonId)
  }
  if (fields.tierIds !== undefined) {
    syncAddonTiers(artistId, addonId, fields.tierIds)
  }

  return getAddon(artistId, addonId)
}

/**
 * 删除增项
 */
export function deleteAddon(artistId, addonId) {
  getAddon(artistId, addonId) // 归属校验
  db.prepare('DELETE FROM price_addons WHERE id = ?').run(addonId)
  return { deleted: true }
}

/**
 * 增项排序（拖拽用）
 */
export function reorderAddons(artistId, orderedIds) {
  const addons = db.prepare(
    'SELECT id FROM price_addons WHERE artist_id = ?'
  ).all(artistId).map(r => r.id)

  if (orderedIds.length !== addons.length) throw new AppError(E.REORDER_LENGTH)
  if (new Set(orderedIds).size !== orderedIds.length) throw new AppError(E.REORDER_DUPLICATE)
  for (const id of orderedIds) {
    if (!addons.includes(id)) throw new AppError(E.REORDER_INVALID)
  }

  const stmt = db.prepare('UPDATE price_addons SET sort_order = ? WHERE id = ? AND artist_id = ?')
  const tx = db.transaction(() => {
    orderedIds.forEach((id, i) => stmt.run(i, id, artistId))
  })
  tx()

  return getAddons(artistId)
}

/**
 * 更新增项的档位关联（拖拽到货架用）
 */
export function updateAddonTiers(artistId, addonId, tierIds) {
  getAddon(artistId, addonId) // 归属校验
  syncAddonTiers(artistId, addonId, tierIds)
  return getAddon(artistId, addonId)
}

/** 内部：同步关联表 */
function syncAddonTiers(artistId, addonId, tierIds) {
  // 验证 tierIds 属于该画师
  if (tierIds && tierIds.length > 0) {
    const ownedTiers = db.prepare(
      'SELECT id FROM price_tiers WHERE artist_id = ?'
    ).all(artistId).map(r => r.id)
    for (const tid of tierIds) {
      if (!ownedTiers.includes(tid)) throw new AppError(E.TIER_NOT_FOUND, 404, { tierId: tid })
    }
  }

  const del = db.prepare('DELETE FROM addon_tiers WHERE addon_id = ?')
  const ins = db.prepare('INSERT OR IGNORE INTO addon_tiers (addon_id, tier_id) VALUES (?, ?)')

  const tx = db.transaction(() => {
    del.run(addonId)
    if (tierIds && tierIds.length > 0) {
      for (const tid of tierIds) ins.run(addonId, tid)
    } else {
      // 未指定 → 关联所有档位
      const allTiers = db.prepare('SELECT id FROM price_tiers WHERE artist_id = ?').all(artistId)
      for (const t of allTiers) ins.run(addonId, t.id)
    }
  })
  tx()
}

// ─── 倍率 CRUD ───

export function getMultipliers(artistId) {
  return db.prepare(
    'SELECT * FROM price_multipliers WHERE artist_id = ? ORDER BY type ASC, sort_order ASC'
  ).all(artistId)
}

export function createMultiplier(artistId, { type, name, multiplier, description }) {
  if (!name || !name.trim()) throw new AppError(E.VALIDATION, 400, { field: 'name' })
  if (!['usage', 'rush'].includes(type)) throw new AppError(E.VALIDATION, 400, { field: 'type' })
  if (multiplier == null || multiplier < 1.0) throw new AppError(E.MULTIPLIER_INVALID)

  const maxOrder = db.prepare(
    'SELECT MAX(sort_order) AS m FROM price_multipliers WHERE artist_id = ? AND type = ?'
  ).get(artistId, type).m ?? -1

  const result = db.prepare(`
    INSERT INTO price_multipliers (artist_id, type, name, multiplier, description, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(artistId, type, name.trim(), multiplier, description || null, maxOrder + 1)

  return db.prepare('SELECT * FROM price_multipliers WHERE id = ?').get(result.lastInsertRowid)
}

export function updateMultiplier(artistId, multiplierId, fields) {
  const m = db.prepare(
    'SELECT * FROM price_multipliers WHERE id = ? AND artist_id = ?'
  ).get(multiplierId, artistId)
  if (!m) throw new AppError(E.MULTIPLIER_NOT_FOUND, 404)

  if (fields.name !== undefined) {
    if (!fields.name.trim()) throw new AppError(E.VALIDATION, 400, { field: 'name' })
    db.prepare('UPDATE price_multipliers SET name = ? WHERE id = ?').run(fields.name.trim(), multiplierId)
  }
  if (fields.multiplier !== undefined) {
    if (fields.multiplier < 1.0) throw new AppError(E.MULTIPLIER_INVALID)
    db.prepare('UPDATE price_multipliers SET multiplier = ? WHERE id = ?').run(fields.multiplier, multiplierId)
  }
  if (fields.description !== undefined) {
    db.prepare('UPDATE price_multipliers SET description = ? WHERE id = ?').run(fields.description || null, multiplierId)
  }
  if (fields.enabled !== undefined) {
    db.prepare('UPDATE price_multipliers SET enabled = ? WHERE id = ?').run(fields.enabled ? 1 : 0, multiplierId)
  }

  return db.prepare('SELECT * FROM price_multipliers WHERE id = ?').get(multiplierId)
}

export function deleteMultiplier(artistId, multiplierId) {
  const m = db.prepare(
    'SELECT * FROM price_multipliers WHERE id = ? AND artist_id = ?'
  ).get(multiplierId, artistId)
  if (!m) throw new AppError(E.MULTIPLIER_NOT_FOUND, 404)
  db.prepare('DELETE FROM price_multipliers WHERE id = ?').run(multiplierId)
  return { deleted: true }
}

// ─── 计算引擎 ───

/**
 * 获取画师完整公开报价（客户端用）
 * 返回：档位列表（各含适用增项）+ 倍率列表 + 分期比例
 */
export function getPublicPricing(artistId) {
  const tiers = db.prepare(
    'SELECT * FROM price_tiers WHERE artist_id = ? ORDER BY sort_order ASC'
  ).all(artistId)

  const addons = db.prepare(
    'SELECT * FROM price_addons WHERE artist_id = ? AND enabled = 1 ORDER BY sort_order ASC'
  ).all(artistId)

  const tierLinks = db.prepare(
    'SELECT addon_id, tier_id FROM addon_tiers'
  ).all()

  // 构建 tierId → addonIds 映射
  const tierAddonMap = {}
  for (const link of tierLinks) {
    if (!tierAddonMap[link.tier_id]) tierAddonMap[link.tier_id] = []
    tierAddonMap[link.tier_id].push(link.addon_id)
  }

  const addonMap = Object.fromEntries(addons.map(a => [a.id, a]))

  const tiersWithAddons = tiers.map(t => ({
    ...t,
    addons: (tierAddonMap[t.id] || [])
      .map(aid => addonMap[aid])
      .filter(Boolean)
  }))

  const multipliers = db.prepare(
    'SELECT * FROM price_multipliers WHERE artist_id = ? AND enabled = 1 ORDER BY type ASC, sort_order ASC'
  ).all(artistId)

  const stages = db.prepare(
    'SELECT name, basis_points FROM artist_workflow_stages WHERE artist_id = ? AND takes_payment = 1 ORDER BY sort_order ASC'
  ).all(artistId)

  return {
    tiers: tiersWithAddons,
    multipliers,
    installments: stages.map(s => ({ label: s.name, basisPoints: s.basis_points }))
  }
}

/**
 * 核心计算：无状态，传入选择返回价格明细
 *
 * @param {number} artistId
 * @param {object} opts
 * @param {number} opts.tierId - 基础档位 ID
 * @param {Array<{addonId: number, quantity?: number}>} opts.addons - 选中的增项
 * @param {number|null} opts.usageMultiplierId - 用途倍率 ID
 * @param {number|null} opts.rushMultiplierId - 加急倍率 ID
 * @returns {object} 价格明细
 */
export function calculatePrice(artistId, { tierId, addons = [], usageMultiplierId = null, rushMultiplierId = null }) {
  // 1. 基础价
  if (!tierId) throw new AppError(E.PRICING_TIER_REQUIRED)
  const tier = db.prepare(
    'SELECT * FROM price_tiers WHERE id = ? AND artist_id = ?'
  ).get(tierId, artistId)
  if (!tier) throw new AppError(E.TIER_NOT_FOUND, 404)

  const basePrice = tier.price
  const breakdown = [{ type: 'tier', name: tier.name, amount: basePrice, quantity: 1, multiplier: 1.0 }]

  // 2. 增项合计（百分比永远基于基础价）
  let addonTotal = 0
  const validTierAddonIds = new Set(
    db.prepare('SELECT addon_id FROM addon_tiers WHERE tier_id = ?').all(tierId).map(r => r.addon_id)
  )

  for (const sel of addons) {
    const addon = db.prepare(
      'SELECT * FROM price_addons WHERE id = ? AND artist_id = ? AND enabled = 1'
    ).get(sel.addonId, artistId)
    if (!addon) throw new AppError(E.ADDON_NOT_FOUND, 404, { addonId: sel.addonId })
    if (!validTierAddonIds.has(addon.id)) throw new AppError(E.ADDON_NOT_FOR_TIER, 400, { addon: addon.name })

    // inquiry 模式不计价
    if (addon.select_mode === 'inquiry') {
      breakdown.push({ type: 'addon', name: `${addon.name}（面议）`, amount: 0, quantity: 1, multiplier: 1.0 })
      continue
    }

    const qty = addon.select_mode === 'toggle' ? 1 : Math.max(1, sel.quantity || 1)
    if (addon.select_mode === 'quantity' && qty > addon.max_qty) {
      throw new AppError(E.ADDON_MAX_QTY, 400, { max: addon.max_qty })
    }

    const unitAmount = addon.price_type === 'percent'
      ? basePrice * addon.price_value
      : addon.price_value

    const lineTotal = unitAmount * qty
    addonTotal += lineTotal

    breakdown.push({
      type: 'addon',
      name: qty > 1 ? `${addon.name} ×${qty}` : addon.name,
      amount: lineTotal,
      quantity: qty,
      multiplier: 1.0
    })
  }

  const subtotal = basePrice + addonTotal

  // 3. 用途倍率（取最高，不叠加）
  let usageMultiplier = 1.0
  let usageName = null
  if (usageMultiplierId) {
    const um = db.prepare(
      "SELECT * FROM price_multipliers WHERE id = ? AND artist_id = ? AND type = 'usage' AND enabled = 1"
    ).get(usageMultiplierId, artistId)
    if (!um) throw new AppError(E.MULTIPLIER_NOT_FOUND, 404)
    usageMultiplier = um.multiplier
    usageName = um.name
  }

  // 4. 加急倍率
  let rushMultiplier = 1.0
  let rushName = null
  if (rushMultiplierId) {
    const rm = db.prepare(
      "SELECT * FROM price_multipliers WHERE id = ? AND artist_id = ? AND type = 'rush' AND enabled = 1"
    ).get(rushMultiplierId, artistId)
    if (!rm) throw new AppError(E.MULTIPLIER_NOT_FOUND, 404)
    rushMultiplier = rm.multiplier
    rushName = rm.name
  }

  // 5. 总价 = 小计 × 用途 × 加急
  const totalPrice = subtotal * usageMultiplier * rushMultiplier

  // 倍率贡献金额（展示用）
  if (usageMultiplier > 1.0) {
    breakdown.push({
      type: 'usage',
      name: `${usageName} ×${usageMultiplier}`,
      amount: subtotal * (usageMultiplier - 1) * rushMultiplier,
      quantity: 1,
      multiplier: usageMultiplier
    })
  }
  if (rushMultiplier > 1.0) {
    breakdown.push({
      type: 'rush',
      name: `${rushName} ×${rushMultiplier}`,
      amount: subtotal * usageMultiplier * (rushMultiplier - 1),
      quantity: 1,
      multiplier: rushMultiplier
    })
  }

  // 6. 分期
  const stages = db.prepare(
    'SELECT name, basis_points FROM artist_workflow_stages WHERE artist_id = ? AND takes_payment = 1 ORDER BY sort_order ASC'
  ).all(artistId)

  const installments = stages.map(s => ({
    label: s.name,
    basisPoints: s.basis_points,
    amount: Math.round(totalPrice * s.basis_points) / 10000
  }))

  return {
    basePrice,
    addonTotal,
    subtotal,
    usageMultiplier,
    rushMultiplier,
    totalPrice: Math.round(totalPrice * 100) / 100,
    totalPriceCents: Math.round(totalPrice * 100),
    installments,
    breakdown
  }
}
