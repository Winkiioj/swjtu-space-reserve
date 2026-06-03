const PERIOD_MAP = {
  morning: { indices: [0, 1, 2, 3, 4], label: '上午', icon: '🌅', time: '08:00 - 12:25' },
  afternoon: { indices: [5, 6, 7, 8, 9], label: '下午', icon: '☀️', time: '14:00 - 18:15' },
  evening: { indices: [10, 11, 12], label: '晚上', icon: '🌙', time: '19:30 - 21:55' }
}

const auth = require('../../utils/auth')
const app = getApp()

Page({
  data: {
    todayDate: '',
    tomorrowDate: '',
    dayType: 'this',
    selectedLectures: [],
    morningLectures: [],
    afternoonLectures: [],
    eveningLectures: [],
    periodStates: { morning: false, afternoon: false, evening: false },
    periodCounts: { morning: 0, afternoon: 0, evening: 0 }
  },

  onLoad() {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    this.setData({
      todayDate: this.formatDate(today),
      tomorrowDate: this.formatDate(tomorrow)
    })
    this.buildLectureGroups()
  },

  onShow() {
    if (!auth.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    if (!auth.isBound()) {
      wx.showModal({
        title: '请先绑定学号',
        content: '使用座位预约功能前需要绑定学号或工号',
        confirmText: '去绑定',
        cancelText: '返回首页',
        confirmColor: '#1677ff',
        success: r => {
          if (r.confirm) {
            const openid = auth.getUserId()
            wx.navigateTo({ url: '/pages/bind-student/index?openid=' + encodeURIComponent(openid || '') })
          } else {
            wx.switchTab({ url: '/pages/index/index' })
          }
        }
      })
    }
  },

  formatDate(date) {
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const d = date.getDate().toString().padStart(2, '0')
    return `${y}-${m}-${d}`
  },

  /**
   * 从全局配置构建讲次分组，每个 item 自带 isSelected 标记
   * WXML 只读 item.isSelected，不做 indexOf 运算，避免模板引擎兼容性问题
   */
  buildLectureGroups() {
    const config = app.globalData.config.lectureConfig.times
    const all = config.map(t => ({
      index: t.index,
      label: t.label,
      time: t.time,
      isSelected: false
    }))
    this.setData({
      morningLectures: all.filter(t => t.index >= 0 && t.index <= 4),
      afternoonLectures: all.filter(t => t.index >= 5 && t.index <= 9),
      eveningLectures: all.filter(t => t.index >= 10 && t.index <= 12)
    })
  },

  /**
   * 同步 selectedLectures 到各分组 item.isSelected，刷新 UI
   */
  _syncSelectionToItems(selected) {
    const mark = (arr) => arr.map(item => ({
      ...item,
      isSelected: selected.indexOf(item.index) !== -1
    }))
    this.setData({
      morningLectures: mark(this.data.morningLectures),
      afternoonLectures: mark(this.data.afternoonLectures),
      eveningLectures: mark(this.data.eveningLectures)
    })
  },

  updatePeriodStates() {
    const { selectedLectures } = this.data
    const morning = PERIOD_MAP.morning.indices.every(i => selectedLectures.indexOf(i) !== -1)
    const afternoon = PERIOD_MAP.afternoon.indices.every(i => selectedLectures.indexOf(i) !== -1)
    const evening = PERIOD_MAP.evening.indices.every(i => selectedLectures.indexOf(i) !== -1)
    const morningCount = PERIOD_MAP.morning.indices.filter(i => selectedLectures.indexOf(i) !== -1).length
    const afternoonCount = PERIOD_MAP.afternoon.indices.filter(i => selectedLectures.indexOf(i) !== -1).length
    const eveningCount = PERIOD_MAP.evening.indices.filter(i => selectedLectures.indexOf(i) !== -1).length
    this.setData({
      periodStates: { morning, afternoon, evening },
      periodCounts: { morning: morningCount, afternoon: afternoonCount, evening: eveningCount }
    })
  },

  togglePeriod(e) {
    const period = e.currentTarget.dataset.period
    const indices = PERIOD_MAP[period].indices
    const { selectedLectures } = this.data
    const allSelected = indices.every(i => selectedLectures.indexOf(i) !== -1)
    let newSelected
    if (allSelected) {
      newSelected = selectedLectures.filter(i => indices.indexOf(i) === -1)
    } else {
      const set = new Set(selectedLectures)
      indices.forEach(i => set.add(i))
      newSelected = Array.from(set)
    }
    this.setData({ selectedLectures: newSelected })
    this._syncSelectionToItems(newSelected)
    this.updatePeriodStates()
  },

  /**
   * 单个讲次点击切换
   */
  onLectureChange(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    let { selectedLectures } = this.data
    const idx = selectedLectures.indexOf(index)
    if (idx !== -1) {
      selectedLectures = selectedLectures.filter(i => i !== index)
    } else {
      selectedLectures = [...selectedLectures, index]
    }
    this.setData({ selectedLectures })
    this._syncSelectionToItems(selectedLectures)
    this.updatePeriodStates()
  },

  onDateChange(e) {
    this.setData({ dayType: e.detail.value })
  },

  searchSeats() {
    if (this.data.selectedLectures.length === 0) {
      wx.showToast({ title: '请至少选择一个讲次', icon: 'none' })
      return
    }
    const { dayType, selectedLectures, todayDate, tomorrowDate } = this.data
    const dateStr = dayType === 'this' ? todayDate : tomorrowDate
    wx.navigateTo({
      url: `/pages/seat-result/seat-result?dayType=${dayType}&lectures=${selectedLectures.join(',')}&dateStr=${dateStr}`
    })
  },

  goToMyReservations() {
    wx.navigateTo({ url: '/pages/my-reservations/my-reservations' })
  }
})
