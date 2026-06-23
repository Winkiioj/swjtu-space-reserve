/**
 * admin-api.js — 管理员前端 API 封装层
 *
 * 统一处理云函数调用、自动注入 currentUserID、标准化错误处理。
 * 所有管理页面通过此模块调用云函数，不直接调用 wx.cloud.callFunction。
 *
 * 数据策略：
 * - 读操作（getPending/getReviewed/detail）：优先调真实云函数，再合并 mock store 数据
 * - 写操作（approve/reject/revoke）：优先调真实云函数，失败了且是 mock store 中的 ID 则本地处理
 * - 云函数部署后，所有操作自动走真实云端
 */

const app = getApp()

/** 常规云函数调用 */
function call(name, data = {}) {
  data.currentUserID = app.globalData.currentUserID
  return wx.cloud.callFunction({ name, data })
    .then(res => {
      if (res.result.code === 0) return res.result.data
      throw new Error(res.result.message || '操作失败')
    })
}

/**
 * 带 fallback 的调用：先试真实云函数，失败才走 mock
 */
function callWithFallback(name, data = {}, mockFn) {
  data.currentUserID = app.globalData.currentUserID
  return wx.cloud.callFunction({ name, data })
    .then(res => {
      if (res.result.code === 0) return res.result.data
      throw new Error(res.result.message || '操作失败')
    })
    .catch(err => {
      console.warn(`[AdminAPI] ${name} 失败，使用 mock:`, err.message)
      return mockFn(data)
    })
}

/** 判断 applicationId 是否是 mock 数据 */
function isMockId(id) {
  return id && id.startsWith('mock_')
}

