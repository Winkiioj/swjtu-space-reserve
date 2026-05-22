const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const { success, fail } = require('./response')
const { requireAdmin } = require('./auth')
const { logAudit } = require('./audit')

exports.main = async (event) => {
  const { courses, currentUserID } = event
  if (!currentUserID) return fail(400, '未提供用户标识')

  try {
    await requireAdmin(db, currentUserID)
  } catch (err) {
    return err
  }

  if (!courses || !Array.isArray(courses) || courses.length === 0) {
    return fail(400, '课表数据不能为空')
  }

  let updated = 0
  let skipped = 0

  for (let course of courses) {
    try {
      const classRes = await db.collection('Classrooms')
        .where({ classroomID: course.classroomID })
        .get()
      if (!classRes.data || classRes.data.length === 0) {
        skipped++
        continue
      }

      const { dayOfWeek, startLecture, endLecture } = course.schedule

      // 同时更新本周和下周矩阵
      for (const matrixField of ['thisWeekStatusMatrix', 'nextWeekStatusMatrix']) {
        const matrix = JSON.parse(JSON.stringify(classRes.data[matrixField]))

        // 检查是否已经导入（幂等性）
        let alreadySet = true
        for (let lec = startLecture; lec <= endLecture; lec++) {
          if (matrix[dayOfWeek][lec] !== 1) {
            alreadySet = false
          }
          matrix[dayOfWeek][lec] = 1
        }

        if (!alreadySet) {
          await db.collection('Classrooms').doc(classRes.data[0]._id).update({
            data: { [matrixField]: matrix, updatedAt: Date.now() }
          })
        }
      }
      updated++
    } catch (e) {
      console.error('导入课程失败:', course.courseID, e.message)
      skipped++
    }
  }

  logAudit(db, {
    action: 'import_courses',
    targetType: 'course',
    targetId: `batch_${Date.now()}`,
    adminId: currentUserID,
    details: { updated, skipped, total: courses.length }
  })

  return success({ updated, skipped, total: courses.length })
}
