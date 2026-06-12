const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const { success, fail } = require('./response')
const { requireAdmin } = require('./auth')
const { logAudit } = require('./audit')
const { deepCopyMatrix, REVIEW_EXPIRY_MS } = require('./constants')

/**
 * 获取申请详情
 */
async function getApplicationInfo(applicationID) {
  try {
    const result = await db.collection('Applications')
      .doc(applicationID)
      .get()
    if (result && result.data && result.data._id) {
      return result.data
    }
    return null
  } catch (err) {
    console.error('获取申请详情失败:', err)
    return null
  }
}

/**
 * 获取教室信息
 */
async function getClassroomInfo(classroomID) {
  try {
    const result = await db.collection('Classrooms')
      .doc(classroomID)
      .get()
    if (result && result.data && result.data._id) {
      return result.data
    }
    return null
  } catch (err) {
    console.error('获取教室信息失败:', err)
    return null
  }
}

/**
 * 检查指定讲次是否全部空闲
 */
function checkLecturesAvailable(matrix, dayOfWeek, lectures) {
  return lectures.every(lec => matrix[dayOfWeek][lec] === 0)
}

/**
 * 更新矩阵：将指定讲次标记为占用(2)
 */
function occupyLectures(matrix, dayOfWeek, lectures) {
  const newMatrix = deepCopyMatrix(matrix)
  for (let lec of lectures) {
    newMatrix[dayOfWeek][lec] = 2
  }
  return newMatrix
}

exports.main = async (event) => {
  try {
    const { applicationID, currentUserID, approvedClassroomId } = event
    if (!applicationID || !currentUserID) return fail(400, '参数缺失')

    // ===== 管理员身份校验 =====
    await requireAdmin(db, currentUserID)

    // ===== 获取申请 =====
    const application = await getApplicationInfo(applicationID)
    if (!application) return fail(404, '申请不存在')
    if (application.rentalStatus !== 0) {
      return fail(400, `申请状态不合法（当前状态: ${application.rentalStatus}），只能批准待审核的申请`)
    }

    // ===== 确定目标教室 =====
    const targetClassroomId = approvedClassroomId || application.classroomApplied
    const isAlternative = targetClassroomId !== application.classroomApplied

    const classroom = await getClassroomInfo(targetClassroomId)
    if (!classroom) return fail(404, '教室不存在')

    // ===== 检查讲次可用性（防止并发冲突） =====
    const matrixFieldName = application.rentWeek === 'this'
      ? 'thisWeekStatusMatrix'
      : 'nextWeekStatusMatrix'

    if (!checkLecturesAvailable(classroom[matrixFieldName], application.rentDayOfWeek, application.rentLectures)) {
      return fail(409, '教室讲次已被占用或发生并发修改，请刷新后重试')
    }

    // ===== 原子性更新：申请状态 + 教室矩阵 =====
    const updatedMatrix = occupyLectures(classroom[matrixFieldName], application.rentDayOfWeek, application.rentLectures)
    const now = Date.now()

    // 更新申请
    await db.collection('Applications').doc(applicationID).update({
      data: {
        rentalStatus: 1,
        approverID: currentUserID,
        approvedAt: now,
        approvedClassroomId: isAlternative ? targetClassroomId : undefined,
        notificationSent: false,      // 通知将在2小时后发送
        reviewExpiresAt: now + REVIEW_EXPIRY_MS,  // 撤回截止时间
        updatedAt: now
      }
    })

    // 更新教室矩阵
    await db.collection('Classrooms').doc(targetClassroomId).update({
      data: {
        [matrixFieldName]: updatedMatrix,
        updatedAt: now
      }
    })

    // 审计日志
    logAudit(db, {
      action: 'approve',
      targetType: 'application',
      targetId: applicationID,
      adminId: currentUserID,
      details: {
        classroomId: targetClassroomId,
        isAlternative,
        originalClassroomId: application.classroomApplied,
        rentDate: application.rentDate,
        lectures: application.rentLectures
      }
    })

    return success({
      applicationID,
      status: 1,
      approvedAt: now,
      classroomId: targetClassroomId,
      isAlternative,
      affectedLectures: application.rentLectures,
      rentDate: application.rentDate
    })
  } catch (err) {
    if (err.code && err.message) return err
    console.error('approveApplication 错误:', err)
    return fail(500, '批准失败', err.message)
  }
}
