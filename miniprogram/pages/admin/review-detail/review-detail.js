const app = getApp()
const AdminAPI = require('../../../utils/admin-api')

Page({
  data: {
    application: {},
    applicantName: '',
    applicantPhone: '',
    classroomInfo: {},
    lecturesStr: '',
    alternatives: [],
    isReviewed: false,
    statusText: '',
    statusBadgeClass: '',
    processing: false,
    canRevoke: false,
    revokeCountdown: '',
    btnApproving: false,
    _countdownTimer: null
  },

  onLoad(options) { this.loadDetail(options.id) },
  onUnload() {
    if (this.data._countdownTimer) clearInterval(this.data._countdownTimer)
  },

  async loadDetail(id) {
    wx.showLoading({ title: '加载中' })
    try {
      const d = await AdminAPI.getApplicationDetail(id)
      const app = d.application || {}
      const reviewed = [1, 2].includes(app.rentalStatus)
      const isApproved = app.rentalStatus === 1
      const statusBadgeClass = isApproved ? 'adm-badge-approved' : 'adm-badge-rejected'
      const statusText = isApproved ? '已通过' : '已拒绝'

      this.setData({
        application: app,
        applicantName: d.applicantName || app.proposerName || '',
        applicantPhone: d.applicantPhone || '',
        classroomInfo: d.classroomInfo || {},
        lecturesStr: d.lecturesStr || '',
        alternatives: d.alternatives || [],
        isReviewed: reviewed,
        statusText: reviewed ? statusText : '',
        statusBadgeClass: reviewed ? statusBadgeClass : ''
      })

      if (isApproved && app.approvedAt) this.initRevokeCountdown(app.approvedAt)
    } catch (err) {
      console.error(err)
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  initRevokeCountdown(approvedAt) {
    const TWO_HOURS = 2 * 60 * 60 * 1000
    const expiresAt = approvedAt + TWO_HOURS

    const update = () => {
      const remaining = expiresAt - Date.now()
      if (remaining <= 0) {
        if (this.data._countdownTimer) { clearInterval(this.data._countdownTimer); this.setData({ _countdownTimer: null }) }
        this.setData({ canRevoke: false, revokeCountdown: '已过撤回时限' })
        return
      }
      const m = Math.floor(remaining / 60000)
      const h = Math.floor(m / 60)
      this.setData({ canRevoke: true, revokeCountdown: `剩余 ${h > 0 ? h + '小时' + (m % 60) + '分' : m + '分'}` })
    }
    update()
    this.setData({ _countdownTimer: setInterval(update, 30000) })
  },

  onApprove() {
    if (this.data.processing || this.data.btnApproving) return
    this.setData({ btnApproving: true })
    wx.showModal({
      title: '确认通过',
      content: '批准该申请？',
      success: async (r) => {
        if (!r.confirm) { this.setData({ btnApproving: false }); return }
        this.setData({ processing: true })
        wx.showLoading({ title: '提交中' })
        try {
          await AdminAPI.approveApplication(this.data.application._id)
          wx.hideLoading()
          this.setData({ processing: false, btnApproving: false })
          wx.showToast({ title: '已通过' })
          setTimeout(() => wx.navigateBack(), 1500)
        } catch (err) {
          wx.hideLoading()
          this.setData({ processing: false, btnApproving: false })
          wx.showToast({ title: err.message || '操作失败', icon: 'none' })
        }
      },
      fail: () => this.setData({ btnApproving: false })
    })
  },

  onReject() {
    if (this.data.processing) return
    this.setData({ processing: true })
    wx.showModal({
      title: '拒绝申请', editable: true, placeholderText: '请输入拒绝原因',
      success: async (r) => {
        if (!r.confirm || !r.content) { this.setData({ processing: false }); return }
        try {
          await AdminAPI.rejectApplication(this.data.application._id, r.content)
          this.setData({ processing: false })
          wx.showToast({ title: '已拒绝' })
          setTimeout(() => wx.navigateBack(), 1500)
        } catch (err) {
          this.setData({ processing: false })
          wx.showToast({ title: err.message || '操作失败', icon: 'none' })
        }
      },
      fail: () => this.setData({ processing: false })
    })
  },

  onRevoke() {
    if (this.data.processing) return
    if (!this.data.canRevoke) { wx.showToast({ title: '已过撤回时限', icon: 'none' }); return }
    wx.showModal({
      title: '撤销审核', content: '撤销后申请将恢复为待审核状态，确认撤销？',
      success: async (r) => {
        if (!r.confirm) return
        this.setData({ processing: true })
        wx.showLoading({ title: '提交中' })
        try {
          await AdminAPI.revokeReview(this.data.application._id)
          if (this.data._countdownTimer) clearInterval(this.data._countdownTimer)
          wx.hideLoading()
          this.setData({ processing: false, canRevoke: false, revokeCountdown: '已撤销', _countdownTimer: null })
          wx.showToast({ title: '已撤销' })
          setTimeout(() => wx.navigateBack(), 1500)
        } catch (err) {
          wx.hideLoading()
          this.setData({ processing: false })
          wx.showToast({ title: err.message || '操作失败', icon: 'none' })
        }
      }
    })
  }
})
