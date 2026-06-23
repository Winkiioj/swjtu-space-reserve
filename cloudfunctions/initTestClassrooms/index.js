/**
 * initTestClassrooms - 初始化测试教室（2026-06-12 新增）
 *
 * 创建 20 间测试教室，覆盖全部 8 种教室类型、多种设施组合、
 * 多个楼栋和楼层，用于测试新增的精确筛选功能。
 *
 * 特点：
 *   - 按 classroomID 幂等：已存在的教室自动跳过
 *   - 覆盖 roomType（8种）、facilities（8种）、floor（1-6）、building（8栋）
 *
 * 使用方式：
 *   - 普通导入：wx.cloud.callFunction({ name: 'initTestClassrooms' })
 *   - 清空后重导（含教室+申请+通知）：wx.cloud.callFunction({ name: 'initTestClassrooms', data: { clean: true } })
 *   - 注意：clean=true 会同时清空 Applications 和 Notifications，避免旧 _id 悬空引用
 *   - 清空后可重新运行 initTestData 重建申请记录
 */

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

// ===== 20 间测试教室，覆盖全维度 =====
const TEST_CLASSROOMS = [
  // ─── 一号教学楼 ───
  { buildingBelong: '一号教学楼', classroomID: 'x1101', containNumber: 60,  roomType: '多媒体教室', facilities: ['投影仪', '音响/话筒', '空调', '教学电脑'], floor: 1, description: '标准多媒体教室，配备投影仪和音响' },
  { buildingBelong: '一号教学楼', classroomID: 'x1205', containNumber: 120, roomType: '阶梯教室',   facilities: ['投影仪', '音响/话筒', '空调', '录播系统'],        floor: 2, description: '大型阶梯教室，配备录播系统' },
  { buildingBelong: '一号教学楼', classroomID: 'x1337', containNumber: 30,  roomType: '研讨室',     facilities: ['空调', '智慧白板', '高速WiFi'],                     floor: 3, description: '小型研讨室，可移动圆桌' },

  // ─── 二号教学楼 ───
  { buildingBelong: '二号教学楼', classroomID: 'x2101', containNumber: 50,  roomType: '普通教室',   facilities: ['空调'],                                              floor: 1, description: '标准普通教室' },
  { buildingBelong: '二号教学楼', classroomID: 'x2203', containNumber: 50,  roomType: '机房',       facilities: ['教学电脑', '空调', '投影仪', '高速WiFi'],             floor: 2, description: '计算机机房，每人一台电脑' },
  { buildingBelong: '二号教学楼', classroomID: 'x2310', containNumber: 80,  roomType: '智慧教室',   facilities: ['智慧白板', '录播系统', '音响/话筒', '空调', '高速WiFi'], floor: 3, description: '智慧教室，支持互动教学和远程授课' },

  // ─── 三号教学楼 ───
  { buildingBelong: '三号教学楼', classroomID: 'x3101', containNumber: 150, roomType: '报告厅',     facilities: ['投影仪', '音响/话筒', '空调', '录播系统'],           floor: 1, description: '大型报告厅，可容纳150人' },
  { buildingBelong: '三号教学楼', classroomID: 'x3202', containNumber: 40,  roomType: '研讨室',     facilities: ['空调', '高速WiFi'],                                  floor: 2, description: '小型研讨室，适合小组讨论' },
  { buildingBelong: '三号教学楼', classroomID: 'x3308', containNumber: 90,  roomType: '多媒体教室', facilities: ['投影仪', '音响/话筒', '空调'],                          floor: 3, description: '多媒体教室，适合中型班级授课' },

  // ─── 四号教学楼 ───
  { buildingBelong: '四号教学楼', classroomID: 'x4101', containNumber: 60,  roomType: '实验室',     facilities: ['实验设备', '空调', '教学电脑'],                       floor: 1, description: '物理实验室，配备全套实验台' },
  { buildingBelong: '四号教学楼', classroomID: 'x4203', containNumber: 60,  roomType: '实验室',     facilities: ['实验设备', '空调', '投影仪'],                         floor: 2, description: '化学实验室' },
  { buildingBelong: '四号教学楼', classroomID: 'x4315', containNumber: 100, roomType: '阶梯教室',   facilities: ['投影仪', '音响/话筒', '空调', '录播系统'],           floor: 3, description: '阶梯教室，适合公开课和讲座' },

  // ─── 五号教学楼 ───
  { buildingBelong: '五号教学楼', classroomID: 'x5101', containNumber: 50,  roomType: '普通教室',   facilities: ['空调', '投影仪'],                                    floor: 1, description: '带投影仪的普通教室' },
  { buildingBelong: '五号教学楼', classroomID: 'x5204', containNumber: 50,  roomType: '机房',       facilities: ['教学电脑', '空调', '投影仪', '智慧白板'],             floor: 2, description: '新机房，配备智慧白板和教学电脑' },
  { buildingBelong: '五号教学楼', classroomID: 'x5306', containNumber: 40,  roomType: '智慧教室',   facilities: ['智慧白板', '录播系统', '空调', '高速WiFi', '音响/话筒'], floor: 3, description: '智慧教室，全设备覆盖' },

  // ─── 六号教学楼 ───
  { buildingBelong: '六号教学楼', classroomID: 'x6101', containNumber: 200, roomType: '报告厅',     facilities: ['投影仪', '音响/话筒', '空调', '录播系统', '高速WiFi'], floor: 1, description: '大型学术报告厅' },
  { buildingBelong: '六号教学楼', classroomID: 'x6205', containNumber: 80,  roomType: '多媒体教室', facilities: ['投影仪', '音响/话筒', '空调', '教学电脑', '高速WiFi'],    floor: 2, description: '多媒体教室，设备齐全' },

  // ─── 七号教学楼 ───
  { buildingBelong: '七号教学楼', classroomID: 'x7101', containNumber: 100, roomType: '阶梯教室',   facilities: ['投影仪', '音响/话筒', '空调'],                       floor: 1, description: '阶梯教室，固定排椅' },
  { buildingBelong: '七号教学楼', classroomID: 'x7208', containNumber: 20,  roomType: '研讨室',     facilities: ['空调', '高速WiFi', '智慧白板'],                      floor: 2, description: '小型研讨室，适合10-20人小组' },

  // ─── 八号教学楼 ───
  { buildingBelong: '八号教学楼', classroomID: 'x8101', containNumber: 70,  roomType: '智慧教室',   facilities: ['智慧白板', '录播系统', '音响/话筒', '空调', '高速WiFi', '教学电脑'], floor: 1, description: '旗舰智慧教室，全设备覆盖' },
]

