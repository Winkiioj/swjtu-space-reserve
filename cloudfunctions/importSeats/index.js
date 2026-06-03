const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const { success, fail } = require('./response')
const { requireAdmin } = require('./auth')
const { logAudit } = require('./audit')
const { createEmptyMatrix } = require('./constants')

exports.main = async (event) => {
  const { seats, currentUserID } = event
  if (!currentUserID) return fail(400, '未提供用户标识')

  try {
    await requireAdmin(db, currentUserID)
  } catch (err) {
    return err
  }

  if (!seats || !Array.isArray(seats) || seats.length === 0) {
    return fail(400, '座位数据不能为空')
  }

  // 幂等性：检查已存在的座位
  const existingIds = seats.map(s => s.seatID)
  const existRes = await db.collection('Seats')
    .where({ seatID: db.command.in(existingIds) })
    .get()
  const existingSet = new Set(existRes.data.map(s => s.seatID))

  let added = 0
  let skipped = 0

  for (let seat of seats) {
    if (existingSet.has(seat.seatID)) {
      skipped++
      continue
    }
    try {
      const emptyDay = createEmptyMatrix()
      await db.collection('Seats').add({
        data: {
          areaBelong: seat.areaBelong,
          seatID: seat.seatID,
          seatType: seat.seatType || 'standard',
          thisDayStatusMatrix: emptyDay,
          nextDayStatusMatrix: createEmptyMatrix(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      })
      added++
    } catch (e) {
      console.error('导入座位失败:', seat.seatID, e.message)
    }
  }

  logAudit(db, {
    action: 'import_seats',
    targetType: 'seat',
    targetId: `batch_${Date.now()}`,
    adminId: currentUserID,
    details: { added, skipped, total: seats.length }
  })

  return success({ added, skipped, total: seats.length })
}
