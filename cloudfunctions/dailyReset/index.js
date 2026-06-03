const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const { getAllDocs } = require('./dbutils')
const { createEmptyMatrix } = require('./constants')

exports.main = async () => {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=周日, 1=周一, ..., 6=周六

  // ===== 教室矩阵轮转（周六执行） =====
  if (dayOfWeek === 6) {
    const classrooms = await getAllDocs(db, 'Classrooms')
    for (let room of classrooms) {
      await db.collection('Classrooms').doc(room._id).update({
        data: {
          thisWeekStatusMatrix: room.nextWeekStatusMatrix,
          nextWeekStatusMatrix: createEmptyMatrix(),
          updatedAt: Date.now()
        }
      })
    }
  }

  // ===== 座位每日重置 =====
  const seats = await getAllDocs(db, 'Seats')
  for (let seat of seats) {
    await db.collection('Seats').doc(seat._id).update({
      data: {
        thisDayStatusMatrix: seat.nextDayStatusMatrix,
        nextDayStatusMatrix: createEmptyMatrix(),
        updatedAt: Date.now()
      }
    })
  }

  // ===== 将已批准且租借日期已过的申请标记为已完成 =====
  const todayStr = now.toISOString().slice(0, 10)
  const expired = await getAllDocs(db, 'Applications', {
    rentalStatus: 1,
    rentDate: db.command.lt(todayStr)
  })

  for (let app of expired) {
    await db.collection('Applications').doc(app._id).update({
      data: { rentalStatus: 4, completedAt: Date.now() }
    })
  }

  return {
    success: true,
    stats: {
      classroomsRotated: dayOfWeek === 6,
      seatsReset: seats.length,
      applicationsCompleted: expired.length
    }
  }
}
