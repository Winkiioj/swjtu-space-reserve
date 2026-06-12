const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 讲次开始时间（当天分钟数），用于拦截已开始的讲次
const LECTURE_START_MINUTES = [
  8 * 60,       // 第1讲  08:00
  8 * 60 + 55,  // 第2讲  08:55
  9 * 60 + 50,  // 第3讲  09:50
  10 * 60 + 45, // 第4讲  10:45
  11 * 60 + 40, // 第5讲  11:40
  14 * 60,      // 第6讲  14:00
  14 * 60 + 50, // 第7讲  14:50
  15 * 60 + 40, // 第8讲  15:40
  16 * 60 + 40, // 第9讲  16:40
  17 * 60 + 30, // 第10讲 17:30
  19 * 60 + 30, // 第11讲 19:30
  20 * 60 + 20, // 第12讲 20:20
  21 * 60 + 10  // 第13讲 21:10
]

exports.main = async (event, context) => {
  const { seatId, dayType, lectures, date } = event
  const matrixField = dayType === 'this' ? 'thisDayStatusMatrix' : 'nextDayStatusMatrix'

  try {
    const wxContext = cloud.getWXContext()
    const userId = wxContext.OPENID

    // 防止预约已过去的时间段
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    if (date && date === todayStr) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      const earliestLecture = Math.min(...lectures)
      if (earliestLecture >= 0 && earliestLecture < LECTURE_START_MINUTES.length) {
        if (nowMinutes >= LECTURE_START_MINUTES[earliestLecture]) {
          return { code: 400, message: '该时段已开始，不可预约' }
        }
      }
    }

    const transaction = await db.startTransaction()

    // 1. 检查同一用户同一日期是否已有活跃预约（防止同一人多占座位）
    const existingRes = await transaction.collection('Reservations')
      .where({
        userId: userId,
        date: date,
        status: 'active'
      })
      .get()
    for (let existing of existingRes.data) {
      const hasOverlap = lectures.some(lec => existing.lectures.includes(lec))
      if (hasOverlap) {
        await transaction.rollback()
        return {
          code: 409,
          message: `您在该时段已有预约（座位 ${existing.seatID}，讲次 ${existing.lectures.map(l => l + 1).join(',')}）`
        }
      }
    }

    // 2. 检查目标座位是否已被占用
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
    const now2 = Date.now()
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
        createdAt: now2,
        updatedAt: now2
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
