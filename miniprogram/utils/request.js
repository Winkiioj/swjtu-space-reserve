/**
 * 网络请求封装工具
 * 基于 wx.request 封装，提供统一的请求处理、错误处理、token管理
 */

class Request {
  constructor() {
    // 基础配置
    this.config = {
      baseUrl: '', // 云函数不需要baseUrl，使用wx.cloud.callFunction
      timeout: 10000,
      loading: true,
      loadingText: '加载中...'
    }
  }

  /**
   * 设置配置
   */
  setConfig(config) {
    this.config = { ...this.config, ...config }
    return this
  }

  /**
   * 显示加载提示
   */
  showLoading(text = this.config.loadingText) {
    if (this.config.loading) {
      wx.showLoading({ title: text, mask: true })
    }
  }

  /**
   * 隐藏加载提示
   */
  hideLoading() {
    wx.hideLoading()
  }

  /**
   * 显示错误提示
   */
  showError(message = '请求失败') {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    })
  }

  /**
   * 调用云函数
   * @param {string} name - 云函数名称
   * @param {object} data - 请求参数
   * @param {object} options - 额外选项
   * @returns {Promise}
   */
  async callFunction(name, data = {}, options = {}) {
    const { showLoading = this.config.loading, loadingText = this.config.loadingText } = options
    
    if (showLoading) {
      this.showLoading(loadingText)
    }

    try {
      const result = await wx.cloud.callFunction({
        name,
        data: {
          userOpenID: this.getOpenID(), // 自动携带用户openid
          ...data
        }
      })

      const { code, message, data: responseData } = result.result

      // 统一错误处理
      if (code !== 0) {
        this.handleError(code, message)
        return Promise.reject({ code, message, data: responseData })
      }

      return responseData
    } catch (error) {
      console.error(`云函数调用失败 [${name}]:`, error)
      this.showError(error.errMsg || '网络请求失败')
      return Promise.reject(error)
    } finally {
      if (showLoading) {
        this.hideLoading()
      }
    }
  }

  /**
   * 获取用户openid（从本地存储获取）
   */
  getOpenID() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      return userInfo?.openid || null
    } catch (e) {
      return null
    }
  }

  /**
   * 错误码处理
   */
  handleError(code, message) {
    switch (code) {
      case 401:
        // 未登录，跳转到登录页
        wx.showToast({ title: '请先登录', icon: 'none' })
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/login/index' })
        }, 1500)
        break
      case 402:
        wx.showToast({ title: '您已被加入黑名单', icon: 'none' })
        break
      case 403:
        wx.showToast({ title: '权限不足', icon: 'none' })
        break
      case 404:
        wx.showToast({ title: message || '资源不存在', icon: 'none' })
        break
      case 409:
        wx.showToast({ title: message || '资源冲突', icon: 'none' })
        break
      default:
        wx.showToast({ title: message || '操作失败', icon: 'none' })
    }
  }

  /**
   * 普通HTTP请求（备用，用于非云函数场景）
   */
  async request(options) {
    const { url, method = 'GET', data = {}, header = {}, showLoading = true } = options
    
    if (showLoading) {
      this.showLoading()
    }

    return new Promise((resolve, reject) => {
      wx.request({
        url: this.config.baseUrl + url,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          ...header
        },
        timeout: this.config.timeout,
        success: (res) => {
          if (res.statusCode === 200) {
            const { code, message, data: responseData } = res.data
            if (code === 0) {
              resolve(responseData)
            } else {
              this.handleError(code, message)
              reject({ code, message })
            }
          } else {
            this.showError(`请求失败: ${res.statusCode}`)
            reject(res)
          }
        },
        fail: (error) => {
          console.error('HTTP请求失败:', error)
          this.showError(error.errMsg || '网络请求失败')
          reject(error)
        },
        complete: () => {
          if (showLoading) {
            this.hideLoading()
          }
        }
      })
    })
  }
}

// 创建单例
const request = new Request()

module.exports = request