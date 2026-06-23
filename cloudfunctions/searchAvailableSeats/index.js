const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 已知楼层范围 1~6
const FLOORS = [1, 2, 3, 4, 5, 6]

exports.main = async (event, context) => {
  const { dayType, lectures } = event
  console.log('请求参数:', { dayType, lectures })

  if (!lectures || lectures.length === 0) {
    return { code: 400, message: '请选择讲次' }
  }

  const matrixField = dayType === 'this' ? 'thisDayStatusMatrix' : 'nextDayStatusMatrix'

  // 按楼层分别查询（每层座位数 < 100，避免 skip 限制）
  let allSeats = []
  for (const floor of FLOORS) {
    try {
      const res = await db.collection('Seats')
        .where({ floor })
        .limit(100)
        .get()
      allSeats = allSeats.concat(res.data)
      console.log(`楼层 ${floor}: 获取 ${res.data.length} 条`)
    } catch (err) {
      console.error(`楼层 ${floor} 查询失败:`, err)
    }
  }

  console.log(`总共获取 ${allSeats.length} 条座位`)

  const available = []
  for (let seat of allSeats) {
    const matrix = seat[matrixField]
    if (!Array.isArray(matrix) || matrix.length < 13) {
      console.warn(`座位 ${seat.seatID} 矩阵无效，跳过`)
      continue
    }
    let canUse = true
    for (let lec of lectures) {
      if (matrix[lec] !== 0) {
        canUse = false
        break
      }
    }
    if (canUse) {
      available.push({
        _id: seat._id,
        seatID: seat.seatID,
        areaBelong: seat.areaBelong,
        seatType: seat.seatType
      })
    }
  }

  return { code: 0, data: available }
}
