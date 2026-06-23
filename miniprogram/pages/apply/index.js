/**
 * 教室预约 - 三步向导
 * Step 0: 选时间（周+日期+讲次+人数）
 * Step 1: 选教室（楼栋/类型/设施/楼层筛选 → 教室列表）
 * Step 2: 确认提交（事由+说明）
 */
const app = getApp()
const auth = require('../../utils/auth')
const api = require('../../utils/api')

Page({
  data: {
    // 步骤
    currentStep: 0,
    steps: [
      { num: 1, label: '选时间' },
      { num: 2, label: '选教室' },
      { num: 3, label: '提交' }
    ],

    // 第一步：时间选择
    selectedWeek: 'this',
    selectedDate: '',
    dayOfWeekText: '',
    selectedLectures: [],
    lecturePicked: {},
    capacity: 30,
    dateRange: { start: '', end: '' },

    // 第二步：教室筛选
    selectedBuilding: '',
    selectedRoomType: '',        // 教室类型（''=全部）
    selectedFloor: 0,            // 楼层（0=全部）
    selectedFacilities: [],      // 设施（多选，存 key 数组）
    facilityPicked: {},          // 设施选中状态 map
    showFilter: false,           // 展开/收起高级筛选
    filterCount: 0,              // 高级筛选项计数
    classrooms: [],
    selectedClassroom: '',
    selectedClassroomInfo: {},
    loading: false,

    // 第三步：提交
    rentalDetail: '',
    rentalDescription: '',
    submitting: false,

    // 静态数据
    lectures: [],
    buildings: [],
    roomTypes: [],
    facilities: [],
    floors: []
  },

  onLoad(options) {
    const config = app.globalData.config
    this.setData({
      lectures: config.lectureConfig.times,
      buildings: config.buildings,
      roomTypes: config.roomTypes,
      facilities: config.facilities,
      floors: config.floors
    })

    // 预填今天，计算可预约的日期范围
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    const todayStr = `${y}-${m}-${d}`

    const jsDay = today.getDay()
    const daysUntilNextFriday = jsDay <= 5 ? (5 - jsDay + 7) : (5 - jsDay + 7)
    const maxDate = new Date(today)
    maxDate.setDate(today.getDate() + daysUntilNextFriday)
    const endStr = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`

    this.setData({
      selectedDate: todayStr,
      dateRange: { start: todayStr, end: endStr }
    })
    this.updateDayOfWeekText(todayStr)
  },

  onShow() {
    if (!auth.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    if (!auth.isBound()) {
      wx.showModal({
        title: '请先绑定学号',
        content: '使用借教室功能前，请先绑定学号或工号',
        confirmText: '去绑定',
        cancelText: '返回',
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
      return
    }

    this.updateCanProceed()
  },

  // ====== 第一步：时间选择 ======

  onWeekSelect(e) {
    this.setData({ selectedWeek: e.currentTarget.dataset.week })
  },

  onDateChange(e) {
    const dateStr = e.detail.value
    this.setData({ selectedDate: dateStr })
    this.updateDayOfWeekText(dateStr)
  },

  updateDayOfWeekText(dateStr) {
    const jsDay = new Date(dateStr).getDay()
    const map = { 0: '周日', 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六' }
    this.setData({ dayOfWeekText: map[jsDay] || '' })
  },

  onLectureToggle(e) {
    const idx = parseInt(e.currentTarget.dataset.index)
    let arr = [...this.data.selectedLectures]

    if (arr.includes(idx)) {
      arr = arr.filter(i => i !== idx)
    } else {
      arr.push(idx)
      arr.sort((a, b) => a - b)
      // 强制连续：只保留最长连续段
      let best = [arr[0]]
      let cur = [arr[0]]
      for (let i = 1; i < arr.length; i++) {
        if (arr[i] === arr[i - 1] + 1) {
          cur.push(arr[i])
        } else {
          if (cur.length > best.length) best = cur
          cur = [arr[i]]
        }
      }
      if (cur.length > best.length) best = cur
      arr = best
    }

    const picked = {}
    arr.forEach(i => { picked[i] = true })
    this.setData({ selectedLectures: arr, lecturePicked: picked })
    this.updateCanProceed()
  },

  onCapacityChange(e) {
    const delta = parseInt(e.currentTarget.dataset.delta)
    const v = Math.max(1, Math.min(300, this.data.capacity + delta))
    this.setData({ capacity: v })
  },

  // ====== 第二步：教室选择与筛选 ======

  onBuildingSelect(e) {
    this.setData({
      selectedBuilding: e.currentTarget.dataset.building,
      selectedClassroom: '',
      selectedClassroomInfo: {}
    })
    this.loadClassrooms()
  },

  onRoomTypeSelect(e) {
    this.setData({
      selectedRoomType: e.currentTarget.dataset.type,
      selectedClassroom: '',
      selectedClassroomInfo: {}
    })
    this._updateFilterCount()
    this.loadClassrooms()
  },

  onFloorSelect(e) {
    this.setData({
      selectedFloor: parseInt(e.currentTarget.dataset.floor),
      selectedClassroom: '',
      selectedClassroomInfo: {}
    })
    this._updateFilterCount()
    this.loadClassrooms()
  },

  onFacilityToggle(e) {
    const key = e.currentTarget.dataset.key
    let arr = [...this.data.selectedFacilities]
    if (arr.includes(key)) {
      arr = arr.filter(k => k !== key)
    } else {
      arr.push(key)
    }
    const picked = {}
    arr.forEach(k => { picked[k] = true })
    this.setData({
      selectedFacilities: arr,
      facilityPicked: picked,
      selectedClassroom: '',
      selectedClassroomInfo: {}
    })
    this._updateFilterCount()
    this.loadClassrooms()
  },

  toggleFilter() {
    this.setData({ showFilter: !this.data.showFilter })
  },

  resetFilter() {
    this.setData({
      selectedBuilding: '',
      selectedRoomType: '',
      selectedFloor: 0,
      selectedFacilities: [],
      facilityPicked: {},
      filterCount: 0,
      selectedClassroom: '',
      selectedClassroomInfo: {}
    })
    this.loadClassrooms()
  },

  _updateFilterCount() {
    const { selectedRoomType, selectedFloor, selectedFacilities } = this.data
    let count = 0
    if (selectedRoomType) count++
    if (selectedFloor > 0) count++
    if (selectedFacilities.length > 0) count++
    this.setData({ filterCount: count })
  },

  onClassroomSelect(e) {
    const id = e.currentTarget.dataset.id
    const info = this.data.classrooms.find(c => c._id === id)
    this.setData({
      selectedClassroom: id,
      selectedClassroomInfo: info || {}
    })
    this.updateCanProceed()
  },

  getSystemDayOfWeek(dateStr) {
    const jsDay = new Date(dateStr).getDay()
    if (jsDay === 0 || jsDay === 6) return -1
    return jsDay - 1
  },

  async loadClassrooms() {
    const { selectedDate, selectedWeek, selectedLectures, capacity,
            selectedBuilding, selectedRoomType, selectedFloor, selectedFacilities } = this.data
    if (!selectedDate || selectedLectures.length === 0) return

    const dayOfWeek = this.getSystemDayOfWeek(selectedDate)
    if (dayOfWeek === -1) {
      wx.showToast({ title: '请选择周一至周五', icon: 'none' })
      return
    }

    this.setData({ loading: true, classrooms: [], selectedClassroom: '', selectedClassroomInfo: {} })

    try {
      const params = {
        rentDate: selectedDate,
        rentWeek: selectedWeek,
        rentDayOfWeek: dayOfWeek,
        rentLectures: selectedLectures,
        minCapacity: capacity,
        building: selectedBuilding
      }

      // 新增筛选参数
      if (selectedRoomType) params.roomType = selectedRoomType
      if (selectedFloor > 0) params.floor = selectedFloor
      if (selectedFacilities.length > 0) params.facilities = selectedFacilities

      const result = await api.classroom.searchAvailable(params)
      this.setData({ classrooms: result || [] })
    } catch (err) {
      console.error('查询教室失败:', err)
      wx.showToast({ title: '查询失败，请重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
      this.updateCanProceed()
    }
  },

  // ====== 第三步：提交 ======

  onRentalDetailInput(e) {
    this.setData({ rentalDetail: e.detail.value })
    this.updateCanProceed()
  },

  onRentalDescriptionInput(e) {
    this.setData({ rentalDescription: e.detail.value })
  },

  async submitApplication() {
    if (!this.data.canProceed || this._submitting) return
    this._submitting = true

    const { selectedDate, selectedWeek, selectedLectures, capacity, rentalDetail, rentalDescription, selectedClassroomInfo } = this.data

    const dayOfWeek = this.getSystemDayOfWeek(selectedDate)
    if (dayOfWeek === -1) {
      wx.showToast({ title: '请选择周一至周五', icon: 'none' })
      this._submitting = false
      return
    }

    if (!selectedClassroomInfo || !selectedClassroomInfo.classroomID) {
      wx.showToast({ title: '请先选择教室', icon: 'none' })
      this._submitting = false
      return
    }

    this.setData({ submitting: true })

    try {
      await api.application.submit({
        classroomID: selectedClassroomInfo.classroomID,
        rentDate: selectedDate,
        rentWeek: selectedWeek,
        rentDayOfWeek: dayOfWeek,
        rentLectures: selectedLectures,
        rentalDetail: rentalDetail.trim(),
        rentalDescription: rentalDescription.trim(),
        expectedAttendeeCount: capacity
      })

      wx.showToast({ title: '申请提交成功', icon: 'success' })
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/application/index' })
      }, 1200)
    } catch (err) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' })
      this._submitting = false
    } finally {
      this.setData({ submitting: false })
    }
  },

  // ====== 导航 ======

  nextStep() {
    if (!this.data.canProceed) return

    if (this.data.currentStep === 0) {
      this.setData({ currentStep: 1 })
      this.updateCanProceed()
      this.loadClassrooms()
      return
    }

    if (this.data.currentStep === 1) {
      this.setData({ currentStep: 2 })
      this.updateCanProceed()
      return
    }
  },

  prevStep() {
    if (this.data.currentStep > 0) {
      this.setData({ currentStep: this.data.currentStep - 1 })
      this.updateCanProceed()
    }
  },

  // ====== 状态 ======

  updateCanProceed() {
    let can = false
    switch (this.data.currentStep) {
      case 0:
        can = !!this.data.selectedDate && this.data.selectedLectures.length > 0
        break
      case 1:
        can = !!this.data.selectedClassroom
        break
      case 2:
        can = !!this.data.rentalDetail.trim()
        break
    }
    this.setData({ canProceed: can })

    if (this.data.selectedLectures.length > 0) {
      const s = [...this.data.selectedLectures].sort((a, b) => a - b)
      const first = this.data.lectures.find(l => l.index === s[0])
      const last = this.data.lectures.find(l => l.index === s[s.length - 1])
      this.setData({ lectureSummary: first && last ? `${first.label} ~ ${last.label}` : '' })
    }
  },

  getLectureRange() {
    const { selectedLectures, lectures } = this.data
    if (selectedLectures.length === 0) return ''
    const s = [...selectedLectures].sort((a, b) => a - b)
    const first = lectures.find(l => l.index === s[0])
    const last = lectures.find(l => l.index === s[s.length - 1])
    return first && last ? `${first.label} - ${last.label}` : ''
  }
})
