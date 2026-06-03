const app = getApp()

Page({
  data: {
    userID: '',
    loading: false
  },

  onInput(e) {
    this.setData({ userID: e.detail.value })
  },

  async doLogin() {
    const userID = this.data.userID.trim()
    if (!userID) {
      wx.showToast({ title: '请输入工号/学号', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    wx.showLoading({ title: '登录中' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'getUserByID',
        data: { userID }
      })
      wx.hideLoading()
      this.setData({ loading: false })

      if (res.result.code === 0 && res.result.data) {
        const user = res.result.data
        app.globalData.currentUserID = user.userID
        app.globalData.userRole = user.identity

        if (user.isBlacklisted) {
          wx.showToast({ title: '账号已被禁用', icon: 'none' })
          return
        }

        if (user.identity === 'admin') {
          wx.redirectTo({ url: '/pages/admin/dashboard/dashboard' })
        } else {
          wx.switchTab({ url: '/pages/index/index' })
        }
      } else {
        wx.showToast({ title: res.result.message || '登录失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      this.setData({ loading: false })
      console.error(err)
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  }
})
