const app = getApp()
const AdminAPI = require('../../../utils/admin-api')

Page({
  data: {
    type: 'pending',
    pageTitle: '待审核申请',
    applications: [],
    showList: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    keyword: '',
    showEmpty: false,
    hasData: false,
    emptyText: ''
  },

  onLoad(options) {
    if (options.type === 'reviewed') {
      this.setData({ type: 'reviewed', pageTitle: '最近已审核' })
      wx.setNavigationBarTitle({ title: '最近已审核' })
    }
  },

  onShow() { this.loadList(true) },
  onPullDownRefresh() { this.loadList(true).then(() => wx.stopPullDownRefresh()) },
  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.loadList() },

  async loadList(reset = false) {
    if (this.data.loading) return
    this.setData({ loading: true })
    if (reset) this.setData({ page: 1, hasMore: true })

    try {
      const fn = this.data.type === 'reviewed'
        ? AdminAPI.getReviewedApplications(reset ? 1 : this.data.page, this.data.pageSize)
        : AdminAPI.getPendingApplications(reset ? 1 : this.data.page, this.data.pageSize)

      const result = await fn
      const list = result.applications || []
      const total = result.total || 0

      const enriched = list.map(item => this._enrich(item))
      const merged = reset ? enriched : this.data.applications.concat(enriched)

      this.setData({
        applications: merged,
        page: reset ? 2 : this.data.page + 1,
        hasMore: merged.length < total,
        loading: false,
        hasData: merged.length > 0
      })
      this.filterApps()
    } catch (err) {
      console.error(err)
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  _enrich(item) {
    const totalMinutes = Math.floor((item.revokeRemainingMs || 0) / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    let revokeText = ''
    if (item.canRevoke && item.revokeRemainingMs > 0) {
      revokeText = hours > 0 ? `剩余${hours}h${minutes}m` : `剩余${minutes}分钟`
    }

    const isPending = this.data.type !== 'reviewed'
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

  _formatCountdown(ms) {
    const totalMinutes = Math.floor(ms / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours > 0) return `剩余${hours}h${minutes}m`
    return `剩余${minutes}分钟`
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
      emptyText: kw ? '未找到匹配的申请' : (this.data.type === 'reviewed' ? '暂无已审核记录' : '暂无待审核申请')
    })
  },

  clearSearch() {
    this.setData({ keyword: '' })
    this.filterApps()
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/admin/review-detail/review-detail?id=${id}` })
  }
})
