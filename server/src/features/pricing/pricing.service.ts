import db from '../../db/connection.js'
import { AppError, E } from '../../shared/errors.js'
import type { Multiplier, PriceBreakdownItem, PriceResult } from '../../types/entities.js'

// ============================================
// 价格计算器服务 - 倍率 CRUD + 计算引擎
// （v0.36 C-1：旧增项管理 API/函数已删除——前端零消费，增项数据面由新画风模型承接；
//   v0.39 addons 清理第一批：算价读路径已移除 price_addons/addon_tiers 读取，
//   addons 参数等价忽略不再计价；档位基础价（price_tiers）不受影响）
// ============================================

// ─── 倍率 CRUD ───

export function getMultipliers(artistId: number): Multiplier[] {
  return db.prepare(
    'SELECT * FROM price_multipliers WHERE artist_id = ? ORDER BY type ASC, multiplier DESC'
  ).all(artistId) as Multiplier[]
}

interface CreateMultiplierInput {
  type: string
  name: string
  multiplier: number
  description?: string | null
}

export function createMultiplier(artistId: number, { type, name, multiplier, description }: CreateMultiplierInput): Multiplier {
  if (!name || !name.trim()) throw new AppError(E.VALIDATION, 400, { field: 'name' })
  if (!['usage', 'rush'].includes(type)) throw new AppError(E.VALIDATION, 400, { field: 'type' })
  if (multiplier == null || multiplier < 1.0) throw new AppError(E.MULTIPLIER_INVALID)

  const maxOrder = (db.prepare(
    'SELECT MAX(sort_order) AS m FROM price_multipliers WHERE artist_id = ? AND type = ?'
  ).get(artistId, type) as { m: number | null }).m ?? -1

  const result = db.prepare(`
    INSERT INTO price_multipliers (artist_id, type, name, multiplier, description, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(artistId, type, name.trim(), multiplier, description || null, maxOrder + 1)

  return db.prepare('SELECT * FROM price_multipliers WHERE id = ?').get(Number(result.lastInsertRowid)) as Multiplier
}

interface UpdateMultiplierFields {
  name?: string
  multiplier?: number
  description?: string | null
  enabled?: boolean
}

export function updateMultiplier(artistId: number, multiplierId: number, fields: UpdateMultiplierFields): Multiplier {
  const m = db.prepare(
    'SELECT * FROM price_multipliers WHERE id = ? AND artist_id = ?'
  ).get(multiplierId, artistId) as Multiplier | undefined
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

  return db.prepare('SELECT * FROM price_multipliers WHERE id = ?').get(multiplierId) as Multiplier
}

export function deleteMultiplier(artistId: number, multiplierId: number): { deleted: boolean } {
  const m = db.prepare(
    'SELECT * FROM price_multipliers WHERE id = ? AND artist_id = ?'
  ).get(multiplierId, artistId) as Multiplier | undefined
  if (!m) throw new AppError(E.MULTIPLIER_NOT_FOUND, 404)
  db.prepare('DELETE FROM price_multipliers WHERE id = ?').run(multiplierId)
  return { deleted: true }
}

// ─── 计算引擎 ───

interface PublicPricing {
  tiers: Array<Record<string, unknown> & { addons: Record<string, unknown>[] }>
  multipliers: Multiplier[]
  installments: Array<{ label: string; basisPoints: number }>
  discountEnabled: boolean
}

/**
 * 获取画师完整公开报价（客户端用）
 * 返回：档位列表（各含适用增项）+ 倍率列表 + 分期比例
 */
export function getPublicPricing(artistId: number): PublicPricing {
  // v0.24 #10: 过滤 hidden 档位（showcase 保留，前端渲染灰色"暂不接单"）
  // v0.39 addons 清理第一批：不再读取 price_addons/addon_tiers（表已冻结），
  // tiers 保留空 addons 字段维持响应结构兼容（前端旧模型兜底分支下批同清）
  const tiers = db.prepare(
    "SELECT * FROM price_tiers WHERE artist_id = ? AND visibility != 'hidden' ORDER BY sort_order ASC"
  ).all(artistId) as Array<Record<string, unknown> & { id: number }>

  const multipliers = db.prepare(
    'SELECT * FROM price_multipliers WHERE artist_id = ? AND enabled = 1 ORDER BY type ASC, multiplier DESC'
  ).all(artistId) as Multiplier[]

  const stages = db.prepare(
    'SELECT name, basis_points FROM artist_workflow_stages WHERE artist_id = ? AND takes_payment = 1 ORDER BY sort_order ASC'
  ).all(artistId) as Array<{ name: string; basis_points: number }>

  return {
    tiers: tiers.map(t => ({ ...t, addons: [] })),
    multipliers,
    installments: stages.map(s => ({ label: s.name, basisPoints: s.basis_points })),
    // v0.31 F3: 客户端据此决定是否显示折扣码输入框
    discountEnabled: !!(db.prepare('SELECT discount_enabled FROM artists WHERE id = ?').get(artistId) as { discount_enabled: number } | undefined)?.discount_enabled
  }
}

interface CalculatePriceOpts {
  tierId: number
  addons?: Array<{ addonId: number; quantity?: number }>
  usageMultiplierId?: number | null
  rushMultiplierId?: number | null
}

/**
 * 核心计算：无状态，传入选择返回价格明细
 */
export function calculatePrice(artistId: number, opts: CalculatePriceOpts): PriceResult {
  // v0.39 addons 清理第一批：旧增项（price_addons/addon_tiers）已冻结，
  // opts.addons 等价忽略不再计价（调用方仍传，下批删 schema 时同步移除）
  const { tierId, usageMultiplierId = null, rushMultiplierId = null } = opts

  // 1. 基础价
  if (!tierId) throw new AppError(E.PRICING_TIER_REQUIRED)
  const tier = db.prepare(
    'SELECT * FROM price_tiers WHERE id = ? AND artist_id = ?'
  ).get(tierId, artistId) as { id: number; name: string; price: number } | undefined
  if (!tier) throw new AppError(E.TIER_NOT_FOUND, 404)

  const basePrice = tier.price
  const breakdown: PriceBreakdownItem[] = [{ type: 'tier', name: tier.name, amount: basePrice, quantity: 1, multiplier: 1.0 }]

  // 2. 增项：旧增项冻结，不再读取 addon_tiers/price_addons，addonTotal 恒 0
  const addonTotal = 0

  const subtotal = basePrice + addonTotal

  // 3. 用途倍率（取最高，不叠加）
  let usageMultiplier = 1.0
  let usageName: string | null = null
  if (usageMultiplierId) {
    const um = db.prepare(
      "SELECT * FROM price_multipliers WHERE id = ? AND artist_id = ? AND type = 'usage' AND enabled = 1"
    ).get(usageMultiplierId, artistId) as Multiplier | undefined
    if (!um) throw new AppError(E.MULTIPLIER_NOT_FOUND, 404)
    usageMultiplier = um.multiplier
    usageName = um.name
  }

  // 4. 加急倍率
  let rushMultiplier = 1.0
  let rushName: string | null = null
  if (rushMultiplierId) {
    const rm = db.prepare(
      "SELECT * FROM price_multipliers WHERE id = ? AND artist_id = ? AND type = 'rush' AND enabled = 1"
    ).get(rushMultiplierId, artistId) as Multiplier | undefined
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
  ).all(artistId) as Array<{ name: string; basis_points: number }>

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
