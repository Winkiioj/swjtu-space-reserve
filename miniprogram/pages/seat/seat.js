const PERIOD_MAP = {
  morning: { indices: [0, 1, 2, 3, 4] },
  afternoon: { indices: [5, 6, 7, 8, 9] },
  evening: { indices: [10, 11, 12] }
}

Page({
  data: {
    todayDate: '',
    tomorrowDate: '',
    dayType: 'this',
    selectedLectures: [],
    morningLectures: [],
    afternoonLectures: [],
    eveningLectures: [],
    periodStates: { morning: false, afternoon: false, evening: false }
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

  formatDate(date) {
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const d = date.getDate().toString().padStart(2, '0')
    return `${y}-${m}-${d}`
  },

  updatePeriodStates() {
    const { selectedLectures } = this.data
    const morning = PERIOD_MAP.morning.indices.every(i => selectedLectures.indexOf(i) !== -1)
    const afternoon = PERIOD_MAP.afternoon.indices.every(i => selectedLectures.indexOf(i) !== -1)
    const evening = PERIOD_MAP.evening.indices.every(i => selectedLectures.indexOf(i) !== -1)
    this.setData({ periodStates: { morning, afternoon, evening } })
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
    this.updatePeriodStates()
  },

  buildLectureGroups() {
    const morning = [
      { index: 0, label: '第1讲 (8:00-8:45)' },
      { index: 1, label: '第2讲' },
      { index: 2, label: '第3讲' },
      { index: 3, label: '第4讲' },
      { index: 4, label: '第5讲 (11:40-12:25)' }
    ]
    const afternoon = [
      { index: 5, label: '第6讲 (14:00-14:45)' },
      { index: 6, label: '第7讲' },
      { index: 7, label: '第8讲' },
      { index: 8, label: '第9讲' },
      { index: 9, label: '第10讲 (17:30-18:15)' }
    ]
    const evening = [
      { index: 10, label: '第11讲 (19:30-20:15)' },
      { index: 11, label: '第12讲' },
      { index: 12, label: '第13讲 (21:10-21:55)' }
    ]
    this.setData({
      morningLectures: morning,
      afternoonLectures: afternoon,
      eveningLectures: evening
    })
  },

  onMorningChange(e) {
    const morning = e.detail.value.map(v => parseInt(v))
    const others = this.data.selectedLectures.filter(i => i >= 5)
    this.setData({ selectedLectures: [...morning, ...others] })
    this.updatePeriodStates()
  },

  onAfternoonChange(e) {
    const afternoon = e.detail.value.map(v => parseInt(v))
    const others = this.data.selectedLectures.filter(i => i < 5 || i >= 10)
    this.setData({ selectedLectures: [...afternoon, ...others] })
    this.updatePeriodStates()
  },

  onEveningChange(e) {
    const evening = e.detail.value.map(v => parseInt(v))
    const others = this.data.selectedLectures.filter(i => i < 10)
    this.setData({ selectedLectures: [...evening, ...others] })
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
