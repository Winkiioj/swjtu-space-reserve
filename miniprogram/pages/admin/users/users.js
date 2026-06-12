const AdminAPI = require('../../../utils/admin-api')

Page({
  data: {
    users: [],
    showList: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    keyword: '',
    filterMode: 'all',
    blacklistedCount: 0,
    allTabClass: 'filter-tab filter-tab-active',
    blackTabClass: 'filter-tab',
    showEmpty: false,
    emptyText: '',
    showBlacklistBanner: false
  },

  onShow() { this.loadList(true) },
  onPullDownRefresh() { this.loadList(true).then(() => wx.stopPullDownRefresh()) },
  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.loadList() },

  async loadList(reset = false) {
    if (this.data.loading) return
    this.setData({ loading: true })
    if (reset) this.setData({ page: 1, hasMore: true })

    try {
      const res = await AdminAPI.getAllUsers(reset ? 1 : this.data.page, this.data.pageSize)
      const list = (res && res.data) || []
      const merged = reset ? list : this.data.users.concat(list)
      const blacklisted = merged.filter(u => u.isBlacklisted).length
      this.setData({
        users: merged,
        blacklistedCount: blacklisted,
        page: reset ? 2 : this.data.page + 1,
        hasMore: list.length >= this.data.pageSize,
        loading: false
      })
      this.filterUsers()
    } catch (err) {
      console.error(err)
      this.setData({ loading: false })
    }
  },

  onSearchInput(e) { this.setData({ keyword: e.detail.value }); this.filterUsers() },
  clearSearch() { this.setData({ keyword: '' }); this.filterUsers() },

  filterUsers() {
    const isBlacklistMode = this.data.filterMode === 'blacklisted'
    let base = this.data.users
    if (isBlacklistMode) base = base.filter(u => u.isBlacklisted)

    const kw = this.data.keyword.trim().toLowerCase()
    if (kw) {
      base = base.filter(u =>
        (u.userName && u.userName.toLowerCase().includes(kw)) ||
        (u.userID && u.userID.toLowerCase().includes(kw)) ||
        (u.department && u.department.toLowerCase().includes(kw))
      )
    }

    const enriched = base.map(u => {
      let identityText = '学生'
      if (u.identity === 'admin') identityText = '管理员'
      else if (u.identity === 'teacher') identityText = '教师'

      return {
        ...u,
        _identityText: identityText,
        _isAdmin: u.identity === 'admin',
        _avatarClass: u.isBlacklisted ? 'avatar-blacklisted' : '',
        _tagClass: u.identity === 'admin' ? 'tag-admin' : u.identity === 'teacher' ? 'tag-teacher' : 'tag-student',
        _blackTag: u.isBlacklisted ? '🚫 黑名单' : '',
        _btnClass: u.isBlacklisted ? 'action-btn-danger' : 'action-btn-warning',
        _btnText: u.isBlacklisted ? '✅ 移出黑名单' : '🚫 加入黑名单'
      }
    })

    this.setData({
      showList: enriched,
      showEmpty: enriched.length === 0,
      showBlacklistBanner: isBlacklistMode && enriched.length === 0,
      emptyText: kw ? '未找到匹配的用户' : (isBlacklistMode ? '' : '暂无用户数据'),
      allTabClass: 'filter-tab' + (isBlacklistMode ? '' : ' filter-tab-active'),
      blackTabClass: 'filter-tab' + (isBlacklistMode ? ' filter-tab-active' : '')
    })
  },

  switchFilter(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ filterMode: mode })
    this.filterUsers()
  },

  async toggleBlacklist(e) {
    const id = e.currentTarget.dataset.id
    const user = this.data.users.find(u => u._id === id)
    if (!user) return

    wx.showModal({
      title: '确认操作',
      content: '确定将 ' + (user.userName || '该用户') + (user.isBlacklisted ? ' 移出黑名单？' : ' 加入黑名单？'),
      success: async (r) => {
        if (r.confirm) {
          try {
            await AdminAPI.toggleUserBlacklist(id, !user.isBlacklisted)
            await this.loadList(true)
            wx.showToast({ title: '操作成功', icon: 'none' })
          } catch (err) {
            wx.showToast({ title: err.message || '操作失败', icon: 'none' })
          }
        }
      }
    })
  }
})
