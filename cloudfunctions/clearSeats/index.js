const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  // 可选：如果要保留某些记录，可以在 where 条件中排除
  // 这里默认删除所有记录
  const MAX_LIMIT = 100
  let totalDeleted = 0

  while (true) {
    const res = await db.collection('Seats').limit(MAX_LIMIT).get()
    if (res.data.length === 0) break

    const _ = db.command
    const ids = res.data.map(item => item._id)
    await db.collection('Seats').where({ _id: _.in(ids) }).remove()
    totalDeleted += ids.length
    console.log(`已删除 ${totalDeleted} 条`)
  }

  return { code: 0, message: `成功删除 ${totalDeleted} 条座位数据` }
}