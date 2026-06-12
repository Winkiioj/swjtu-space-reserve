const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const { success, fail } = require('./response')
const { requireAdmin } = require('./auth')
const { logAudit } = require('./audit')

exports.main = async (event) => {
  const { applicationId, reason, currentUserID } = event
  if (!applicationId || !currentUserID) return fail(400, '参数缺失')

  try {
    await requireAdmin(db, currentUserID)

    const appRes = await db.collection('Applications').doc(applicationId).get()
    if (!appRes.data) return fail(404, '申请不存在')

    const app = appRes.data
    if (app.rentalStatus !== 0) {
      return fail(400, `当前状态不允许拒绝（状态码：${app.rentalStatus}）`)
    }

    const now = Date.now()
    await db.collection('Applications').doc(applicationId).update({
      data: {
        rentalStatus: 2,
        rejectionReason: reason || '',
        approverID: currentUserID,
        reviewedAt: now,
        notificationSent: false,   // 标记需要发送拒绝通知
        updatedAt: now
      }
    })

    // 审计日志
    logAudit(db, {
      action: 'reject',
      targetType: 'application',
      targetId: applicationId,
      adminId: currentUserID,
      details: { reason: reason || '' }
    })

    return success({ applicationId, status: 2 })
  } catch (err) {
    if (err.code && err.message) return err
    console.error(err)
    return fail(500, '拒绝失败', err.message)
  }
}