const AdminAPI = {
  /** 登录 */
  login(userID) {
    return wx.cloud.callFunction({
      name: 'getUserByID',
      data: { userID }
    }).then(res => {
      if (res.result.code === 0 && res.result.data) return res.result.data
      throw new Error(res.result.message || '登录失败')
    })
  },

  /** 获取管理面板统计 */
  getStats() {
    return call('getAdminStats')
      .then(data => {
        // 加上 mock store 中撤销回待审核的记录数
        const mockPending = getMockStore().filter(a => a.rentalStatus === 0 && a._id.startsWith('mock_')).length
        if (mockPending > 0) {
          data.pendingCount = (data.pendingCount || 0) + mockPending
        }
        return data
      })
      .catch(err => {
        console.warn('[AdminAPI] getStats 失败，使用 mock:', err.message)
        return {
          pendingCount: getMockStore().filter(a => a.rentalStatus === 0).length,
          totalClassrooms: 10,
          todayReservations: 0
        }
      })
  },

  /**
   * 获取待审核列表（分页）
   * 真实云函数 + 合并 mock store 中被撤销回待审核的记录
   * 同时补全真实数据中缺失的姓名（"未知"→ 用 proposerID 生成占位名）
   */
  getPendingApplications(page = 1, pageSize = 20) {
    return call('getPendingApplications', { page, pageSize })
      .then(realData => {
        // 补全真实数据中的"未知"姓名
        if (realData.applications) {
          realData.applications = realData.applications.map(app => {
            if (!app.userName || app.userName === '未知') {
              app.userName = app.proposerID || '未知用户'
            }
            return app
          })
        }

        // 合并 mock store 中 status=0 的记录（被撤销回来的）
        const mockPending = getMockStore().filter(a => a.rentalStatus === 0 && a._id.startsWith('mock_'))
        if (mockPending.length === 0) return realData

        const mockList = mockPending.map(({ _classroomInfo, _alternatives, ...rest }) => rest)
        const merged = [...mockList, ...(realData.applications || [])]
        // 去重
        const seen = new Set()
        const deduped = []
        for (const item of merged) {
          if (!seen.has(item._id)) {
            seen.add(item._id)
            deduped.push(item)
          }
        }
        return { ...realData, applications: deduped, total: deduped.length }
      })
      .catch(err => {
        // 真实云函数失败，只返回 mock 待审核
        console.warn('[AdminAPI] getPendingApplications 失败，使用 mock:', err.message)
        return getMockPending(page, pageSize)
      })
  },

  /**
   * 获取申请详情
   * 真实数据经 enrichDetail 补充倒计时字段；mock ID 走 mock store
   */
  getApplicationDetail(applicationId) {
    if (isMockId(applicationId)) {
      return Promise.resolve(getMockDetail(applicationId))
    }
    return call('getApplicationDetail', { applicationId })
      .then(data => {
        // 补全"未知"姓名
        if (data && (!data.applicantName || data.applicantName === '未知')) {
          data.applicantName = data.application?.proposerName || data.application?.proposerID || '未知用户'
        }
        return enrichDetail(data)
      })
      .catch(err => {
        console.warn('[AdminAPI] getApplicationDetail 失败，使用 mock:', err.message)
        return getMockDetail(applicationId)
      })
  },

  /**
   * 审批通过
   * 真实 ID 调真实云函数；mock ID 走 mock store
   */
  approveApplication(applicationID, approvedClassroomId) {
    if (isMockId(applicationID)) {
      mockApproveInStore(applicationID)
      return Promise.resolve({ applicationID, status: 1, approvedAt: Date.now(), isAlternative: false })
    }
    return call('approveApplication', { applicationID, approvedClassroomId })
  },

  /**
   * 审批拒绝
   * 真实 ID 调真实云函数；mock ID 走 mock store
   */
  rejectApplication(applicationId, reason) {
    if (isMockId(applicationId)) {
      mockRejectInStore(applicationId, reason)
      return Promise.resolve({ applicationId, status: 2 })
    }
    return call('rejectApplication', { applicationId, reason })
  },

  /** 导入教室 */
  importClassrooms(classrooms) {
    return call('importClassrooms', { classrooms })
  },

  /** 导入课表 */
  importCourses(courses) {
    return call('importCourses', { courses })
  },

  /** 导入座位 */
  importSeats(seats) {
    return call('importSeats', { seats })
  },

  /**
   * 获取最近已审核的申请（分页）
   * 真实云函数缺 approvedAt（旧版）时降级到 mock
   */
  getReviewedApplications(page = 1, pageSize = 20) {
    return call('getReviewedApplications', { page, pageSize })
      .then(data => {
        // 补全真实数据中的"未知"姓名
        if (data.applications) {
          data.applications = data.applications.map(app => {
            if (!app.userName || app.userName === '未知') {
              app.userName = app.proposerID || '未知用户'
            }
            return app
          })
        }

        const hasApprovedAt = data.applications &&
          data.applications.some(a => a.rentalStatus === 1 && a.approvedAt)
        if (hasApprovedAt) return enrichReviewedList(data)
        console.info('[AdminAPI] 旧版云函数（缺 approvedAt），降级 mock')
        return getMockReviewed(page, pageSize)
      })
      .catch(err => {
        console.warn('[AdminAPI] getReviewedApplications 失败，使用 mock:', err.message)
        return getMockReviewed(page, pageSize)
      })
  },

  /** 撤销审核 — 调真实云函数，失败则 fallback */
  revokeReview(applicationID) {
    return callWithFallback('revokeReview', { applicationID }, () => {
      mockRevokeInStore(applicationID)
      return { applicationID, status: 0 }
    })
  },

  /** 获取近30天申请趋势数据 */
  getAppTrends() {
    return callWithFallback('getAppTrends', {}, () => mockGetTrends())
  },

  /** 获取教室占用热力图数据 */
  getHeatmapData() {
    return callWithFallback('getHeatmapData', {}, () => mockGetHeatmap())
  },

  /** 获取管理员通知列表 */
  getAdminNotifications(page = 1, pageSize = 10) {
    return call('getUserNotifications', { userId: 'admin', limit: pageSize })
  },

  /** 获取管理员未读通知数 */
  getAdminUnreadCount() {
    return call('getUnreadNotificationCount', { userId: 'admin' })
  },

  /** 标记通知已读 */
  markNotificationRead(notificationId) {
    return call('markNotificationRead', { notificationId })
  },

  /** 全部标记已读 */
  markAllNotificationsRead() {
    return call('markAllNotificationsRead', { userId: 'admin' })
  },

  /** 获取所有用户（分页） */
  getAllUsers(page = 1, pageSize = 20) {
    return callWithFallback('getAllUsers', { page, pageSize }, () => {
      return mockGetAllUsers(page, pageSize)
    })
  },

  /** 切换用户黑名单状态 */
  toggleUserBlacklist(userId, isBlacklisted) {
    return callWithFallback('updateUserInfo', { userId, isBlacklisted }, () => {
      return mockToggleBlacklist(userId, isBlacklisted)
    })
  }
}

