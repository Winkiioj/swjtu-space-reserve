const AdminAPI = require('../../../utils/admin-api')

Page({
  data: {
    notifications: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    unreadCount: 0,
    showEmpty: false,
    emptyText: '',
    notifCountText: ''
  },

  onShow() {
    this.loadList(true)
    this.loadUnreadCount()
  },

  onPullDownRefresh() {
    this.loadList(true).then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadList()
    }
  },

  async loadList(reset = false) {
    if (this.data.loading) return
    this.setData({ loading: true })
    if (reset) {
      this.setData({ page: 1, hasMore: true })
    }

    try {
      const res = await AdminAPI.getAdminNotifications(reset ? 1 : this.data.page, this.data.pageSize)
      const list = (res && res.data) || []
      const enriched = list.map(n => this._enrich(n))
      const merged = reset ? enriched : this.data.notifications.concat(enriched)
      this.setData({
        notifications: merged,
        page: reset ? 2 : this.data.page + 1,
        hasMore: list.length >= this.data.pageSize,
        loading: false,
        showEmpty: merged.length === 0,
        emptyText: '暂无通知消息'
      })
    } catch (err) {
      console.error(err)
      this.setData({ loading: false })
    }
  },

  _enrich(n) {
    const icons = {
      new_application: '📋', review_sent: '✅', reject_sent: '❌',
      revoke_reminder: '⏰', weekly_report: '📊'
    }
    return { ...n, _icon: icons[n.type] || '💬', _unreadClass: n.isRead ? '' : 'notif-item-unread' }
  },

  async loadUnreadCount() {
    try {
      const res = await AdminAPI.getAdminUnreadCount()
      const count = (res && res.count) || 0
      this.setData({
        unreadCount: count,
        notifCountText: count > 0 ? count + ' 条未读' : ''
      })
    } catch (err) {
      console.error(err)
    }
  },

  /** 标记已读 */
  async markAsRead(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    // 如果已读则跳过
    const n = this.data.notifications.find(n => n._id === id)
    if (n && n.isRead) return

    try {
      await AdminAPI.markNotificationRead(id)
      const notifs = this.data.notifications.map(n => {
        if (n._id === id) n.isRead = true
        return n
      })
      this.setData({
        notifications: notifs,
        unreadCount: Math.max(0, this.data.unreadCount - 1)
      })
    } catch (err) {
      console.error(err)
    }
  },

  /** 标记全部已读 */
  async markAllRead() {
    try {
      await AdminAPI.markAllNotificationsRead()
      this.setData({
        notifications: this.data.notifications.map(n => ({ ...n, isRead: true })),
        unreadCount: 0
      })
      wx.showToast({ title: '已全部标记已读', icon: 'none' })
    } catch (err) {
      console.error(err)
    }
  },

  goToDashboard() {
    wx.navigateTo({ url: '/pages/admin/dashboard/dashboard' })
  },

  goToReview() {
    wx.navigateTo({ url: '/pages/admin/review-list/review-list' })
  },

  goToNotifications() {
    // 已在通知页
  },

  goToAdminProfile() {
    wx.navigateTo({ url: '/pages/admin/profile/profile' })
  },

  getNotifIcon(type) {
    const icons = {
      new_application: '📋',
      review_sent: '✅',
      reject_sent: '❌',
      revoke_reminder: '⏰',
      weekly_report: '📊'
    }
    return icons[type] || '💬'
  }
})
