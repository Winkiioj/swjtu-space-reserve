const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const { success, fail } = require('./response')
const { requireAdmin } = require('./auth')

exports.main = async (event) => {
  const { applicationId, currentUserID } = event
  if (!applicationId || !currentUserID) return fail(400, '参数缺失')

  try {
    await requireAdmin(db, currentUserID)

    const appRes = await db.collection('Applications').doc(applicationId).get()
    if (!appRes.data) return fail(404, '申请不存在')
    const application = appRes.data

    const userRes = await db.collection('Users').where({ userID: application.proposerID }).get()
    const proposer = userRes.data[0] || null
    const applicantPhone = proposer ? (proposer.phone || '未填写') : '未填写'
    const applicantName = (application.proposerName)
      || (proposer ? proposer.userName : '')
      || '未知'

    const classRes = await db.collection('Classrooms').doc(application.classroomApplied).get()
    const classroom = classRes.data
    if (!classroom) return fail(404, '教室不存在')

    const lecturesStr = application.rentLectures.map(l => l + 1).join(',') + '讲'

    // 查找替代教室：容量≥原教室，同一周次相同时段空闲
    const matrixKey = application.rentWeek === 'this'
      ? 'thisWeekStatusMatrix'
      : 'nextWeekStatusMatrix'
    const dayOfWeek = application.rentDayOfWeek
    const lectures = application.rentLectures

    const allRooms = await db.collection('Classrooms')
      .where({ containNumber: _.gte(classroom.containNumber) })
      .get()

    const alternatives = []
    for (let room of allRooms.data) {
      if (room._id === classroom._id) continue
      let conflict = false
      for (let lec of lectures) {
        if (room[matrixKey][dayOfWeek][lec] !== 0) {
          conflict = true
          break
        }
      }
      if (!conflict) {
        alternatives.push({
          _id: room._id,
          buildingBelong: room.buildingBelong,
          classroomID: room.classroomID,
          containNumber: room.containNumber
        })
      }
    }

    // 按容量升序排列（最接近原教室的排前面）
    alternatives.sort((a, b) => a.containNumber - b.containNumber)

    return success({
      application,
      applicantName,
      applicantPhone,
      classroomInfo: classroom,
      lecturesStr,
      alternatives: alternatives.slice(0, 5)
    })
  } catch (err) {
    if (err.code && err.message) return err
    console.error(err)
    return fail(500, '获取失败', err.message)
  }
}
