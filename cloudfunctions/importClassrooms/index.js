const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const { success, fail } = require('./response')
const { requireAdmin } = require('./auth')
const { logAudit } = require('./audit')
const { createEmptyMatrix } = require('./constants')

exports.main = async (event) => {
  const { classrooms, currentUserID } = event
  if (!currentUserID) return fail(400, '未提供用户标识')

  try {
    await requireAdmin(db, currentUserID)
  } catch (err) {
    return err
  }

  if (!classrooms || !Array.isArray(classrooms) || classrooms.length === 0) {
    return fail(400, '教室数据不能为空')
  }

  // 幂等性：检查已存在的教室
  const existingIds = classrooms.map(r => r.classroomID)
  const existRes = await db.collection('Classrooms')
    .where({ classroomID: db.command.in(existingIds) })
    .get()
  const existingSet = new Set(existRes.data.map(r => r.classroomID))

  let added = 0
  let skipped = 0

  for (let room of classrooms) {
    if (existingSet.has(room.classroomID)) {
      skipped++
      continue
    }
    try {
      const emptyMatrix = createEmptyMatrix()
      await db.collection('Classrooms').add({
        data: {
          buildingBelong: room.buildingBelong,
          classroomID: room.classroomID,
          containNumber: room.containNumber,
          description: room.description || '',
          thisWeekStatusMatrix: emptyMatrix,
          nextWeekStatusMatrix: createEmptyMatrix(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      })
      added++
    } catch (e) {
      console.error('导入教室失败:', room.classroomID, e.message)
    }
  }

  // 审计日志
  logAudit(db, {
    action: 'import_classrooms',
    targetType: 'classroom',
    targetId: `batch_${Date.now()}`,
    adminId: currentUserID,
    details: { added, skipped, total: classrooms.length }
  })

  return success({ added, skipped, total: classrooms.length })
}
