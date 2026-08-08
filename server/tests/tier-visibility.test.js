import { describe, it, expect, beforeEach } from 'vitest'
import { db, cleanDb, seedArtist } from './setup.js'
import { createSession } from '../src/features/auth/auth.service.js'
import { buildApp } from '../src/app.js'

/** 创建档位（直接 SQL，绕过路由） */
function seedTier(artistId, overrides = {}) {
  const defaults = { name: '测试档位', price: 10000, sort_order: 1 }
  const data = { ...defaults, ...overrides }
  const result = db.prepare(
    'INSERT INTO price_tiers (artist_id, name, price, sort_order) VALUES (?, ?, ?, ?)'
  ).run(artistId, data.name, data.price, data.sort_order)
  return db.prepare('SELECT * FROM price_tiers WHERE id = ?').get(result.lastInsertRowid)
}

describe('档位三态 (Tier Visibility, v0.24 #10)', () => {
  let app, admin, token

  beforeEach(async () => {
    cleanDb()
    admin = seedArtist({ qq_number: '88201', subdomain: 'vis-test' })
    db.prepare("UPDATE platform_config SET value = '88201' WHERE key = 'admin_qq'").run()
    token = createSession(admin.id, admin.token_version)
    app = await buildApp({ logger: false })
    await app.ready()
  })

  // ─── 迁移 v25 ───

  it('TC-TV-01: 迁移 v25 — visibility 列存在且默认 visible', () => {
    const tier = seedTier(admin.id)
    expect(tier.visibility).toBe('visible')
  })

  it('TC-TV-02: 迁移幂等 — 重复执行不报错', async () => {
    const { initDatabase } = await import('../src/db/init.js')
    expect(() => initDatabase(db)).not.toThrow()
  })

  // ─── 公开 API 过滤 ───

  it('TC-TV-03: 公开主页过滤 hidden、保留 showcase', async () => {
    // 用非管理员画师（公开主页屏蔽 admin QQ）
    const pub = seedArtist({ qq_number: '88210', subdomain: 'vis-pub' })
    seedTier(pub.id, { name: '正常', sort_order: 1 })
    seedTier(pub.id, { name: '展示', sort_order: 2 })
    seedTier(pub.id, { name: '隐藏', sort_order: 3 })

    db.prepare("UPDATE price_tiers SET visibility = 'showcase' WHERE name = '展示'").run()
    db.prepare("UPDATE price_tiers SET visibility = 'hidden' WHERE name = '隐藏'").run()

    const res = await app.inject({
      method: 'GET',
      url: '/api/artists/vis-pub'
    })

    expect(res.statusCode).toBe(200)
    const names = res.json().tiers.map(t => t.name)
    expect(names).toContain('正常')
    expect(names).toContain('展示')
    expect(names).not.toContain('隐藏')
  })

  it('TC-TV-04: 公开报价 API 过滤 hidden', async () => {
    seedTier(admin.id, { name: '可见', sort_order: 1 })
    seedTier(admin.id, { name: '隐藏', sort_order: 2 })
    db.prepare("UPDATE price_tiers SET visibility = 'hidden' WHERE name = '隐藏'").run()

    const res = await app.inject({
      method: 'GET',
      url: '/api/public/pricing/vis-test'
    })

    expect(res.statusCode).toBe(200)
    const names = res.json().tiers.map(t => t.name)
    expect(names).toContain('可见')
    expect(names).not.toContain('隐藏')
  })

  // ─── 下单校验 ───

  it('TC-TV-09: 下单选 visible 档位成功', async () => {
    const tier = seedTier(admin.id)
    db.prepare("UPDATE artists SET status = 'open' WHERE id = ?").run(admin.id)

    const res = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: {
        subdomain: 'vis-test',
        tierId: tier.id,
        clientQq: '99901',
        agreeRules: true
      }
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().orderNo).toBeTruthy()
  })

  it('TC-TV-10: 下单选 showcase 档位被拒', async () => {
    const tier = seedTier(admin.id)
    db.prepare("UPDATE price_tiers SET visibility = 'showcase' WHERE id = ?").run(tier.id)
    db.prepare("UPDATE artists SET status = 'open' WHERE id = ?").run(admin.id)

    const res = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: {
        subdomain: 'vis-test',
        tierId: tier.id,
        clientQq: '99902',
        agreeRules: true
      }
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('TIER_NOT_AVAILABLE')
  })

  it('TC-TV-11: 下单选 hidden 档位被拒', async () => {
    const tier = seedTier(admin.id)
    db.prepare("UPDATE price_tiers SET visibility = 'hidden' WHERE id = ?").run(tier.id)
    db.prepare("UPDATE artists SET status = 'open' WHERE id = ?").run(admin.id)

    const res = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: {
        subdomain: 'vis-test',
        tierId: tier.id,
        clientQq: '99903',
        agreeRules: true
      }
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('TIER_NOT_AVAILABLE')
  })

  it('TC-TV-12: 无 tierId 下单不受影响', async () => {
    db.prepare("UPDATE artists SET status = 'open' WHERE id = ?").run(admin.id)

    const res = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: {
        subdomain: 'vis-test',
        clientQq: '99904',
        agreeRules: true
      }
    })

    expect(res.statusCode).toBe(200)
  })
})
