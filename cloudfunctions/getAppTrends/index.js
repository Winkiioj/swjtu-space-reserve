/**
 * getAppTrends — 获取近30天申请趋势数据
 *
 * 返回每日的申请提交量（按状态分组），用于前端趋势折线图。
 * === 调用参数 ===
 * 无参数
 *
 * === 返回示例 ===
 * {
 *   code: 0,
 *   data: {
 *     dates: ['05-13', '05-14', ...],
 *     series: {
 *       pending: [3, 5, 2, ...],
 *       approved: [1, 3, 4, ...],
 *       rejected: [0, 1, 2, ...]
 *     }
 *   }
 * }
 */

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  try {
    const now = new Date()
    const days = 30
    const dates = []
    const pending = []
    const approved = []
    const rejected = []

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      const dayEnd = dayStart + 24 * 60 * 60 * 1000

      const [pCount, aCount, rCount] = await Promise.all([
        db.collection('Applications').where({
          appliedAt: _.gte(dayStart).lt(dayEnd),
          rentalStatus: 0
        }).count(),
        db.collection('Applications').where({
          appliedAt: _.gte(dayStart).lt(dayEnd),
          rentalStatus: 1
        }).count(),
        db.collection('Applications').where({
          appliedAt: _.gte(dayStart).lt(dayEnd),
          rentalStatus: 2
        }).count()
      ])

      dates.push(dateStr)
      pending.push(pCount.total)
      approved.push(aCount.total)
      rejected.push(rCount.total)
    }

    return {
      code: 0,
      message: 'success',
      data: { dates, series: { pending, approved, rejected } }
    }
  } catch (err) {
    console.error('getAppTrends 错误:', err)
    return { code: 500, message: '获取趋势数据失败', error: err.message }
  }
}
