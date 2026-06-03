// pages/application/index.js
const app = getApp()
const auth = require('../../utils/auth')
const api = require('../../utils/api')

Page({
  data: {
    activeTab: 'all',
    applications: [],
    hasMore: true,
    pageSize: 10,
    pageIndex: 0
  },

  onLoad: function (options) {
  },

  onShow: function () {
    this.refresh()
  },

  // 刷新列表
  refresh() {
    this.setData({ applications: [], pageIndex: 0, hasMore: true })
    this.loadApplications()
  },

  // 获取状态对应的tab值
  getStatusTab(status) {
    const map = {
      0: 'pending',
      1: 'approved',
      2: 'rejected',
      3: 'cancelled',
      4: 'completed'
    }
    return map[status] || 'all'
  },

  // 获取状态文本
  getStatusText(status) {
    const map = {
      0: '待审核',
      1: '已通过',
      2: '已拒绝',
      3: '已取消',
      4: '已完成'
    }
    return map[status] || '未知状态'
  },

  // 获取状态样式类
  getStatusClass(status) {
    const map = {
      0: 'status-pending',
      1: 'status-approved',
      2: 'status-rejected',
      3: 'status-cancelled',
      4: 'status-completed'
    }
    return map[status] || ''
  },

  // 获取讲次文本
  getLectureText(lectures) {
    if (!lectures || lectures.length === 0) return ''

    const sorted = [...lectures].sort((a, b) => a - b)
    const first = app.globalData.config.lectureConfig.times.find(l => l.index === sorted[0])
    const last = app.globalData.config.lectureConfig.times.find(l => l.index === sorted[sorted.length - 1])

    if (first && last) {
      return `${first.label}-${last.label}`
    }
    return ''
  },

  // 切换tab
  onTabChange: function (e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab, applications: [], pageIndex: 0, hasMore: true })
    this.loadApplications()
  },

  // 加载申请列表
  async loadApplications() {
    const { activeTab, pageIndex, pageSize } = this.data
    const userId = auth.getUserId()

    // 获取状态筛选条件
    let status = -1
    switch (activeTab) {
      case 'pending':
        status = 0
        break
      case 'approved':
        status = 1
        break
      case 'rejected':
        status = 2
        break
    }

    try {
      const result = await api.application.getUserApplications({
        userID: userId,
        status: status,
        limit: pageSize,
        skip: pageIndex * pageSize
      })

      if (result && result.length > 0) {
        // 格式化日期
        const formatted = result.map(item => ({
          ...item,
          createdAt: this.formatDate(item.createdAt),
          rentDate: this.formatDate(item.rentDate)
        }))

        this.setData({
          applications: [...this.data.applications, ...formatted],
          hasMore: result.length >= pageSize
        })
      } else {
        this.setData({ hasMore: false })
      }
    } catch (error) {
      console.error('加载申请列表失败:', error)
      this.setData({ hasMore: false })
    }
  },

  // 格式化日期
  formatDate(date) {
    if (!date) return ''
    const d = typeof date === 'number' ? new Date(date) : new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  // 加载更多
  loadMore: function () {
    if (!this.data.hasMore) return
    this.setData({ pageIndex: this.data.pageIndex + 1 })
    this.loadApplications()
  },

  // 点击申请 - 显示详情弹窗
  onApplicationClick: function (e) {
    const id = e.currentTarget.dataset.id
    const it = this.data.applications.find(a => a._id === id)
    if (!it) return

    const statusText = this.getStatusText(it.rentalStatus)
    const lectureText = this.getLectureText(it.rentLectures)
    const canCancel = it.rentalStatus === 0 || it.rentalStatus === 1
    const building = it.classroomBuilding || ''
    const roomName = it.classroomName || it.classroomApplied || ''

    const content = [
      '教室：' + building + ' ' + roomName,
      '日期：' + (it.rentDate || '—'),
      '讲次：' + (lectureText || '—'),
      '事由：' + (it.rentalDetail || '—'),
      '人数：' + (it.expectedAttendeeCount || '—'),
      '状态：' + statusText,
      it.rejectionReason ? '拒绝原因：' + it.rejectionReason : ''
    ].filter(Boolean).join('\n')

    wx.showModal({
      title: '申请详情',
      content: content,
      confirmText: canCancel ? '取消申请' : '知道了',
      cancelText: '关闭',
      confirmColor: canCancel ? '#ff4d4f' : '#1677ff',
      success: (res) => {
        if (res.confirm && canCancel) {
          this.cancelApplication(id)
        }
      }
    })
  },

  // 执行取消
  cancelApplication(id) {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个申请吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.application.cancel(id)
            wx.showToast({ title: '已取消', icon: 'success' })
            this.refresh()
          } catch (err) {
            wx.showToast({ title: err.message || '取消失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 取消申请（卡片上"取消"按钮）
  onCancel: function (e) {
    const id = e.currentTarget.dataset.id || e.target.dataset.id
    if (!id) { wx.showToast({ title: '操作失败，请重试', icon: 'none' }); return }

    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个申请吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.application.cancel(id)
            wx.showToast({ title: '已取消', icon: 'success' })
            this.refresh()
          } catch (error) {
            wx.showToast({ title: error.message || '取消失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 去申请
  onGoApply: function () {
    wx.navigateTo({ url: '/pages/apply/index' })
  }
})