// 精细分析：#1 landing 卡片网格 / #3 footer 背景对比度 / #4 artist 顶部对齐
import { chromium } from 'playwright'

const BASE = 'http://localhost:5175'
const SHOTS = 'D:/Hermes Agent CN Desktop/workspace/temp/layout-audit/shots'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const report = {}

// ── Landing：#1 网格分析 ──
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
report.landing = await page.evaluate(() => {
  const out = { bodyBg: getComputedStyle(document.body).backgroundColor, htmlBg: getComputedStyle(document.documentElement).backgroundColor }
  // 找所有含 Alice/Bob 的卡片级元素（宽 < 500）
  const all = [...document.querySelectorAll('*')]
  const cards = all.filter(e => e.children.length > 0 && /Alice|Bob/.test(e.textContent) && e.offsetWidth > 150 && e.offsetWidth < 500)
    .map(c => { const r = c.getBoundingClientRect(); return { tag: c.tagName, cls: (c.className||'').toString().slice(0,50), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } })
  out.cards = cards.slice(0, 10)
  // 找网格容器（display grid）
  const grids = all.filter(e => getComputedStyle(e).display === 'grid' && e.offsetWidth > 400)
    .map(g => { const r = g.getBoundingClientRect(); return { cls: (g.className||'').toString().slice(0,50), x: Math.round(r.x), w: Math.round(r.width), cols: getComputedStyle(g).gridTemplateColumns } })
  out.grids = grids.slice(0, 8)
  // footer 背景
  const footer = document.querySelector('footer')
  if (footer) {
    let p = footer
    let bg = getComputedStyle(p).backgroundColor
    while (bg === 'rgba(0, 0, 0, 0)' && p !== document.documentElement) { p = p.parentElement; bg = getComputedStyle(p).backgroundColor }
    out.footerBg = bg
    out.footerTextColor = getComputedStyle(footer.querySelector('p, span') || footer).color
  }
  return out
})

// ── Artist alice：#4 顶部 vs 价格表 ──
await page.goto(BASE + '/artist/alice', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
report.artist = await page.evaluate(() => {
  const out = {}
  const all = [...document.querySelectorAll('*')]
  // hero/顶部区块：含 bio 的容器
  const bioEl = all.find(e => /擅长日系头像和半身像/.test(e.textContent) && e.children.length < 40 && e.offsetWidth > 400)
  if (bioEl) { let s = bioEl; const r = s.getBoundingClientRect(); out.hero = { cls: (s.className||'').toString().slice(0,60), x: Math.round(r.x), w: Math.round(r.width) } }
  // 价格表网格：TplTierGrid 或含“头像”的网格
  const tierEl = all.find(e => /头像/.test(e.textContent) && /半身像/.test(e.textContent) && e.offsetWidth > 400 && e.children.length < 20)
  if (tierEl) { let s = tierEl; const r = s.getBoundingClientRect(); out.tier = { cls: (s.className||'').toString().slice(0,60), x: Math.round(r.x), w: Math.round(r.width) } }
  // 内容容器（main 内最大的居中容器）
  const main = document.querySelector('main')
  if (main) {
    const candidates = [...main.querySelectorAll('div, section')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 600 && r.x > 0 })
    out.wideSections = candidates.slice(0, 10).map(e => { const r = e.getBoundingClientRect(); return { cls: (e.className||'').toString().slice(0,50), x: Math.round(r.x), w: Math.round(r.width) } })
  }
  return out
})

await browser.close()
console.log(JSON.stringify(report, null, 2))
