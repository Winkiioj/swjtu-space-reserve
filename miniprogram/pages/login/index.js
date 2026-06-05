/**
 * pages/login/index.js
 * 登录页 — 微信原生授权流程
 *
 * 流程：
 * 1. 用户点击头像区域 → chooseAvatar 选择微信头像
 * 2. 用户在昵称输入框输入/确认昵称（type="nickname" 微信原生键盘）
 * 3. 头像 + 昵称 都填写后，登录按钮亮起
 * 4. 点击登录 → wx.login 获取 code → wechatLogin 云函数 → 保存登录态
 * 5. 登录成功 → reLaunch 到首页
 */

const auth = require('../../utils/auth')
const api = require('../../utils/api')

Page({
  data: {
    avatarUrl: '',
    nickName: '',
    canLogin: false,
    loading: false,
    _adminTapCount: 0,
    _adminTapTimer: null
  },

  onLoad() {
    // 已登录不进登录页
    if (auth.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  },

  onShow() {
    // 已登录直接进首页
    if (auth.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  },

  /**
   * 选择头像（微信原生 chooseAvatar）
   * 头像临时路径会由云函数在后续版本上传到云存储
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.setData({ avatarUrl })
    this.checkCanLogin()
  },

  /**
   * 输入昵称
   */
  onNicknameInput(e) {
    this.setData({ nickName: e.detail.value })
    this.checkCanLogin()
  },

  /**
   * 昵称失焦（微信 type="nickname" 键盘收起时也会触发）
   */
  onNicknameBlur(e) {
    const v = e.detail.value
    if (v && v !== this.data.nickName) {
      this.setData({ nickName: v })
      this.checkCanLogin()
    }
  },

  /**
   * Logo 连点 3 次 → 跳转管理员登录（隐蔽入口）
   */
  onLogoTap() {
    if (this.data._adminTapTimer) clearTimeout(this.data._adminTapTimer)
    const count = this.data._adminTapCount + 1
    if (count >= 3) {
      this.setData({ _adminTapCount: 0, _adminTapTimer: null })
      wx.navigateTo({ url: '/pages/manager-login/manager-login' })
      return
    }
    this.setData({ _adminTapCount: count })
    this.data._adminTapTimer = setTimeout(() => {
      this.setData({ _adminTapCount: 0, _adminTapTimer: null })
    }, 2000)
  },

  /**
   * 检查是否可以登录
   */
  checkCanLogin() {
    const canLogin = !!this.data.avatarUrl && !!this.data.nickName.trim()
    if (this.data.canLogin !== canLogin) {
      this.setData({ canLogin })
    }
  },

  /**
   * 点击登录
   */
  async onLogin() {
    if (!this.data.canLogin || this.data.loading) return

    this.setData({ loading: true })

    try {
      // 1. 获取微信登录 code
      const code = await auth.getLoginCode()

      // 2. 构造用户信息
      const userInfo = {
        avatarUrl: this.data.avatarUrl,
        nickName: this.data.nickName.trim()
      }

      // 3. 云函数登录
      const params = { code, userInfo }
      let result

      // 提前判断环境，供 catch 块和后续逻辑共用
      const accountInfo = wx.getAccountInfoSync()
      const isDev = accountInfo.miniProgram.envVersion === 'develop'

      try {
        result = await api.user.wechatLogin(params)
      } catch (cloudErr) {
        // 开发环境：云函数未部署时用 mock 数据绕过登录
        if (isDev) {
          console.warn('[DEV] 云函数未部署，使用 mock 登录模拟')
          result = {
            openid: 'dev_mock_openid_' + Date.now(),
            avatarUrl: userInfo.avatarUrl,
            nickName: userInfo.nickName,
            isBound: false
          }
        } else {
          throw cloudErr
        }
      }

      if (result) {
        // 缓存 openid 用于开发环境
        if (isDev && result.openid) {
          wx.setStorageSync('_devOpenid', result.openid)
        }

        // 保存登录状态
        auth.setLoginStatus(result)

        wx.showToast({ title: '登录成功', icon: 'success', duration: 1000 })

        // 如果未绑定学号，延迟提示
        if (!result.isBound) {
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/index/index' })
            // reLaunch 完成后，页面的 onShow 不再触发 toast，这里用全局方式
            setTimeout(() => {
              wx.showToast({ title: '请绑定学号以使用全部功能', icon: 'none', duration: 2500 })
            }, 500)
          }, 800)
        } else {
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/index/index' })
          }, 800)
        }
      }
    } catch (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none', duration: 2500 })
    } finally {
      this.setData({ loading: false })
    }
  }
})
