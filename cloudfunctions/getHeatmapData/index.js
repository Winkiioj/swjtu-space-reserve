/**
 * getHeatmapData — 获取教室占用热力图数据
 *
 * 统计所有教室本周状态矩阵中各讲次的占用率（值为2的比例），
 * 用于前端展示5天×13讲次的热力图。
 *
 * === 返回示例 ===
 * {
 *   code: 0,
 *   data: {
 *     matrix: [
 *       [0.12, 0.45, ...],   // 周一 13个讲次
 *       [0.08, 0.32, ...],   // 周二
 *       [0.15, 0.28, ...],   // 周三
 *       [0.05, 0.18, ...],   // 周四
 *       [0.22, 0.35, ...]    // 周五
 *     ],
 *     totalClassrooms: 48,
 *     maxRate: 0.78          // 最大占用率（用于前端颜色映射）
 *   }
 * }
 */

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

exports.main = async (event) => {
  try {
    const classRes = await db.collection('Classrooms').get()
    const classrooms = classRes.data
    if (classrooms.length === 0) {
      return { code: 0, data: { matrix: Array(5).fill().map(() => Array(13).fill(0)), totalClassrooms: 0, maxRate: 0 } }
    }

    // 初始化累加矩阵 [5][13]
    const matrix = Array(5).fill().map(() => Array(13).fill(0))

    for (const room of classrooms) {
      const statusMatrix = room.thisWeekStatusMatrix
      if (!statusMatrix || statusMatrix.length < 5) continue
      for (let d = 0; d < 5; d++) {
        for (let l = 0; l < 13; l++) {
          if (statusMatrix[d][l] === 2) {
            matrix[d][l]++
          }
        }
      }
    }

    // 转换为占用率
    let maxRate = 0
    const rateMatrix = matrix.map(row => {
      return row.map(count => {
        const rate = classrooms.length > 0 ? count / classrooms.length : 0
        if (rate > maxRate) maxRate = rate
        return Math.round(rate * 100) / 100
      })
    })

    return {
      code: 0,
      data: {
        matrix: rateMatrix,
        totalClassrooms: classrooms.length,
        maxRate
      }
    }
  } catch (err) {
    console.error('getHeatmapData 错误:', err)
    return { code: 500, message: '获取热力图数据失败', error: err.message }
  }
}
