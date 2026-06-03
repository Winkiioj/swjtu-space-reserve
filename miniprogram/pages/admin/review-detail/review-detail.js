const app = getApp()
const AdminAPI = require('../../../utils/admin-api')

Page({
  data: {
    application: null,
    applicantPhone: '',
    classroomInfo: null,
    lecturesStr: '',
    alternatives: [],
    isReviewed: false,
    statusText: '',
    processing: false
  },

  onLoad(options) {
    this.loadDetail(options.id)
  },

  async loadDetail(id) {
    wx.showLoading({ title: '加载中' })
    try {
      const d = await AdminAPI.getApplicationDetail(id)
      const app = d.application
      const reviewed = [1, 2].includes(app.rentalStatus)
      const statusMap = { 1: '已通过', 2: '已拒绝' }
      this.setData({
        application: app,
        applicantPhone: d.applicantPhone,
        classroomInfo: d.classroomInfo,
        lecturesStr: d.lecturesStr,
        alternatives: d.alternatives,
        isReviewed: reviewed,
        statusText: statusMap[app.rentalStatus] || ''
      })
    } catch (err) {
      console.error(err)
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  async approve() {
    if (this.data.processing) return
    const that = this
    wx.showModal({
      title: '确认通过',
      content: `批准 ${that.data.classroomInfo.buildingBelong} ${that.data.classroomInfo.classroomID}？`,
      success: async (res) => {
        if (res.confirm) {
          that.setData({ processing: true })
          wx.showLoading({ title: '提交中' })
          try {
            // 不传 approvedClassroomId，使用原教室
            await AdminAPI.approveApplication(that.data.application._id)
            wx.hideLoading()
            that.setData({ processing: false })
            wx.showToast({ title: '已通过' })
            setTimeout(() => wx.navigateBack(), 1500)
          } catch (err) {
            wx.hideLoading()
            that.setData({ processing: false })
            wx.showToast({ title: err.message || '操作失败', icon: 'none' })
          }
        }
      }
    })
  },

  rejectWithRecommend() {
    if (this.data.processing) return
    const alts = this.data.alternatives
    const itemList = alts.map(a => `${a.buildingBelong} ${a.classroomID}（${a.containNumber}人）`)
    const that = this

    wx.showActionSheet({
      itemList,
      success(res) {
        // 已选替代教室显示在下方"推荐替代教室"区域，不重复写入拒绝原因
        wx.showModal({
          title: '拒绝申请',
          editable: true,
          placeholderText: '请输入拒绝原因',
          success: async (r) => {
            if (r.confirm) {
              if (!r.content) {
                wx.showToast({ title: '请填写拒绝原因', icon: 'none' })
                return
              }
              that.setData({ processing: true })
              wx.showLoading({ title: '提交中' })
              try {
                await AdminAPI.rejectApplication(that.data.application._id, r.content)
                wx.hideLoading()
                that.setData({ processing: false })
                wx.showToast({ title: '已拒绝' })
                setTimeout(() => wx.navigateBack(), 1500)
              } catch (err) {
                wx.hideLoading()
                that.setData({ processing: false })
                wx.showToast({ title: err.message || '操作失败', icon: 'none' })
              }
            }
          }
        })
      }
    })
  },

  async reject() {
    if (this.data.processing) return

    const that = this
    wx.showModal({
      title: '拒绝申请',
      editable: true,
      placeholderText: '请输入拒绝原因',
      success: async (res) => {
        if (res.confirm) {
          if (!res.content) {
            wx.showToast({ title: '请填写拒绝原因', icon: 'none' })
            return
          }
          that.setData({ processing: true })
          wx.showLoading({ title: '提交中' })
          try {
            await AdminAPI.rejectApplication(that.data.application._id, res.content)
            wx.hideLoading()
            that.setData({ processing: false })
            wx.showToast({ title: '已拒绝' })
            setTimeout(() => wx.navigateBack(), 1500)
          } catch (err) {
            wx.hideLoading()
            that.setData({ processing: false })
            wx.showToast({ title: err.message || '操作失败', icon: 'none' })
          }
        }
      }
    })
  },

  async revoke() {
    if (this.data.processing) return
    const that = this
    wx.showModal({
      title: '撤销审核',
      content: '撤销后申请将恢复为待审核状态，确认撤销？',
      success: async (res) => {
        if (res.confirm) {
          that.setData({ processing: true })
          wx.showLoading({ title: '提交中' })
          try {
            await AdminAPI.revokeReview(that.data.application._id)
            wx.hideLoading()
            that.setData({ processing: false })
            wx.showToast({ title: '已撤销' })
            setTimeout(() => wx.navigateBack(), 1500)
          } catch (err) {
            wx.hideLoading()
            that.setData({ processing: false })
            wx.showToast({ title: err.message || '操作失败', icon: 'none' })
          }
        }
      }
    })
  }
})
