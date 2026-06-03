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

    // ====== 2. 生成 200 个新座位 ======
    const floors = [1, 2, 3, 4, 5, 6]
    const areas = ['A', 'B', 'C', 'D', 'E']
    const seats = []

    // 每层 5 个区域 × 6 个基础座位 = 30 条/层 → 180 条
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

    // 额外 20 个座位分散到随机区域（每区最多加 1 个）
    const regions = []
    for (const floor of floors) {
      for (const area of areas) {
        regions.push({ floor, area })
      }
    }
    // 打乱顺序
    for (let i = regions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [regions[i], regions[j]] = [regions[j], regions[i]]
    }

    for (const reg of regions.slice(0, 20)) {
      const { floor, area } = reg
      const currentCount = seats.filter(s => s.areaBelong === `${floor}${area}`).length
      const num = (currentCount + 1).toString().padStart(3, '0')
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
      detail: {
        每层基础: `${floors.length}层 × ${areas.length}区 × 6座 = 180`,
        额外分布: '20 个座位随机分散到各区域',
        合计: seats.length
      }
    }
  } catch (err) {
    console.error(err)
    return { code: 500, message: '初始化失败', error: err.message }
  }
}
