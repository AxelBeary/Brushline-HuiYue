<template>
  <div class="embed-order">
    <!-- ⚠️ 已废弃（v0.18）：嵌入功能改为跳转模式，embed.js 点击直接跳转画师公开主页。
         本组件及 embed.html / src/embed/main.js 不再被 embed.js 引用，
         待 vite.config.js 移除 embed 入口后整体删除（需一号协调）。 -->
    <!-- 加载中 -->
    <div v-if="loading" class="state-loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

    <!-- 错误 -->
    <div v-else-if="error" class="state-error">
      <p>{{ error }}</p>
    </div>

    <!-- 表单 -->
    <template v-else-if="artist">
      <div class="eo-header">
        <h2>{{ t('orderForm.title') }}</h2>
        <p class="eo-artist">→ {{ artist.name }}</p>
      </div>

      <div class="eo-body">
        <!-- 档位选择 -->
        <div class="eo-field" v-if="tiers.length">
          <label>{{ t('orderForm.tierLabel') }}</label>
          <div class="eo-tier-list">
            <div
              v-for="tier in tiers" :key="tier.id"
              class="eo-tier-item"
              :class="{ active: selectedTier === tier.id }"
              @click="selectedTier = tier.id"
            >
              <div class="eo-tier-top">
                <span class="eo-tier-name">{{ tier.name }}</span>
                <span class="eo-tier-price">¥{{ tier.price }}</span>
              </div>
              <p class="eo-tier-desc" v-if="tier.description">{{ tier.description }}</p>
              <p class="eo-tier-days" v-if="tier.work_days">{{ t('artistHome.aboutDays', { n: tier.work_days }) }}</p>
            </div>
          </div>
        </div>

        <!-- QQ -->
        <div class="eo-field">
          <label>{{ t('orderForm.qqLabel') }}</label>
          <input v-model="form.qq" :placeholder="t('orderForm.qqPlaceholder')" class="eo-input" maxlength="15" />
        </div>

        <!-- 昵称 -->
        <div class="eo-field">
          <label>{{ t('orderForm.nameLabel') }}</label>
          <input v-model="form.name" :placeholder="t('orderForm.namePlaceholder')" class="eo-input" maxlength="30" />
        </div>

        <!-- 需求描述 -->
        <div class="eo-field">
          <label>{{ t('orderForm.descLabel') }}</label>
          <textarea v-model="form.desc" :placeholder="t('orderForm.descPlaceholder')" class="eo-textarea" rows="4"></textarea>
        </div>

        <!-- 错误提示 -->
        <p class="eo-error" v-if="formError">{{ formError }}</p>

        <!-- 提交 -->
        <button class="eo-submit" @click="submit" :disabled="submitting">
          {{ submitting ? 'Submitting...' : t('orderForm.submit') }}
        </button>

        <!-- 成功 -->
        <div v-if="submitted" class="eo-success">
          <p class="eo-success-icon">✅</p>
          <p class="eo-success-text">{{ t('orderForm.successTitle') }}</p>
          <div class="eo-order-no">{{ orderNo }}</div>
          <p class="eo-success-hint">{{ t('orderForm.addQqHint') }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
// ─── 极简组件：无编译工具、无 i18n 初始化、无 router
// 字符串内联翻译，避免额外依赖
const LANG = navigator.language?.startsWith('zh') ? 'zh' : 'en'

function t(key, params) {
  const MSG = {
    'orderForm.title':              { zh: '我要约稿', en: 'Commission Me' },
    'orderForm.tierLabel':          { zh: '选择档位', en: 'Select Tier' },
    'orderForm.qqLabel':            { zh: '你的QQ号', en: 'Your QQ Number' },
    'orderForm.qqPlaceholder':      { zh: '画师会通过QQ联系你', en: 'The artist will contact you on QQ' },
    'orderForm.nameLabel':          { zh: '昵称（可选）', en: 'Nickname (optional)' },
    'orderForm.namePlaceholder':    { zh: '怎么称呼你', en: 'What should we call you' },
    'orderForm.descLabel':          { zh: '需求描述', en: 'Description' },
    'orderForm.descPlaceholder':    { zh: '描述你想要的画面：角色、姿势、风格、背景等', en: 'Describe what you want: character, pose, style, background' },
    'orderForm.submit':             { zh: '提交约稿', en: 'Submit' },
    'orderForm.successTitle':       { zh: '约稿提交成功！', en: 'Commission Submitted!' },
    'orderForm.addQqHint':          { zh: '请添加画师QQ沟通细节，报上你的订单号即可', en: 'Add the artist on QQ with your order number to discuss details' },
    'orderForm.selectTier':         { zh: '请选择档位', en: 'Please select a tier' },
    'orderForm.fillQq':             { zh: '请填写QQ号', en: 'Please enter your QQ number' },
    'artistHome.aboutDays':         { zh: (p) => `约${p.n}天`, en: (p) => `~${p.n} days` },
    'artistHome.commission':        { zh: '约稿', en: 'Commission' },
    'artistHome.track':             { zh: '查询进度', en: 'Track Order' }
  }
  const msg = MSG[key]
  if (!msg) return key
  const val = msg[LANG] || msg.en
  return typeof val === 'function' ? val(params) : val
}

export default {
  name: 'EmbedOrderPage',
  data() {
    return {
      loading: true,
      error: '',
      artist: null,
      subdomain: '',
      tiers: [],
      selectedTier: null,
      form: { qq: '', name: '', desc: '' },
      formError: '',
      submitting: false,
      submitted: false,
      orderNo: ''
    }
  },
  mounted() {
    this.fetchArtist()
  },
  methods: {
    t,
    async fetchArtist() {
      const params = new URLSearchParams(window.location.search)
      const subdomain = params.get('artist')
      if (!subdomain) { this.error = 'Missing artist parameter'; this.loading = false; return }
      this.subdomain = subdomain

      try {
        const res = await fetch(`/api/artists/${encodeURIComponent(subdomain)}`)
        if (!res.ok) throw new Error('Artist not found')
        const data = await res.json()
        this.artist = data
        this.tiers = data.tiers || []
      } catch (err) {
        this.error = err.message || 'Failed to load artist'
      } finally {
        this.loading = false
      }
    },
    async submit() {
      this.formError = ''
      if (!this.selectedTier) { this.formError = t('orderForm.selectTier'); return }
      if (!this.form.qq.trim()) { this.formError = t('orderForm.fillQq'); return }

      this.submitting = true
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subdomain: this.subdomain,
            tierId: this.selectedTier,
            clientQq: this.form.qq.trim(),
            clientName: this.form.name.trim() || null,
            description: this.form.desc.trim() || null,
            agreeRules: true
          })
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Submit failed')
        }
        const data = await res.json()
        this.orderNo = data.orderNo
        this.submitted = true
      } catch (err) {
        this.formError = err.message
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style>
.embed-order {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  height: 100%; overflow-y: auto; background: #fff;
  padding: 0;
}

/* States */
.state-loading, .state-error {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; color: #666; font-size: 14px;
}
.spinner {
  width: 24px; height: 24px; border: 2px solid #eee; border-top-color: #1a1a1a;
  border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 12px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Header */
.eo-header {
  padding: 24px 24px 16px; border-bottom: 1px solid #eee;
}
.eo-header h2 { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
.eo-artist { font-size: 13px; color: #999; }

/* Body */
.eo-body { padding: 16px 24px 24px; }
.eo-field { margin-bottom: 16px; }
.eo-field label { display: block; font-size: 13px; font-weight: 600; color: #333; margin-bottom: 6px; }
.eo-input, .eo-textarea {
  width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px;
  font-size: 14px; outline: none; transition: border-color 0.2s;
  font-family: inherit; box-sizing: border-box;
}
.eo-input:focus, .eo-textarea:focus { border-color: #1a1a1a; }
.eo-textarea { resize: vertical; min-height: 80px; }

/* Tier list */
.eo-tier-list { display: flex; flex-direction: column; gap: 8px; }
.eo-tier-item {
  padding: 12px; border: 1px solid #eee; border-radius: 8px;
  cursor: pointer; transition: all 0.2s;
}
.eo-tier-item:hover { border-color: #ccc; }
.eo-tier-item.active { border-color: #1a1a1a; background: #fafafa; }
.eo-tier-top { display: flex; justify-content: space-between; align-items: baseline; }
.eo-tier-name { font-size: 14px; font-weight: 600; color: #1a1a1a; }
.eo-tier-price { font-size: 18px; font-weight: 700; color: #1a1a1a; }
.eo-tier-desc { font-size: 12px; color: #999; margin-top: 4px; }
.eo-tier-days { font-size: 11px; color: #bbb; margin-top: 2px; }

/* Error */
.eo-error { color: #e74c3c; font-size: 13px; margin-bottom: 12px; }

/* Submit */
.eo-submit {
  width: 100%; padding: 12px; background: #1a1a1a; color: #fff;
  border: none; border-radius: 8px; font-size: 15px; font-weight: 600;
  cursor: pointer; transition: opacity 0.2s;
}
.eo-submit:hover { opacity: 0.85; }
.eo-submit:disabled { opacity: 0.4; cursor: not-allowed; }

/* Success */
.eo-success { text-align: center; padding: 32px 0; }
.eo-success-icon { font-size: 40px; margin-bottom: 12px; }
.eo-success-text { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 12px; }
.eo-order-no {
  font-size: 28px; font-weight: 700; color: #1a1a1a; letter-spacing: 2px;
  margin-bottom: 8px;
}
.eo-success-hint { font-size: 13px; color: #999; line-height: 1.5; }
</style>
