const auth = require('../../utils/auth')

Page({
  data: {
    isLoggedIn: false,
    isBound: false,
    avatar: '',
    nickName: '',
    userID: '',
    identityText: '',
    steps: [
      { num: 1, title: '登录授权', desc: '微信授权头像和昵称' },
      { num: 2, title: '绑定学号', desc: '在我的页面绑定学号/工号' },
      { num: 3, title: '选择教室', desc: '按时间和容量筛选可用教室' },
      { num: 4, title: '提交申请', desc: '填写事由，等待管理员审核' }
    ]
  },

  onLoad() {
    if (!auth.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    this.loadInfo()
  },
  onShow() { this.loadInfo() },

  loadInfo() {
    const info = auth.getUserInfo()
    if (info && info.openid) {
      this.setData({
        isLoggedIn: true,
        isBound: info.isBound || false,
        avatar: info.avatarUrl || '',
        nickName: info.nickName || info.userName || '',
        userID: info.userID || '',
        identityText: this.idt(info.identity)
      })
    } else {
      this.setData({ isLoggedIn: false, isBound: false })
    }
  },

  idt(i) {
    const m = { student: '学生', teacher: '教师', admin: '管理员' }
    return m[i] || '学生'
  },

  onUserTap() {
    wx.switchTab({ url: '/pages/mine/index' })
  },

  onFunc(e) {
    const type = e.currentTarget.dataset.type
    if (type === 'classroom' && !this.data.isBound) {
      wx.showModal({
        title: '请先绑定学号',
        content: '使用借教室功能前需要绑定学号或工号',
        confirmText: '去绑定',
        cancelText: '取消',
        confirmColor: '#1677ff',
        success: r => {
          if (r.confirm) {
            const openid = auth.getUserId()
            wx.navigateTo({ url: '/pages/bind-student/index?openid=' + encodeURIComponent(openid || '') })
          }
        }
      })
      return
    }
    if (type === 'classroom') wx.navigateTo({ url: '/pages/apply/index' })
    else if (type === 'seat') wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  onBindBanner() {
    const openid = auth.getUserId()
    if (!openid) return
    wx.navigateTo({ url: '/pages/bind-student/index?openid=' + encodeURIComponent(openid) })
  }
})
