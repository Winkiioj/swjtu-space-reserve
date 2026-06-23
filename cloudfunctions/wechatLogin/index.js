/**
 * wechatLogin - 微信登录（唯一登录入口）
 *
 * 1. 通过微信 code 获取 openid
 * 2. 按 openid 查找 Users 表
 *    - 找到 → 返回用户信息（isBound 取决于 userID 是否为空）
 *    - 没找到 → 自动创建新用户（userID 为空，isBound: false）
 * 3. 开发环境支持 devOpenid 参数模拟登录
 */

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

exports.main = async (event, context) => {
    try {
        const { code, userInfo, devOpenid } = event

        // ===== 获取 openid =====
        let openid = null
        if (devOpenid) {
            // 开发环境：允许手动传入 openid 模拟登录
            openid = devOpenid
        } else if (code) {
            // 生产环境：通过微信 code 获取真实 openid
            const wxContext = cloud.getWXContext()
            openid = wxContext.OPENID
        }
        if (!openid) {
            return { code: 400, message: '获取微信身份失败', data: null }
        }

        // ===== 按 openid 查找用户 =====
        const result = await db.collection('Users').where({ openid }).get()

        if (result.data.length > 0) {
            // 如果有多个记录（空记录 + 已绑定记录），优先返回已绑定的
            let user = result.data[0]
            if (result.data.length > 1) {
                const bound = result.data.find(u => !!u.userID)
                if (bound) user = bound
                // 清理孤儿的空记录（openid 相同但无 userID，且不是当前选中的）
                for (const u of result.data) {
                    if (u._id !== user._id && !u.userID) {
                        await db.collection('Users').doc(u._id).remove()
                        console.log('已清理重复的空记录:', u._id)
                    }
                }
            }

            // 检查黑名单
            if (user.isBlacklisted) {
                return { code: 403, message: '账号已被禁用，请联系管理员', data: null }
            }

            // 更新微信头像昵称（如果传入）
            if (userInfo && (userInfo.avatarUrl || userInfo.nickName)) {
                const updates = { updatedAt: Date.now() }
                if (userInfo.avatarUrl) updates.avatarUrl = userInfo.avatarUrl
                if (userInfo.nickName) updates.nickName = userInfo.nickName
                await db.collection('Users').doc(user._id).update({ data: updates })
                // 同步更新本地 user 对象，确保返回的是最新数据
                if (userInfo.avatarUrl) user.avatarUrl = userInfo.avatarUrl
                if (userInfo.nickName) user.nickName = userInfo.nickName
            }

            return {
                code: 0,
                message: '登录成功',
                data: {
                    openid,
                    userID: user.userID || '',
                    userName: user.userName,
                    identity: user.identity,
                    department: user.department || '',
                    phone: user.phone || '',
                    isBlacklisted: user.isBlacklisted || false,
                    avatarUrl: user.avatarUrl || '',
                    nickName: user.nickName || user.userName,
                    isBound: !!user.userID
                }
            }
        }

        // ===== 没找到 → 创建新用户（userID 为空，后续在"我的"中绑定学号） =====
        const newUser = {
            openid,
            identity: 'student',
            userID: '',
            userName: (userInfo && userInfo.nickName) ? userInfo.nickName : '微信用户',
            department: '',
            phone: '',
            avatarUrl: (userInfo && userInfo.avatarUrl) ? userInfo.avatarUrl : '',
            nickName: (userInfo && userInfo.nickName) ? userInfo.nickName : '微信用户',
            isBlacklisted: false,
            totalRentals: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }
        await db.collection('Users').add({ data: newUser })

        return {
            code: 0,
            message: '登录成功，请绑定学号',
            data: {
                openid,
                userID: '',
                userName: newUser.userName,
                identity: 'student',
                department: '',
                phone: '',
                isBlacklisted: false,
                avatarUrl: newUser.avatarUrl,
                nickName: newUser.nickName,
                isBound: false
            }
        }
    } catch (error) {
        console.error('wechatLogin 错误:', error)
        return { code: 500, message: '微信登录失败', error: error.message }
    }
}
