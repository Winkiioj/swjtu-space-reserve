const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const userId = wxContext.OPENID

    const res = await db.collection('Reservations')
      .where({ userId, status: 'active' })
      .orderBy('createdAt', 'desc')
      .get()

    return { code: 0, data: res.data }
  } catch (err) {
    console.error(err)
    return { code: 500, message: '查询失败', error: err.message }
  }
}
