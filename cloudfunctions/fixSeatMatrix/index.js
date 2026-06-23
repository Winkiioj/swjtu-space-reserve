const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const MAX_LIMIT = 100
  let allSeats = []
  let skip = 0
  let hasMore = true

  // 分页获取所有座位
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
      console.log(`已获取 ${allSeats.length} 条记录`)
    }
  }

  console.log(`共需处理 ${allSeats.length} 条记录`)

  let fixedCount = 0
  for (let seat of allSeats) {
    let needUpdate = false
    const updateData = {}

    // 修复 thisDayStatusMatrix
    if (typeof seat.thisDayStatusMatrix === 'string') {
      try {
        updateData.thisDayStatusMatrix = JSON.parse(seat.thisDayStatusMatrix)
        needUpdate = true
      } catch (e) {
        console.error(`座位 ${seat.seatID} 的 thisDayStatusMatrix 解析失败:`, seat.thisDayStatusMatrix)
      }
    }
    // 修复 nextDayStatusMatrix
    if (typeof seat.nextDayStatusMatrix === 'string') {
      try {
        updateData.nextDayStatusMatrix = JSON.parse(seat.nextDayStatusMatrix)
        needUpdate = true
      } catch (e) {
        console.error(`座位 ${seat.seatID} 的 nextDayStatusMatrix 解析失败:`, seat.nextDayStatusMatrix)
      }
    }

    // 额外：如果矩阵是数组但长度不对（应该13），也修复
    if (Array.isArray(seat.thisDayStatusMatrix) && seat.thisDayStatusMatrix.length !== 13) {
      updateData.thisDayStatusMatrix = Array(13).fill(0)
      needUpdate = true
    }
    if (Array.isArray(seat.nextDayStatusMatrix) && seat.nextDayStatusMatrix.length !== 13) {
      updateData.nextDayStatusMatrix = Array(13).fill(0)
      needUpdate = true
    }

    if (needUpdate) {
      await db.collection('Seats').doc(seat._id).update({ data: updateData })
      fixedCount++
      if (fixedCount % 50 === 0) console.log(`已修复 ${fixedCount} 条`)
    }
  }

  return { code: 0, message: `处理完成，共修复 ${fixedCount} 条记录` }
}