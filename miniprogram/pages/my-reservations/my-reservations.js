const LECTURE_LABELS = [
  '第1讲 (08:00-08:45)', '第2讲 (08:55-09:40)', '第3讲 (09:50-10:35)',
  '第4讲 (10:45-11:30)', '第5讲 (11:40-12:25)', '第6讲 (14:00-14:45)',
  '第7讲 (14:50-15:35)', '第8讲 (15:40-16:25)', '第9讲 (16:40-17:25)',
  '第10讲 (17:30-18:15)', '第11讲 (19:30-20:15)', '第12讲 (20:20-21:05)',
  '第13讲 (21:10-21:55)'
]

Page({
  data: {
    reservations: [],
    loading: true
  },

  onShow() {
    this.loadReservations()
  },

  loadReservations() {
    this.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'getUserReservations'
    }).then(res => {
      this.setData({ loading: false })
      if (res.result.code === 0) {
        // 格式化讲次显示
        const list = res.result.data.map(r => ({
          ...r,
          lecturesLabel: r.lectures.map(i => LECTURE_LABELS[i]).join('、')
        }))
        this.setData({ reservations: list })
      } else {
        wx.showToast({ title: res.result.message || '加载失败', icon: 'none' })
      }
    }).catch(err => {
      this.setData({ loading: false })
      console.error(err)
      wx.showToast({ title: '网络错误', icon: 'none' })
    })
  },

  cancelReservation(e) {
    const reservation = e.currentTarget.dataset.item
    wx.showModal({
      title: '取消预约',
      content: `确定取消座位 ${reservation.seatID} 的预约吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' })
          wx.cloud.callFunction({
            name: 'cancelReservation',
            data: { reservationId: reservation._id }
          }).then(result => {
            wx.hideLoading()
            if (result.result.code === 0) {
              wx.showToast({ title: '已取消', icon: 'success' })
              this.loadReservations()
            } else {
              wx.showToast({ title: result.result.message, icon: 'none' })
            }
          }).catch(err => {
            wx.hideLoading()
            console.error(err)
            wx.showToast({ title: '取消失败', icon: 'none' })
          })
        }
      }
    })
  }
})
