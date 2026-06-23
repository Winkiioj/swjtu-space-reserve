const auth = require('../../utils/auth')
const api = require('../../utils/api')

Page({
  data: {
    notifications: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    showEmpty: false
  },

  onShow() {
    this.loadList(true)
  },

  onPullDownRefresh() {
    this.loadList(true).then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadList()
  },

  /** 返回时同步红点 */
  onUnload() {
    syncBadgeFromList(this.data.notifications)
  },

  async loadList(reset = false) {
    if (this.data.loading) return
    const uid = auth.getUserId()
    if (!uid) return

    this.setData({ loading: true })
    if (reset) this.setData({ page: 1, hasMore: true })

    try {
      const res = await api.notification.getList(uid, this.data.pageSize)
      const list = res || []
      const enriched = list.map(n => ({
        ...n,
        _icon: iconMap[n.type] || '💬',
        _time: formatTime(n.createdAt)
      }))
      const merged = reset ? enriched : this.data.notifications.concat(enriched)
      this.setData({
        notifications: merged,
        page: reset ? 2 : this.data.page + 1,
        hasMore: list.length >= this.data.pageSize,
        loading: false,
        showEmpty: merged.length === 0
      })
      // 首次加载时同步红点
      if (reset) syncBadgeFromList(merged)
    } catch (err) {
      console.error(err)
      this.setData({ loading: false })
    }
  },

  /** 点击通知：标记已读 */
  async onNotifTap(e) {
    const { id, read } = e.currentTarget.dataset
    if (read === 'true') return
    try {
      await api.notification.markAsRead(id)
      const arr = this.data.notifications.map(n =>
        n._id === id ? { ...n, isRead: true } : n
      )
      this.setData({ notifications: arr })
      syncBadgeFromList(arr)
    } catch (e) {
      console.error(e)
    }
  },

  /** 全部标记已读 */
  async markAllRead() {
    const uid = auth.getUserId()
    if (!uid) return
    try {
      await api.notification.markAllRead(uid)
      const arr = this.data.notifications.map(n => ({ ...n, isRead: true }))
      this.setData({ notifications: arr })
      wx.removeTabBarBadge({ index: 3 })
    } catch (e) {
      console.error(e)
    }
  }
})

/** 根据列表中的未读数同步 tabBar 红点 */
function syncBadgeFromList(list) {
  const count = list.filter(n => !n.isRead).length
  if (count > 0) {
    wx.setTabBarBadge({ index: 3, text: count > 99 ? '99+' : String(count) })
  } else {
    wx.removeTabBarBadge({ index: 3 })
  }
}

const iconMap = {
  new_application: '📋',
  review_result: '📬',
  review_sent: '✅',
  reject_sent: '❌',
  revoke_reminder: '⏰',
  weekly_report: '📊'
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - ts
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + '小时前'
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
