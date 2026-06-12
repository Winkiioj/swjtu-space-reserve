const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { clean = false } = event

  try {
    // ====== 1. 清除所有旧数据（支持 200+ 条） ======
    if (clean) {
      let allSeats = []
      let skip = 0
      let hasMore = true
      while (hasMore) {
        const res = await db.collection('Seats')
          .skip(skip)
          .limit(100)
          .get()
        if (res.data.length === 0) {
          hasMore = false
        } else {
          allSeats = allSeats.concat(res.data)
          skip += res.data.length
        }
      }

      // 逐条删除（分批并发）
      const BATCH = 20
      for (let i = 0; i < allSeats.length; i += BATCH) {
        const batch = allSeats.slice(i, i + BATCH)
        await Promise.all(batch.map(s => db.collection('Seats').doc(s._id).remove()))
      }
      console.log(`已清除 ${allSeats.length} 条旧数据`)
    }

    // ====== 2. 生成 180 个座位（6层 × 5区 × 6座） ======
    const floors = [1, 2, 3, 4, 5, 6]
    const areas = ['A', 'B', 'C', 'D', 'E']
    const seats = []

    for (const floor of floors) {
      for (const area of areas) {
        for (let i = 1; i <= 6; i++) {
          const num = i.toString().padStart(3, '0')
          seats.push({
            areaBelong: `${floor}${area}`,
            floor,
            seatID: `${floor}${area}${num}`,
            seatType: 'standard',
            thisDayStatusMatrix: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            nextDayStatusMatrix: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            createdAt: Date.now(),
            updatedAt: Date.now()
          })
        }
      }
    }

    // ====== 3. 批量写入数据库（每批 20 条并发） ======
    const BATCH = 20
    let added = 0
    for (let i = 0; i < seats.length; i += BATCH) {
      const batch = seats.slice(i, i + BATCH)
      await Promise.all(batch.map(s => db.collection('Seats').add({ data: s })))
      added += batch.length
      console.log(`已写入 ${added}/${seats.length}`)
    }

    return {
      code: 0,
      message: `成功生成 ${seats.length} 个座位`,
      total: seats.length,
      detail: `${floors.length}层 × ${areas.length}区 × 6座 = ${seats.length}`
    }
  } catch (err) {
    console.error(err)
    return { code: 500, message: '初始化失败', error: err.message }
  }
}
