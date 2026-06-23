const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { clean = false } = event

  try {
    // ====== 1. 清除旧数据（一气呵成，用完即走） ======
    if (clean) {
      let deleted = 0
      while (true) {
        const res = await db.collection('Seats').limit(100).get()
        if (res.data.length === 0) break
        const ids = res.data.map(s => s._id)
        // 一批全删，不拆小批次
        await db.collection('Seats').where({ _id: db.command.in(ids) }).remove()
        deleted += ids.length
      }
      console.log(`已清除 ${deleted} 条旧数据`)
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

    // ====== 3. 批量写入（加大批次，一次 50 条，4 批写完） ======
    const BATCH = 50
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
