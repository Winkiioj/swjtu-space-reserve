/**
 * resetDay — 模拟"新的一天开始"
 *
 * 日常测试循环中的快捷重置工具，将今日未处理的申请完结、清理占座等。
 * 所有操作支持 preview 模式先预览再执行。
 *
 * === 调用参数 ===
 * @param {boolean} preview      仅预览（默认 false）
 * @param {string}  date         指定日期，格式 YYYY-MM-DD（默认今天）
 * @param {object}  options      细粒度控制
 *   - cancelPending: bool   将待审核申请标记为已取消（默认 true）
 *   - completeApproved: bool 将已批准但未完成的标记为已完成（默认 true）
 *   - clearSeats: bool      清空座位占用（默认 false，需手动确认座位模块需要）
 *   - deleteOldApps: bool   彻底删除 30 天前的已取消/已拒绝/已完成申请（默认 false）
 *
 * === 返回示例 ===
 * {
 *   code: 0,
 *   message: "日结完成",
 *   data: { cancelled: 3, completed: 2, seatsCleared: 0, oldDeleted: 0 }
 * }
 *
 * === 运行方式 ===
 * 微信开发者工具 → 云函数 → resetDay → 测试
 * 先传 { preview: true } 看看会波及多少记录，再正式执行
 */

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const MAX_BATCH = 100

// 批量更新：查找符合条件 → 逐批 update
async function batchUpdate(collection, whereCondition, updateData, label) {
  let count = 0
  while (true) {
    const res = await db.collection(collection)
      .where(whereCondition)
      .limit(MAX_BATCH)
      .get()
    if (res.data.length === 0) break

    const ids = res.data.map(d => d._id)
    await db.collection(collection)
      .where({ _id: _.in(ids) })
      .update({ data: updateData })
    count += ids.length
    console.log(`[resetDay] ${label}: 已处理 ${count} 条`)
  }
  return count
}

// 批量删除
async function batchDelete(collection, whereCondition, label) {
  let count = 0
  while (true) {
    const res = await db.collection(collection)
      .where(whereCondition)
      .limit(MAX_BATCH)
      .get()
    if (res.data.length === 0) break

    const ids = res.data.map(d => d._id)
    await db.collection(collection)
      .where({ _id: _.in(ids) })
      .remove()
    count += ids.length
    console.log(`[resetDay] ${label}: 已删除 ${count} 条`)
  }
  return count
}

// 计数
async function countDocs(collection, whereCondition) {
  const res = await db.collection(collection).where(whereCondition).count()
  return res.total
}

exports.main = async (event) => {
  const {
    preview = false,
    date,
    options = {}
  } = event || {}

  const {
    cancelPending = true,
    completeApproved = true,
    clearSeats = false,
    deleteOldApps = false
  } = options

  try {
    // ===== 确定目标日期 =====
    let targetDate
    if (date) {
      targetDate = date
    } else {
      const now = new Date()
      targetDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
    }

    // ===== 30天前的日期 =====
    const oldThreshold = new Date()
    oldThreshold.setDate(oldThreshold.getDate() - 30)
    const oldThresholdStr = `${oldThreshold.getFullYear()}-${String(oldThreshold.getMonth()+1).padStart(2,'0')}-${String(oldThreshold.getDate()).padStart(2,'0')}`

    const now = Date.now()
    const previewResults = {
      date: targetDate,
      pendingAppCount: 0,
      approvedAppCount: 0,
      occupiedSeatsCount: 0,
      oldAppCount: 0
    }

    // ===== 1. 待审核 → 已取消 =====
    const pendingWhere = { rentDate: targetDate, rentalStatus: 0 }
    previewResults.pendingAppCount = await countDocs('Applications', pendingWhere)

    // ===== 2. 已批准 → 已完成 =====
    const approvedWhere = { rentDate: targetDate, rentalStatus: 1 }
    previewResults.approvedAppCount = await countDocs('Applications', approvedWhere)

    // ===== 3. 座位占用 =====
    if (clearSeats) {
      previewResults.occupiedSeatsCount = await countDocs('Seats', { status: 'occupied' })
    }

    // ===== 4. 旧数据 =====
    if (deleteOldApps) {
      previewResults.oldAppCount = await countDocs('Applications', {
        rentDate: _.lt(oldThresholdStr),
        rentalStatus: _.in([2, 3, 4])
      })
    }

    // ===== 预览模式 =====
    if (preview) {
      const lines = []
      if (cancelPending) lines.push(`待审核→已取消: ${previewResults.pendingAppCount} 条`)
      if (completeApproved) lines.push(`已批准→已完成: ${previewResults.approvedAppCount} 条`)
      if (clearSeats) lines.push(`清空座位: ${previewResults.occupiedSeatsCount} 条`)
      if (deleteOldApps) lines.push(`删除旧申请(>30天): ${previewResults.oldAppCount} 条`)

      return {
        code: 0,
        message: `[预览] ${targetDate} 预计影响: ${lines.join(' | ')}`,
        data: { ...previewResults, preview: true }
      }
    }

    // ===== 执行 =====
    let cancelled = 0, completed = 0, seatsCleared = 0, oldDeleted = 0

    // 1. 待审核 → 已取消
    if (cancelPending) {
      cancelled = await batchUpdate('Applications', pendingWhere, {
        rentalStatus: 3,
        updatedAt: now
      }, '待审核→已取消')
    }

    // 2. 已批准 → 已完成
    if (completeApproved) {
      completed = await batchUpdate('Applications', approvedWhere, {
        rentalStatus: 4,
        completedAt: now,
        updatedAt: now
      }, '已批准→已完成')
    }

    // 3. 清空座位
    if (clearSeats) {
      seatsCleared = await batchUpdate('Seats',
        { status: 'occupied' },
        { status: 'free', occupantID: '', occupiedAt: null, updatedAt: now },
        '清空座位'
      )
    }

    // 4. 删除旧申请
    if (deleteOldApps) {
      oldDeleted = await batchDelete('Applications', {
        rentDate: _.lt(oldThresholdStr),
        rentalStatus: _.in([2, 3, 4])
      }, '删除旧申请')
    }

    const summary = {
      date: targetDate,
      cancelled,
      completed,
      seatsCleared,
      oldDeleted
    }

    return {
      code: 0,
      message: `日结完成: ${cancelled} 取消 + ${completed} 完成 + ${seatsCleared} 座位清空 + ${oldDeleted} 旧数据删除`,
      data: summary
    }

  } catch (error) {
    console.error('resetDay 错误:', error)
    return { code: 500, message: '日结失败', error: error.message }
  }
}
