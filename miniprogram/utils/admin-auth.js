/**
 * admin-auth.js — 前端管理员权限守卫
 */

const app = getApp()

/**
 * 校验当前用户是否为管理员，不是则重定向
 * @returns {boolean}
 */
function requireAdmin() {
  if (app.globalData.userRole !== 'admin') {
    wx.showToast({ title: '无权限访问', icon: 'none' })
    setTimeout(() => {
      wx.redirectTo({ url: '/pages/manager-login/manager-login' })
    }, 1500)
    return false
  }
  return true
}

/**
 * 检查是否已登录
 * @returns {boolean}
 */
function isLoggedIn() {
  return !!app.globalData.currentUserID
}

module.exports = { requireAdmin, isLoggedIn }
