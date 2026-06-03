/**
 * 认证工具类
 * 处理微信登录、用户信息管理
 */

class Auth {
  constructor() {
    this.LOGIN_STATUS_KEY = 'loginStatus'
    this.USER_INFO_KEY = 'userInfo'
    this.TOKEN_KEY = 'token'
  }

  /**
   * 获取微信登录code
   * @returns {Promise<string>}
   */
  async getLoginCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve(res.code)
          } else {
            reject(new Error('获取登录凭证失败'))
          }
        },
        fail: (err) => reject(err)
      })
    })
  }

  /**
   * 获取用户微信头像昵称
   * @returns {Promise<object>}
   */
  async getUserProfile() {
    return new Promise((resolve) => {
      wx.getUserProfile({
        desc: '用于完成用户登录和身份验证',
        success: (res) => resolve(res.userInfo),
        fail: () => resolve({}) // 失败时返回空对象，不阻塞登录
      })
    })
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn() {
    try {
      const loginStatus = wx.getStorageSync(this.LOGIN_STATUS_KEY)
      const userInfo = wx.getStorageSync(this.USER_INFO_KEY)
      return loginStatus === 'logged' && userInfo && userInfo.openid
    } catch (e) {
      return false
    }
  }

  /**
   * 获取用户信息
   */
  getUserInfo() {
    try {
      return wx.getStorageSync(this.USER_INFO_KEY) || null
    } catch (e) {
      return null
    }
  }

  /**
   * 获取用户 openid
   */
  getUserId() {
    const userInfo = this.getUserInfo()
    return userInfo?.openid || null
  }

  /**
   * 保存登录状态
   */
  setLoginStatus(userInfo) {
    try {
      wx.setStorageSync(this.LOGIN_STATUS_KEY, 'logged')
      wx.setStorageSync(this.USER_INFO_KEY, userInfo)
    } catch (e) {
      console.error('保存登录状态失败:', e)
    }
  }

  /**
   * 退出登录
   */
  logout() {
    try {
      wx.removeStorageSync(this.LOGIN_STATUS_KEY)
      wx.removeStorageSync(this.USER_INFO_KEY)
      wx.removeStorageSync(this.TOKEN_KEY)
    } catch (e) {
      console.error('退出登录失败:', e)
    }
  }

  /**
   * 检查是否已绑定学号
   */
  isBound() {
    const userInfo = this.getUserInfo()
    return userInfo?.isBound || false
  }

  /**
   * 检查用户是否在黑名单
   */
  isBlacklisted() {
    const userInfo = this.getUserInfo()
    return userInfo?.isBlacklisted || false
  }

  /**
   * 获取用户身份类型
   */
  getUserIdentity() {
    const userInfo = this.getUserInfo()
    return userInfo?.identity || null
  }

  /**
   * 跳转登录页
   */
  redirectToLogin() {
    wx.redirectTo({ url: '/pages/login/index' })
  }

  /**
   * 验证登录状态，未登录跳转登录页
   */
  requireAuth() {
    if (!this.isLoggedIn()) {
      this.redirectToLogin()
      return false
    }
    return true
  }
}

const auth = new Auth()

module.exports = auth
