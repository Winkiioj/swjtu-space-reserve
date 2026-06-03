const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const { success, fail } = require('./response')
const { requireAdmin } = require('./auth')

exports.main = async (event) => {
  const { currentUserID } = event
  if (!currentUserID) return fail(400, '参数缺失')

  try {
    await requireAdmin(db, currentUserID)

    const todayStr = new Date().toISOString().slice(0, 10)

    const [pendingCount, totalClassrooms, todayReservations] = await Promise.all([
      db.collection('Applications').where({ rentalStatus: 0 }).count(),
      db.collection('Classrooms').count(),
      db.collection('Applications')
        .where({ rentDate: todayStr, rentalStatus: _.in([0, 1]) })
        .count()
    ])

    return success({
      pendingCount: pendingCount.total,
      totalClassrooms: totalClassrooms.total,
      todayReservations: todayReservations.total
    })
  } catch (err) {
    if (err.code && err.message) return err
    console.error(err)
    return fail(500, '获取统计失败', err.message)
  }
}
