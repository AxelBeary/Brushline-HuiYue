/**
 * 平台 URL 识别工具
 * R58-8: 从 URL 自动识别社交平台
 */

// 平台识别规则：域名模式 → 平台标识
interface PlatformRule {
  pattern: RegExp
  platform: string
}

const PLATFORM_RULES: PlatformRule[] = [
  { pattern: /pixiv\.(net|me)/i, platform: 'pixiv' },
  { pattern: /(twitter\.com|x\.com)/i, platform: 'x' },
  { pattern: /weibo\.(com|cn)/i, platform: 'weibo' },
  { pattern: /lofter\.com/i, platform: 'lofter' },
  { pattern: /(bilibili\.com|b23\.tv)/i, platform: 'bilibili' },
  { pattern: /(xiaohongshu\.com|xhslink\.com)/i, platform: 'xiaohongshu' },
]

// 已知平台标识白名单（手动选择时的合法值）
export const KNOWN_PLATFORMS: string[] = ['pixiv', 'x', 'weibo', 'lofter', 'bilibili', 'xiaohongshu', 'other']

// 平台标识 → 显示名
export const PLATFORM_LABELS: Record<string, string> = {
  pixiv: 'Pixiv',
  x: 'X (Twitter)',
  weibo: '微博',
  lofter: 'Lofter',
  bilibili: 'Bilibili',
  xiaohongshu: '小红书',
  other: '其他'
}

/**
 * 从 URL 识别平台
 * @param {string} url - 完整 URL
 * @returns {string} 平台标识（pixiv/x/weibo/lofter/bilibili/xiaohongshu/other）
 */
export function identifyPlatform(url: string): string {
  if (!url || typeof url !== 'string') return 'other'
  for (const rule of PLATFORM_RULES) {
    if (rule.pattern.test(url)) return rule.platform
  }
  return 'other'
}

/**
 * 获取平台显示名
 * @param {string} platform - 平台标识
 * @returns {string} 显示名
 */
export function getPlatformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] || PLATFORM_LABELS.other
}

/**
 * 解析画师的 platform_urls JSON，返回带平台信息的链接列表
 * 存储格式：[{url, platform}] — platform 为写入时识别/手动选择的最终值
 * 读取时补充 label 显示名；兼容旧格式（纯字符串数组）自动重新识别
 * @param {string|null} platformUrlsJson - 数据库中的 JSON 字符串
 * @returns {Array<{url: string, platform: string, label: string}>}
 */
export function parsePlatformUrls(platformUrlsJson: string | null): Array<{ url: string; platform: string; label: string }> {
  if (!platformUrlsJson) return []
  try {
    const parsed = JSON.parse(platformUrlsJson)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(item => {
        const url = typeof item === 'string' ? item : (item.url || '')
        // 兼容纯字符串格式：重新识别平台
        const platform = (typeof item === 'object' && item.platform) ? item.platform : identifyPlatform(url)
        return { url, platform, label: getPlatformLabel(platform) }
      })
      .filter(item => item.url)
  } catch {
    return []
  }
}
