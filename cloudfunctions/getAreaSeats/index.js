const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { areaBelong, dayType, selectedLectures } = event

  if (!areaBelong) {
    return { code: 400, message: '请选择区域' }
  }

  const matrixField = dayType === 'this' ? 'thisDayStatusMatrix' : 'nextDayStatusMatrix'

  try {
    const res = await db.collection('Seats')
      .where({ areaBelong })
      .limit(100)
      .get()

    const seats = res.data.map(seat => {
      const matrix = seat[matrixField] || []
      let isAvailable = true
      if (selectedLectures && selectedLectures.length > 0) {
        for (const lec of selectedLectures) {
          if (matrix[lec] !== 0) {
            isAvailable = false
            break
          }
        }
      }
      return {
        _id: seat._id,
        seatID: seat.seatID,
        areaBelong: seat.areaBelong,
        seatType: seat.seatType,
        isAvailable,
        statusMatrix: matrix
      }
    })

    // 按座位编号排序
    seats.sort((a, b) => a.seatID.localeCompare(b.seatID))

    return { code: 0, data: seats }
  } catch (err) {
    console.error(err)
    return { code: 500, message: '查询失败', error: err.message }
  }
}
