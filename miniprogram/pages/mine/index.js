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
    stats: { total: 0, approved: 0, pending: 0, rejected: 0 },
    unreadNotifCount: 0
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
      this.fetchUnreadCount()
    } else {
      this.setData({
        isLoggedIn: false,
        isBound: false,
        avatar: '', nickName: '', userID: '',
        stats: { total: 0, approved: 0, pending: 0, rejected: 0 },
        unreadNotifCount: 0
      })
      wx.removeTabBarBadge({ index: 3 })
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

  /** 获取未读通知数并更新 tabBar 红点 */
  async fetchUnreadCount() {
    const uid = auth.getUserId()
    if (!uid) return
    try {
      const r = await api.notification.getUnreadCount(uid)
      const count = (r && r.count) || 0
      this.setData({ unreadNotifCount: count })
      this._syncTabBarBadge(count)
    } catch (e) {
      console.error('[mine] fetchUnreadCount 失败:', e)
    }
  },

  /** 同步 tabBar 红点 */
  _syncTabBarBadge(count) {
    if (count > 0) {
      wx.setTabBarBadge({ index: 3, text: count > 99 ? '99+' : String(count) })
    } else {
      wx.removeTabBarBadge({ index: 3 })
    }
  },

  // ===== 统计卡片点击 → 跳转申请列表（带状态筛选） =====

  onStatTap(e) {
    const tab = e.currentTarget.dataset.tab
    wx.navigateTo({ url: '/pages/application/index?tab=' + tab })
  },

  // ===== 通知标记已读 =====

  async markNotifRead(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    try {
      await api.notification.markAsRead(id)
      this.fetchUnreadCount()
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
          wx.removeTabBarBadge({ index: 3 })
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
    } else if (key === 'notifications') {
      wx.navigateTo({ url: '/pages/notifications/notifications' })
    } else if (key === 'favorites') {
      wx.showToast({ title: '功能开发中', icon: 'none' })
    } else if (key === 'help') {
      wx.showModal({ title: '帮助中心', content: '如有问题请联系管理员', showCancel: false })
    } else if (key === 'about') {
      wx.showModal({ title: '关于', content: '西南交通大学空间预约系统', showCancel: false })
    }
  }
})
