const app = getApp()
const AdminAPI = require('../../../utils/admin-api')
const ChartHelper = require('../../../utils/chart-helper')

Page({
  data: {
    pendingCount: 0,
    totalClassrooms: 0,
    reviewedCount: 0,
    todayReservations: 0,
    currentDate: '',
    trendData: null,
    heatmapMatrix: [],
    heatmapMaxRate: 0,
    heatmapLabels: ['第1讲', '第2讲', '第3讲', '第4讲', '第5讲', '第6讲', '第7讲', '第8讲', '第9讲', '第10讲', '第11讲', '第12讲', '第13讲'],
    dayLabels: ['周一', '周二', '周三', '周四', '周五'],
    unreadCount: 0,
    unreadBadgeText: '0'
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
    this.loadTrends()
    this.loadHeatmap()
    this.loadNotifications()
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadStats(),
      this.loadTrends(),
      this.loadHeatmap(),
      this.loadNotifications()
    ]).then(() => wx.stopPullDownRefresh())
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
    } catch (err) {
      console.error(err)
    }
  },

  async loadTrends() {
    try {
      const data = await AdminAPI.getAppTrends()
      this.setData({ trendData: data }, () => {
        setTimeout(() => this.drawTrendChart(), 500)
      })
    } catch (err) {
      console.error(err)
    }
  },

  drawTrendChart() {
    const data = this.data.trendData
    if (!data || !data.series) return

    const query = wx.createSelectorQuery()
    query.select('#trendCanvas').node((res) => {
      if (!res || !res.node) {
        setTimeout(() => this.drawTrendChart(), 500)
        return
      }
      const canvas = res.node
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const showCount = 14
      const total = data.dates.length
      const step = Math.max(1, Math.floor(total / showCount))
      const labels = data.dates.filter((_, i) => i % step === 0 || i === total - 1)

      const series = [
        { name: '待审核', color: '#f59e0b', values: data.series.pending },
        { name: '已通过', color: '#22c55e', values: data.series.approved },
        { name: '已拒绝', color: '#ef4444', values: data.series.rejected }
      ]

      ChartHelper.drawLineChart(ctx, canvas, { labels, series }, {
        height: 350,
        padding: { top: 40, right: 20, bottom: 40, left: 55 },
        smooth: true,
        fill: true,
        yLabelCount: 4
      })
    }).exec()
  },

  async loadHeatmap() {
    try {
      const data = await AdminAPI.getHeatmapData()
      const matrix = data.matrix || []
      const maxRate = data.maxRate || 0
      // 扁平化为单层数组，每个格子包含颜色和文字
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
      this.setData({
        heatmapMatrix: cells,
        heatmapMaxRate: maxRate
      })
    } catch (err) {
      console.error(err)
    }
  },

  async loadNotifications() {
    try {
      const unreadRes = await AdminAPI.getAdminUnreadCount()
      const count = (unreadRes && unreadRes.count) || 0
      this.setData({
        unreadCount: count,
        unreadBadgeText: count > 99 ? '99+' : count.toString()
      })
    } catch (err) {
      console.error(err)
    }
  },

  goToDashboard() {},
  goToNotifications() { wx.navigateTo({ url: '/pages/admin/notifications/notifications' }) },
  goToReview() { wx.navigateTo({ url: '/pages/admin/review-list/review-list' }) },
  goToInit() { wx.navigateTo({ url: '/pages/admin/init-data/init-data' }) },
  goToReviewed() { wx.navigateTo({ url: '/pages/admin/review-list/review-list?type=reviewed' }) },
  goToAdminProfile() { wx.navigateTo({ url: '/pages/admin/profile/profile' }) }
})
