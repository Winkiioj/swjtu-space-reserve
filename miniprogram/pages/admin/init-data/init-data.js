const app = getApp()
const AdminAPI = require('../../../utils/admin-api')

const BUILDINGS = ['一号教学楼', '二号教学楼', '三号教学楼', '四号教学楼', '五号教学楼', '六号教学楼', '七号教学楼', '八号教学楼']
const FLOORS = ['1', '2', '3', '4', '5', '6']
const CAPACITY_OPTIONS = ['30', '40', '50', '60', '80', '90', '100', '120', '150', '200']

Page({
  data: {
    // 下拉选项
    buildings: BUILDINGS,
    floors: FLOORS,
    capacityOptions: CAPACITY_OPTIONS,

    // 表单数据
    selectedBuildingIndex: 0,
    selectedFloorIndex: 0,
    roomStart: '01',
    roomEnd: '05',
    selectedCapacityIndex: 2,
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
    classroomJson: ''
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

  onRoomStartInput(e) {
    this.setData({ roomStart: e.detail.value })
  },

  onRoomEndInput(e) {
    this.setData({ roomEnd: e.detail.value })
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value })
  },

  // ===== 生成教室列表 =====
  generateClassrooms() {
    const building = BUILDINGS[this.data.selectedBuildingIndex]
    const buildingNum = this.data.selectedBuildingIndex + 1
    const floor = FLOORS[this.data.selectedFloorIndex]
    const start = parseInt(this.data.roomStart)
    const end = parseInt(this.data.roomEnd)
    const capacity = parseInt(CAPACITY_OPTIONS[this.data.selectedCapacityIndex])
    const desc = this.data.description || '普通教室'

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
        description: desc
      })
    }

    const currentList = this.data.classroomList
    this.setData({
      classroomList: currentList.concat(rooms)
    })

    wx.showToast({
      title: `已添加 ${rooms.length} 间教室（${building} ${floor}${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')}）`,
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
})
