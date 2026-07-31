import db from '../../db/connection.js'

// ============================================
// 留言板服务（F4）
// ============================================

export function getMessageById(id) {
  return db.prepare('SELECT * FROM guestbook_messages WHERE id = ?').get(id)
}

/** 客户提交留言（默认 pending） */
export function createMessage(artistId, nickname, content) {
  const result = db.prepare(
    'INSERT INTO guestbook_messages (artist_id, nickname, content) VALUES (?, ?, ?)'
  ).run(artistId, nickname, content)
  return getMessageById(result.lastInsertRowid)
}

/** 公开查询：仅 approved 且未被管理员删除，按 created_at DESC 分页 */
export function getPublicMessages(artistId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize
  const messages = db.prepare(
    "SELECT * FROM guestbook_messages WHERE artist_id = ? AND status = 'approved' AND deleted_by_admin = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?"
  ).all(artistId, pageSize, offset)
  const total = db.prepare(
    "SELECT COUNT(*) as c FROM guestbook_messages WHERE artist_id = ? AND status = 'approved' AND deleted_by_admin = 0"
  ).get(artistId).c
  return { messages, total, page, pageSize }
}

/** 画师查询：自己所有留言（含 pending/rejected），按 created_at DESC */
export function getArtistMessages(artistId) {
  return db.prepare(
    'SELECT * FROM guestbook_messages WHERE artist_id = ? ORDER BY created_at DESC'
  ).all(artistId)
}

/** 通过留言（归属校验：不匹配返回 null） */
export function approveMessage(artistId, messageId) {
  const msg = getMessageById(messageId)
  if (!msg || msg.artist_id !== artistId) return null
  db.prepare("UPDATE guestbook_messages SET status = 'approved' WHERE id = ?").run(messageId)
  return getMessageById(messageId)
}

/** 拒绝留言（静默，归属校验） */
export function rejectMessage(artistId, messageId) {
  const msg = getMessageById(messageId)
  if (!msg || msg.artist_id !== artistId) return null
  db.prepare("UPDATE guestbook_messages SET status = 'rejected' WHERE id = ?").run(messageId)
  return getMessageById(messageId)
}

/** 画师回复（归属校验） */
export function replyMessage(artistId, messageId, reply) {
  const msg = getMessageById(messageId)
  if (!msg || msg.artist_id !== artistId) return null
  db.prepare(
    'UPDATE guestbook_messages SET artist_reply = ?, replied_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(reply, messageId)
  return getMessageById(messageId)
}

/** 管理员强制删除（软删除，不物理删） */
export function adminDeleteMessage(messageId) {
  const msg = getMessageById(messageId)
  if (!msg) return null
  db.prepare('UPDATE guestbook_messages SET deleted_by_admin = 1 WHERE id = ?').run(messageId)
  return getMessageById(messageId)
}
