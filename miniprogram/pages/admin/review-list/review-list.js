const app = getApp()
const AdminAPI = require('../../../utils/admin-api')

Page({
  data: {
    type: 'pending',    // pending | reviewed
    pageTitle: '待审核申请',
    applications: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false
  },

  onLoad(options) {
    if (options.type === 'reviewed') {
      this.setData({
        type: 'reviewed',
        pageTitle: '最近已审核'
      })
      wx.setNavigationBarTitle({ title: '最近已审核' })
    }
  },

  onShow() {
    this.loadList(true)
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
      const fn = this.data.type === 'reviewed'
        ? AdminAPI.getReviewedApplications(reset ? 1 : this.data.page, this.data.pageSize)
        : AdminAPI.getPendingApplications(reset ? 1 : this.data.page, this.data.pageSize)

      const result = await fn
      const list = result.applications || []
      const total = result.total || 0

      this.setData({
        applications: reset ? list : this.data.applications.concat(list),
        page: reset ? 2 : this.data.page + 1,
        hasMore: this.data.applications.length + list.length < total,
        loading: false
      })
    } catch (err) {
      console.error(err)
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/admin/review-detail/review-detail?id=${id}` })
  }
})
