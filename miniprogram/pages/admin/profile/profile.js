const app = getApp()
const AdminAPI = require('../../../utils/admin-api')
const auth = require('../../../utils/auth')

Page({
  data: {
    userInfo: null,
    stats: {},
    _idText: ''
  },

  onShow() {
    this.loadInfo()
  },

  loadInfo() {
    const userInfo = app.globalData.userInfo || {}
    const idText = userInfo.userID ? '工号：' + userInfo.userID : 'ID：' + (userInfo.openid || userInfo._id || '')
    this.setData({ userInfo, _idText: idText })
  },

  goToDashboard() {
    wx.navigateTo({ url: '/pages/admin/dashboard/dashboard' })
  },

  goToReview() {
    wx.navigateTo({ url: '/pages/admin/review-list/review-list' })
  },

  goToNotifications() {
    wx.navigateTo({ url: '/pages/admin/notifications/notifications' })
  },

  goToUsers() {
    wx.navigateTo({ url: '/pages/admin/users/users' })
  },

  goToInit() {
    wx.navigateTo({ url: '/pages/admin/init-data/init-data' })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出管理员账号？',
      success: (res) => {
        if (res.confirm) {
          auth.logout()
          app.globalData.userInfo = null
          app.globalData.isLoggedIn = false
          app.globalData.currentUserID = null
          app.globalData.userRole = null
          wx.reLaunch({ url: '/pages/manager-login/manager-login' })
        }
      }
    })
  }
})
