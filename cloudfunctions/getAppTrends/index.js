/**
 * getAppTrends — 获取近30天申请趋势数据
 *
 * 返回每日的申请提交量（按状态分组），用于前端趋势折线图。
 *
 * === 性能优化 ===
 * 旧版：30天 × 3状态 = 90次 count 查询，云函数3秒超时 → 降级到 mock。
 * 新版：1次 where 查询拉回30天内全部申请，内存按天+状态分组。
 *
 * === 调用参数 ===
 * 无参数
 *
 * === 返回示例 ===
 * {
 *   code: 0,
 *   data: {
 *     dates: ['05-25', '05-26', ...],
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

const MAX_QUERY_LIMIT = 500   // 微信云开发单次查询上限 1000，留余量

exports.main = async (event) => {
  try {
    const now = new Date()
    const days = 30

    // 计算30天窗口的起止时间戳（毫秒）
    const startD = new Date(now)
    startD.setDate(startD.getDate() - days + 1)                     // 30天前的日期
    const startTs = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate()).getTime()
    const endTs   = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() + 24 * 60 * 60 * 1000

    // ---- 1 次查询拉回 30 天内全部申请 ----
    const res = await db.collection('Applications')
      .where({ appliedAt: _.gte(startTs).lt(endTs) })
      .limit(MAX_QUERY_LIMIT)
      .get()

    // ---- 初始化 30 天分组表 ----
    const dateMap = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = fmtDate(d)
      dateMap[key] = { pending: 0, approved: 0, rejected: 0 }
    }

    // ---- 内存分组统计 ----
    for (const app of res.data) {
      const key = fmtDate(new Date(app.appliedAt))
      const bucket = dateMap[key]
      if (!bucket) continue            // 时间窗口外的记录，跳过

      if (app.rentalStatus === 0) bucket.pending++
      else if (app.rentalStatus === 1) bucket.approved++
      else if (app.rentalStatus === 2) bucket.rejected++
    }

    // ---- 组装输出数组（从旧到新，与旧版顺序一致） ----
    const dates = []
    const pending = []
    const approved = []
    const rejected = []

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = fmtDate(d)
      const entry = dateMap[key]
      dates.push(key)
      pending.push(entry.pending)
      approved.push(entry.approved)
      rejected.push(entry.rejected)
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

/** 将 Date 格式化为 "YYYY-MM-DD" */
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