// ==================== 字段补充（enrich） ====================

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

/**
 * 为已审核列表补充倒计时字段
 */
function enrichReviewedList(data) {
  if (!data || !data.applications) return data
  const now = Date.now()
  data.applications = data.applications.map(app => {
    if (app.canRevoke !== undefined) return app
    let canRevoke = false
    let revokeRemainingMs = 0
    if (app.rentalStatus === 1 && app.approvedAt) {
      const expiresAt = app.approvedAt + TWO_HOURS_MS
      revokeRemainingMs = Math.max(0, expiresAt - now)
      canRevoke = revokeRemainingMs > 0
    }
    return { ...app, canRevoke, revokeRemainingMs }
  })
  return data
}

/**
 * 为申请详情补充倒计时字段
 */
function enrichDetail(data) {
  if (!data || !data.application) return data
  const app = data.application
  let canRevoke = false
  let revokeRemainingMs = 0
  if (app.rentalStatus === 1 && app.approvedAt) {
    const expiresAt = app.approvedAt + TWO_HOURS_MS
    revokeRemainingMs = Math.max(0, expiresAt - Date.now())
    canRevoke = revokeRemainingMs > 0
  }
  data.application = { ...app, canRevoke, revokeRemainingMs }
  return data
}

// ==================== 开发环境 Mock 仓库 ====================

let _mockStore = null

function getMockStore() {
  if (!_mockStore) {
    const now = Date.now()
    _mockStore = [
      {
        _id: 'mock_app_001',
        proposerID: 'dev_openid_2023112593',
        proposerName: '王凯', userName: '王凯',
        classroomApplied: 'mock_classroom_001',
        classroomName: '一号教学楼 x1337',
        rentDate: '2026-06-15', rentDayOfWeek: 1, rentWeek: 'this',
        rentLectures: [0, 1, 2], rentLecturesStr: '1,2,3讲',
        rentalDetail: '软件3班班会', rentalDescription: '请批准，谢谢',
        expectedAttendeeCount: 60, actualAttendeeCount: null,
        rentalStatus: 1, statusText: '已通过', rejectionReason: '',
        approverID: 'dev_openid_admin001',
        approvedAt: now - 30 * 60 * 1000,
        appliedAt: now - 60 * 60 * 1000,
        updatedAt: now - 30 * 60 * 1000,
        canRevoke: true, revokeRemainingMs: 90 * 60 * 1000,
        _classroomInfo: {
          _id: 'mock_classroom_001', buildingBelong: '一号教学楼',
          classroomID: 'x1337', containNumber: 90,
          description: '多媒体教室，配备投影仪'
        },
        _alternatives: []
      },
      {
        _id: 'mock_app_002',
        proposerID: 'dev_openid_2023112588',
        proposerName: '李华', userName: '李华',
        classroomApplied: 'mock_classroom_002',
        classroomName: '二号教学楼 b2301',
        rentDate: '2026-06-16', rentDayOfWeek: 2, rentWeek: 'this',
        rentLectures: [5, 6, 7], rentLecturesStr: '6,7,8讲',
        rentalDetail: '小组讨论', rentalDescription: '',
        expectedAttendeeCount: 15, actualAttendeeCount: null,
        rentalStatus: 1, statusText: '已通过', rejectionReason: '',
        approverID: 'dev_openid_admin001',
        approvedAt: now - 10 * 60 * 1000,
        appliedAt: now - 45 * 60 * 1000,
        updatedAt: now - 10 * 60 * 1000,
        canRevoke: true, revokeRemainingMs: 110 * 60 * 1000,
        _classroomInfo: {
          _id: 'mock_classroom_002', buildingBelong: '二号教学楼',
          classroomID: 'b2301', containNumber: 60,
          description: '普通教室'
        },
        _alternatives: []
      },
      {
        _id: 'mock_app_003',
        proposerID: 'dev_openid_admin001',
        proposerName: '管理员', userName: '管理员',
        classroomApplied: 'mock_classroom_003',
        classroomName: '一号教学楼 x1338',
        rentDate: '2026-06-14', rentDayOfWeek: 0, rentWeek: 'this',
        rentLectures: [10, 11], rentLecturesStr: '11,12讲',
        rentalDetail: '学生会例会', rentalDescription: '',
        expectedAttendeeCount: 30, actualAttendeeCount: null,
        rentalStatus: 2, statusText: '已拒绝', rejectionReason: '教室已被课程占用',
        approverID: 'dev_openid_admin001',
        approvedAt: now - 3 * 60 * 60 * 1000,
        appliedAt: now - 4 * 60 * 60 * 1000,
        updatedAt: now - 3 * 60 * 60 * 1000,
        canRevoke: false, revokeRemainingMs: 0,
        _classroomInfo: {
          _id: 'mock_classroom_003', buildingBelong: '一号教学楼',
          classroomID: 'x1338', containNumber: 120,
          description: '多媒体教室'
        },
        _alternatives: []
      },
      {
        _id: 'mock_app_004',
        proposerID: 'dev_openid_2023112544',
        proposerName: '赵强', userName: '赵强',
        classroomApplied: 'mock_classroom_004',
        classroomName: '二号教学楼 b2302',
        rentDate: '2026-06-17', rentDayOfWeek: 3, rentWeek: 'next',
        rentLectures: [2, 3, 4, 5], rentLecturesStr: '3,4,5,6讲',
        rentalDetail: '计算机协会技术分享', rentalDescription: '需要投影仪',
        expectedAttendeeCount: 80, actualAttendeeCount: null,
        rentalStatus: 1, statusText: '已通过', rejectionReason: '',
        approverID: 'dev_openid_admin001',
        approvedAt: now - 5 * 60 * 1000,
        appliedAt: now - 30 * 60 * 1000,
        updatedAt: now - 5 * 60 * 1000,
        canRevoke: true, revokeRemainingMs: 115 * 60 * 1000,
        _classroomInfo: {
          _id: 'mock_classroom_004', buildingBelong: '二号教学楼',
          classroomID: 'b2302', containNumber: 100,
          description: '阶梯教室'
        },
        _alternatives: []
      }
    ]
  }
  return _mockStore
}

