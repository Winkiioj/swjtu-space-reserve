/**
 * 教室详情页 - 状态矩阵 + 快捷预约
 */
const app = getApp()
const auth = require('../../utils/auth')
const api = require('../../utils/api')
const storage = require('../../utils/storage')

Page({
  data: {
    classroom: {},
    currentWeek: 'this',
    statusMatrix: [],
    lectures: [],
    isFavorite: false
  },

  onLoad(options) {
    const classroomId = options.id
    if (!classroomId) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    this.setData({
      lectures: app.globalData.config.lectureConfig.times
    })

    this.loadClassroom(classroomId)
  },

  async loadClassroom(classroomId) {
    try {
      const result = await api.classroom.getDetail(classroomId)
      this.setData({ classroom: result || {} })
      this.loadStatusMatrix(classroomId)
      this.checkFavorite(classroomId)
    } catch (err) {
      console.error('加载教室失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async loadStatusMatrix(classroomId) {
    const week = this.data.currentWeek
    try {
      const result = await api.classroom.getStatusMatrix(classroomId, week)
      this.setData({ statusMatrix: result || [] })
    } catch (err) {
      console.error('加载状态矩阵失败:', err)
    }
  },

  onWeekChange(e) {
    const week = e.currentTarget.dataset.week
    if (week === this.data.currentWeek) return
    this.setData({ currentWeek: week })
    this.loadStatusMatrix(this.data.classroom._id)
  },

  checkFavorite(classroomId) {
    const favs = storage.getFavoriteClassrooms()
    this.setData({ isFavorite: favs.includes(classroomId) })
  },

  onFavorite() {
    if (!auth.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }

    const id = this.data.classroom._id
    if (this.data.isFavorite) {
      storage.removeFavoriteClassroom(id)
      wx.showToast({ title: '已取消', icon: 'none' })
    } else {
      storage.addFavoriteClassroom(id)
      wx.showToast({ title: '已收藏', icon: 'success' })
    }
    this.setData({ isFavorite: !this.data.isFavorite })
  },

  onApply() {
    if (!auth.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    if (!auth.isBound()) {
      wx.showModal({
        title: '请先绑定学号',
        content: '使用借教室功能前需要绑定学号',
        confirmText: '去绑定',
        confirmColor: '#1677ff',
        success: r => {
          if (r.confirm) {
            const openid = auth.getUserId()
            wx.navigateTo({ url: '/pages/bind-student/index?openid=' + encodeURIComponent(openid || '') })
          }
        }
      })
      return
    }

    wx.navigateTo({ url: '/pages/apply/index' })
  }
})
