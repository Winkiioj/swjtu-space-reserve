const app = getApp()
const AdminAPI = require('../../../utils/admin-api')

Page({
  data: {
    pendingCount: 0,
    totalClassrooms: 0,
    todayReservations: 0,
    currentDate: ''
  },

  onLoad() {
    if (app.globalData.userRole !== 'admin') {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      setTimeout(() => wx.redirectTo({ url: '/pages/manager-login/manager-login' }), 1500)
      return
    }
    this.setCurrentDate()
  },

  onShow() {
    this.loadStats()
  },

  onPullDownRefresh() {
    this.loadStats().then(() => wx.stopPullDownRefresh())
  },

  setCurrentDate() {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const d = now.getDate()
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    this.setData({
      currentDate: `${y}年${m}月${d}日 星期${weekdays[now.getDay()]}`
    })
  },

  async loadStats() {
    wx.showLoading({ title: '加载中' })
    try {
      const stats = await AdminAPI.getStats()
      this.setData({
        pendingCount: stats.pendingCount,
        totalClassrooms: stats.totalClassrooms,
        todayReservations: stats.todayReservations
      })
    } catch (err) {
      console.error(err)
    } finally {
      wx.hideLoading()
    }
  },

  goToReview() {
    wx.navigateTo({ url: '/pages/admin/review-list/review-list' })
  },

  goToInit() {
    wx.navigateTo({ url: '/pages/admin/init-data/init-data' })
  }
})
