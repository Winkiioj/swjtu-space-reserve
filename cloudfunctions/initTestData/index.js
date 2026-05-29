/**
 * initTestData - 初始化测试数据（一次性工具）
 *
 * 在云函数测试面板中运行，自动：
 * 1. 创建测试用户（如已存在则跳过）
 * 2. 通过 classroomID 查找对应 _id 并创建申请记录
 *
 * 运行方式：微信开发者工具 → 云函数 → initTestData → 测试
 * 或：云开发控制台 → 云函数 → initTestData → 测试
 */

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command

// ===== 测试用户数据 =====
const TEST_USERS = [
  { userID: '2023112593', userName: '王凯', identity: 'student', department: '软件学院', phone: '13800138001' },
  { userID: '2023112588', userName: '李华', identity: 'student', department: '计算机学院', phone: '13800138002' },
  { userID: '2023112577', userName: '张伟', identity: 'student', department: '软件学院', phone: '13800138003' },
  { userID: '2023112566', userName: '陈明', identity: 'student', department: '经济管理学院', phone: '13800138004' },
  { userID: '2023112555', userName: '刘芳', identity: 'student', department: '人文学院', phone: '13800138005' },
  { userID: '2023112544', userName: '赵强', identity: 'student', department: '交通运输学院', phone: '13800138006' },
  { userID: '2023112533', userName: '孙丽', identity: 'student', department: '外国语学院', phone: '13800138007' },
  { userID: '2023112522', userName: '周杰', identity: 'student', department: '建筑学院', phone: '13800138008' },
  { userID: '12345',     userName: '管理员', identity: 'admin',   department: '教务处',     phone: '13900139000' }
]

// ===== 申请测试数据（通过 classroomID 引用教室）=====
const TEST_APPLICATIONS = [
  {
    classroomID: 'x1101',
    proposerID: '2023112593', proposerName: '王凯',
    rentalDetail: '软件3班班会，讨论期末项目分组',
    rentalDescription: '需要多媒体设备播放PPT',
    rentDate: '2026-06-01', rentWeek: 'this', rentDayOfWeek: 0,
    rentLectures: [6, 7, 8],
    expectedAttendeeCount: 42,
    rentalStatus: 0,
    appliedAt: 1717094400000
  },
  {
    classroomID: 'x1203',
    proposerID: '2023112593', proposerName: '王凯',
    rentalDetail: '高数答疑课',
    rentalDescription: '',
    rentDate: '2026-06-03', rentWeek: 'this', rentDayOfWeek: 2,
    rentLectures: [3, 4, 5],
    expectedAttendeeCount: 35,
    rentalStatus: 0,
    appliedAt: 1717152000000
  },
  {
    classroomID: 'x2101',
    proposerID: '2023112588', proposerName: '李华',
    rentalDetail: 'ACM集训队培训',
    rentalDescription: '需使用电脑，需要电源插座充足的教室',
    rentDate: '2026-06-02', rentWeek: 'this', rentDayOfWeek: 1,
    rentLectures: [0, 1, 2],
    expectedAttendeeCount: 60,
    rentalStatus: 0,
    appliedAt: 1717228800000
  },
  {
    classroomID: 'x3101',
    proposerID: '2023112577', proposerName: '张伟',
    rentalDetail: '英语角活动',
    rentalDescription: '需要可移动桌椅',
    rentDate: '2026-06-04', rentWeek: 'this', rentDayOfWeek: 3,
    rentLectures: [6, 7, 8, 9],
    expectedAttendeeCount: 25,
    rentalStatus: 0,
    appliedAt: 1717315200000
  },
  {
    classroomID: 'x4101',
    proposerID: '2023112566', proposerName: '陈明',
    rentalDetail: '职业规划讲座',
    rentalDescription: '邀请校外导师进行职业规划分享',
    rentDate: '2026-06-05', rentWeek: 'this', rentDayOfWeek: 4,
    rentLectures: [10, 11, 12],
    expectedAttendeeCount: 80,
    rentalStatus: 0,
    appliedAt: 1717401600000
  },
  {
    classroomID: 'x5101',
    proposerID: '2023112555', proposerName: '刘芳',
    rentalDetail: '心理委员培训会',
    rentalDescription: '',
    rentDate: '2026-06-10', rentWeek: 'next', rentDayOfWeek: 2,
    rentLectures: [6, 7, 8],
    expectedAttendeeCount: 50,
    rentalStatus: 0,
    appliedAt: 1717488000000
  },
  {
    classroomID: 'x6201',
    proposerID: '2023112544', proposerName: '赵强',
    rentalDetail: '科研小组讨论',
    rentalDescription: '交通大数据项目组会',
    rentDate: '2026-06-09', rentWeek: 'next', rentDayOfWeek: 1,
    rentLectures: [3, 4, 5],
    expectedAttendeeCount: 15,
    rentalStatus: 0,
    appliedAt: 1717574400000
  },
  // 已通过的申请
  {
    classroomID: 'x1102',
    proposerID: '12345', proposerName: '管理员',
    rentalDetail: '已通过的测试申请',
    rentalDescription: '',
    rentDate: '2026-05-25', rentWeek: 'this', rentDayOfWeek: 0,
    rentLectures: [0, 1, 2],
    expectedAttendeeCount: 30,
    rentalStatus: 1,
    appliedAt: 1716835200000,
    approvedAt: 1716921600000
  },
  // 已拒绝的申请
  {
    classroomID: 'x2102',
    proposerID: '2023112533', proposerName: '孙丽',
    rentalDetail: '已拒绝的申请-时间冲突',
    rentalDescription: '',
    rentDate: '2026-06-03', rentWeek: 'this', rentDayOfWeek: 2,
    rentLectures: [0, 1, 2],
    expectedAttendeeCount: 40,
    rentalStatus: 2,
    rejectionReason: '该时段已有课程安排，请选择其他时间或教室',
    appliedAt: 1716825600000
  },
  // 已取消的申请
  {
    classroomID: 'x2203',
    proposerID: '2023112522', proposerName: '周杰',
    rentalDetail: '已取消的测试申请',
    rentalDescription: '',
    rentDate: '2026-06-05', rentWeek: 'this', rentDayOfWeek: 4,
    rentLectures: [0, 1, 2],
    expectedAttendeeCount: 35,
    rentalStatus: 3,
    appliedAt: 1716816000000
  }
]

