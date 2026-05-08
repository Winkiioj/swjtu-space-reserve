// cloudfunctions/occupySeat/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { seatId, dayType, lectures } = event
  const matrixField = dayType === 'this' ? 'thisDayStatusMatrix' : 'nextDayStatusMatrix'
  try {
    const transaction = await db.startTransaction()
    const seatRes = await transaction.collection('Seats').doc(seatId).get()
    const seat = seatRes.data
    const currentMatrix = seat[matrixField]
    for (let lec of lectures) {
      if (currentMatrix[lec] !== 0) {
        await transaction.rollback()
        return { code: 409, message: `座位已被占用（讲次 ${lec+1}）` }
      }
    }
    const newMatrix = [...currentMatrix]
    for (let lec of lectures) {
      newMatrix[lec] = 1
    }
    await transaction.collection('Seats').doc(seatId).update({
      data: {
        [matrixField]: newMatrix,
        updatedAt: Date.now()
      }
    })
    await transaction.commit()
    return { code: 0, message: '预约成功' }
  } catch (err) {
    console.error(err)
    return { code: 500, message: '预约失败，请重试' }
  }
}