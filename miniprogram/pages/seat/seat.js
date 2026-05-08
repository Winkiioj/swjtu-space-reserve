// miniprogram/pages/seat/seat.js
Page({
  data: {
    todayDate: '',
    tomorrowDate: '',
    dayType: 'this',
    selectedLectures: [],
    // 讲次分组数据（用于渲染）
    morningLectures: [],
    afternoonLectures: [],
    eveningLectures: [],
    // 原始座位数据（从云函数返回）
    seatsRaw: [],
    // 筛选相关
    floors: [],           // 所有楼层（如['2','3']）
    currentFloor: '',
    currentFloorAreas: [], // 当前楼层下的所有区域
    currentArea: '',
    filteredSeats: [],    // 筛选后显示的座位
    // 辅助标志
    queried: false
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
    const m = (date.getMonth()+1).toString().padStart(2,'0')
    const d = date.getDate().toString().padStart(2,'0')
    return `${y}-${m}-${d}`
  },

  // 构建分组讲次（只显示节次，首尾标注时间）
  buildLectureGroups() {
    // 上午：索引 0~4，首 8:00-8:45，尾 11:40-12:25
    const morning = [
      { index: 0, label: '第1讲 (8:00-8:45)' },
      { index: 1, label: '第2讲' },
      { index: 2, label: '第3讲' },
      { index: 3, label: '第4讲' },
      { index: 4, label: '第5讲 (11:40-12:25)' }
    ]
    // 下午：索引 5~9，首 14:00-14:45，尾 17:30-18:15
    const afternoon = [
      { index: 5, label: '第6讲 (14:00-14:45)' },
      { index: 6, label: '第7讲' },
      { index: 7, label: '第8讲' },
      { index: 8, label: '第9讲' },
      { index: 9, label: '第10讲 (17:30-18:15)' }
    ]
    // 晚上：索引 10~12，首 19:30-20:15，尾 21:10-21:55
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

  // 讲次选择（三个 checkbox-group 共用同一个事件）
  onLectureChange(e) {
    // e.detail.value 是所有被选中的 checkbox 的 value 数组（字符串形式）
    const indices = e.detail.value.map(v => parseInt(v))
    this.setData({ selectedLectures: indices })
    console.log('选中的讲次索引:', indices)
  },

  // 查询空闲座位
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
        const seats = res.result.data
        // 解析所有可用的楼层和区域
        const floorsSet = new Set()
        const areaMap = new Map() // key: 楼层, value: Set(区域)
        seats.forEach(seat => {
          const area = seat.areaBelong   // 如 "2A"
          if (area && area.length >= 2) {
            const floor = area.charAt(0)
            const areaLetter = area.charAt(1)
            floorsSet.add(floor)
            if (!areaMap.has(floor)) areaMap.set(floor, new Set())
            areaMap.get(floor).add(areaLetter)
          }
        })
        const floors = Array.from(floorsSet).sort()
        // 转换为方便渲染的格式
        const floorAreas = {}
        floors.forEach(floor => {
          floorAreas[floor] = Array.from(areaMap.get(floor) || []).sort()
        })
        this.setData({
          seatsRaw: seats,
          floors: floors,
          floorAreas: floorAreas,
          currentFloor: floors.length > 0 ? floors[0] : '',
          currentArea: '',
          filteredSeats: [],
          queried: true
        })
        // 自动触发区域列表生成（但不自动显示座位，等用户确认）
        this.updateCurrentFloorAreas()
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
        this.setData({ seatsRaw: [], filteredSeats: [], queried: true })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error(err)
      wx.showToast({ title: '网络错误，请重试', icon: 'none' })
    })
  },

  // 根据当前楼层更新可选的区域列表
  updateCurrentFloorAreas() {
    const { currentFloor, floorAreas } = this.data
    if (!currentFloor || !floorAreas[currentFloor]) {
      this.setData({ currentFloorAreas: [], currentArea: '' })
      return
    }
    const areas = floorAreas[currentFloor]
    this.setData({
      currentFloorAreas: areas,
      currentArea: areas.length > 0 ? areas[0] : ''
    })
  },

  // 选择楼层
  selectFloor(e) {
    const floor = e.currentTarget.dataset.floor
    this.setData({ currentFloor: floor, currentArea: '' })
    this.updateCurrentFloorAreas()
  },

  // 选择区域
  selectArea(e) {
    const area = e.currentTarget.dataset.area
    this.setData({ currentArea: area })
  },

  // 应用筛选，显示座位
  applyFilter() {
    const { seatsRaw, currentFloor, currentArea } = this.data
    if (!currentFloor || !currentArea) {
      wx.showToast({ title: '请选择楼层和区域', icon: 'none' })
      return
    }
    const targetArea = currentFloor + currentArea
    const filtered = seatsRaw.filter(seat => seat.areaBelong === targetArea)
    this.setData({ filteredSeats: filtered })
    if (filtered.length === 0) {
      wx.showToast({ title: '该区域暂无空闲座位', icon: 'none' })
    }
  },

  // 预约座位
  reserveSeat(e) {
    const seat = e.currentTarget.dataset.seat
    const lectures = this.data.selectedLectures
    wx.showModal({
      title: '确认预约',
      content: `座位 ${seat.seatID}（${seat.areaBelong}区），讲次 ${lectures.map(l=>l+1).join(',')}，是否确认？`,
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
              // 预约成功后重新查询座位，刷新列表
              this.searchSeats()
            } else {
              wx.showToast({ title: result.result.message, icon: 'none' })
            }
          }).catch(err => {
            wx.hideLoading()
            console.error(err)
            wx.showToast({ title: '预约失败', icon: 'none' })
          })
        }
      }
    })
  }
})