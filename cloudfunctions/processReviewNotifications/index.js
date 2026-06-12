/**
 * processReviewNotifications - 处理审核结果通知的定时任务
 *
 * 定时触发（每5分钟），处理两类待发送通知：
 * 1. 已通过的申请（需等待2小时撤回窗口过后才发送）
 * 2. 已拒绝的申请（立即发送，无需等待）
 *
 * 关联模块：approveApplication（审批通过时设置 notificationSent=false）
 *          rejectApplication（审批拒绝时设置 notificationSent=false）
 *          revokeReview（撤销后重新变成待审核）
 */

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const { REVIEW_EXPIRY_MS } = require('./constants')
const { getAllDocs } = require('./dbutils')

/**
 * 为单个申请创建通知记录
 */
async function createNotification(app, status, now) {
  // 获取申请人姓名
  const usersRes = await db.collection('Users')
    .where({ openid: app.proposerID })
    .get()
  const userName = (usersRes.data[0] && usersRes.data[0].userName) || app.proposerName || '用户'

  const lectureStr = app.rentLectures.map(l => l + 1).join(',')
  const isApproved = status === 1
  const title = isApproved ? '✅ 教室审核通过通知' : '❌ 教室审核未通过通知'
  const content = isApproved
    ? `您好 ${userName}，您于 ${app.rentDate} 申请 ${app.classroomName || '教室'}（${lectureStr}讲）的预约已通过审核，请按时使用。`
    : `您好 ${userName}，您于 ${app.rentDate} 申请 ${app.classroomName || '教室'}（${lectureStr}讲）的预约未通过审核。${app.rejectionReason ? '原因：' + app.rejectionReason : ''}`

  await db.collection('Notifications').add({
    data: {
      targetUsers: [app.proposerID],
      title,
      content,
      type: 'review_result',
      relatedId: app._id,
      isRead: false,
      createdAt: now,
      updatedAt: now
    }
  })
}

exports.main = async () => {
  try {
    const now = Date.now()
    const twoHoursAgo = now - REVIEW_EXPIRY_MS
    let processedApproved = 0
    let processedRejected = 0

    // ===== 1. 处理已通过的申请（2小时后方可发送通知） =====
    const pendingApproved = await getAllDocs(db, 'Applications', {
      rentalStatus: 1,
      notificationSent: _.neq(true),
      approvedAt: _.lte(twoHoursAgo)
    })

    for (const app of pendingApproved) {
      // 二次确认：检查是否已被撤回
      const fresh = await db.collection('Applications').doc(app._id).get()
      if (!fresh.data || fresh.data.rentalStatus !== 1 || fresh.data.notificationSent === true) continue

      await createNotification(app, 1, now)

      await db.collection('Applications').doc(app._id).update({
        data: { notificationSent: true, notificationSentAt: now, updatedAt: now }
      })
      processedApproved++
    }

    // ===== 2. 处理已拒绝的申请（无需等待） =====
    const pendingRejected = await getAllDocs(db, 'Applications', {
      rentalStatus: 2,
      notificationSent: _.neq(true)
    })

    for (const app of pendingRejected) {
      // 二次确认
      const fresh = await db.collection('Applications').doc(app._id).get()
      if (!fresh.data || fresh.data.rentalStatus !== 2 || fresh.data.notificationSent === true) continue

      await createNotification(app, 2, now)

      await db.collection('Applications').doc(app._id).update({
        data: { notificationSent: true, notificationSentAt: now, updatedAt: now }
      })
      processedRejected++
    }

    const total = processedApproved + processedRejected
    return {
      success: true,
      processed: total,
      approvedSent: processedApproved,
      rejectedSent: processedRejected,
      message: `已处理 ${total} 条通知（通过 ${processedApproved}，拒绝 ${processedRejected}）`
    }
  } catch (err) {
    console.error('processReviewNotifications 错误:', err)
    return { success: false, error: err.message }
  }
}
