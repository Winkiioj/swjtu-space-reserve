const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { seatId, dayType, lectures, date } = event
  const matrixField = dayType === 'this' ? 'thisDayStatusMatrix' : 'nextDayStatusMatrix'

  try {
    const wxContext = cloud.getWXContext()
    const userId = wxContext.OPENID

    const transaction = await db.startTransaction()
    const seatRes = await transaction.collection('Seats').doc(seatId).get()
    const seat = seatRes.data
    const currentMatrix = seat[matrixField]

    for (let lec of lectures) {
      if (currentMatrix[lec] !== 0) {
        await transaction.rollback()
        return { code: 409, message: `座位已被占用（讲次 ${lec+1}）` }
      }
    }

    // 更新座位矩阵
    const newMatrix = [...currentMatrix]
    for (let lec of lectures) {
      newMatrix[lec] = 1
    }
    await transaction.collection('Seats').doc(seatId).update({
      data: {
        [matrixField]: newMatrix,
        updatedAt: Date.now()
      }
    })

    // 创建预约记录
    const now = Date.now()
    const reservationResult = await transaction.collection('Reservations').add({
      data: {
        userId,
        seatId,
        seatID: seat.seatID,
        areaBelong: seat.areaBelong,
        date: date || '',
        dayType,
        lectures,
        status: 'active',
        createdAt: now,
        updatedAt: now
      }
    })

    await transaction.commit()
    return {
      code: 0,
      message: '预约成功',
      reservationId: reservationResult._id
    }
  } catch (err) {
    console.error(err)
    return { code: 500, message: '预约失败，请重试' }
  }
}