exports.main = async () => {
  const results = { users: { created: 0, existed: 0 }, applications: { created: 0, skipped: 0 } }

  // ===== 1. 创建测试用户 =====
  for (const u of TEST_USERS) {
    const exist = await db.collection('Users').where({ userID: u.userID }).get()
    if (exist.data.length > 0) {
      results.users.existed++
      continue
    }
    await db.collection('Users').add({
      data: { ...u, isBlacklisted: false, createdAt: Date.now(), updatedAt: Date.now() }
    })
    results.users.created++
  }

  // ===== 2. 创建测试申请 =====
  for (const app of TEST_APPLICATIONS) {
    // 通过 classroomID 查找教室的 _id
    const room = await db.collection('Classrooms')
      .where({ classroomID: app.classroomID })
      .get()

    if (room.data.length === 0) {
      results.applications.skipped++
      console.warn(`跳过：教室 ${app.classroomID} 不存在，请先导入教室数据`)
      continue
    }

    const now = Date.now()
    const record = {
      classroomApplied: room.data[0]._id,
      proposerID: app.proposerID,
      proposerName: app.proposerName,
      rentalDetail: app.rentalDetail,
      rentalDescription: app.rentalDescription || '',
      rentDate: app.rentDate,
      rentWeek: app.rentWeek,
      rentDayOfWeek: app.rentDayOfWeek,
      rentLectures: app.rentLectures,
      expectedAttendeeCount: app.expectedAttendeeCount,
      actualAttendeeCount: null,
      rentalStatus: app.rentalStatus,
      rejectionReason: app.rejectionReason || '',
      appliedAt: app.appliedAt || now,
      approvedAt: app.approvedAt || null,
      completedAt: null,
      updatedAt: now
    }

    await db.collection('Applications').add({ data: record })
    results.applications.created++
  }

  return {
    code: 0,
    message: '测试数据初始化完成',
    data: results
  }
}
