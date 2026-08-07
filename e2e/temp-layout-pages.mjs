// 剩余页面：bob主页/3模板/login/下单/查单 + #4 hero对齐数据
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
const BASE = 'http://localhost:5175'
const SHOTS = 'D:/Hermes Agent CN Desktop/workspace/temp/layout-audit/shots'
mkdirSync(SHOTS, { recursive: true })
const browser = await chromium.launch()
const report = {}

async function shot(page, name, full = true) { await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: full }) }

// #4 hero vs body 对齐
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(BASE + '/artist/alice', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  report.heroBody = await page.evaluate(() => {
    const hero = document.querySelector('.tpl-hero')
    const body = document.querySelector('.classic-body')
    const main = document.querySelector('.classic-main')
    const heroR = hero?.getBoundingClientRect(), bodyR = body?.getBoundingClientRect(), mainR = main?.getBoundingClientRect()
    return {
      hero: heroR ? { x: Math.round(heroR.x), w: Math.round(heroR.width) } : null,
      body: bodyR ? { x: Math.round(bodyR.x), w: Math.round(bodyR.width) } : null,
      main: mainR ? { x: Math.round(mainR.x), w: Math.round(mainR.width) } : null,
      heroName: document.querySelector('.tpl-hero-name')?.textContent
    }
  })
  await page.close()
}

// bob 主页（classic 同款，数据不同 status=full）
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(BASE + '/artist/bob', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, 'bob-home')
  report.bob = await page.evaluate(() => {
    const badge = [...document.querySelectorAll('*')].find(e => /不可约|暂不接|满/.test(e.textContent) && e.children.length === 0)
    const hero = document.querySelector('.tpl-hero')
    return { badge: badge?.textContent.trim() || null, heroCls: hero?.className || null, title: document.title }
  })
  await page.close()
}

// 三模板 _tpl=gallery / folio / atelier
for (const tpl of ['gallery', 'folio', 'atelier']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`${BASE}/artist/alice?_tpl=${tpl}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await shot(page, `tpl-${tpl}`)
  report[tpl] = await page.evaluate(() => {
    const out = { heroVariant: null, sections: [] }
    const hero = document.querySelector('.tpl-hero')
    out.heroVariant = hero?.className.match(/tpl-hero--(\w+)/)?.[1] || null
    const main = document.querySelector('main')
    if (main) {
      out.sections = [...main.querySelectorAll('section, .tpl-*')].slice(0, 12).map(s => {
        const r = s.getBoundingClientRect()
        return { cls: (s.className||'').toString().slice(0, 45), x: Math.round(r.x), w: Math.round(r.width) }
      })
    }
    // 水平溢出检测
    out.hOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth
    return out
  })
  await page.close()
}

// login 页
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, 'login')
  report.login = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input')].map(i => ({ ph: i.placeholder, type: i.type }))
    const btn = [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(Boolean)
    return { inputs, btn, hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }
  })
  await page.close()
}

// 下单页（需先建 order 数据？查单页单独）
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(BASE + '/artist/alice/order', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await shot(page, 'order-form')
  report.order = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input, textarea')].map(i => ({ ph: i.placeholder || '', t: i.tagName }))
    const radios = document.querySelectorAll('input[type=radio], .el-radio').length
    const tiers = [...document.querySelectorAll('.tier-card, [class*=tier]')].length
    return { inputCount: inputs.length, radios, tierEls: tiers, hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }
  })
  await page.close()
}

// 查单页
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(BASE + '/artist/alice/track', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, 'track')
  report.track = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input')].map(i => ({ ph: i.placeholder, type: i.type }))
    const btn = [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(Boolean)
    return { inputs, btn, hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }
  })
  await page.close()
}

// 移动端抽查（375px）
{
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, 'mobile-landing')
  report.mobileLanding = await page.evaluate(() => ({
    hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth
  }))
  await page.close()
}
{
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
  await page.goto(BASE + '/artist/alice', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await shot(page, 'mobile-artist')
  report.mobileArtist = await page.evaluate(() => ({
    hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth
  }))
  await page.close()
}
{
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
  await page.goto(BASE + '/artist/alice/order', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await shot(page, 'mobile-order')
  report.mobileOrder = await page.evaluate(() => ({
    hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth
  }))
  await page.close()
}

await browser.close()
console.log(JSON.stringify(report, null, 2))
