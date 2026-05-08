// miniprogram/pages/seat/seat.js
Page({
  data: {
    todayDate: '',
    tomorrowDate: '',
    dayType: 'this',
    selectedLectures: [],
    lectures: [
      {index:0, time:'8:00-8:45'}, {index:1, time:'8:55-9:40'},
      {index:2, time:'9:50-10:35'}, {index:3, time:'10:45-11:30'},
      {index:4, time:'11:40-12:25'}, {index:5, time:'14:00-14:45'},
      {index:6, time:'14:50-15:35'}, {index:7, time:'15:40-16:25'},
      {index:8, time:'16:40-17:25'}, {index:9, time:'17:30-18:15'},
      {index:10, time:'19:30-20:15'}, {index:11, time:'20:20-21:05'},
      {index:12, time:'21:10-21:55'}
    ],
    seats: []
  },

  onLoad() {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    this.setData({
      todayDate: this.formatDate(today),
      tomorrowDate: this.formatDate(tomorrow)
    })
  },

  formatDate(date) {
    const y = date.getFullYear()
    const m = (date.getMonth()+1).toString().padStart(2,'0')
    const d = date.getDate().toString().padStart(2,'0')
    return `${y}-${m}-${d}`
  },

  onDateChange(e) {
    this.setData({ dayType: e.detail.value })
  },

  onLectureChange(e) {
    const indices = e.detail.value.map(v => parseInt(v))
    this.setData({ selectedLectures: indices })
  },

  searchSeats() {
    if (this.data.selectedLectures.length === 0) {
      wx.showToast({ title: '请至少选择一个讲次', icon: 'none' })
      return
    }
    wx.showLoading({ title: '查询中' })
    wx.cloud.callFunction({
      name: 'searchAvailableSeats',
      data: {
        dayType: this.data.dayType,
        lectures: this.data.selectedLectures
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.code === 0) {
        this.setData({ seats: res.result.data })
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error(err)
    })
  },

  reserveSeat(e) {
    const seat = e.currentTarget.dataset.seat
    const lectures = this.data.selectedLectures
    wx.showModal({
      title: '确认预约',
      content: `座位 ${seat.seatID}，讲次 ${lectures.map(l=>l+1).join(',')}，是否确认？`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '预约中' })
          wx.cloud.callFunction({
            name: 'occupySeat',
            data: {
              seatId: seat._id,
              dayType: this.data.dayType,
              lectures: lectures
            }
          }).then(result => {
            wx.hideLoading()
            if (result.result.code === 0) {
              wx.showToast({ title: '预约成功' })
              this.searchSeats()  // 刷新列表
            } else {
              wx.showToast({ title: result.result.message, icon: 'none' })
            }
          }).catch(err => {
            wx.hideLoading()
            console.error(err)
          })
        }
      }
    })
  }
})