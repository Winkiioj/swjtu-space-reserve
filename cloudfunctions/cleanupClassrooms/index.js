const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

exports.main = async () => {
  // 删除所有旧格式 classroomID（不以 x 开头的）
  const result = await db.collection('Classrooms')
    .where({
      classroomID: db.command.not(new RegExp('^x'))
    })
    .get()

  let deleted = 0
  for (let room of result.data) {
    await db.collection('Classrooms').doc(room._id).remove()
    deleted++
  }

  return {
    success: true,
    deleted,
    message: `已删除 ${deleted} 间旧格式教室`
  }
}
