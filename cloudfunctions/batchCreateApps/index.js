/**
 * batchCreateApps — 批量创建测试申请
 *
 * 快速构造多用户、多状态、多教室的申请记录，方便测试不同场景。
 * 支持两种模式：templates 精确控制 / quick 快捷生成。
 *
 * === 调用参数 ===
 *
 * 方式一：模板批量创建
 * {
 *   templates: [
 *     {
 *       classroomID: "x1101",        // 教室号
 *       proposerID: "dev_openid_xxx", // 申请人 openid
 *       proposerName: "王凯",         // 申请人姓名
 *       rentalDetail: "班会",         // 事由
 *       rentDate: "2026-06-10",      // 日期
 *       rentWeek: "this",            // this/next
 *       rentDayOfWeek: 1,            // 0=周一 4=周五
 *       rentLectures: [3,4,5],       // 讲次
 *       expectedAttendeeCount: 30,   // 人数
 *       rentalStatus: 0,            // 0待审核 1已通过 2已拒绝
 *       rejectionReason: ""          // 拒绝原因（status=2 时使用）
 *     }
 *   ]
 * }
 *
 * 方式二：快捷生成
 * {
 *   quick: {
 *     count: 10,                     // 生成条数
 *     proposerID: "dev_openid_2023112593", // 申请人
 *     proposerName: "王凯",
 *     statuses: [0,0,0,0,1,1,2],     // 按此分布随机分配状态
 *     classrooms: ["x1101","x1203","x2101"], // 候选教室池（可选，不传则自动查）
 *     dateRange: { start: "2026-06-01", end: "2026-06-14" }  // 日期范围（可选）
 *   }
 * }
 *
 * === 返回示例 ===
 * { code: 0, message: "批量创建完成: 15/15 成功", data: { created: 15, skipped: 0, ids: [...] } }
 */

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

// 教室缓存
const classroomCache = {}
async function getClassroom(classroomID) {
  if (classroomCache[classroomID]) return classroomCache[classroomID]
  const res = await db.collection('Classrooms').where({ classroomID }).get()
  if (res.data.length > 0) {
    classroomCache[classroomID] = res.data[0]
    return res.data[0]
  }
  return null
}

// 随机整数 [min, max]
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 获取某天零点时间戳
function dateToTimestamp(dateStr) {
  return new Date(dateStr + 'T00:00:00+08:00').getTime()
}

// 周几映射
const DAY_NAMES = ['周一','周二','周三','周四','周五']

// 格式化日期
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

exports.main = async (event) => {
  const { templates, quick } = event || {}
  let appsToCreate = []

  try {
    // ===== 方式一：模板批量 =====
    if (templates && Array.isArray(templates)) {
      if (templates.length === 0) {
        return { code: 400, message: 'templates 数组不能为空', data: null }
      }
      if (templates.length > 50) {
        return { code: 400, message: '单次最多 50 条', data: null }
      }
      appsToCreate = templates
    }

    // ===== 方式二：快捷生成 =====
    else if (quick) {
      const {
        count = 10,
        proposerID,
        proposerName = '测试用户',
        statuses = [0],
        classrooms: candidateClassrooms = null,
        dateRange
      } = quick

      if (!proposerID) {
        return { code: 400, message: 'quick 模式需指定 proposerID', data: null }
      }
      if (count < 1 || count > 50) {
        return { code: 400, message: 'count 范围 1-50', data: null }
      }

      // 获取候选教室
      let classrooms = candidateClassrooms
      if (!classrooms || classrooms.length === 0) {
        const res = await db.collection('Classrooms').limit(100).get()
        classrooms = res.data.map(r => r.classroomID).filter(Boolean)
        if (classrooms.length === 0) {
          return { code: 400, message: '数据库无教室记录，请先导入教室', data: null }
        }
      }

      // 日期范围
      let startDate, endDate
      if (dateRange) {
        startDate = new Date(dateRange.start + 'T00:00:00+08:00')
        endDate = new Date(dateRange.end + 'T00:00:00+08:00')
      } else {
        // 默认：未来两周
        const now = new Date()
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 13)
      }

      const dateDiff = Math.floor((endDate - startDate) / 86400000)
      const statusNames = ['待审核','已通过','已拒绝']

      for (let i = 0; i < count; i++) {
        const status = statuses[randInt(0, statuses.length - 1)]
        const classroomID = classrooms[randInt(0, classrooms.length - 1)]
        const randomDay = randInt(0, dateDiff)
        const d = new Date(startDate)
        d.setDate(d.getDate() + randomDay)
        const dayOfWeek = d.getDay() === 0 ? 0 : (d.getDay() <= 5 ? d.getDay() - 1 : randInt(0, 4))

        // 随机讲次 (2-3连)
        const startLec = randInt(0, 10)
        const lecCount = randInt(2, 3)
        const lectures = []
        for (let j = 0; j < lecCount && startLec + j <= 12; j++) {
          lectures.push(startLec + j)
        }

        appsToCreate.push({
          classroomID,
          proposerID,
          proposerName,
          rentalDetail: `[快捷生成] ${statusNames[Math.min(status,2)]}测试 ${DAY_NAMES[dayOfWeek]} ${fmtDate(d)}`,
          rentalDescription: `自动生成 #${i+1}`,
          rentDate: fmtDate(d),
          rentWeek: 'this',
          rentDayOfWeek: dayOfWeek,
          rentLectures: lectures,
          expectedAttendeeCount: randInt(10, 80),
          rentalStatus: status,
          rejectionReason: status === 2 ? '自动生成测试-模拟被拒绝' : ''
        })
      }
    }

    else {
      return {
        code: 400,
        message: '请指定 templates（模板数组）或 quick（快捷生成参数）',
        data: null
      }
    }

    // ===== 执行创建 =====
    let created = 0, skipped = 0
    const createdIds = []

    for (const app of appsToCreate) {
      const classroom = await getClassroom(app.classroomID)
      if (!classroom) {
        console.warn(`跳过：教室 ${app.classroomID} 不存在`)
        skipped++
        continue
      }

      const now = Date.now()
      const record = {
        classroomApplied: classroom._id,
        classroomName: classroom.classroomID,
        classroomBuilding: classroom.buildingBelong,
        proposerID: app.proposerID,
        proposerName: app.proposerName || '未知',
        rentalDetail: app.rentalDetail || '测试申请',
        rentalDescription: app.rentalDescription || '',
        rentDate: app.rentDate || fmtDate(new Date()),
        rentWeek: app.rentWeek || 'this',
        rentDayOfWeek: app.rentDayOfWeek !== undefined ? app.rentDayOfWeek : 0,
        rentLectures: app.rentLectures || [3,4,5],
        expectedAttendeeCount: app.expectedAttendeeCount || 30,
        actualAttendeeCount: null,
        rentalStatus: app.rentalStatus !== undefined ? app.rentalStatus : 0,
        rejectionReason: app.rejectionReason || '',
        appliedAt: app.appliedAt || now,
        approvedAt: app.rentalStatus === 1 ? now : (app.approvedAt || null),
        completedAt: app.rentalStatus === 4 ? now : null,
        updatedAt: now
      }

      const res = await db.collection('Applications').add({ data: record })
      createdIds.push(res._id)
      created++
    }

    return {
      code: 0,
      message: `批量创建完成: ${created}/${appsToCreate.length} 成功` + (skipped > 0 ? `, ${skipped} 跳过` : ''),
      data: { created, skipped, total: appsToCreate.length, ids: createdIds }
    }

  } catch (error) {
    console.error('batchCreateApps 错误:', error)
    return { code: 500, message: '批量创建失败', error: error.message }
  }
}
