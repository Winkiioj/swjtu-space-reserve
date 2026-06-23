const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const MAX_LIMIT = 100

/**
 * 分页获取集合中全部匹配文档
 */
async function getAllDocs(collection, query = {}, batch = MAX_LIMIT) {
  let all = []
  let skip = 0
  while (true) {
    const res = await db.collection(collection)
      .where(query)
      .skip(skip)
      .limit(batch)
      .get()
    all = all.concat(res.data)
    if (res.data.length < batch) break
    skip += batch
  }
  return all
}

exports.main = async (event, context) => {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  // ===== 座位矩阵每日轮转 =====
  const seats = await getAllDocs('Seats')
  for (let seat of seats) {
    await db.collection('Seats').doc(seat._id).update({
      data: {
        thisDayStatusMatrix: seat.nextDayStatusMatrix,
        nextDayStatusMatrix: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        updatedAt: Date.now()
      }
    })
  }

  // ===== 将昨日及更早的活跃座位预约标记为过期 =====
  // 矩阵已被轮转清除，无需恢复座位状态，只需更新预约记录
  const pastReservations = await getAllDocs('Reservations', {
    status: 'active',
    date: db.command.lt(todayStr)
  })

  for (let r of pastReservations) {
    await db.collection('Reservations').doc(r._id).update({
      data: {
        status: 'expired',
        updatedAt: Date.now()
      }
    })
  }

  return {
    code: 0,
    message: '座位日推进完成',
    stats: {
      seatsRotated: seats.length,
      reservationsExpired: pastReservations.length
    }
  }
}
