const app = getApp()
const AdminAPI = require('../../../utils/admin-api')

Page({
  data: {
    application: null,
    applicantPhone: '',
    classroomInfo: null,
    lecturesStr: '',
    alternatives: [],
    selectedAlternativeId: '',
    processing: false
  },

  onLoad(options) {
    this.loadDetail(options.id)
  },

  async loadDetail(id) {
    wx.showLoading({ title: '加载中' })
    try {
      const d = await AdminAPI.getApplicationDetail(id)
      this.setData({
        application: d.application,
        applicantPhone: d.applicantPhone,
        classroomInfo: d.classroomInfo,
        lecturesStr: d.lecturesStr,
        alternatives: d.alternatives,
        selectedAlternativeId: d.alternatives[0]?._id || ''
      })
    } catch (err) {
      console.error(err)
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  onSelectAlternative(e) {
    this.setData({ selectedAlternativeId: e.detail.value })
  },

  async approve() {
    if (this.data.processing) return
    const finalClassroomId = this.data.selectedAlternativeId || this.data.classroomInfo._id

    const that = this
    wx.showModal({
      title: '确认通过',
      content: finalClassroomId !== this.data.classroomInfo._id
        ? '已选择替代教室，确认通过吗？'
        : '批准后教室讲次将被占用，确认通过吗？',
      success: async (res) => {
        if (res.confirm) {
          that.setData({ processing: true })
          wx.showLoading({ title: '提交中' })
          try {
            const result = await AdminAPI.approveApplication(
              that.data.application._id,
              finalClassroomId
            )
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
  }
})
