const app = getApp()
const AdminAPI = require('../../../utils/admin-api')
const ChartHelper = require('../../../utils/chart-helper')
const auth = require('../../../utils/auth')

Page({
  data: {
    // ===== 导航 =====
    currentTab: 'dashboard',

    // ===== 首页仪表盘 =====
    pendingCount: 0,
    totalClassrooms: 0,
    reviewedCount: 0,
    todayReservations: 0,
    currentDate: '',
    trendData: null,
    heatmapMatrix: [],
    heatmapMaxRate: 0,
    heatmapLabels: ['第1讲','第2讲','第3讲','第4讲','第5讲','第6讲','第7讲','第8讲','第9讲','第10讲','第11讲','第12讲','第13讲'],
    dayLabels: ['周一','周二','周三','周四','周五'],
    unreadCount: 0,
    unreadBadgeText: '0',

    // ===== 审核列表 =====
    reviewType: 'pending',
    reviewTitle: '待审核申请',
    applications: [],
    showList: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    reviewLoading: false,
    keyword: '',
    showEmpty: false,
    hasData: false,
    emptyText: '',

    // ===== 通知列表 =====
    notifications: [],
    notifPage: 1,
    notifPageSize: 20,
    notifHasMore: true,
    notifLoading: false,
    notifShowEmpty: false,
    notifEmptyText: '',
    notifCountText: '',

    // ===== 个人中心 =====
    userInfo: null,
    _idText: ''
  },

  // ==================== 生命周期 ====================

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
    this.loadTrends()
    this.loadHeatmap()
    this.loadUnreadBadge()
    // 根据当前 tab 刷新数据
    if (this.data.currentTab === 'review') this.loadReviewList(true)
    else if (this.data.currentTab === 'notifications') this.loadNotifList(true)
    else if (this.data.currentTab === 'profile') this.loadInfo()
  },

  onPullDownRefresh() {
    const tasks = [this.loadStats(), this.loadUnreadBadge()]
    if (this.data.currentTab === 'dashboard') {
      tasks.push(this.loadTrends(), this.loadHeatmap())
    } else if (this.data.currentTab === 'review') {
      tasks.push(this.loadReviewList(true))
    } else if (this.data.currentTab === 'notifications') {
      tasks.push(this.loadNotifList(true))
    } else if (this.data.currentTab === 'profile') {
      tasks.push(Promise.resolve(this.loadInfo()))
    }
    Promise.all(tasks).then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.currentTab === 'review' && this.data.hasMore && !this.data.reviewLoading) {
      this.loadReviewList()
    } else if (this.data.currentTab === 'notifications' && this.data.notifHasMore && !this.data.notifLoading) {
      this.loadNotifList()
    }
  },

  // ==================== 导航切换 ====================

  switchTab(tab) {
    if (this.data.currentTab === tab) return
    this.setData({ currentTab: tab })
    if (tab === 'review') {
      this.loadReviewList(true)
    } else if (tab === 'notifications') {
      this.loadNotifList(true)
      this.loadUnreadBadge()
    } else if (tab === 'profile') {
      this.loadInfo()
    } else if (tab === 'dashboard') {
      this.loadStats()
      this.loadTrends()
      this.loadHeatmap()
    }
  },

  goToDashboard() { this.switchTab('dashboard') },
  goToReview() {
    this.setData({ reviewType: 'pending', reviewTitle: '待审核申请' })
    this.switchTab('review')
  },
  goToReviewed() {
    this.setData({ reviewType: 'reviewed', reviewTitle: '最近已审核' })
    this.switchTab('review')
  },
  goToNotifications() { this.switchTab('notifications') },
  goToAdminProfile() { this.switchTab('profile') },

  // ==================== 首页仪表盘 ====================

  setCurrentDate() {
    const now = new Date()
    const weekdays = ['日','一','二','三','四','五','六']
    this.setData({
      currentDate: `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`
    })
  },

  async loadStats() {
    try {
      const [stats, reviewed] = await Promise.all([
        AdminAPI.getStats(),
        AdminAPI.getReviewedApplications(1, 1)
      ])
      this.setData({
        pendingCount: stats.pendingCount || 0,
        totalClassrooms: stats.totalClassrooms || 0,
        todayReservations: stats.todayReservations || 0,
        reviewedCount: reviewed.total || 0
      })
    } catch (err) { console.error(err) }
  },

  async loadTrends() {
    try {
      const data = await AdminAPI.getAppTrends()
      this.setData({ trendData: data }, () => {
        setTimeout(() => this.drawTrendChart(), 500)
      })
    } catch (err) { console.error(err) }
  },

  drawTrendChart() {
    const data = this.data.trendData
    if (!data || !data.series) return
    const query = wx.createSelectorQuery()
    query.select('#trendCanvas').node((res) => {
      if (!res || !res.node) { setTimeout(() => this.drawTrendChart(), 500); return }
      const canvas = res.node
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const labels = data.dates   // 全量30天→chart-helper内部按间距智能选标签
      const series = [
        { name: '待审核', color: '#f59e0b', values: data.series.pending },
        { name: '已通过', color: '#22c55e', values: data.series.approved },
        { name: '已拒绝', color: '#ef4444', values: data.series.rejected }
      ]
      ChartHelper.drawLineChart(ctx, canvas, { labels, series }, {
        height: 350, padding: { top: 40, right: 24, bottom: 48, left: 60 },
        smooth: true, fill: true, yLabelCount: 4
      })
    }).exec()
  },

  async loadHeatmap() {
    try {
      const data = await AdminAPI.getHeatmapData()
      const matrix = data.matrix || []
      const maxRate = data.maxRate || 0
      const cells = []
      for (let d = 0; d < matrix.length; d++) {
        const row = matrix[d]
        const rowCells = []
        for (let l = 0; l < row.length; l++) {
          const rate = row[l]
          const intensity = maxRate > 0 ? rate / maxRate : 0
          const r = Math.round(235 - intensity * 200)
          const g = Math.round(245 - intensity * 175)
          const b = Math.round(255 - intensity * 160)
          rowCells.push({
            color: `rgb(${r}, ${g}, ${b})`,
            text: rate > 0 ? Math.round(rate * 100) + '%' : '',
            rate
          })
        }
        cells.push(rowCells)
      }
      this.setData({ heatmapMatrix: cells, heatmapMaxRate: maxRate })
    } catch (err) { console.error(err) }
  },

  async loadUnreadBadge() {
    try {
      const res = await AdminAPI.getAdminUnreadCount()
      const count = (res && res.count) || 0
      this.setData({
        unreadCount: count,
        unreadBadgeText: count > 99 ? '99+' : count.toString()
      })
    } catch (err) { console.error(err) }
  },

  goToInit() { wx.navigateTo({ url: '/pages/admin/init-data/init-data' }) },

  // ==================== 审核列表 ====================

  switchReviewType(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.reviewType) return
    this.setData({
      reviewType: type,
      reviewTitle: type === 'reviewed' ? '最近已审核' : '待审核申请'
    })
    this.loadReviewList(true)
  },

  async loadReviewList(reset = false) {
    if (this.data.reviewLoading) return
    this.setData({ reviewLoading: true })
    if (reset) this.setData({ page: 1, hasMore: true })

    try {
      const fn = this.data.reviewType === 'reviewed'
        ? AdminAPI.getReviewedApplications(reset ? 1 : this.data.page, this.data.pageSize)
        : AdminAPI.getPendingApplications(reset ? 1 : this.data.page, this.data.pageSize)

      const result = await fn
      const list = result.applications || []
      const total = result.total || 0
      const enriched = list.map(item => this._enrichReview(item))
      const merged = reset ? enriched : this.data.applications.concat(enriched)

      this.setData({
        applications: merged,
        page: reset ? 2 : this.data.page + 1,
        hasMore: merged.length < total,
        reviewLoading: false,
        hasData: merged.length > 0
      })
      this.filterApps()
    } catch (err) {
      console.error(err)
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      this.setData({ reviewLoading: false })
    }
  },

  _enrichReview(item) {
    const totalMinutes = Math.floor((item.revokeRemainingMs || 0) / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    let revokeText = ''
    if (item.canRevoke && item.revokeRemainingMs > 0) {
      revokeText = hours > 0 ? `剩余${hours}h${minutes}m` : `剩余${minutes}分钟`
    }
    const isPending = this.data.reviewType !== 'reviewed'
    const statusClass = isPending ? 'tag-pending'
      : item.rentalStatus === 1 ? 'tag-approved' : 'tag-rejected'
    return {
      ...item,
      _revokeText: revokeText,
      _statusClass: statusClass,
      _initial: item.userName ? item.userName[0] : '?',
      _subtitle: item._revokeText || (item.proposerID || ''),
      _dateDisplay: item.rentDate + ' · 周' + ((item.rentDayOfWeek || 0) + 1) + ' · ' + (item.rentLecturesStr || '')
    }
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
    this.filterApps()
  },

  filterApps() {
    const kw = this.data.keyword.trim().toLowerCase()
    let base = this.data.applications
    if (kw) {
      base = base.filter(item =>
        (item.userName && item.userName.toLowerCase().includes(kw)) ||
        (item.classroomName && item.classroomName.toLowerCase().includes(kw)) ||
        (item.rentalDetail && item.rentalDetail.toLowerCase().includes(kw)) ||
        (item.proposerID && item.proposerID.toLowerCase().includes(kw))
      )
    }
    const isEmpty = base.length === 0
    this.setData({
      showList: base,
      showEmpty: isEmpty,
      hasData: base.length > 0,
      emptyText: kw ? '未找到匹配的申请' : (this.data.reviewType === 'reviewed' ? '暂无已审核记录' : '暂无待审核申请')
    })
  },

  clearSearch() {
    this.setData({ keyword: '' })
    this.filterApps()
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/admin/review-detail/review-detail?id=${id}` })
  },

  // ==================== 通知列表 ====================

  async loadNotifList(reset = false) {
    if (this.data.notifLoading) return
    this.setData({ notifLoading: true })
    if (reset) this.setData({ notifPage: 1, notifHasMore: true })

    try {
      const res = await AdminAPI.getAdminNotifications(reset ? 1 : this.data.notifPage, this.data.notifPageSize)
      // 已处理的新申请通知不显示
      const list = (res || []).filter(n => !(n.type === 'new_application' && n.isRead))
      const enriched = list.map(n => this._enrichNotif(n))
      const merged = reset ? enriched : this.data.notifications.concat(enriched)
      this.setData({
        notifications: merged,
        notifPage: reset ? 2 : this.data.notifPage + 1,
        notifHasMore: list.length >= this.data.notifPageSize,
        notifLoading: false,
        notifShowEmpty: merged.length === 0,
        notifEmptyText: '暂无通知消息'
      })
    } catch (err) {
      console.error(err)
      this.setData({ notifLoading: false })
    }
  },

  _enrichNotif(n) {
    const icons = {
      new_application: '📋', review_sent: '✅', reject_sent: '❌',
      revoke_reminder: '⏰', weekly_report: '📊'
    }
    return { ...n, _icon: icons[n.type] || '💬', _unreadClass: n.isRead ? '' : 'notif-item-unread' }
  },

  async loadNotifUnreadCount() {
    try {
      const res = await AdminAPI.getAdminUnreadCount()
      const count = (res && res.count) || 0
      this.setData({
        notifCountText: count > 0 ? count + ' 条未读' : ''
      })
    } catch (err) { console.error(err) }
  },

  /** 点击通知项：标记已读 + 跳转关联页面 */
  handleNotificationTap(e) {
    const ds = e.currentTarget.dataset
    console.log('[通知点击] dataset:', JSON.stringify(ds))

    // 从列表中找到这条通知
    const n = this.data.notifications.find(n => n._id === ds.id)
    const relatedId = ds.relatedid || (n && n.relatedId)

    // 标记已读
    if (ds.id) this.markAsReadById(ds.id)

    // 跳转
    if (relatedId) {
      wx.navigateTo({
        url: `/pages/admin/review-detail/review-detail?id=${relatedId}`,
        fail: (err) => {
          console.error('navigateTo 失败:', err)
          wx.showToast({ title: '跳转失败: ' + (err.errMsg || ''), icon: 'none' })
        }
      })
    } else {
      wx.showToast({ title: '无关联申请ID', icon: 'none' })
    }
  },

  markAsRead(e) {
    const id = e.currentTarget.dataset.id
    this.markAsReadById(id)
  },

  markAsReadById(id) {
    if (!id) return
    const n = this.data.notifications.find(n => n._id === id)
    if (n && n.isRead) return
    try {
      AdminAPI.markNotificationRead(id)
      const notifs = this.data.notifications.map(n => {
        if (n._id === id) n.isRead = true
        return n
      })
      this.setData({
        notifications: notifs,
        unreadCount: Math.max(0, this.data.unreadCount - 1)
      })
    } catch (err) { console.error(err) }
  },

  async markAllRead() {
    try {
      await AdminAPI.markAllNotificationsRead()
      this.setData({
        notifications: this.data.notifications.map(n => ({ ...n, isRead: true })),
        unreadCount: 0
      })
      wx.showToast({ title: '已全部标记已读', icon: 'none' })
    } catch (err) { console.error(err) }
  },

  // ==================== 个人中心 ====================

  loadInfo() {
    const userInfo = app.globalData.userInfo || {}
    const idText = userInfo.userID ? '工号：' + userInfo.userID : 'ID：' + (userInfo.openid || userInfo._id || '')
    this.setData({ userInfo, _idText: idText })
  },

  goToUsers() {
    wx.navigateTo({ url: '/pages/admin/users/users' })
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
