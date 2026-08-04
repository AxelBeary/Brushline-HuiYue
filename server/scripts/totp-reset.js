#!/usr/bin/env node
// ============================================
// TOTP 绑定重置 CLI（REQ-027 R5 兜底）
// 服务器本机执行，不经网络、不开端口——只有能物理操作服务器的人可用
// 可重置任意账号（含管理员）的动态口令绑定
// 用法：npm run totp:reset -- <QQ号>
// ============================================
import 'dotenv/config'
import db from '../src/db/connection.js'
import { initDatabase } from '../src/db/init.js'
import { resetTotp } from '../src/features/auth/auth.service.js'

const qq = (process.argv[2] || '').trim()
if (!/^\d{5,15}$/.test(qq)) {
  console.error('❌ 用法: npm run totp:reset -- <QQ号>')
  console.error('   示例: npm run totp:reset -- 123456789')
  process.exit(1)
}

initDatabase(db)

const artist = db.prepare('SELECT id, qq_number, name FROM artists WHERE qq_number = ? AND deleted_at IS NULL').get(qq)
if (!artist) {
  console.error(`❌ 未找到 QQ ${qq} 对应的画师账号（已删除账号不在此列）`)
  process.exit(1)
}

resetTotp(artist.id)
console.log(`✅ 已重置画师「${artist.name}」(QQ ${artist.qq_number}) 的 TOTP 动态口令绑定`)
console.log('画师下次登录前，需由管理员在后台「生成绑定二维码」重新完成绑定')
console.log('（旧验证器 App 上的动态口令已全部失效）')

db.close()
