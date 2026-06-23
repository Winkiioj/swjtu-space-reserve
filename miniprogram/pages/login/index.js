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
 *
 * 开发环境：自动显示测试用户快捷选择，传入 devOpenid 模拟登录
 */

const auth = require('../../utils/auth')
const api = require('../../utils/api')

// ===== 开发环境测试用户列表 =====
const DEV_TEST_USERS = [
  { label: '王凯 (学生)', value: 'dev_openid_2023112593' },
  { label: '李华 (学生)', value: 'dev_openid_2023112588' },
  { label: '张伟 (学生)', value: 'dev_openid_2023112577' },
  { label: '陈明 (学生)', value: 'dev_openid_2023112566' },
  { label: '刘芳 (学生)', value: 'dev_openid_2023112555' },
  { label: '赵强 (学生)', value: 'dev_openid_2023112544' },
  { label: '孙丽 (学生)', value: 'dev_openid_2023112533' },
  { label: '周杰 (学生)', value: 'dev_openid_2023112522' },
  { label: '张涛 (学生)', value: 'dev_openid_2023112419' },
  { label: '潘星宇 (学生)', value: 'dev_openid_2023112425' },
  { label: '管理员',       value: 'dev_openid_admin001' }
]

Page({
  data: {
    avatarUrl: '',
    nickName: '',
    canLogin: false,
    loading: false,
    _adminTapCount: 0,
    _adminTapTimer: null,
    // 开发环境
    isDev: false,
    selectedDevUser: -1,        // 选中的测试用户索引，-1 = 真实登录
    devUsers: DEV_TEST_USERS
  },

  onLoad() {
    // 检测开发环境
    const accountInfo = wx.getAccountInfoSync()
    const isDev = accountInfo.miniProgram.envVersion === 'develop'
    this.setData({ isDev })

    // 读取上次选的测试用户
    if (isDev) {
      const lastDevUser = wx.getStorageSync('_lastDevUserIndex')
      if (lastDevUser !== undefined && lastDevUser !== '') {
        const idx = parseInt(lastDevUser)
        if (idx >= 0 && idx < DEV_TEST_USERS.length) {
          this.setData({ selectedDevUser: idx })
        }
      }
    }

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
   * 昵称失焦
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
   * 开发环境：选择测试用户
   */
  onSelectDevUser(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    this.setData({ selectedDevUser: index })
    wx.setStorageSync('_lastDevUserIndex', index)
  },

  /**
   * 开发环境：切回真实登录
   */
  onUseRealLogin() {
    this.setData({ selectedDevUser: -1 })
    wx.removeStorageSync('_lastDevUserIndex')
  },

  /**
   * 检查是否可以登录
   */
  checkCanLogin() {
    const isDev = this.data.isDev
    const hasAvatar = !!this.data.avatarUrl
    const hasNick = !!this.data.nickName.trim()
    const isDevUser = isDev && this.data.selectedDevUser >= 0

    // 开发环境选了测试用户：头像昵称可省；真实登录或生产环境：必须填
    const canLogin = isDevUser ? true : (hasAvatar && hasNick)
    if (this.data.canLogin !== canLogin) {
      this.setData({ canLogin })
    }
  },

  /**
   * 点击登录
   */
  async onLogin() {
    if (!this.data.canLogin || this.data.loading) return

    const isDev = this.data.isDev
    const selectedDevUser = this.data.selectedDevUser

    this.setData({ loading: true })

    try {
      let result

      if (isDev && selectedDevUser >= 0) {
        // ===== 开发环境：devOpenid 模拟登录 =====
        const devOpenid = DEV_TEST_USERS[selectedDevUser].value
        const userInfo = {
          avatarUrl: this.data.avatarUrl || '',
          nickName: this.data.nickName.trim() || DEV_TEST_USERS[selectedDevUser].label
        }

        console.log(`[DEV] 使用 devOpenid 模拟登录: ${devOpenid}`)

        try {
          result = await api.user.wechatLogin({
            code: '',
            userInfo,
            devOpenid
          })
        } catch (cloudErr) {
          console.warn('[DEV] 云函数调用失败，使用本地 mock:', cloudErr)
          // 云函数未部署时的兜底 mock
          result = {
            openid: devOpenid,
            userID: '',
            userName: DEV_TEST_USERS[selectedDevUser].label.split(' ')[0],
            identity: 'student',
            department: '',
            isBound: true,
            isBlacklisted: false,
            avatarUrl: userInfo.avatarUrl,
            nickName: userInfo.nickName
          }
        }

      } else {
        // ===== 生产环境：真实微信登录 =====
        const code = await auth.getLoginCode()
        const userInfo = {
          avatarUrl: this.data.avatarUrl,
          nickName: this.data.nickName.trim()
        }

        const params = { code, userInfo }
        try {
          result = await api.user.wechatLogin(params)
        } catch (cloudErr) {
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
      }

      if (result) {
        // 缓存 devOpenid 用于开发环境
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
