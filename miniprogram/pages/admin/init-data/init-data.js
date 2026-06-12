const app = getApp()
const AdminAPI = require('../../../utils/admin-api')

const BUILDINGS = ['一号教学楼', '二号教学楼', '三号教学楼', '四号教学楼', '五号教学楼', '六号教学楼', '七号教学楼', '八号教学楼']
const FLOORS = ['1', '2', '3', '4', '5', '6']
const CAPACITY_OPTIONS = ['30', '40', '50', '60', '80', '90', '100', '120', '150', '200']

// 教室类型选项
const ROOM_TYPES = ['普通教室', '多媒体教室', '阶梯教室', '智慧教室', '机房', '研讨室', '实验室', '报告厅']

// 设施选项（key:label 对，存储时存 label 到 facilities 数组）
const FACILITY_OPTIONS = [
  { key: '投影仪', label: '投影仪' },
  { key: '音响/话筒', label: '音响/话筒' },
  { key: '空调', label: '空调' },
  { key: '教学电脑', label: '教学电脑' },
  { key: '录播系统', label: '录播系统' },
  { key: '智慧白板', label: '智慧白板' },
  { key: '高速WiFi', label: '高速WiFi' },
  { key: '实验设备', label: '实验设备' }
]

Page({
  data: {
    // 下拉选项
    buildings: BUILDINGS,
    floors: FLOORS,
    capacityOptions: CAPACITY_OPTIONS,
    roomTypes: ROOM_TYPES,
    facilityOptions: FACILITY_OPTIONS,

    // 表单数据
    selectedBuildingIndex: 0,
    selectedFloorIndex: 0,
    roomStart: '01',
    roomEnd: '05',
    selectedCapacityIndex: 2,
    selectedRoomTypeIndex: 0,     // 新增：教室类型
    selectedFacilities: [],        // 新增：设施（多选，存 label 数组）
    facilityChecked: {},           // 新增：设施勾选状态
    description: '',

    // 列表
    classroomList: [],
    importing: false,
    logs: [],

    // 课表导入弹框
    showCourseModal: false,
    courseJson: '',
    importingCourses: false,

    // 教室 JSON 导入弹框
    showClassroomModal: false,
    classroomJson: '',

    // 一键重置测试环境
    resetRunning: false,
    resetSteps: [],
    resetDone: false,
    resetSummary: ''
  },

  // ===== Picker 变更 =====
  onBuildingChange(e) {
    this.setData({ selectedBuildingIndex: e.detail.value })
  },

  onFloorChange(e) {
    this.setData({ selectedFloorIndex: e.detail.value })
  },

  onCapacityChange(e) {
    this.setData({ selectedCapacityIndex: e.detail.value })
  },

  onRoomTypeChange(e) {
    this.setData({ selectedRoomTypeIndex: e.detail.value })
  },

  onRoomStartInput(e) {
    this.setData({ roomStart: e.detail.value })
  },

  onRoomEndInput(e) {
    this.setData({ roomEnd: e.detail.value })
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value })
  },

  // ===== 设施多选 =====
  onFacilityToggle(e) {
    const key = e.currentTarget.dataset.key
    let arr = [...this.data.selectedFacilities]
    if (arr.includes(key)) {
      arr = arr.filter(k => k !== key)
    } else {
      arr.push(key)
    }
    const checked = {}
    arr.forEach(k => { checked[k] = true })
    this.setData({ selectedFacilities: arr, facilityChecked: checked })
  },

  // ===== 生成教室列表 =====
  generateClassrooms() {
    const building = BUILDINGS[this.data.selectedBuildingIndex]
    const buildingNum = this.data.selectedBuildingIndex + 1
    const floor = FLOORS[this.data.selectedFloorIndex]
    const start = parseInt(this.data.roomStart)
    const end = parseInt(this.data.roomEnd)
    const capacity = parseInt(CAPACITY_OPTIONS[this.data.selectedCapacityIndex])
    const roomType = ROOM_TYPES[this.data.selectedRoomTypeIndex]
    const facilities = [...this.data.selectedFacilities]
    const desc = this.data.description || ''

    if (isNaN(start) || isNaN(end) || start < 1 || end > 30 || start > end) {
      wx.showToast({ title: '编号范围无效（01-30）', icon: 'none' })
      return
    }

    const rooms = []
    for (let i = start; i <= end; i++) {
      const roomNum = String(i).padStart(2, '0')
      rooms.push({
        buildingBelong: building,
        classroomID: `x${buildingNum}${floor}${roomNum}`,
        containNumber: capacity,
        roomType: roomType,
        facilities: facilities,
        floor: parseInt(floor),
        description: desc
      })
    }

    const currentList = this.data.classroomList
    this.setData({
      classroomList: currentList.concat(rooms)
    })

    const facilityStr = facilities.length > 0 ? ` [${facilities.join('、')}]` : ''
    wx.showToast({
      title: `已添加 ${rooms.length} 间 ${roomType}${facilityStr}`,
      icon: 'none'
    })
  },

  // ===== 移除某批教室 =====
  removeItem(e) {
    const index = e.currentTarget.dataset.index
    const list = this.data.classroomList
    list.splice(index, 1)
    this.setData({ classroomList: list })
  },

  clearList() {
    this.setData({ classroomList: [] })
  },

  // ===== 执行导入 =====
  async doImport() {
    const list = this.data.classroomList
    if (list.length === 0) {
      wx.showToast({ title: '请先添加教室', icon: 'none' })
      return
    }

    if (this.data.importing) return
    this.setData({ importing: true })
    wx.showLoading({ title: '导入教室中...' })

    try {
      const result = await AdminAPI.importClassrooms(list)
      wx.hideLoading()
      this.setData({ importing: false })

      const detail = `新增 ${result.added} 间，跳过 ${result.skipped} 间（共 ${result.total} 间）`
      const newLog = `[${new Date().toLocaleTimeString()}] 导入教室：${detail}`
      this.setData({
        logs: [newLog, ...this.data.logs],
        classroomList: []
      })
      wx.showToast({ title: `导入完成：${detail}` })
    } catch (err) {
      wx.hideLoading()
      this.setData({ importing: false })
      wx.showToast({ title: err.message || '导入失败', icon: 'none' })
    }
  },

  // ===== 教室 JSON 导入 =====
  showClassroomImport() {
    this.setData({ showClassroomModal: true, classroomJson: '' })
  },

  closeClassroomModal() {
    this.setData({ showClassroomModal: false, classroomJson: '' })
  },

  onClassroomJsonInput(e) {
    this.setData({ classroomJson: e.detail.value })
  },

  async submitClassroomImport() {
    const raw = this.data.classroomJson.trim()
    if (!raw) {
      wx.showToast({ title: '请粘贴教室 JSON 数据', icon: 'none' })
      return
    }

    let classrooms
    try {
      classrooms = JSON.parse(raw)
    } catch (e) {
      wx.showToast({ title: 'JSON 格式错误，请检查', icon: 'none' })
      return
    }

    if (!Array.isArray(classrooms) || classrooms.length === 0) {
      wx.showToast({ title: '教室数据应为非空数组', icon: 'none' })
      return
    }

    if (this.data.importing) return
    this.setData({ importing: true })
    wx.showLoading({ title: '导入教室中...' })

    try {
      const result = await AdminAPI.importClassrooms(classrooms)
      wx.hideLoading()
      this.setData({ importing: false, showClassroomModal: false, classroomJson: '' })

      const detail = `新增 ${result.added} 间，跳过 ${result.skipped} 间（共 ${result.total} 间）`
      const newLog = `[${new Date().toLocaleTimeString()}] 导入教室(JSON)：${detail}`
      this.setData({ logs: [newLog, ...this.data.logs] })
      wx.showToast({ title: `导入完成：${detail}` })
    } catch (err) {
      wx.hideLoading()
      this.setData({ importing: false })
      wx.showToast({ title: err.message || '导入失败', icon: 'none' })
    }
  },

  // ===== 课表导入 =====
  noop() {},

  showCourseImport() {
    this.setData({ showCourseModal: true, courseJson: '' })
  },

  closeCourseModal() {
    this.setData({ showCourseModal: false, courseJson: '' })
  },

  onCourseJsonInput(e) {
    this.setData({ courseJson: e.detail.value })
  },

  async submitCourseImport() {
    const raw = this.data.courseJson.trim()
    if (!raw) {
      wx.showToast({ title: '请粘贴课表 JSON 数据', icon: 'none' })
      return
    }

    let courses
    try {
      courses = JSON.parse(raw)
    } catch (e) {
      wx.showToast({ title: 'JSON 格式错误，请检查', icon: 'none' })
      return
    }

    if (!Array.isArray(courses) || courses.length === 0) {
      wx.showToast({ title: '课表数据应为非空数组', icon: 'none' })
      return
    }

    if (this.data.importingCourses) return
    this.setData({ importingCourses: true })
    wx.showLoading({ title: '导入课表中...' })

    try {
      const result = await AdminAPI.importCourses(courses)
      wx.hideLoading()
      this.setData({ importingCourses: false, showCourseModal: false, courseJson: '' })

      const detail = `更新 ${result.updated} 间，跳过 ${result.skipped} 间（共 ${result.total} 间）`
      const newLog = `[${new Date().toLocaleTimeString()}] 导入课表：${detail}`
      this.setData({ logs: [newLog, ...this.data.logs] })
      wx.showToast({ title: `课表导入完成：${detail}` })
    } catch (err) {
      wx.hideLoading()
      this.setData({ importingCourses: false })
      wx.showToast({ title: err.message || '导入失败', icon: 'none' })
    }
  }
	      wx.showToast({ title: err.message || '导入失败', icon: 'none' })
	    }
	  },

  // ===== 一键重置测试环境 =====

  async startReset() {
    if (this.data.resetRunning) return

    wx.showModal({
      title: '确认重置',
      content: '将清空教室/申请/通知，重新导入 20 间测试教室、11 个用户、10 条申请和 200 个座位。确定继续？',
      confirmText: '确认重置',
      confirmColor: '#f5222d',
      success: async (r) => {
        if (!r.confirm) return
        await this._executeReset()
      }
    })
  },

  async _executeReset() {
    const steps = [
      { name: '清空旧数据', fn: () => wx.cloud.callFunction({ name: 'initTestClassrooms', data: { clean: true } }) },
      { name: '导入测试教室 20间', fn: () => wx.cloud.callFunction({ name: 'initTestClassrooms' }) },
      { name: '导入测试用户+申请', fn: () => wx.cloud.callFunction({ name: 'initTestData' }) },
      { name: '导入测试座位 200个', fn: () => wx.cloud.callFunction({ name: 'initSeats', data: { clean: true } }) },
      { name: '统计校验', fn: () => wx.cloud.callFunction({ name: 'dataStats' }) }
    ]

    this.setData({
      resetRunning: true,
      resetDone: false,
      resetSummary: '',
      resetSteps: steps.map(s => ({ ...s, status: 'wait' }))
    })

    for (let i = 0; i < steps.length; i++) {
      this._updateResetStep(i, 'running')
      try {
        const res = await steps[i].fn()
        const result = res.result || {}
        this._updateResetStep(i, 'done', result)
      } catch (e) {
        this._updateResetStep(i, 'fail', e.message || '调用失败')
        wx.showToast({ title: `"${steps[i].name}" 失败，已中断`, icon: 'none' })
        this.setData({ resetRunning: false })
        return
      }
    }

    const st = this.data.resetSteps
    const s1 = st[1]?.raw
    const s2 = st[2]?.raw
    const s4 = st[4]?.raw
    const lines = []
    if (s1?.data) {
      lines.push(`教室: 新增${s1.data.added}间, 跳过${s1.data.skipped}间`)
      if (s1.data.byType) lines.push(`类型: ${Object.entries(s1.data.byType).map(([k,v]) => `${k}x${v}`).join(', ')}`)
    }
    if (s2?.data) lines.push(`用户: 新建${s2.data.users.created} 已存在${s2.data.users.existed} | 申请: 新建${s2.data.applications.created}`)
    if (s4?.data) lines.push(`验证: 教室${s4.data.classrooms}间 用户${s4.data.users}人 申请${s4.data.applications}条 座位${s4.data.seats}个`)

    this.setData({ resetRunning: false, resetDone: true, resetSummary: lines.join('\n') })
  },

  _updateResetStep(index, status, raw) {
    const arr = this.data.resetSteps
    arr[index] = { ...arr[index], status, raw }
    this.setData({ resetSteps: arr })
  }

})
