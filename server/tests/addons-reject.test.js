import { describe, it, expect, beforeEach } from 'vitest'
import { db, cleanDb, seedArtist } from './setup.js'
import { buildApp } from '../src/app.js'

// v43 (2026-08-05): addons schema 字段已删除。
// 实际行为：Fastify 默认 ajv removeAdditional=true —— addons 字段被静默剥离而非 400
// （routes.test.js L272 / style.test.js L669 已实证该配置），故断言"请求成功 + addons 零作用"。
describe('addons 字段清理回归（v43 schema 删除）', () => {
  let app, artist, tier

  beforeEach(async () => {
    cleanDb()
    artist = seedArtist({ qq_number: '77001', subdomain: 'alice' })
    const r = db.prepare(
      'INSERT INTO price_tiers (artist_id, name, price, sort_order) VALUES (?, ?, ?, ?)'
    ).run(artist.id, '全身像', 200, 1)
    tier = db.prepare('SELECT * FROM price_tiers WHERE id = ?').get(r.lastInsertRowid)
    app = await buildApp({ logger: false })
    await app.ready()
  })

  it('TC-AR-01: POST /api/orders 带 addons → 剥离且不影响订单价格（不含增项）', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: {
        subdomain: 'alice',
        tierId: tier.id,
        clientQq: '123456',
        agreeRules: true,
        addons: [{ addonId: 1, quantity: 1 }]
      }
    })
    // removeAdditional 剥离 addons → 请求成功，价格 = 档位基础价 20000 分（无增项）
    expect(res.statusCode).toBe(200)
    expect(res.json().totalPriceCents).toBe(20000)
  })

  it('TC-AR-02: POST /api/public/calculate-price 带 addons → 剥离且 addonTotal 恒 0', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/public/calculate-price',
      payload: {
        subdomain: 'alice',
        tierId: tier.id,
        addons: [{ addonId: 1, quantity: 1 }]
      }
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.addonTotal).toBe(0)
    expect(body.totalPriceCents).toBe(20000)
  })

  it('TC-AR-03: POST /api/public/calculate-price 不带 addons → 正常 200（回归）', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/public/calculate-price',
      payload: {
        subdomain: 'alice',
        tierId: tier.id
      }
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.basePrice).toBe(200)
    expect(body.addonTotal).toBe(0)
  })
})
