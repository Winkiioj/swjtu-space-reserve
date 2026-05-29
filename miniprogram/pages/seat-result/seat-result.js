Page({
  data: {
    dayType: '',
    selectedLectures: [],
    dateStr: '',
    // 查询结果
    seatsRaw: [],
    // 筛选相关
    floors: [],
    floorAreas: {},
    currentFloor: '',
    currentFloorAreas: [],
    currentArea: '',
    // 座位地图
    mapSeats: [],
    showMap: false,
    mapAreaLabel: '',
    // 收藏
    favorites: [],
    isCurrentFav: false,
    // 辅助
    queried: false
  },

  onLoad(options) {
    const lectures = options.lectures ? options.lectures.split(',').map(Number) : []
    this.setData({
      dayType: options.dayType || 'this',
      selectedLectures: lectures,
      dateStr: options.dateStr || ''
    })
    const saved = wx.getStorageSync('favoriteAreas') || []
    this.setData({ favorites: saved })
    this.searchSeats()
  },

  goBack() {
    wx.navigateBack()
  },

  searchSeats() {
    wx.showLoading({ title: '查询中...' })
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
        const floorsSet = new Set()
        const areaMap = new Map()
        seats.forEach(seat => {
          const area = seat.areaBelong
          if (area && area.length >= 2) {
            const floor = area.charAt(0)
            const areaLetter = area.charAt(1)
            floorsSet.add(floor)
            if (!areaMap.has(floor)) areaMap.set(floor, new Set())
            areaMap.get(floor).add(areaLetter)
          }
        })
        const floors = Array.from(floorsSet).sort()
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
          queried: true,
          showMap: false,
          mapSeats: []
        })
        this.updateCurrentFloorAreas()
        this.updateIsCurrentFav()
      } else {
        wx.showToast({ title: res.result.message, icon: 'none' })
        this.setData({ seatsRaw: [], queried: true })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error(err)
      wx.showToast({ title: '网络错误，请重试', icon: 'none' })
    })
  },

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

  updateIsCurrentFav() {
    const { currentFloor, currentArea, favorites } = this.data
    if (!currentFloor || !currentArea) {
      this.setData({ isCurrentFav: false })
      return
    }
    const key = currentFloor + currentArea
    this.setData({ isCurrentFav: favorites.some(f => f.value === key) })
  },

  selectFloor(e) {
    const floor = e.currentTarget.dataset.floor
    this.setData({ currentFloor: floor, currentArea: '', showMap: false, mapSeats: [] })
    this.updateCurrentFloorAreas()
    this.updateIsCurrentFav()
  },

  selectArea(e) {
    const area = e.currentTarget.dataset.area
    this.setData({ currentArea: area, showMap: false, mapSeats: [] })
    this.updateIsCurrentFav()
  },

  toggleFavorite() {
    const { currentFloor, currentArea, favorites } = this.data
    if (!currentFloor || !currentArea) {
      wx.showToast({ title: '请先选择楼层和区域', icon: 'none' })
      return
    }
    const key = currentFloor + currentArea
    const label = currentFloor + '楼' + currentArea + '区'
    const idx = favorites.findIndex(f => f.value === key)
    let newFav
    if (idx !== -1) {
      newFav = favorites.filter((_, i) => i !== idx)
      wx.showToast({ title: '已取消收藏 ' + label, icon: 'none' })
    } else {
      newFav = [...favorites, { value: key, label }]
      wx.showToast({ title: '已收藏 ' + label, icon: 'success' })
    }
    wx.setStorageSync('favoriteAreas', newFav)
    this.setData({ favorites: newFav, isCurrentFav: idx === -1 })
  },

  loadFavorite(e) {
    const fav = e.currentTarget.dataset.fav
    const floor = fav.value.charAt(0)
    const area = fav.value.charAt(1)
    this.setData({
      currentFloor: floor,
      currentArea: area,
      showMap: false,
      mapSeats: []
    })
    this.updateCurrentFloorAreas()
    this.updateIsCurrentFav()
    this.loadAreaMap()
  },

  loadAreaMap() {
    const { currentFloor, currentArea, selectedLectures, dayType } = this.data
    if (!currentFloor || !currentArea) {
      wx.showToast({ title: '请选择楼层和区域', icon: 'none' })
      return
    }
    const areaBelong = currentFloor + currentArea
    wx.showLoading({ title: '加载座位图...' })
    wx.cloud.callFunction({
      name: 'getAreaSeats',
      data: { areaBelong, dayType, selectedLectures }
    }).then(res => {
      wx.hideLoading()
      if (res.result.code === 0) {
        this.setData({
          mapSeats: res.result.data,
          mapAreaLabel: areaBelong,
          showMap: true
        })
      } else {
        wx.showToast({ title: res.result.message || '加载失败', icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error(err)
      wx.showToast({ title: '网络错误，请重试', icon: 'none' })
    })
  },

  reserveSeat(e) {
    const seat = e.currentTarget.dataset.seat
    if (seat.isAvailable === false) return
    const lectures = this.data.selectedLectures
    wx.showModal({
      title: '确认预约',
      content: `座位 ${seat.seatID}（${seat.areaBelong}区），讲次 ${lectures.map(l => l + 1).join(',')}，是否确认？`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '预约中...' })
          wx.cloud.callFunction({
            name: 'occupySeat',
            data: {
              seatId: seat._id,
              dayType: this.data.dayType,
              lectures: lectures,
              date: this.data.dateStr
            }
          }).then(result => {
            wx.hideLoading()
            if (result.result.code === 0) {
              wx.showToast({ title: '预约成功', icon: 'success' })
              if (this.data.showMap) {
                this.loadAreaMap()
              } else {
                this.searchSeats()
              }
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
