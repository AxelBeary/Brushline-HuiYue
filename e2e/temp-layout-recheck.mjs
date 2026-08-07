// 复核子代理5条 + landing/artist alice 截图 — 浏览器内计算对比度/字号/对齐
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const BASE = 'http://localhost:5175'
const SHOTS = 'D:/Hermes Agent CN Desktop/workspace/temp/layout-audit/shots'
mkdirSync(SHOTS, { recursive: true })

const WCAG = `
(() => {
  const lum = (hex) => {
    const c = hex.replace('#','');
    const vals = [0,2,4].map(i => parseInt(c.slice(i,i+2),16)/255)
      .map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
    return 0.2126*vals[0] + 0.7152*vals[1] + 0.0722*vals[2];
  };
  const parse = (s) => {
    const m = s.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map(x => parseFloat(x.trim()));
    if (p[3] === 0) return null; // transparent
    const toHex = (v) => Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0');
    return '#' + toHex(p[0]) + toHex(p[1]) + toHex(p[2]);
  };
  const contrast = (selBg, selFg) => {
    const elBg = document.querySelector(selBg);
    const elFg = document.querySelector(selFg);
    if (!elBg || !elFg) return { ok:false, msg:'sel missing' };
    const bg = parse(getComputedStyle(elBg).backgroundColor);
    const fg = parse(getComputedStyle(elFg).color);
    if (!bg || !fg) return { ok:false, msg:'parse fail: '+bg+' / '+fg };
    const l1 = lum(bg), l2 = lum(fg);
    const ratio = (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
    return { ok:true, bg, fg, ratio: +ratio.toFixed(2) };
  };
  window.__wcag = contrast;
})();`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.addInitScript(WCAG)

const report = {}

// ── 1. Landing light ──
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.screenshot({ path: SHOTS + '/recheck-landing-light.png', fullPage: true })
report.landingLight = await page.evaluate(() => {
  // #1 卡片网格左缘对齐：grid 容器与卡片位置
  const grid = document.querySelector('[class*="grid"], [class*="card"]') // 找画师卡片容器
  // 状态徽章 #2
  const badge = document.querySelector('.artist-card .el-tag, [class*="badge"], [class*="status"]')
  const result = { contrastBadge: null, fontSizeBadge: null }
  // 通用：找含“可约稿”文本的最近元素
  const all = [...document.querySelectorAll('*')]
  const badgeEl = all.find(e => /可约稿|开放中|可约/.test(e.textContent) && e.children.length === 0)
  if (badgeEl) {
    result.badgeText = badgeEl.textContent.trim()
    result.badgeFont = getComputedStyle(badgeEl).fontSize
    result.badgeColor = getComputedStyle(badgeEl).color
    let p = badgeEl.parentElement
    while (p && getComputedStyle(p).backgroundColor === 'rgba(0, 0, 0, 0)' && p !== document.body) p = p.parentElement
    result.badgeBg = p ? getComputedStyle(p).backgroundColor : 'body'
    // 直接算
    const parse = (s) => { const m = s.match(/rgba?\\(([^)]+)\\)/); if(!m) return null; const p = m[1].split(',').map(x=>parseFloat(x.trim())); const toHex=v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0'); return '#'+toHex(p[0])+toHex(p[1])+toHex(p[2]); }
    const lum = (hex) => { const c=hex.replace('#',''); const vals=[0,2,4].map(i=>parseInt(c.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)); return 0.2126*vals[0]+0.7152*vals[1]+0.0722*vals[2]; }
    const bg = parse(result.badgeBg); const fg = parse(result.badgeColor)
    if (bg && fg) { const l1=lum(bg), l2=lum(fg); result.badgeContrast = +((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)).toFixed(2) }
  }
  // #3 footer 次级文字
  const footer = document.querySelector('footer')
  if (footer) {
    const texts = [...footer.querySelectorAll('p, span, a, div')].filter(e => e.children.length === 0 && e.textContent.trim().length > 0)
    const sampled = texts.slice(0, 5).map(e => {
      const c = getComputedStyle(e).color
      const f = getComputedStyle(footer).backgroundColor
      return { t: e.textContent.trim().slice(0, 20), color: c, bg: f, font: getComputedStyle(e).fontSize }
    })
    result.footerTexts = sampled
  }
  // #1 网格对齐：找包含画师卡片的网格容器，取卡片 x 与容器 x
  const cards = all.filter(e => /Alice|Bob/.test(e.textContent) && e.children.length < 5 && e.offsetWidth > 200)
  if (cards.length) {
    result.cardPositions = cards.slice(0, 4).map(c => ({ x: Math.round(c.getBoundingClientRect().x), w: Math.round(c.getBoundingClientRect().width) }))
  }
  return result
})

