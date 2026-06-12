const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 讲次过期阈值 = 结束时间 + 20分钟，转换为当天分钟数
// 用于比较：当前分钟数 >= 阈值 → 该讲次已过期
const LECTURE_EXPIRY_MINUTES = [
  9 * 60 + 5,    // 第1讲  08:00-08:45 + 20min → 09:05 → 545
  10 * 60 + 0,   // 第2讲  08:55-09:40 + 20min → 10:00 → 600
  10 * 60 + 55,  // 第3讲  09:50-10:35 + 20min → 10:55 → 655
  11 * 60 + 50,  // 第4讲  10:45-11:30 + 20min → 11:50 → 710
  12 * 60 + 45,  // 第5讲  11:40-12:25 + 20min → 12:45 → 765
  15 * 60 + 5,   // 第6讲  14:00-14:45 + 20min → 15:05 → 905
  15 * 60 + 55,  // 第7讲  14:50-15:35 + 20min → 15:55 → 955
  16 * 60 + 45,  // 第8讲  15:40-16:25 + 20min → 16:45 → 1005
  17 * 60 + 45,  // 第9讲  16:40-17:25 + 20min → 17:45 → 1065
  18 * 60 + 35,  // 第10讲 17:30-18:15 + 20min → 18:35 → 1115
  20 * 60 + 35,  // 第11讲 19:30-20:15 + 20min → 20:35 → 1235
  21 * 60 + 25,  // 第12讲 20:20-21:05 + 20min → 21:25 → 1285
  22 * 60 + 15   // 第13讲 21:10-21:55 + 20min → 22:15 → 1335
]

/**
 * 分页获取集合中全部匹配文档
 */
async function getAllDocs(db, collection, query = {}, batch = 100) {
  let all = []
  let skip = 0
  while (true) {
    const res = await db.collection(collection)
      .where(query)
      .skip(skip)
      .limit(batch)
      .get()
    all = all.concat(res.data)
    if (res.data.length < batch) break
    skip += batch
  }
  return all
}

/**
 * 根据当前日期确定应更新的矩阵字段
 * @param {string} reservationDate - 预约日期 YYYY-MM-DD
 * @param {string} todayStr - 今天 YYYY-MM-DD
 * @param {string} tomorrowStr - 明天 YYYY-MM-DD
 * @returns {string|null} 矩阵字段名，null 表示矩阵已轮转无需恢复
 */
function getMatrixField(reservationDate, todayStr, tomorrowStr) {
  if (reservationDate === todayStr) return 'thisDayStatusMatrix'
  if (reservationDate === tomorrowStr) return 'nextDayStatusMatrix'
  // 日期早于今天：矩阵已被午夜轮转清除，无需恢复
  return null
}

exports.main = async (event, context) => {
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  // 格式化日期字符串（UTC+8 北京时间）
  const todayStr = now.toISOString().slice(0, 10)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  // 查询所有活跃且日期不晚于今天的预约（未来日期不处理）
  const activeReservations = await getAllDocs(db, 'Reservations', {
    status: 'active',
    date: db.command.lte(todayStr)
  })

  let expiredCount = 0
  const errors = []

  for (let reservation of activeReservations) {
    // 防御：确保 lectures 是有效数组
    if (!Array.isArray(reservation.lectures) || reservation.lectures.length === 0) {
      continue
    }

    // 取最大讲次索引，判断是否已过过期阈值
    const maxLecture = Math.max(...reservation.lectures)

    // 防御：讲次索引越界
    if (maxLecture < 0 || maxLecture >= LECTURE_EXPIRY_MINUTES.length) {
      continue
    }

    if (nowMinutes < LECTURE_EXPIRY_MINUTES[maxLecture]) {
      // 还未到过期时间
      continue
    }

    const matrixField = getMatrixField(reservation.date, todayStr, tomorrowStr)

    if (matrixField) {
      // 需要同时更新矩阵 → 使用事务保证原子性
      try {
        const transaction = await db.startTransaction()

        // 更新预约状态
        await transaction.collection('Reservations').doc(reservation._id).update({
          data: {
            status: 'expired',
            updatedAt: Date.now()
          }
        })

        // 恢复座位矩阵
        const seatRes = await transaction.collection('Seats').doc(reservation.seatId).get()
        if (seatRes.data && Array.isArray(seatRes.data[matrixField])) {
          const matrix = seatRes.data[matrixField]
          const newMatrix = [...matrix]
          for (let lec of reservation.lectures) {
            if (lec >= 0 && lec < newMatrix.length) {
              newMatrix[lec] = 0
            }
          }
          await transaction.collection('Seats').doc(reservation.seatId).update({
            data: {
              [matrixField]: newMatrix,
              updatedAt: Date.now()
            }
          })
        }

        await transaction.commit()
        expiredCount++
      } catch (err) {
        // 单条失败不影响其他预约的处理
        try { await transaction.rollback() } catch (_) { /* 忽略回滚错误 */ }
        errors.push({ reservationId: reservation._id, error: err.message || String(err) })
      }
    } else {
      // 矩阵已被午夜轮转清除，只需更新状态
      try {
        await db.collection('Reservations').doc(reservation._id).update({
          data: {
            status: 'expired',
            updatedAt: Date.now()
          }
        })
        expiredCount++
      } catch (err) {
        errors.push({ reservationId: reservation._id, error: err.message || String(err) })
      }
    }
  }

  return {
    code: 0,
    message: `已过期 ${expiredCount} 条预约`,
    expired: expiredCount,
    errors: errors.length > 0 ? errors : undefined
  }
}