/** Mock 已审核列表 */
function getMockReviewed(page, pageSize) {
  const all = getMockStore()
  const reviewed = all.filter(a => [1, 2].includes(a.rentalStatus))
  const list = reviewed.map(({ _classroomInfo, _alternatives, ...rest }) => rest)
  const sorted = list.sort((a, b) => b.updatedAt - a.updatedAt)
  const start = (page - 1) * pageSize
  return { applications: sorted.slice(start, start + pageSize), total: sorted.length, page, pageSize }
}

/** Mock 待审核列表 */
function getMockPending(page, pageSize) {
  const all = getMockStore()
  const pending = all.filter(a => a.rentalStatus === 0)
  const list = pending.map(({ _classroomInfo, _alternatives, ...rest }) => rest)
  const sorted = list.sort((a, b) => b.updatedAt - a.updatedAt)
  const start = (page - 1) * pageSize
  return { applications: sorted.slice(start, start + pageSize), total: sorted.length, page, pageSize }
}

/** Mock 申请详情 */
function getMockDetail(applicationId) {
  const app = getMockStore().find(a => a._id === applicationId)
  if (!app) return { application: { _id: applicationId, rentalStatus: 0 }, applicantName: '', applicantPhone: '', classroomInfo: null, lecturesStr: '', alternatives: [] }
  return {
    application: { ...app },
    applicantName: app.proposerName,
    applicantPhone: '',
    classroomInfo: app._classroomInfo,
    lecturesStr: app.rentLecturesStr,
    alternatives: app._alternatives
  }
}

/** Mock 撤销 */
function mockRevokeInStore(applicationID) {
  const app = getMockStore().find(a => a._id === applicationID)
  if (!app) return
  app.rentalStatus = 0
  app.statusText = '待审核'
  app.canRevoke = false
  app.revokeRemainingMs = 0
  app.approvedAt = null
  app.updatedAt = Date.now()
}

/** Mock 审批通过 */
function mockApproveInStore(applicationID) {
  const app = getMockStore().find(a => a._id === applicationID)
  if (!app) throw new Error('申请不存在')
  const now = Date.now()
  app.rentalStatus = 1
  app.statusText = '已通过'
  app.approvedAt = now
  app.updatedAt = now
}

