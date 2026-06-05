/**
 * clearTestData — 清理测试数据
 *
 * 用于快速清理 Applications 表中的测试/旧数据，
 * 支持多种清理模式，避免手动去数据库控制台逐条删除。
 *
 * === 调用参数 ===
 * @param {string}  mode      清理模式（必填）
 *   - 'old'      清理旧版测试申请（proposerID 为纯数字学号，如 "2023112593"）
 *   - 'all'      清空全部申请（需 confirm: true 二次确认）
 *   - 'byStatus' 按状态清理，需配合 status 参数
 *   - 'stale'    清理过期申请（rentDate 早于今天，状态为待审核/已批准但未完成）
 * @param {boolean} preview  仅预览（默认 false），设为 true 只返回匹配记录数，不执行删除
 * @param {number}  status   当 mode='byStatus' 时指定状态：0=待审核 1=已通过 2=已拒绝 3=已取消 4=已完成
 * @param {boolean} confirm  当 mode='all' 时必须传 true，防止误删
 *
 * === 返回示例 ===
 * { code: 0, message: '已删除 15 条旧版申请', data: { deleted: 15, preview: false } }
 *
 * === 运行方式 ===
 * 微信开发者工具 → 云函数 → clearTestData → 测试
 * 或：云开发控制台 → 云函数 → clearTestData → 测试
 */

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const MAX_BATCH = 100

// ===== 工具函数：分批删除 =====
async function batchDelete(collection, whereCondition, label) {
  let total = 0
  while (true) {
    const res = await db.collection(collection)
      .where(whereCondition)
      .limit(MAX_BATCH)
      .get()
    if (res.data.length === 0) break

    const ids = res.data.map(d => d._id)
    await db.collection(collection).where({ _id: _.in(ids) }).remove()
    total += ids.length
    console.log(`[clearTestData] ${label}: 已删除 ${total} 条`)
  }
  return total
}

// ===== 工具函数：仅计数 =====
async function countDocs(collection, whereCondition) {
  const res = await db.collection(collection)
    .where(whereCondition)
    .count()
  return res.total
}

exports.main = async (event) => {
  const { mode, preview = false, status, confirm = false } = event

  try {
    // ===== 参数校验 =====
    const validModes = ['old', 'all', 'byStatus', 'stale']
    if (!mode || !validModes.includes(mode)) {
      return {
        code: 400,
        message: `请指定有效的 mode 参数：${validModes.join(' | ')}`,
        data: null
      }
    }

    if (mode === 'all' && !confirm) {
      // 预览模式允许不确认
      if (!preview) {
        return {
          code: 400,
          message: 'mode=all 将清空全部申请记录，请传 confirm: true 二次确认',
          data: null
        }
      }
    }

    if (mode === 'byStatus' && (status === undefined || status < 0 || status > 4)) {
      return {
        code: 400,
        message: 'mode=byStatus 需指定有效 status: 0=待审核 1=已通过 2=已拒绝 3=已取消 4=已完成',
        data: null
      }
    }

    // ===== 构建查询条件 =====
    let whereCondition = {}
    let label = ''

    switch (mode) {
      case 'old':
        // 旧版测试申请：proposerID 为纯数字学号（新版的 openid 包含下划线）
        // 用已知旧版学号列表精确匹配
        const OLD_STUDENT_IDS = [
          '2023112593','2023112588','2023112577','2023112566','2023112555',
          '2023112544','2023112533','2023112522','2023112419','2023112425','12345'
        ]
        whereCondition = {
          proposerID: _.in(OLD_STUDENT_IDS)
        }
        label = '旧版申请(学号)'
        break

      case 'all':
        whereCondition = {}
        label = '全部申请'
        break

      case 'byStatus':
        whereCondition = { rentalStatus: status }
        const statusNames = ['待审核', '已通过', '已拒绝', '已取消', '已完成']
        label = `${statusNames[status]} 申请`
        break

      case 'stale':
        // 过期申请 = 日期已过且状态仍处于待审核(0)或已通过(1)
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
        whereCondition = {
          rentDate: _.lt(todayStr),
          rentalStatus: _.in([0, 1])
        }
        label = `过期申请(早于${todayStr}, 待审核/已批准)`
        break
    }

    // ===== 预览模式 =====
    if (preview) {
      const count = await countDocs('Applications', whereCondition)
      return {
        code: 0,
        message: `[预览] ${label} 共 ${count} 条，不会实际删除`,
        data: { count, preview: true, mode, whereCondition_summary: label }
      }
    }

    // ===== 执行删除 =====
    const deleted = await batchDelete('Applications', whereCondition, label)

    return {
      code: 0,
      message: `已删除 ${deleted} 条${label}`,
      data: { deleted, preview: false, mode }
    }

  } catch (error) {
    console.error('clearTestData 错误:', error)
    return {
      code: 500,
      message: '清理失败',
      error: error.message
    }
  }
}
