import { describe, it, expect, beforeEach } from 'vitest'
import { db, cleanDb, seedArtist } from './setup.js'
import * as pricingService from '../src/features/pricing/pricing.service.js'

// ─── 辅助函数 ───

function seedTier(artistId, name, price, sortOrder = 1) {
  const r = db.prepare(
    'INSERT INTO price_tiers (artist_id, name, price, sort_order) VALUES (?, ?, ?, ?)'
  ).run(artistId, name, price, sortOrder)
  return db.prepare('SELECT * FROM price_tiers WHERE id = ?').get(r.lastInsertRowid)
}

function seedWorkflowStages(artistId) {
  // 定金30% + 尾款70%
  const ins = db.prepare(
    'INSERT INTO artist_workflow_stages (artist_id, name, sort_order, takes_payment, basis_points) VALUES (?, ?, ?, 1, ?)'
  )
  ins.run(artistId, '定金', 1, 3000)
  ins.run(artistId, '尾款', 2, 7000)
}

describe('价格计算器服务 (Pricing Service)', () => {
  let artist, tier

  beforeEach(() => {
    cleanDb()
    artist = seedArtist({ qq_number: '11111', subdomain: 'alice' })
    tier = seedTier(artist.id, '全身像', 200)
    seedWorkflowStages(artist.id)
  })

  // ─── 倍率 CRUD ───

  describe('倍率 CRUD', () => {
    it('TC-P-11: 创建倍率', () => {
      const m = pricingService.createMultiplier(artist.id, {
        type: 'usage', name: '商用授权', multiplier: 1.5
      })

      expect(m.name).toBe('商用授权')
      expect(m.multiplier).toBe(1.5)
      expect(m.type).toBe('usage')
    })

    it('TC-P-12: 倍率 < 1.0 拒绝', () => {
      expect(() => {
        pricingService.createMultiplier(artist.id, {
          type: 'usage', name: '打折', multiplier: 0.8
        })
      }).toThrow('MULTIPLIER_INVALID')
    })

    it('TC-P-13: 更新倍率', () => {
      const m = pricingService.createMultiplier(artist.id, {
        type: 'rush', name: '加急', multiplier: 2.0
      })
      const updated = pricingService.updateMultiplier(artist.id, m.id, { multiplier: 3.0 })
      expect(updated.multiplier).toBe(3.0)
    })

    it('TC-P-14: 删除倍率', () => {
      const m = pricingService.createMultiplier(artist.id, {
        type: 'usage', name: '临时', multiplier: 1.2
      })
      pricingService.deleteMultiplier(artist.id, m.id)

      const list = pricingService.getMultipliers(artist.id)
      expect(list.find(x => x.id === m.id)).toBeUndefined()
    })
  })

  // ─── 计算引擎 ───

  describe('计算引擎', () => {
    it('TC-P-15: 纯基础价（无增项无倍率）', () => {
      const result = pricingService.calculatePrice(artist.id, { tierId: tier.id })

      expect(result.basePrice).toBe(200)
      expect(result.addonTotal).toBe(0)
      expect(result.subtotal).toBe(200)
      expect(result.totalPrice).toBe(200)
      expect(result.installments).toHaveLength(2)
      expect(result.installments[0].amount).toBe(60)  // 30%
      expect(result.installments[1].amount).toBe(140) // 70%
    })

    it('TC-P-16: 传 addons 不影响档位算价（旧增项已冻结，等价忽略）', () => {
      // v0.39 addons 清理第一批：price_addons/addon_tiers 冻结，
      // 即使传入不存在的增项 ID 也不再拒绝/计价，档位基础价不变
      const result = pricingService.calculatePrice(artist.id, {
        tierId: tier.id,
        addons: [{ addonId: 99999, quantity: 1 }]
      })

      expect(result.basePrice).toBe(200)
      expect(result.addonTotal).toBe(0)
      expect(result.subtotal).toBe(200)
      expect(result.totalPrice).toBe(200)
      expect(result.breakdown).toHaveLength(1)
    })

    it('TC-P-17: 传多个 addons（含重复 ID）也不影响档位算价', () => {
      // 旧逻辑：重复增项 ID 抛 VALIDATION、不存在增项抛 ADDON_NOT_FOUND；
      // 现均等价忽略（增项冻结，不再读取任何增项表）
      const result = pricingService.calculatePrice(artist.id, {
        tierId: tier.id,
        addons: [
          { addonId: 1, quantity: 1 },
          { addonId: 1, quantity: 2 },
          { addonId: 99999 }
        ]
      })

      expect(result.addonTotal).toBe(0)
      expect(result.subtotal).toBe(200)
      expect(result.totalPrice).toBe(200)
    })

    it('TC-P-22: 用途倍率', () => {
      const um = pricingService.createMultiplier(artist.id, {
        type: 'usage', name: '商用授权', multiplier: 1.5
      })

      const result = pricingService.calculatePrice(artist.id, {
        tierId: tier.id,
        usageMultiplierId: um.id
      })

      expect(result.usageMultiplier).toBe(1.5)
      expect(result.totalPrice).toBe(300) // 200 × 1.5
    })

    it('TC-P-23: 加急倍率', () => {
      const rm = pricingService.createMultiplier(artist.id, {
        type: 'rush', name: '加急（3天内）', multiplier: 2.0
      })

      const result = pricingService.calculatePrice(artist.id, {
        tierId: tier.id,
        rushMultiplierId: rm.id
      })

      expect(result.rushMultiplier).toBe(2.0)
      expect(result.totalPrice).toBe(400) // 200 × 2.0
    })

    it('TC-P-24: 用途 × 加急叠加', () => {
      const um = pricingService.createMultiplier(artist.id, {
        type: 'usage', name: '商用', multiplier: 1.5
      })
      const rm = pricingService.createMultiplier(artist.id, {
        type: 'rush', name: '加急', multiplier: 2.0
      })

      const result = pricingService.calculatePrice(artist.id, {
        tierId: tier.id,
        usageMultiplierId: um.id,
        rushMultiplierId: rm.id
      })

      // 200 × 1.5 × 2.0 = 600
      expect(result.totalPrice).toBe(600)
      expect(result.usageMultiplier).toBe(1.5)
      expect(result.rushMultiplier).toBe(2.0)
    })

    it('TC-P-25: 完整场景 — 基础+倍率+分期', () => {
      const um = pricingService.createMultiplier(artist.id, {
        type: 'usage', name: '商用', multiplier: 1.5
      })
      const rm = pricingService.createMultiplier(artist.id, {
        type: 'rush', name: '加急', multiplier: 2.0
      })

      const result = pricingService.calculatePrice(artist.id, {
        tierId: tier.id,
        usageMultiplierId: um.id,
        rushMultiplierId: rm.id
      })

      // 基础 200 × 1.5 × 2.0 = 600（旧增项冻结，无增项参与）
      expect(result.basePrice).toBe(200)
      expect(result.addonTotal).toBe(0)
      expect(result.subtotal).toBe(200)
      expect(result.totalPrice).toBe(600)
      // 分期：定金 30% = 180，尾款 70% = 420
      expect(result.installments[0].amount).toBe(180)
      expect(result.installments[1].amount).toBe(420)
      // breakdown 有 3 项：tier + usage + rush
      expect(result.breakdown).toHaveLength(3)
    })

    it('TC-P-26: 未选档位拒绝', () => {
      expect(() => {
        pricingService.calculatePrice(artist.id, { tierId: null })
      }).toThrow('PRICING_TIER_REQUIRED')
    })

    it('TC-P-28: 禁用的倍率不可选', () => {
      const m = pricingService.createMultiplier(artist.id, {
        type: 'usage', name: '已下架', multiplier: 2.0
      })
      pricingService.updateMultiplier(artist.id, m.id, { enabled: false })

      expect(() => {
        pricingService.calculatePrice(artist.id, {
          tierId: tier.id,
          usageMultiplierId: m.id
        })
      }).toThrow('MULTIPLIER_NOT_FOUND')
    })
  })

  // ─── 公开报价 ───

  describe('公开报价', () => {
    it('TC-P-29: 获取完整报价结构（旧增项冻结，tiers.addons 恒为空数组）', () => {
      seedTier(artist.id, '头像', 50, 2)
      pricingService.createMultiplier(artist.id, {
        type: 'usage', name: '商用', multiplier: 1.5
      })

      const pricing = pricingService.getPublicPricing(artist.id)

      expect(pricing.tiers).toHaveLength(2)
      expect(pricing.tiers[0].addons).toHaveLength(0)
      expect(pricing.tiers[0].addons).toEqual([])
      expect(pricing.multipliers).toHaveLength(1)
      expect(pricing.installments).toHaveLength(2)
      expect(pricing.installments[0].basisPoints).toBe(3000)
    })
  })
})