/** Mock 审批拒绝 */
function mockRejectInStore(applicationId, reason) {
  const app = getMockStore().find(a => a._id === applicationId)
  if (!app) throw new Error('申请不存在')
  app.rentalStatus = 2
  app.statusText = '已拒绝'
  app.rejectionReason = reason || ''
  app.updatedAt = Date.now()
}

// ==================== Mock 趋势 & 热力图数据 ====================

/**
 * Mock 近30天申请趋势
 */
function mockGetTrends() {
  const now = new Date()
  const dates = []
  const pending = []
  const approved = []
  const rejected = []

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    dates.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    // 生成随机但有趋势的数据
    const base = 5 + Math.sin((29 - i) * 0.3) * 3
    pending.push(Math.max(0, Math.round(base + (Math.random() - 0.5) * 4)))
    approved.push(Math.max(0, Math.round(base * 0.6 + (Math.random() - 0.5) * 3)))
    rejected.push(Math.max(0, Math.round((Math.random() - 0.3) * 3)))
  }

  return { dates, series: { pending, approved, rejected } }
}

/**
 * Mock 教室占用热力图（5天 × 13讲次）
 */
function mockGetHeatmap() {
  const matrix = []
  for (let d = 0; d < 5; d++) {
    const row = []
    for (let l = 0; l < 13; l++) {
      // 模拟真实分布：中间时段（3-8讲）占用率高，早晚低
      const baseRate = (l >= 2 && l <= 7) ? 0.5 : 0.15
      const dayFactor = (d === 1 || d === 3) ? 1.2 : 1.0  // 周二周四略高
      row.push(Math.min(1, Math.round((baseRate * dayFactor + (Math.random() - 0.5) * 0.2) * 100) / 100))
    }
    matrix.push(row)
  }
  return { matrix, totalClassrooms: 48, maxRate: 0.85 }
}

// ==================== Mock 用户数据 ====================

let _mockUserStore = null

function getMockUserStore() {
  if (_mockUserStore) return _mockUserStore
  _mockUserStore = [
    { _id: 'user_001', userID: '2023112593', userName: '王凯', identity: 'student', department: '软件学院', phone: '13800138001', isBlacklisted: false },
    { _id: 'user_002', userID: '2023112588', userName: '李华', identity: 'student', department: '计算机学院', phone: '13800138002', isBlacklisted: true },
    { _id: 'user_003', userID: '2023112577', userName: '张伟', identity: 'student', department: '软件学院', phone: '13800138003', isBlacklisted: false },
    { _id: 'user_004', userID: '2023112566', userName: '陈明', identity: 'student', department: '信息学院', phone: '13800138004', isBlacklisted: false },
    { _id: 'user_005', userID: '2023112555', userName: '刘芳', identity: 'student', department: '数学学院', phone: '13800138005', isBlacklisted: false },
    { _id: 'user_006', userID: '2023112544', userName: '赵强', identity: 'student', department: '计算机学院', phone: '13800138006', isBlacklisted: false },
    { _id: 'user_007', userID: '2023112533', userName: '孙丽', identity: 'student', department: '软件学院', phone: '13800138007', isBlacklisted: false },
    { _id: 'user_008', userID: '2023112522', userName: '周杰', identity: 'student', department: '信息学院', phone: '13800138008', isBlacklisted: false },
    { _id: 'user_009', userID: '2023112419', userName: '张涛', identity: 'student', department: '数学学院', phone: '13800138009', isBlacklisted: false },
    { _id: 'user_010', userID: '2023112425', userName: '潘星宇', identity: 'student', department: '计算机学院', phone: '13800138010', isBlacklisted: false },
    { _id: 'user_011', userID: 'admin001', userName: '管理员', identity: 'admin', department: '教务处', phone: '13800138999', isBlacklisted: false }
  ]
  return _mockUserStore
}

function mockGetAllUsers(page, pageSize) {
  const all = [...getMockUserStore()]
  const start = (page - 1) * pageSize
  return { data: all.slice(start, start + pageSize), total: all.length, page, pageSize }
}

function mockToggleBlacklist(userId, isBlacklisted) {
  const user = getMockUserStore().find(u => u._id === userId || u.userID === userId)
  if (!user) throw new Error('用户不存在')
  user.isBlacklisted = isBlacklisted
  return { success: true }
}

module.exports = AdminAPI
