const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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
      return { code: 400, message: '该预约已取消或已完成' }
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
