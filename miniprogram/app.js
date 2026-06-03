/**
 * 小程序入口文件
 */
const auth = require('./utils/auth')

App({
  globalData: {
    env: "cloud1-d0gbgetcn91021db4",
    userInfo: null,
    isLoggedIn: false,
    _loginChecked: false,
    appVersion: '1.0.0',
    systemInfo: null,
    config: {
      maxAdvanceDays: 30,
      maxPendingApplications: 5,
      lectureConfig: {
        total: 13,
        times: [
          { index: 0, label: '第1讲', time: '8:00-8:45' },
          { index: 1, label: '第2讲', time: '8:55-9:40' },
          { index: 2, label: '第3讲', time: '9:50-10:35' },
          { index: 3, label: '第4讲', time: '10:45-11:30' },
          { index: 4, label: '第5讲', time: '11:40-12:25' },
          { index: 5, label: '第6讲', time: '14:00-14:45' },
          { index: 6, label: '第7讲', time: '14:50-15:35' },
          { index: 7, label: '第8讲', time: '15:40-16:25' },
          { index: 8, label: '第9讲', time: '16:40-17:25' },
          { index: 9, label: '第10讲', time: '17:30-18:15' },
          { index: 10, label: '第11讲', time: '19:30-20:15' },
          { index: 11, label: '第12讲', time: '20:20-21:05' },
          { index: 12, label: '第13讲', time: '21:10-21:55' }
        ]
      },
      statusMap: {
        application: { 0: '待审核', 1: '已批准', 2: '已拒绝', 3: '已取消', 4: '已完成' },
        classroom: { 0: '空闲', 1: '有课', 2: '已占用' }
      },
      buildings: [
        { id: '一号教学楼', name: '一号教学楼' },
        { id: '二号教学楼', name: '二号教学楼' }
      ]
    }
  },

  onLaunch() {
    this.initCloud()
    this.getSystemInfo()
  },

  onShow() {
    // 全局登录守卫：每次小程序切回前台时检查
    // 未登录且当前不在登录页 → 跳登录页
    setTimeout(() => {
      this.globalLoginGuard()
    }, 100)
  },

  globalLoginGuard() {
    if (!auth.isLoggedIn()) {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      if (!currentPage || currentPage.route !== 'pages/login/index') {
        wx.reLaunch({ url: '/pages/login/index' })
      }
    }
  },

  initCloud() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      env: this.globalData.env,
      traceUser: true
    })
  },

  getSystemInfo() {
    try { this.globalData.systemInfo = wx.getSystemInfoSync() } catch (e) {}
  },

  setUserInfo(info) {
    this.globalData.userInfo = info
    this.globalData.isLoggedIn = !!info
  },

  clearUserInfo() {
    auth.logout()
    this.globalData.userInfo = null
    this.globalData.isLoggedIn = false
  },

  getUserId() { return this.globalData.userInfo?.openid || null },

  showLoading(title = '加载中...') { wx.showLoading({ title, mask: true }) },
  hideLoading() { wx.hideLoading() },
  showToast(title, icon = 'none', duration = 2000) { wx.showToast({ title, icon, duration }) },

  showModal(options) {
    wx.showModal({ title: '提示', showCancel: true, confirmColor: '#1677ff', ...options })
  },

  formatDate(date, format = 'YYYY-MM-DD') {
    const d = typeof date === 'number' ? new Date(date) : new Date(date)
    return format.replace('YYYY', d.getFullYear()).replace('MM', String(d.getMonth() + 1).padStart(2, '0')).replace('DD', String(d.getDate()).padStart(2, '0'))
  },

  getLectureInfo(index) {
    return this.globalData.config.lectureConfig.times.find(l => l.index === index) || null
  },

  getStatusText(type, status) {
    const map = this.globalData.config.statusMap[type]
    return map ? map[status] || '未知状态' : '未知状态'
  }
})
