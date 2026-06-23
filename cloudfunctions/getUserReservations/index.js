const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const userId = wxContext.OPENID
    const todayStr = new Date().toISOString().slice(0, 10)

    // 只返回今天及以后的活跃预约，过去日期的预约不展示
    const res = await db.collection('Reservations')
      .where({
        userId,
        status: 'active',
        date: db.command.gte(todayStr)
      })
      .orderBy('createdAt', 'desc')
      .get()

    return { code: 0, data: res.data }
  } catch (err) {
    console.error(err)
    return { code: 500, message: '查询失败', error: err.message }
  }
}
