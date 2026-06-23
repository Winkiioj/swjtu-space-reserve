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
        notificationSent: true,   // 立即发送通知
        notificationSentAt: now,
        updatedAt: now
      }
    })

    // 标记原始"新申请"通知为已读（申请已处理，不再需要提醒）
    try {
      await db.collection('Notifications')
        .where({ relatedId: applicationId, type: 'new_application' })
        .update({ data: { isRead: true, updatedAt: now } })
    } catch (e) {
      console.warn('标记新申请通知失败:', e.message)
    }

    // 立即发送审核结果通知给申请人+管理员
    try {
      const classroomName = app.classroomName || '教室'
      const lectureStr = (app.rentLectures || []).map(l => l + 1).join(',')
      const reasonStr = reason ? `原因：${reason}` : ''
      await db.collection('Notifications').add({
        data: {
          targetUsers: [app.proposerID, 'admin'],
          title: '❌ 教室审核未通过通知',
          content: `您好 ${app.proposerName}，您于 ${app.rentDate} 申请 ${classroomName}（${lectureStr}讲）的预约未通过审核。${reasonStr}`,
          type: 'review_result',
          relatedId: applicationId,
          isRead: false,
          createdAt: now,
          updatedAt: now
        }
      })
    } catch (e) {
      console.warn('发送审核结果通知失败:', e.message)
    }

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