// ── 2. Landing dark ──
await page.click('.theme-toggle, [class*="theme"] button, header button, nav button').catch(() => {})
await page.waitForTimeout(600)
await page.screenshot({ path: SHOTS + '/recheck-landing-dark.png', fullPage: true })
report.landingDarkBadge = await page.evaluate(() => {
  const all = [...document.querySelectorAll('*')]
  const badgeEl = all.find(e => /可约稿|开放中|可约/.test(e.textContent) && e.children.length === 0)
  if (!badgeEl) return null
  const parse = (s) => { const m = s.match(/rgba?\\(([^)]+)\\)/); if(!m) return null; const p = m[1].split(',').map(x=>parseFloat(x.trim())); const toHex=v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0'); return '#'+toHex(p[0])+toHex(p[1])+toHex(p[2]); }
  const lum = (hex) => { const c=hex.replace('#',''); const vals=[0,2,4].map(i=>parseInt(c.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)); return 0.2126*vals[0]+0.7152*vals[1]+0.0722*vals[2]; }
  let p = badgeEl.parentElement
  while (p && getComputedStyle(p).backgroundColor === 'rgba(0, 0, 0, 0)' && p !== document.body) p = p.parentElement
  const bg = parse(getComputedStyle(p).backgroundColor), fg = parse(getComputedStyle(badgeEl).color)
  if (!bg || !fg) return { text: badgeEl.textContent.trim(), color: getComputedStyle(badgeEl).color, bgRaw: getComputedStyle(p).backgroundColor }
  const l1=lum(bg), l2=lum(fg)
  return { text: badgeEl.textContent.trim(), bg, fg, contrast: +((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)).toFixed(2) }
})

// ── 3. Artist alice classic ──
await page.goto(BASE + '/artist/alice', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.screenshot({ path: SHOTS + '/recheck-artist-alice-classic-top.png', fullPage: false })
// #4 顶部区块左缘 vs 价格表网格对齐
report.artistAlice = await page.evaluate(() => {
  const all = [...document.querySelectorAll('*')]
  const result = {}
  // 找价格表容器
  const tier = all.find(e => /头像|半身像|全身像/.test(e.textContent) && e.children.length < 8 && e.offsetWidth > 300)
  // 找顶部 hero
  const hero = all.find(e => /擅长日系头像和半身像/.test(e.textContent) && e.children.length < 30)
  const firstSection = document.querySelector('main > *, [class*="hero"], [class*="top"], [class*="header"]')
  const sections = [...document.querySelectorAll('main section, main > div, main > article')]
  result.sections = sections.slice(0, 8).map(s => ({ cls: (s.className||'').toString().slice(0,40), x: Math.round(s.getBoundingClientRect().x), w: Math.round(s.getBoundingClientRect().width) }))
  // 流程百分比徽章 #5
  const pctEls = all.filter(e => /%/.test(e.textContent) && e.children.length === 0 && e.textContent.trim().length <= 5)
  result.pctBadges = pctEls.slice(0, 6).map(e => ({ t: e.textContent.trim(), font: getComputedStyle(e).fontSize, color: getComputedStyle(e).color }))
  return result
})
await page.screenshot({ path: SHOTS + '/recheck-artist-alice-classic-workflow.png', fullPage: true })

await browser.close()
console.log(JSON.stringify(report, null, 2))
