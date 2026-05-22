/**
 * admin-api.js — 管理员前端 API 封装层
 *
 * 统一处理云函数调用、自动注入 currentUserID、标准化错误处理。
 * 所有管理页面通过此模块调用云函数，不直接调用 wx.cloud.callFunction。
 */

const app = getApp()

function call(name, data = {}) {
  data.currentUserID = app.globalData.currentUserID
  return wx.cloud.callFunction({
    name,
    data
  }).then(res => {
    if (res.result.code === 0) return res.result.data
    throw new Error(res.result.message || '操作失败')
  })
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
  },

  /** 获取待审核列表（分页） */
  getPendingApplications(page = 1, pageSize = 20) {
    return call('getPendingApplications', { page, pageSize })
  },

  /** 获取申请详情 */
  getApplicationDetail(applicationId) {
    return call('getApplicationDetail', { applicationId })
  },

  /** 审批通过 */
  approveApplication(applicationID, approvedClassroomId) {
    return call('approveApplication', { applicationID, approvedClassroomId })
  },

  /** 审批拒绝 */
  rejectApplication(applicationId, reason) {
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
  }
}

module.exports = AdminAPI
