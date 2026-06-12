/**
 * getReviewedApplications - 获取管理员最近审核的申请
 */

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const { success, fail } = require('./response')
const { requireAdmin } = require('./auth')
const { REVIEW_EXPIRY_MS } = require('./constants')

exports.main = async (event) => {
  const { currentUserID, page = 1, pageSize = 20 } = event
  if (!currentUserID) return fail(400, '参数缺失')

  try {
    await requireAdmin(db, currentUserID)

    const [countResult, listResult] = await Promise.all([
      db.collection('Applications')
        .where({ approverID: currentUserID, rentalStatus: _.in([1, 2]) })
        .count(),
      db.collection('Applications')
        .where({ approverID: currentUserID, rentalStatus: _.in([1, 2]) })
        .orderBy('updatedAt', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()
    ])

    if (listResult.data.length === 0) {
      return success({ applications: [], total: 0, page, pageSize })
    }

    // 获取申请人姓名
    const proposerIDs = [...new Set(listResult.data.map(a => a.proposerID))]
    const users = await db.collection('Users').where({ openid: _.in(proposerIDs) }).get()
    const userMap = {}
    users.data.forEach(u => { userMap[u.openid] = u.userName })

    // 获取教室名称
    const classroomIDs = [...new Set(listResult.data.map(a => a.classroomApplied))]
    const classes = await db.collection('Classrooms').where({ _id: _.in(classroomIDs) }).get()
    const classMap = {}
    classes.data.forEach(c => { classMap[c._id] = `${c.buildingBelong} ${c.classroomID}` })

    const statusMap = { 1: '已通过', 2: '已拒绝' }
    const now = Date.now()

    const enriched = listResult.data.map(app => {
      // 计算撤回状态（仅对已通过的申请）
      let canRevoke = false
      let revokeRemainingMs = 0
      if (app.rentalStatus === 1 && app.approvedAt) {
        const expiresAt = app.approvedAt + REVIEW_EXPIRY_MS
        revokeRemainingMs = Math.max(0, expiresAt - now)
        canRevoke = revokeRemainingMs > 0
      }

      return {
        _id: app._id,
        proposerID: app.proposerID,
        userName: userMap[app.proposerID] || '未知',
        classroomName: classMap[app.classroomApplied] || '未知',
        rentDate: app.rentDate,
        rentDayOfWeek: app.rentDayOfWeek,
        rentLectures: app.rentLectures,
        rentLecturesStr: app.rentLectures.map(l => l + 1).join(',') + '讲',
        rentalDetail: app.rentalDetail,
        rentalStatus: app.rentalStatus,
        statusText: statusMap[app.rentalStatus] || '未知',
        approvedAt: app.approvedAt || null,
        updatedAt: app.updatedAt,
        // 撤回时限相关
        canRevoke,
        revokeRemainingMs
      }
    })

    return success({ applications: enriched, total: countResult.total, page, pageSize })
  } catch (err) {
    if (err.code && err.message) return err
    console.error(err)
    return fail(500, '获取失败', err.message)
  }
}
