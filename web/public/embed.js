/* ============================================
 * 绘约平台 - 嵌入脚本（跳转版，v0.18）
 * 画师在自己的网站上插入此脚本即可显示约稿按钮，
 * 点击后跳转到画师公开主页（不再使用 iframe 弹窗）。
 * 用法: <script src="https://你的域名/embed.js" data-artist="alice"></script>
 * ============================================ */
(function () {
  'use strict'

  var BASE_URL = (document.currentScript
    ? document.currentScript.src.replace('/embed.js', '').replace(/\/+$/, '')
    : '') || window.location.origin

  var ARTIST = document.currentScript
    ? document.currentScript.getAttribute('data-artist')
    : null

  if (!ARTIST) {
    console.warn('[HuiYue] Missing data-artist attribute on embed script tag')
    return
  }

  // ─── 创建按钮 ───
  var btn = document.createElement('button')
  btn.textContent = '✨ Commission Me'
  btn.setAttribute('aria-label', 'Go to commission page')
  btn.style.cssText = [
    'padding:10px 24px',
    'background:#1a1a1a',
    'color:#fff',
    'border:none',
    'border-radius:8px',
    'cursor:pointer',
    'font-size:14px',
    'transition:opacity 0.2s'
  ].join(';')

  btn.addEventListener('mouseenter', function () { btn.style.opacity = '0.85' })
  btn.addEventListener('mouseleave', function () { btn.style.opacity = '1' })

  // ─── 点击跳转到画师公开主页 ───
  btn.addEventListener('click', function () {
    window.location.href = BASE_URL + '/artist/' + encodeURIComponent(ARTIST)
  })

  // ─── 挂载到页面 ───
  var target = document.getElementById('huiyue-commission')
  if (target) {
    target.appendChild(btn)
  } else if (document.currentScript && document.currentScript.parentNode) {
    document.currentScript.parentNode.insertBefore(btn, document.currentScript.nextSibling)
  }
})()
