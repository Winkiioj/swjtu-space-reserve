const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { dayType, lectures } = event
  console.log('请求参数:', { dayType, lectures })

  if (!lectures || lectures.length === 0) {
    return { code: 400, message: '请选择讲次' }
  }

  const matrixField = dayType === 'this' ? 'thisDayStatusMatrix' : 'nextDayStatusMatrix'
  
  // 分页获取所有座位
  const MAX_LIMIT = 100
  let allSeats = []
  let skip = 0
  let hasMore = true
  while (hasMore) {
    const res = await db.collection('Seats')
      .skip(skip)
      .limit(MAX_LIMIT)
      .get()
    if (res.data.length === 0) {
      hasMore = false
    } else {
      allSeats = allSeats.concat(res.data)
      skip += res.data.length
      console.log(`已获取 ${allSeats.length} 条座位`)
    }
  }

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