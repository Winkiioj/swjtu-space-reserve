/**
 * audit.js — 审计日志模块（共享模块）
 *
 * 将管理员的关键操作记录到 AuditLogs 集合，用于操作追溯。
 *
 * AuditLogs 集合结构：
 * {
 *   action: string,      // 操作类型（approve/reject/import_classrooms/...）
 *   targetType: string,  // 操作对象类型（application/classroom/seat）
 *   targetId: string,    // 操作对象ID
 *   adminId: string,     // 操作管理员ID
 *   details: object,     // 详细数据（如审批意见、导入数量等）
 *   timestamp: number    // 操作时间戳
 * }
 */

/**
 * 写入审计日志
 * @param {Object} db - cloud.database() 实例
 * @param {Object} param
 * @param {string} param.action - 操作类型
 * @param {string} param.targetType - 对象类型
 * @param {string} param.targetId - 对象ID
 * @param {string} param.adminId - 管理员ID
 * @param {Object} [param.details] - 详细信息
 */
async function logAudit(db, { action, targetType, targetId, adminId, details = {} }) {
  try {
    await db.collection('AuditLogs').add({
      data: {
        action,
        targetType,
        targetId,
        adminId,
        details,
        timestamp: Date.now()
      }
    })
  } catch (err) {
    // 审计日志写入失败不影响主流程，仅打印警告
    console.warn('审计日志写入失败:', err.message)
  }
}

module.exports = { logAudit }
