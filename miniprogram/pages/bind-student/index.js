const app = getApp()
const auth = require('../../utils/auth')
const api = require('../../utils/api')

Page({
  data: { openid: '', userID: '', loading: false },

  onLoad(opts) {
    this.setData({ openid: decodeURIComponent(opts.openid || '') })
  },

  onInput(e) { this.setData({ userID: e.detail.value }) },

  async onSubmit() {
    const { openid, userID } = this.data
    if (!userID.trim()) { wx.showToast({ title: '请输入学号或工号', icon: 'none' }); return }
    if (!openid) { wx.showToast({ title: '身份信息丢失，请重新登录', icon: 'none' }); return }

    this.setData({ loading: true })
    try {
      const result = await api.user.bindStudentId(openid, userID.trim())
      auth.setLoginStatus(result)
      app.setUserInfo(result)
      wx.showToast({ title: '绑定成功', icon: 'success', duration: 1000 })
      setTimeout(() => wx.navigateBack(), 800)
    } catch (err) {
      wx.showToast({ title: err.message || '绑定失败', icon: 'none', duration: 2500 })
    } finally {
      this.setData({ loading: false })
    }
  }
})
