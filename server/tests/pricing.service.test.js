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

  // ─── 增项 CRUD ───

  describe('增项 CRUD', () => {
    it('TC-P-01: 创建增项 — 默认关联所有档位', () => {
      const addon = pricingService.createAddon(artist.id, {
        category: 'expression',
        name: '表情差分',
        priceType: 'fixed',
        priceValue: 15
      })

      expect(addon.name).toBe('表情差分')
      expect(addon.price_type).toBe('fixed')
      expect(addon.price_value).toBe(15)
      expect(addon.select_mode).toBe('quantity')
      expect(addon.tierIds).toContain(tier.id)
    })

    it('TC-P-02: 创建增项 — 指定关联档位', () => {
      const tier2 = seedTier(artist.id, '头像', 50, 2)
      const addon = pricingService.createAddon(artist.id, {
        category: 'background',
        name: '复杂背景',
        priceValue: 80,
        tierIds: [tier2.id]
      })

      expect(addon.tierIds).toEqual([tier2.id])
      expect(addon.tierIds).not.toContain(tier.id)
    })

    it('TC-P-03: 创建增项 — 名称为空拒绝', () => {
      expect(() => {
        pricingService.createAddon(artist.id, { category: 'other', name: '', priceValue: 10 })
      }).toThrow('ADDON_NAME_EMPTY')
    })

    it('TC-P-04: 创建增项 — 无效分类拒绝', () => {
      expect(() => {
        pricingService.createAddon(artist.id, { category: 'invalid', name: 'X', priceValue: 10 })
      }).toThrow('VALIDATION')
    })

    it('TC-P-05: 更新增项', () => {
      const addon = pricingService.createAddon(artist.id, {
        category: 'weapon', name: '武器', priceValue: 50
      })
      const updated = pricingService.updateAddon(artist.id, addon.id, {
        name: '大型武器', priceValue: 100
      })

      expect(updated.name).toBe('大型武器')
      expect(updated.price_value).toBe(100)
    })

    it('TC-P-06: 删除增项', () => {
      const addon = pricingService.createAddon(artist.id, {
        category: 'other', name: '临时', priceValue: 5
      })
      pricingService.deleteAddon(artist.id, addon.id)

      expect(() => pricingService.getAddon(artist.id, addon.id)).toThrow('ADDON_NOT_FOUND')
    })

    it('TC-P-07: 增项排序', () => {
      const a1 = pricingService.createAddon(artist.id, { category: 'expression', name: 'A', priceValue: 10 })
      const a2 = pricingService.createAddon(artist.id, { category: 'outfit', name: 'B', priceValue: 20 })
      const a3 = pricingService.createAddon(artist.id, { category: 'background', name: 'C', priceValue: 30 })

      const reordered = pricingService.reorderAddons(artist.id, [a3.id, a1.id, a2.id])
      expect(reordered.map(a => a.name)).toEqual(['C', 'A', 'B'])
    })

    it('TC-P-08: 排序长度不匹配拒绝', () => {
      pricingService.createAddon(artist.id, { category: 'other', name: 'A', priceValue: 10 })
      pricingService.createAddon(artist.id, { category: 'other', name: 'B', priceValue: 20 })

      expect(() => {
        pricingService.reorderAddons(artist.id, [1])
      }).toThrow('REORDER_LENGTH')
    })

    it('TC-P-09: 更新档位关联', () => {
      const tier2 = seedTier(artist.id, '头像', 50, 2)
      const addon = pricingService.createAddon(artist.id, {
        category: 'expression', name: '表情', priceValue: 15
      })

      // 默认关联所有 → 改为只关联 tier2
      const updated = pricingService.updateAddonTiers(artist.id, addon.id, [tier2.id])
      expect(updated.tierIds).toEqual([tier2.id])
    })

    it('TC-P-10: 关联不属于自己的档位拒绝', () => {
      const other = seedArtist({ qq_number: '22222', subdomain: 'bob' })
      const otherTier = seedTier(other.id, '别人的', 100)
      const addon = pricingService.createAddon(artist.id, {
        category: 'other', name: 'X', priceValue: 10
      })

      expect(() => {
        pricingService.updateAddonTiers(artist.id, addon.id, [otherTier.id])
      }).toThrow('TIER_NOT_FOUND')
    })
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

    it('TC-P-16: 固定增项', () => {
      const addon = pricingService.createAddon(artist.id, {
        category: 'background', name: '复杂背景', priceType: 'fixed', priceValue: 80
      })

      const result = pricingService.calculatePrice(artist.id, {
        tierId: tier.id,
        addons: [{ addonId: addon.id, quantity: 1 }]
      })

      expect(result.addonTotal).toBe(80)
      expect(result.subtotal).toBe(280)
      expect(result.totalPrice).toBe(280)
    })

    it('TC-P-17: 百分比增项基于基础价（不是小计）', () => {
      // 固定增项 80 + 百分比增项 40%
      const fixed = pricingService.createAddon(artist.id, {
        category: 'background', name: '复杂背景', priceType: 'fixed', priceValue: 80
      })
      const pct = pricingService.createAddon(artist.id, {
        category: 'expression', name: '差分表情', priceType: 'percent', priceValue: 0.4,
        selectMode: 'toggle'
      })

      const result = pricingService.calculatePrice(artist.id, {
        tierId: tier.id,
        addons: [
          { addonId: fixed.id, quantity: 1 },
          { addonId: pct.id, quantity: 1 }
        ]
      })

      // 百分比基于基础价 200，不是小计 280
      // 200 * 0.4 = 80
      expect(result.addonTotal).toBe(160) // 80 + 80
      expect(result.subtotal).toBe(360)
    })

    it('TC-P-18: 数量增项', () => {
      const addon = pricingService.createAddon(artist.id, {
        category: 'expression', name: '表情差分', priceType: 'fixed', priceValue: 15, maxQty: 5
      })

      const result = pricingService.calculatePrice(artist.id, {
        tierId: tier.id,
        addons: [{ addonId: addon.id, quantity: 3 }]
      })

      expect(result.addonTotal).toBe(45) // 15 × 3
      const line = result.breakdown.find(b => b.type === 'addon')
      expect(line.name).toBe('表情差分 ×3')
      expect(line.quantity).toBe(3)
    })

    it('TC-P-19: 超出最大数量拒绝', () => {
      const addon = pricingService.createAddon(artist.id, {
        category: 'expression', name: '表情', priceValue: 15, maxQty: 3
      })

      expect(() => {
        pricingService.calculatePrice(artist.id, {
          tierId: tier.id,
          addons: [{ addonId: addon.id, quantity: 5 }]
        })
      }).toThrow('ADDON_MAX_QTY')
    })

    it('TC-P-20: inquiry 模式不计价', () => {
      const addon = pricingService.createAddon(artist.id, {
        category: 'other', name: '定制挂件', priceValue: 0, selectMode: 'inquiry'
      })

      const result = pricingService.calculatePrice(artist.id, {
        tierId: tier.id,
        addons: [{ addonId: addon.id }]
      })

      expect(result.addonTotal).toBe(0)
      expect(result.totalPrice).toBe(200)
      const line = result.breakdown.find(b => b.name.includes('定制挂件'))
      expect(line.amount).toBe(0)
    })

    it('TC-P-21: 增项不适用于当前档位拒绝', () => {
      const tier2 = seedTier(artist.id, '头像', 50, 2)
      const addon = pricingService.createAddon(artist.id, {
        category: 'weapon', name: '武器', priceValue: 50, tierIds: [tier2.id]
      })

      expect(() => {
        pricingService.calculatePrice(artist.id, {
          tierId: tier.id, // 全身像，不是头像
          addons: [{ addonId: addon.id }]
        })
      }).toThrow('ADDON_NOT_FOR_TIER')
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

    it('TC-P-25: 完整场景 — 基础+增项+倍率+分期', () => {
      const addon1 = pricingService.createAddon(artist.id, {
        category: 'expression', name: '表情差分', priceType: 'fixed', priceValue: 15
      })
      const addon2 = pricingService.createAddon(artist.id, {
        category: 'background', name: '复杂背景', priceType: 'percent', priceValue: 0.4,
        selectMode: 'toggle'
      })
      const um = pricingService.createMultiplier(artist.id, {
        type: 'usage', name: '商用', multiplier: 1.5
      })
      const rm = pricingService.createMultiplier(artist.id, {
        type: 'rush', name: '加急', multiplier: 2.0
      })

      const result = pricingService.calculatePrice(artist.id, {
        tierId: tier.id,
        addons: [
          { addonId: addon1.id, quantity: 2 },
          { addonId: addon2.id, quantity: 1 }
        ],
        usageMultiplierId: um.id,
        rushMultiplierId: rm.id
      })

      // 基础 200 + 表情 15×2=30 + 背景 200×0.4=80 = 小计 310
      expect(result.basePrice).toBe(200)
      expect(result.addonTotal).toBe(110)
      expect(result.subtotal).toBe(310)
      // 310 × 1.5 × 2.0 = 930
      expect(result.totalPrice).toBe(930)
      // 分期：定金 30% = 279，尾款 70% = 651
      expect(result.installments[0].amount).toBe(279)
      expect(result.installments[1].amount).toBe(651)
      // breakdown 有 5 项：tier + 2 addon + usage + rush
      expect(result.breakdown).toHaveLength(5)
    })

    it('TC-P-26: 未选档位拒绝', () => {
      expect(() => {
        pricingService.calculatePrice(artist.id, { tierId: null })
      }).toThrow('PRICING_TIER_REQUIRED')
    })

    it('TC-P-27: 禁用的增项不可选', () => {
      const addon = pricingService.createAddon(artist.id, {
        category: 'other', name: '已下架', priceValue: 10
      })
      pricingService.updateAddon(artist.id, addon.id, { enabled: false })

      expect(() => {
        pricingService.calculatePrice(artist.id, {
          tierId: tier.id,
          addons: [{ addonId: addon.id }]
        })
      }).toThrow('ADDON_NOT_FOUND')
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
    it('TC-P-29: 获取完整报价结构', () => {
      seedTier(artist.id, '头像', 50, 2)
      pricingService.createAddon(artist.id, {
        category: 'expression', name: '表情差分', priceValue: 15
      })
      pricingService.createMultiplier(artist.id, {
        type: 'usage', name: '商用', multiplier: 1.5
      })

      const pricing = pricingService.getPublicPricing(artist.id)

      expect(pricing.tiers).toHaveLength(2)
      expect(pricing.tiers[0].addons).toHaveLength(1)
      expect(pricing.multipliers).toHaveLength(1)
      expect(pricing.installments).toHaveLength(2)
      expect(pricing.installments[0].basisPoints).toBe(3000)
    })
  })
})
