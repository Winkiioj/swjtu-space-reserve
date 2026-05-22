const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const { success, fail } = require('./response')

exports.main = async (event) => {
  const { userID } = event
  if (!userID) return fail(400, 'userID不能为空')

  try {
    const res = await db.collection('Users')
      .where({ userID })
      .limit(1)
      .get()

    if (res.data.length === 0) return fail(404, '用户不存在')

    const user = res.data[0]
    return success({
      userID: user.userID,
      identity: user.identity,
      userName: user.userName,
      department: user.department,
      phone: user.phone,
      isBlacklisted: user.isBlacklisted
    })
  } catch (err) {
    console.error(err)
    return fail(500, '查询失败', err.message)
  }
}
