/**
 * dataStats — 数据概况查询
 *
 * 一键查看各集合数据概况：记录数、申请状态分布、用户/教室统计等。
 * 省去手动去数据库控制台逐表翻看的步骤。
 *
 * === 调用参数 ===
 * 无参数（直接运行即可）
 * 可选 detail: true 返回更详细信息
 *
 * === 返回示例 ===
 * {
 *   code: 0,
 *   data: {
 *     Applications: { total: 25, pending: 10, approved: 5, rejected: 3, cancelled: 2, completed: 5 },
 *     Users: { total: 15, student: 12, teacher: 1, admin: 2, blacklisted: 0 },
 *     Classrooms: { total: 48 },
 *     Courses: { total: 0 },
 *     Seats: { total: 600, occupied: 0 },
 *     lectures: { total: 0 }
 *   }
 * }
 *
 * === 运行方式 ===
 * 微信开发者工具 → 云函数 → dataStats → 测试（不填参数直接运行）
 */

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command

// 获取集合中的文档总数
async function getCount(collection) {
  try {
    const res = await db.collection(collection).count()
    return res.total
  } catch (e) {
    return -1  // -1 表示集合不存在或无权访问
  }
}

// 获取某个条件下的文档数
async function getCountByCondition(collection, condition) {
  try {
    const res = await db.collection(collection).where(condition).count()
    return res.total
  } catch (e) {
    return -1
  }
}

exports.main = async (event) => {
  const { detail = false } = event || {}

  try {
    // ===== 并行查询所有统计 =====
    const [
      appsTotal,
      appsPending, appsApproved, appsRejected, appsCancelled, appsCompleted,
      usersTotal,
      usersStudent, usersTeacher, usersAdmin, usersBlacklisted,
      classroomsTotal,
      coursesTotal,
      seatsTotal, seatsOccupied,
      lecturesTotal
    ] = await Promise.all([
      // Applications
      getCount('Applications'),
      getCountByCondition('Applications', { rentalStatus: 0 }),
      getCountByCondition('Applications', { rentalStatus: 1 }),
      getCountByCondition('Applications', { rentalStatus: 2 }),
      getCountByCondition('Applications', { rentalStatus: 3 }),
      getCountByCondition('Applications', { rentalStatus: 4 }),
      // Users
      getCount('Users'),
      getCountByCondition('Users', { identity: 'student' }),
      getCountByCondition('Users', { identity: 'teacher' }),
      getCountByCondition('Users', { identity: 'admin' }),
      getCountByCondition('Users', { isBlacklisted: true }),
      // Others
      getCount('Classrooms'),
      getCount('Courses'),
      getCount('Seats'),
      getCountByCondition('Seats', { status: 'occupied' }),
      getCount('Lectures')
    ])

    const stats = {
      Applications: {
        total: appsTotal,
        pending: appsPending,
        approved: appsApproved,
        rejected: appsRejected,
        cancelled: appsCancelled,
        completed: appsCompleted
      },
      Users: {
        total: usersTotal,
        student: usersStudent,
        teacher: usersTeacher,
        admin: usersAdmin,
        blacklisted: usersBlacklisted
      },
      Classrooms: { total: classroomsTotal },
      Courses: { total: coursesTotal },
      Seats: { total: seatsTotal, occupied: seatsOccupied },
      Lectures: { total: lecturesTotal }
    }

    // 详细模式：附加更多信息
    let detailInfo = null
    if (detail) {
      // 今天申请数
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
      const todayApps = await getCountByCondition('Applications', { rentDate: todayStr })

      // 教室按楼栋分布
      const buildings = ['一号教学楼','二号教学楼','三号教学楼','四号教学楼','五号教学楼','六号教学楼','七号教学楼','八号教学楼']
      const buildingCounts = {}
      for (const b of buildings) {
        buildingCounts[b] = await getCountByCondition('Classrooms', { buildingBelong: b })
      }

      detailInfo = {
        todayDate: todayStr,
        todayApplications: todayApps,
        classroomByBuilding: buildingCounts
      }
    }

    return {
      code: 0,
      message: '查询完成',
      data: { ...stats, detail: detailInfo }
    }

  } catch (error) {
    console.error('dataStats 错误:', error)
    return { code: 500, message: '查询失败', error: error.message }
  }
}
