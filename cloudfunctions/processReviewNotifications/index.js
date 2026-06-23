/**
 * processReviewNotifications - 定时任务（每5分钟）
 *
 * 审批通过/拒绝时已立即发送通知（approveApplication / rejectApplication），
 * 本定时任务不再负责发送通知，仅处理：
 * 1. 撤回窗口过期 → 标记 canRevoke = false
 *
 * 关联模块：approveApplication（立即发送通知并设 notificationSent=true）
 *          rejectApplication（立即发送通知并设 notificationSent=true）
 *          revokeReview（撤销后重新变成待审核）
 */

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const { REVIEW_EXPIRY_MS } = require('./constants')
const { getAllDocs } = require('./dbutils')

exports.main = async () => {
  try {
    const now = Date.now()
    let expiredRevoke = 0

    // 查找审批通过已超过2小时的申请，标记撤回窗口关闭
    const expired = await getAllDocs(db, 'Applications', {
      rentalStatus: 1,
      reviewExpiresAt: _.lte(now),
      canRevoke: _.neq(false)
    })

    for (const app of expired) {
      const fresh = await db.collection('Applications').doc(app._id).get()
      if (!fresh.data || fresh.data.rentalStatus !== 1) continue
      if (fresh.data.reviewExpiresAt && fresh.data.reviewExpiresAt > now) continue

      await db.collection('Applications').doc(app._id).update({
        data: { canRevoke: false, updatedAt: now }
      })
      expiredRevoke++
    }

    return {
      success: true,
      expiredRevoke,
      message: `撤回窗口过期处理：${expiredRevoke} 条`
    }
  } catch (err) {
    console.error('processReviewNotifications 错误:', err)
    return { success: false, error: err.message }
  }
}
