import crypto from 'crypto'

// ============================================
// 安全：文件访问签名 — 替代 /uploads/ 全目录公开
// 仅 images/ 保持公开（画师作品集），references/ 和 deliverables/ 需签名
// ============================================

const FILE_TTL_MS = 15 * 60 * 1000 // 签名有效期 15 分钟

function getSecret() {
  return process.env.SESSION_SECRET || 'dev-secret-change-in-production'
}

/**
 * 为文件路径生成带时效的签名 token
 * 格式: base64url(payload).base64url(hmac)
 */
export function signFilePath(filePath) {
  const expires = Date.now() + FILE_TTL_MS
  const payload = Buffer.from(JSON.stringify({ p: filePath, e: expires })).toString('base64url')
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

/**
 * 验证签名 token，返回文件路径或 null
 * 使用 timing-safe 比较防止时序攻击
 */
export function verifyFileToken(token) {
  if (!token) return null
  const dotIdx = token.lastIndexOf('.')
  if (dotIdx === -1) return null

  const payload = token.slice(0, dotIdx)
  const sig = token.slice(dotIdx + 1)
  if (!payload || !sig) return null

  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (Date.now() > data.e) return null
    return data.p
  } catch {
    return null
  }
}

/**
 * 生成带签名的完整 URL（用于 API 响应）
 */
export function signedUrl(filePath) {
  return `/uploads/${filePath}?sig=${signFilePath(filePath)}`
}

/**
 * 判断路径是否为公开目录（无需签名）
 */
export function isPublicUploadPath(urlPath) {
  return urlPath.startsWith('/uploads/images/')
}