exports.main = async (event) => {
  const { clean } = event || {}

  // 可选：清空所有教室 + 关联申请 + 通知（避免旧 _id 悬空引用）
  if (clean) {
    const collections = ['Classrooms', 'Applications', 'Notifications']
    const stats = {}
    const errors = []
    for (const name of collections) {
      try {
        let totalDeleted = 0
        // 分页读取 + 批量删除，突破 .get() 的 20 条限制
        while (true) {
          const res = await db.collection(name).limit(100).get()
          if (res.data.length === 0) break
          const ids = res.data.map(d => d._id)
          await db.collection(name).where({ _id: db.command.in(ids) }).remove()
          totalDeleted += ids.length
          console.log(`已清空 ${name}: ${totalDeleted} 条（本批 ${ids.length}）`)
        }
        stats[name] = totalDeleted
      } catch (e) {
        console.error(`清空 ${name} 失败:`, e.message)
        errors.push(`${name}: ${e.message}`)
        stats[name] = -1
      }
    }
    if (errors.length > 0) {
      return {
        code: 500,
        message: `清空部分失败: ${errors.join('; ')}`,
        data: { cleaned: stats }
      }
    }
    return {
      code: 0,
      message: `已清空，请重新单独调用本函数导入教室，再调用 initTestData 重建申请`,
      data: { cleaned: stats }
    }
  }

  // 幂等检查：已存在的 classroomID 跳过
  const existingIds = TEST_CLASSROOMS.map(r => r.classroomID)
  const existRes = await db.collection('Classrooms')
    .where({ classroomID: db.command.in(existingIds) })
    .get()
  const existingSet = new Set(existRes.data.map(r => r.classroomID))

  let added = 0
  let skipped = 0

  for (const room of TEST_CLASSROOMS) {
    if (existingSet.has(room.classroomID)) {
      skipped++
      continue
    }

    try {
      await db.collection('Classrooms').add({
        data: {
          buildingBelong: room.buildingBelong,
          classroomID: room.classroomID,
          containNumber: room.containNumber,
          roomType: room.roomType,
          facilities: room.facilities,
          floor: room.floor,
          description: room.description,
          thisWeekStatusMatrix: Array(5).fill().map(() => Array(13).fill(0)),
          nextWeekStatusMatrix: Array(5).fill().map(() => Array(13).fill(0)),
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      })
      added++
    } catch (e) {
      console.error('导入教室失败:', room.classroomID, e.message)
    }
  }

  // 统计汇总
  const stats = {}
  for (const room of TEST_CLASSROOMS) {
    stats[room.roomType] = (stats[room.roomType] || 0) + 1
  }

  return {
    code: 0,
    message: `测试教室导入完成`,
    data: {
      added,
      skipped,
      total: TEST_CLASSROOMS.length,
      byType: stats
    }
  }
}
