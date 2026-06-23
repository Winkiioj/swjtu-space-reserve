/**
 * API调用封装
 * 统一管理所有后端接口调用
 */

const request = require('./request')

// 教室相关API
const classroomAPI = {
  /**
   * 查询可用教室
   * @param {object} params - 查询参数
   * @param {string} params.rentDate - 租赁日期
   * @param {string} params.rentWeek - this/next
   * @param {number} params.rentDayOfWeek - 周几 0-4
   * @param {number[]} params.rentLectures - 讲次数组
   * @param {number} params.minCapacity - 最小容量
   * @returns {Promise}
   */
  searchAvailable: (params) => {
    return request.callFunction('searchAvailableClassrooms', params)
  },

  /**
   * 获取教室详情
   * @param {string} classroomId - 教室ID
   * @returns {Promise}
   */
  getDetail: (classroomId) => {
    return request.callFunction('getClassroomDetail', { classroomId })
  },

  /**
   * 获取所有教室列表
   * @returns {Promise}
   */
  getAll: () => {
    return request.callFunction('getAllClassrooms')
  },

  /**
   * 获取教室状态矩阵
   * @param {string} classroomId - 教室ID
   * @param {string} week - this/next
   * @returns {Promise}
   */
  getStatusMatrix: (classroomId, week = 'this') => {
    return request.callFunction('getClassroomStatus', { classroomId, week })
  }
}

// 申请相关API
const applicationAPI = {
  /**
   * 提交租赁申请
   * @param {object} params - 申请参数
   * @param {string} params.classroomID - 教室ID
   * @param {string} params.rentDate - 租赁日期
   * @param {string} params.rentWeek - this/next
   * @param {number} params.rentDayOfWeek - 周几
   * @param {number[]} params.rentLectures - 讲次数组
   * @param {string} params.rentalDetail - 租赁事由
   * @param {string} params.rentalDescription - 详细描述
   * @param {number} params.expectedAttendeeCount - 期望人数
   * @returns {Promise}
   */
  submit: (params) => {
    return request.callFunction('submitApplication', params)
  },

  /**
   * 获取用户申请列表
   * @param {object} params - 查询参数
   * @param {string} params.userID - 用户ID
   * @param {number} params.status - 状态筛选 -1=全部, 0=待审核, 1=已批准, 2=已拒绝, 3=已取消, 4=已完成
   * @param {number} params.limit - 每页数量
   * @param {number} params.skip - 跳过数量
   * @returns {Promise}
   */
  getUserApplications: (params) => {
    return request.callFunction('getUserApplications', params)
  },

  /**
   * 获取申请详情
   * @param {string} applicationId - 申请ID
   * @returns {Promise}
   */
  getDetail: (applicationId) => {
    return request.callFunction('getApplicationDetail', { applicationId })
  },

  /**
   * 取消申请
   * @param {string} applicationId - 申请ID
   * @returns {Promise}
   */
  cancel: (applicationId) => {
    return request.callFunction('cancelApplication', { applicationId })
  },

  /**
   * 批准申请（管理员）
   * @param {string} applicationId - 申请ID
   * @param {string} approverID - 审批人ID
   * @returns {Promise}
   */
  approve: (applicationId, approverID) => {
    return request.callFunction('approveApplication', { applicationId, approverID })
  },

  /**
   * 拒绝申请（管理员）
   * @param {string} applicationId - 申请ID
   * @param {string} approverID - 审批人ID
   * @param {string} reason - 拒绝原因
   * @returns {Promise}
   */
  reject: (applicationId, approverID, reason) => {
    return request.callFunction('rejectApplication', { applicationId, approverID, reason })
  }
}

// 用户相关API
const userAPI = {
  /**
   * 微信登录
   * @param {object} params - { code, userInfo, devOpenid? }
   * @returns {Promise}
   */
  wechatLogin: (params) => {
    return request.callFunction('wechatLogin', params)
  },

  /**
   * 获取用户信息
   * @param {string} userId - 用户ID
   * @returns {Promise}
   */
  getInfo: (userId) => {
    return request.callFunction('getUserInfo', { userId })
  },

  /**
   * 更新用户信息
   * @param {object} params - 用户信息
   * @returns {Promise}
   */
  updateInfo: (params) => {
    return request.callFunction('updateUserInfo', params)
  },

  /**
   * 绑定学号（微信登录后关联已有学号/工号）
   * @param {string} openid - 微信 openid
   * @param {string} userID - 学号/工号
   * @returns {Promise}
   */
  bindStudentId: (openid, userID) => {
    return request.callFunction('bindStudentId', { openid, userID })
  },

  /**
   * 获取用户统计信息
   * @param {string} userId - 用户ID
   * @returns {Promise}
   */
  getStats: (userId) => {
    return request.callFunction('getUserStats', { userId })
  }
}

// 通知相关API
const notificationAPI = {
  /**
   * 获取用户通知列表
   * @param {string} userId - 用户ID
   * @param {number} limit - 数量限制
   * @returns {Promise}
   */
  getList: (userId, limit = 20) => {
    return request.callFunction('getUserNotifications', { userId, limit })
  },

  /**
   * 标记通知为已读
   * @param {string} notificationId - 通知ID
   * @returns {Promise}
   */
  markAsRead: (notificationId) => {
    return request.callFunction('markNotificationRead', { notificationId })
  },

  /**
   * 标记所有通知为已读
   * @param {string} userId - 用户ID
   * @returns {Promise}
   */
  markAllRead: (userId) => {
    return request.callFunction('markAllNotificationsRead', { userId })
  },

  /**
   * 获取未读通知数量
   * @param {string} userId - 用户ID
   * @returns {Promise}
   */
  getUnreadCount: (userId) => {
    return request.callFunction('getUnreadNotificationCount', { userId })
  }
}

// 课表相关API
const courseAPI = {
  /**
   * 获取教室课表
   * @param {string} classroomId - 教室ID
   * @param {string} week - this/next
   * @returns {Promise}
   */
  getClassroomSchedule: (classroomId, week = 'this') => {
    return request.callFunction('getClassroomSchedule', { classroomId, week })
  },

  /**
   * 获取用户课表（学生）
   * @param {string} userId - 用户ID
   * @param {string} week - this/next
   * @returns {Promise}
   */
  getUserSchedule: (userId, week = 'this') => {
    return request.callFunction('getUserSchedule', { userId, week })
  }
}

// 导出所有API模块
module.exports = {
  classroom: classroomAPI,
  application: applicationAPI,
  user: userAPI,
  notification: notificationAPI,
  course: courseAPI
}