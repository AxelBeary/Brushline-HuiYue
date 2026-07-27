/* ============================================
 * 绘约平台 - 嵌入脚本
 * 画师在自己的网站上插入此脚本即可启用约稿按钮
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
  btn.setAttribute('aria-label', 'Open commission form')
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

  // ─── 点击打开弹窗 ───
  var overlay, iframe, closeBtn

  function openWidget() {
    overlay = document.createElement('div')
    overlay.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
      'background:rgba(0,0,0,0.5)', 'z-index:2147483646', 'display:flex',
      'align-items:center', 'justify-content:center', 'padding:20px',
      'box-sizing:border-box'
    ].join(';')

    iframe = document.createElement('iframe')
    iframe.src = BASE_URL + '/embed.html?artist=' + encodeURIComponent(ARTIST)
    iframe.style.cssText = [
      'width:100%', 'max-width:520px', 'height:90vh', 'max-height:700px',
      'border:none', 'border-radius:12px', 'background:#fff',
      'box-shadow:0 20px 60px rgba(0,0,0,0.3)'
    ].join(';')
    iframe.setAttribute('allow', '')
    iframe.setAttribute('title', 'Commission form')

    closeBtn = document.createElement('button')
    closeBtn.innerHTML = '&times;'
    closeBtn.setAttribute('aria-label', 'Close')
    closeBtn.style.cssText = [
      'position:fixed', 'top:60px', 'right:20px', 'z-index:2147483648',
      'width:40px', 'height:40px', 'background:#fff', 'border:1px solid #ddd',
      'border-radius:50%', 'cursor:pointer', 'font-size:22px', 'line-height:1',
      'display:flex', 'align-items:center', 'justify-content:center',
      'color:#666', 'box-shadow:0 2px 8px rgba(0,0,0,0.1)'
    ].join(';')

    function closeWidget() {
      if (overlay) overlay.remove()
      if (closeBtn) closeBtn.remove()
      overlay = null; iframe = null; closeBtn = null
    }

    closeBtn.addEventListener('click', closeWidget)
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeWidget()
    })

    // 按 Escape 关闭
    function onKeydown(e) {
      if (e.key === 'Escape') { closeWidget(); document.removeEventListener('keydown', onKeydown) }
    }
    document.addEventListener('keydown', onKeydown)

    overlay.appendChild(iframe)
    document.body.appendChild(overlay)
    document.body.appendChild(closeBtn)
  }

  btn.addEventListener('click', openWidget)

  // ─── 挂载到页面 ───
  var target = document.getElementById('huiyue-commission')
  if (target) {
    target.appendChild(btn)
  } else if (document.currentScript && document.currentScript.parentNode) {
    document.currentScript.parentNode.insertBefore(btn, document.currentScript.nextSibling)
  }
})()
