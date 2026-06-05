const auth = require('../../utils/auth')
const api = require('../../utils/api')

Page({
  data: {
    isLoggedIn: false,
    isBound: false,
    avatar: '',
    nickName: '',
    userID: '',
    identityText: '',
    stats: { total: 0, approved: 0, pending: 0, rejected: 0 }
  },

  onLoad() { this.loadInfo() },
  onShow() { this.loadInfo() },

  loadInfo() {
    const info = auth.getUserInfo()
    if (info && info.openid) {
      this.setData({
        isLoggedIn: true,
        isBound: info.isBound || false,
        avatar: info.avatarUrl || '',
        nickName: info.nickName || info.userName || '',
        userID: info.userID || '',
        identityText: this.idt(info.identity)
      })
      this.fetchStats()
    } else {
      this.setData({
        isLoggedIn: false,
        isBound: false,
        avatar: '', nickName: '', userID: '',
        stats: { total: 0, approved: 0, pending: 0, rejected: 0 }
      })
    }
  },

  idt(i) {
    const m = { student: '学生', teacher: '教师', admin: '管理员' }
    return m[i] || '学生'
  },

  async fetchStats() {
    const uid = auth.getUserId()
    if (!uid) return
    try {
      const r = await api.user.getStats(uid)
      this.setData({
        stats: {
          total: r.total || 0,
          approved: r.approved || 0,
          pending: r.pending || 0,
          rejected: r.rejected || 0
        }
      })
    } catch (e) {}
  },

  onLogin() { wx.reLaunch({ url: '/pages/login/index' }) },

  onBind() {
    const openid = auth.getUserId()
    if (!openid) return
    wx.navigateTo({ url: '/pages/bind-student/index?openid=' + encodeURIComponent(openid) })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后需要重新授权登录',
      confirmText: '退出',
      confirmColor: '#ff4d4f',
      success: r => {
        if (r.confirm) {
          auth.logout()
          wx.reLaunch({ url: '/pages/login/index' })
        }
      }
    })
  },

  onMenu(e) {
    const key = e.currentTarget.dataset.key
    if (key === 'applications') {
      wx.navigateTo({ url: '/pages/application/index' })
    } else if (key === 'reservations') {
      wx.navigateTo({ url: '/pages/my-reservations/my-reservations' })
    } else if (key === 'favorites') {
      wx.showToast({ title: '功能开发中', icon: 'none' })
    } else if (key === 'help') {
      wx.showModal({ title: '帮助中心', content: '如有问题请联系管理员', showCancel: false })
    } else if (key === 'about') {
      wx.showModal({ title: '关于', content: '西南交通大学空间预约系统', showCancel: false })
    }
  }
})
