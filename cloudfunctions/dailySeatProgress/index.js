// cloudfunctions/dailySeatProgress/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const seats = await db.collection('Seats').get()
  for (let seat of seats.data) {
    await db.collection('Seats').doc(seat._id).update({
      data: {
        thisDayStatusMatrix: seat.nextDayStatusMatrix,
        nextDayStatusMatrix: [0,0,0,0,0,0,0,0,0,0,0,0,0],
        updatedAt: Date.now()
      }
    })
  }
  return { code: 0, message: '座位日推进完成' }
}