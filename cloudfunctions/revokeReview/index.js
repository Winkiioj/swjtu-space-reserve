/**
 * revokeReview - 撤销审核（将已审核的申请恢复为待审核）
 *
 * 仅在申请仍处于已通过(1)或已拒绝(2)状态时可撤销。
 * 若已通过，需要恢复教室状态矩阵（对应讲次从2恢复为0）。
 * 已通过的申请仅在被批准后2小时内可撤回，过期不能撤回。
 */

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const { success, fail } = require('./response')
const { requireAdmin } = require('./auth')
const { logAudit } = require('./audit')
const { REVIEW_EXPIRY_MS } = require('./constants')

exports.main = async (event) => {
  const { applicationID, currentUserID } = event
  if (!applicationID || !currentUserID) return fail(400, '参数缺失')

  try {
    await requireAdmin(db, currentUserID)

    const appRes = await db.collection('Applications').doc(applicationID).get()
    if (!appRes.data) return fail(404, '申请不存在')

    const app = appRes.data
    if (![1, 2].includes(app.rentalStatus)) {
      return fail(400, '只能撤销已通过或已拒绝的申请')
    }

    // ===== 2小时撤回时限检查（仅对已通过的申请） =====
    if (app.rentalStatus === 1) {
      const now = Date.now()
      const expiresAt = app.approvedAt + REVIEW_EXPIRY_MS
      if (now >= expiresAt) {
        return fail(400, '已超过2小时撤回时限，无法撤销审核')
      }
    }

    const now = Date.now()

    // 如果已通过，需要恢复教室矩阵
    if (app.rentalStatus === 1) {
      const targetId = app.approvedClassroomId || app.classroomApplied
      const classRes = await db.collection('Classrooms').doc(targetId).get()
      if (classRes.data) {
        const matrixField = app.rentWeek === 'this'
          ? 'thisWeekStatusMatrix'
          : 'nextWeekStatusMatrix'
        const matrix = JSON.parse(JSON.stringify(classRes.data[matrixField]))
        for (let lec of app.rentLectures) {
          if (matrix[app.rentDayOfWeek][lec] === 2) {
            matrix[app.rentDayOfWeek][lec] = 0
          }
        }
        await db.collection('Classrooms').doc(targetId).update({
          data: { [matrixField]: matrix, updatedAt: now }
        })
      }
    }

    // 恢复为待审核
    await db.collection('Applications').doc(applicationID).update({
      data: {
        rentalStatus: 0,
        rejectionReason: '',
        approverID: '',
        approvedAt: null,
        reviewedAt: null,
        approvedClassroomId: '',
        updatedAt: now
      }
    })

    logAudit(db, {
      action: 'revoke',
      targetType: 'application',
      targetId: applicationID,
      adminId: currentUserID,
      details: { previousStatus: app.rentalStatus }
    })

    return success({ applicationID, status: 0 })
  } catch (err) {
    if (err.code && err.message) return err
    console.error(err)
    return fail(500, '撤销失败', err.message)
  }
}
