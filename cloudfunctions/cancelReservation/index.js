const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 讲次过期阈值（结束时间 + 20分钟），用于判断是否已过期
const LECTURE_EXPIRY_MINUTES = [
  9 * 60 + 5,    // 第1讲  08:00-08:45 + 20min → 09:05
  10 * 60 + 0,   // 第2讲  08:55-09:40 + 20min → 10:00
  10 * 60 + 55,  // 第3讲  09:50-10:35 + 20min → 10:55
  11 * 60 + 50,  // 第4讲  10:45-11:30 + 20min → 11:50
  12 * 60 + 45,  // 第5讲  11:40-12:25 + 20min → 12:45
  15 * 60 + 5,   // 第6讲  14:00-14:45 + 20min → 15:05
  15 * 60 + 55,  // 第7讲  14:50-15:35 + 20min → 15:55
  16 * 60 + 45,  // 第8讲  15:40-16:25 + 20min → 16:45
  17 * 60 + 45,  // 第9讲  16:40-17:25 + 20min → 17:45
  18 * 60 + 35,  // 第10讲 17:30-18:15 + 20min → 18:35
  20 * 60 + 35,  // 第11讲 19:30-20:15 + 20min → 20:35
  21 * 60 + 25,  // 第12讲 20:20-21:05 + 20min → 21:25
  22 * 60 + 15   // 第13讲 21:10-21:55 + 20min → 22:15
]

/**
 * 判断预约是否已过期
 * @returns {boolean}
 */
function isReservationExpired(reservation) {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  // 过去日期的预约一律视为过期
  if (reservation.date < todayStr) return true

  // 今天日期的预约，检查讲次时间
  if (reservation.date === todayStr) {
    if (!Array.isArray(reservation.lectures) || reservation.lectures.length === 0) return true
    const maxLecture = Math.max(...reservation.lectures)
    if (maxLecture < 0 || maxLecture >= LECTURE_EXPIRY_MINUTES.length) return true
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    return nowMinutes >= LECTURE_EXPIRY_MINUTES[maxLecture]
  }

  // 未来日期 → 未过期
  return false
}

exports.main = async (event, context) => {
  const { reservationId } = event

  if (!reservationId) {
    return { code: 400, message: '缺少预约ID' }
  }

  try {
    const wxContext = cloud.getWXContext()
    const userId = wxContext.OPENID

    // 获取预约记录
    const reservationRes = await db.collection('Reservations').doc(reservationId).get()
    const reservation = reservationRes.data

    if (!reservation) {
      return { code: 404, message: '预约记录不存在' }
    }

    if (reservation.userId !== userId) {
      return { code: 403, message: '无权操作此预约' }
    }

    if (reservation.status !== 'active') {
      return { code: 400, message: '该预约已取消、已过期或已完成' }
    }

    // 检查预约是否已过期（日期已过 或 讲次时间已过20分钟）
    if (isReservationExpired(reservation)) {
      // 直接标记为过期，不允许取消
      await db.collection('Reservations').doc(reservationId).update({
        data: { status: 'expired', updatedAt: Date.now() }
      })
      return { code: 400, message: '该预约已过期，无法取消' }
    }

    const matrixField = reservation.dayType === 'this' ? 'thisDayStatusMatrix' : 'nextDayStatusMatrix'

    const transaction = await db.startTransaction()

    // 更新预约状态为已取消
    await transaction.collection('Reservations').doc(reservationId).update({
      data: {
        status: 'cancelled',
        updatedAt: Date.now()
      }
    })

    // 恢复座位矩阵（将预约的讲次置为 0）
    const seatRes = await transaction.collection('Seats').doc(reservation.seatId).get()
    if (seatRes.data) {
      const matrix = seatRes.data[matrixField]
      const newMatrix = [...matrix]
      for (let lec of reservation.lectures) {
        newMatrix[lec] = 0
      }
      await transaction.collection('Seats').doc(reservation.seatId).update({
        data: {
          [matrixField]: newMatrix,
          updatedAt: Date.now()
        }
      })
    }

    await transaction.commit()
    return { code: 0, message: '取消成功' }
  } catch (err) {
    console.error(err)
    return { code: 500, message: '取消失败，请重试' }
  }
}
