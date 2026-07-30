import db from '../../db/connection.js'
import { AppError, E } from '../../shared/errors.js'
import { getOrder } from './order.service.js'

// ============================================
// 订单流程服务（从 order.service.js 拆出，v0.16）
// 流程节点推进、回退、跟踪启用、进度查询
// ============================================

/**
 * 根据节点位置映射订单状态
 * 规则（SPEC-002 用户确认）：
 *   第 1 个节点 → pending
 *   第 2 个节点且为收款节点 → confirmed
 *   中间节点 → wip
 *   最后一个节点 → done
 */
export function mapStageToStatus(stages, stageId) {
  const idx = stages.findIndex(s => s.id === stageId)
  if (idx === -1) return 'wip'
  if (idx === 0) return 'pending'
  if (idx === stages.length - 1) return 'done'
  if (idx === 1 && stages[idx].takes_payment) return 'confirmed'
  return 'wip'
}

/**
 * 推进流程节点（只能前进）
 * stageId=null 时关闭流程跟踪（回退旧模式）
 */
export function advanceStage(orderId, stageId) {
  const order = getOrder(orderId)
  if (!order) throw new AppError(E.ORDER_NOT_FOUND)

  // 关闭流程跟踪
  if (stageId === null) {
    db.prepare('UPDATE orders SET current_stage_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(orderId)
    return getOrder(orderId)
  }

  // 校验目标节点属于该画师
  const stages = db.prepare(
    'SELECT * FROM artist_workflow_stages WHERE artist_id = ? ORDER BY sort_order ASC'
  ).all(order.artist_id)
  const targetIdx = stages.findIndex(s => s.id === stageId)
  if (targetIdx === -1) throw new AppError(E.STAGE_NOT_FOUND)

  // 校验只能前进（当前节点在目标之前）
  if (order.current_stage_id !== null) {
    const currentIdx = stages.findIndex(s => s.id === order.current_stage_id)
    if (currentIdx >= targetIdx) {
      throw new AppError(E.INVALID_TRANSITION, 400, { from: stages[currentIdx]?.name, to: stages[targetIdx].name })
    }
  }

  // 不允许从终态推进
  if (['delivered', 'cancelled'].includes(order.status)) {
    throw new AppError(E.INVALID_TRANSITION, 400, { from: order.status, to: stages[targetIdx].name })
  }

  const newStatus = mapStageToStatus(stages, stageId)
  db.prepare('UPDATE orders SET current_stage_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(stageId, newStatus, orderId)

  if (newStatus === 'done') {
    db.prepare('UPDATE orders SET completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP) WHERE id = ?')
      .run(orderId)
  }

  return getOrder(orderId)
}

/**
 * 回退流程节点（打回修改）
 * 状态映射为 revision，记录系统备注
 */
export function rollbackStage(orderId, stageId) {
  const order = getOrder(orderId)
  if (!order) throw new AppError(E.ORDER_NOT_FOUND)

  if (order.current_stage_id === null) {
    throw new AppError(E.INVALID_TRANSITION, 400, { from: '无流程', to: '回退' })
  }

  const stages = db.prepare(
    'SELECT * FROM artist_workflow_stages WHERE artist_id = ? ORDER BY sort_order ASC'
  ).all(order.artist_id)
  const targetIdx = stages.findIndex(s => s.id === stageId)
  const currentIdx = stages.findIndex(s => s.id === order.current_stage_id)

  if (targetIdx === -1) throw new AppError(E.STAGE_NOT_FOUND)
  if (targetIdx >= currentIdx) {
    throw new AppError(E.INVALID_TRANSITION, 400, { from: stages[currentIdx]?.name, to: stages[targetIdx].name })
  }

  // 不允许从终态回退
  if (['delivered', 'cancelled'].includes(order.status)) {
    throw new AppError(E.INVALID_TRANSITION, 400, { from: order.status, to: stages[targetIdx].name })
  }

  const fromName = stages[currentIdx]?.name || '未知'
  const toName = stages[targetIdx].name

  db.prepare('UPDATE orders SET current_stage_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(stageId, 'revision', orderId)

  // 系统备注（用户确认：客户有知情权）
  db.prepare("INSERT INTO order_notes (order_id, content, created_by) VALUES (?, ?, 'system')")
    .run(orderId, `↩ 从「${fromName}」打回到「${toName}」`)

  return getOrder(orderId)
}

/**
 * 启用流程跟踪（v0.14）
 * 对无工作流订单设 current_stage_id = 画师工作流第一节点，status 保持不变
 * 为什么不能复用 advanceStage：advanceStage 对无跟踪订单会把 status 重置为 pending（状态倒退）
 */
export function enableTracking(orderId) {
  const order = getOrder(orderId)
  if (!order) throw new AppError(E.ORDER_NOT_FOUND)

  // 已有跟踪 → 409
  if (order.current_stage_id !== null) {
    throw new AppError(E.TRACK_ALREADY_ON, 409)
  }

  // 画师无工作流模板 → 400
  const firstStage = db.prepare(
    'SELECT id FROM artist_workflow_stages WHERE artist_id = ? ORDER BY sort_order ASC LIMIT 1'
  ).get(order.artist_id)
  if (!firstStage) {
    throw new AppError(E.NO_WORKFLOW_TEMPLATE)
  }

  // 只设 current_stage_id，不动 status
  db.prepare('UPDATE orders SET current_stage_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(firstStage.id, orderId)

  return getOrder(orderId)
}

/**
 * 获取订单的流程进度信息（供路由层拼装响应）
 */
export function getStageInfo(order) {
  if (!order.current_stage_id) return null

  const stages = db.prepare(
    'SELECT * FROM artist_workflow_stages WHERE artist_id = ? ORDER BY sort_order ASC'
  ).all(order.artist_id)
  const currentIdx = stages.findIndex(s => s.id === order.current_stage_id)
  if (currentIdx === -1) return null

  return {
    currentStageId: order.current_stage_id,
    currentStageName: stages[currentIdx].name,
    stageProgress: { current: currentIdx + 1, total: stages.length }
  }
}
