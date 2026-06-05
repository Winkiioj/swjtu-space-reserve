const auth = require('../../utils/auth')

Page({
  data: {
    isLoggedIn: false,
    isBound: false,
    avatar: '',
    nickName: '',
    userID: '',
    identityText: '',
    classroomSteps: [
      { num: 1, title: '选择时间', desc: '选择日期、讲次和人数' },
      { num: 2, title: '筛选教室', desc: '按楼栋和容量查找空余教室' },
      { num: 3, title: '提交申请', desc: '填写事由，等待管理员审核' },
      { num: 4, title: '查看结果', desc: '在「我的申请」中跟踪进度' }
    ],
    seatSteps: [
      { num: 1, title: '选择日期', desc: '选择今天或明天' },
      { num: 2, title: '选择讲次', desc: '勾选上午/下午/晚上时段' },
      { num: 3, title: '挑选座位', desc: '按楼层区域查看座位图' },
      { num: 4, title: '确认预约', desc: '点击座位即可立即预约' }
    ]
  },

  onLoad() {
    // 不再在此处 reLaunch —— app.js onLaunch 已统一处理登录守卫
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
    if (!auth.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    wx.switchTab({ url: '/pages/mine/index' })
  },

  onFunc(e) {
    if (!auth.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    const type = e.currentTarget.dataset.type
    if (!this.data.isBound) {
      wx.showModal({
        title: '请先绑定学号',
        content: '使用此功能前需要绑定学号或工号',
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
    if (type === 'classroom') wx.switchTab({ url: '/pages/apply/index' })
    else if (type === 'seat') wx.switchTab({ url: '/pages/seat/seat' })
  },

  onBindBanner() {
    const openid = auth.getUserId()
    if (!openid) return
    wx.navigateTo({ url: '/pages/bind-student/index?openid=' + encodeURIComponent(openid) })
  }
})
