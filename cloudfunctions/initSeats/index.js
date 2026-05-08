const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { clean = false } = event

  try {
    if (clean) {
      const all = await db.collection('Seats').get()
      for (let doc of all.data) {
        await db.collection('Seats').doc(doc._id).remove()
      }
      console.log('已清空 Seats 集合')
    }

    const seats = []
    const floors = [1, 2, 3, 4, 5, 6]
    const areas = ['A', 'B', 'C', 'D', 'E']
    const baseCount = 6
    const extraTotal = 20

    // 生成基础座位 (6*30=180)
    for (let floor of floors) {
      for (let area of areas) {
        for (let i = 1; i <= baseCount; i++) {
          const seatID = `${floor}${area}${i.toString().padStart(3, '0')}`
          seats.push({
            areaBelong: `${floor}${area}`,
            floor,
            seatID,
            seatType: 'standard',
            thisDayStatusMatrix: Array(13).fill(0),
            nextDayStatusMatrix: Array(13).fill(0),
            createdAt: Date.now(),
            updatedAt: Date.now()
          })
        }
      }
    }

    // 随机选20个区域各增加1个座位
    const regions = []
    for (let floor of floors) {
      for (let area of areas) {
        regions.push({ floor, area })
      }
    }
    // 打乱顺序取前20
    for (let i = regions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [regions[i], regions[j]] = [regions[j], regions[i]]
    }
    const extraRegions = regions.slice(0, extraTotal)
    for (let reg of extraRegions) {
      const { floor, area } = reg
      const currentCount = seats.filter(s => s.areaBelong === `${floor}${area}`).length
      const newNum = currentCount + 1
      const seatID = `${floor}${area}${newNum.toString().padStart(3, '0')}`
      seats.push({
        areaBelong: `${floor}${area}`,
        floor,
        seatID,
        seatType: 'standard',
        thisDayStatusMatrix: Array(13).fill(0),
        nextDayStatusMatrix: Array(13).fill(0),
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    }

    let added = 0
    for (let seat of seats) {
      await db.collection('Seats').add({ data: seat })
      added++
      if (added % 50 === 0) console.log(`已添加 ${added} 条`)
    }

    return {
      code: 0,
      message: `成功生成 ${seats.length} 个座位`,
      total: seats.length
    }
  } catch (err) {
    console.error(err)
    return { code: 500, message: '初始化失败', error: err.message }
  }
}