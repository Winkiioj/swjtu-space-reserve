/**
 * 本地存储工具类
 * 封装 wx.setStorageSync/wx.getStorageSync/wx.removeStorageSync
 * 提供统一的存储管理
 */

class Storage {
  constructor() {
    // 存储键名常量
    this.KEYS = {
      USER_INFO: 'userInfo',
      LOGIN_STATUS: 'loginStatus',
      TOKEN: 'token',
      APPLY_HISTORY: 'applyHistory',
      FAVORITE_CLASSROOMS: 'favoriteClassrooms',
      SETTINGS: 'settings'
    }
  }

  /**
   * 设置存储
   * @param {string} key - 存储键名
   * @param {any} data - 存储数据
   * @returns {boolean}
   */
  set(key, data) {
    try {
      wx.setStorageSync(key, data)
      return true
    } catch (error) {
      console.error(`存储失败 [${key}]:`, error)
      return false
    }
  }

  /**
   * 获取存储
   * @param {string} key - 存储键名
   * @param {any} defaultValue - 默认值
   * @returns {any}
   */
  get(key, defaultValue = null) {
    try {
      const data = wx.getStorageSync(key)
      return data !== '' ? data : defaultValue
    } catch (error) {
      console.error(`获取存储失败 [${key}]:`, error)
      return defaultValue
    }
  }

  /**
   * 删除存储
   * @param {string} key - 存储键名
   * @returns {boolean}
   */
  remove(key) {
    try {
      wx.removeStorageSync(key)
      return true
    } catch (error) {
      console.error(`删除存储失败 [${key}]:`, error)
      return false
    }
  }

  /**
   * 清空所有存储
   * @returns {boolean}
   */
  clear() {
    try {
      wx.clearStorageSync()
      return true
    } catch (error) {
      console.error('清空存储失败:', error)
      return false
    }
  }

  /**
   * 获取所有键名
   * @returns {string[]}
   */
  getAllKeys() {
    try {
      return wx.getStorageInfoSync().keys || []
    } catch (error) {
      console.error('获取所有键名失败:', error)
      return []
    }
  }

  /**
   * 获取存储大小
   * @returns {object} - { currentSize, limitSize }
   */
  getStorageInfo() {
    try {
      return wx.getStorageInfoSync()
    } catch (error) {
      console.error('获取存储信息失败:', error)
      return { currentSize: 0, limitSize: 10240 }
    }
  }

  // ============ 用户信息相关 ============

  /**
   * 保存用户信息
   * @param {object} userInfo - 用户信息对象
   */
  setUserInfo(userInfo) {
    return this.set(this.KEYS.USER_INFO, userInfo)
  }

  /**
   * 获取用户信息
   * @returns {object|null}
   */
  getUserInfo() {
    return this.get(this.KEYS.USER_INFO, null)
  }

  /**
   * 删除用户信息
   */
  removeUserInfo() {
    return this.remove(this.KEYS.USER_INFO)
  }

  // ============ 登录状态相关 ============

  /**
   * 设置登录状态
   * @param {string} status - 登录状态 'logged' | 'not_logged'
   */
  setLoginStatus(status) {
    return this.set(this.KEYS.LOGIN_STATUS, status)
  }

  /**
   * 获取登录状态
   * @returns {string|null}
   */
  getLoginStatus() {
    return this.get(this.KEYS.LOGIN_STATUS, null)
  }

  // ============ Token相关 ============

  /**
   * 设置Token
   * @param {string} token - JWT token
   */
  setToken(token) {
    return this.set(this.KEYS.TOKEN, token)
  }

  /**
   * 获取Token
   * @returns {string|null}
   */
  getToken() {
    return this.get(this.KEYS.TOKEN, null)
  }

  /**
   * 删除Token
   */
  removeToken() {
    return this.remove(this.KEYS.TOKEN)
  }

  // ============ 申请历史相关 ============

  /**
   * 保存申请历史
   * @param {array} history - 申请历史列表
   */
  setApplyHistory(history) {
    return this.set(this.KEYS.APPLY_HISTORY, history)
  }

  /**
   * 获取申请历史
   * @returns {array}
   */
  getApplyHistory() {
    return this.get(this.KEYS.APPLY_HISTORY, [])
  }

  /**
   * 添加申请记录到历史
   * @param {object} record - 申请记录
   */
  addApplyRecord(record) {
    const history = this.getApplyHistory()
    history.unshift(record)
    // 只保留最近20条记录
    if (history.length > 20) {
      history.pop()
    }
    return this.setApplyHistory(history)
  }

  // ============ 收藏教室相关 ============

  /**
   * 保存收藏的教室列表
   * @param {array} classrooms - 教室ID列表
   */
  setFavoriteClassrooms(classrooms) {
    return this.set(this.KEYS.FAVORITE_CLASSROOMS, classrooms)
  }

  /**
   * 获取收藏的教室列表
   * @returns {array}
   */
  getFavoriteClassrooms() {
    return this.get(this.KEYS.FAVORITE_CLASSROOMS, [])
  }

  /**
   * 添加收藏教室
   * @param {string} classroomId - 教室ID
   */
  addFavoriteClassroom(classroomId) {
    const favorites = this.getFavoriteClassrooms()
    if (!favorites.includes(classroomId)) {
      favorites.push(classroomId)
      return this.setFavoriteClassrooms(favorites)
    }
    return true
  }

  /**
   * 移除收藏教室
   * @param {string} classroomId - 教室ID
   */
  removeFavoriteClassroom(classroomId) {
    const favorites = this.getFavoriteClassrooms()
    const filtered = favorites.filter(id => id !== classroomId)
    return this.setFavoriteClassrooms(filtered)
  }

  /**
   * 检查教室是否已收藏
   * @param {string} classroomId - 教室ID
   * @returns {boolean}
   */
  isFavoriteClassroom(classroomId) {
    const favorites = this.getFavoriteClassrooms()
    return favorites.includes(classroomId)
  }

  // ============ 设置相关 ============

  /**
   * 保存设置
   * @param {object} settings - 设置对象
   */
  setSettings(settings) {
    return this.set(this.KEYS.SETTINGS, settings)
  }

  /**
   * 获取设置
   * @returns {object}
   */
  getSettings() {
    const defaultSettings = {
      autoLogin: true,
      notification: true,
      sound: true,
      theme: 'light'
    }
    const saved = this.get(this.KEYS.SETTINGS, {})
    return { ...defaultSettings, ...saved }
  }

  /**
   * 更新设置
   * @param {object} updates - 更新的设置项
   */
  updateSettings(updates) {
    const current = this.getSettings()
    const updated = { ...current, ...updates }
    return this.setSettings(updated)
  }
}

// 创建单例
const storage = new Storage()

module.exports = storage