/**
 * bindStudentId - 微信登录后绑定学号/工号
 *
 * 将微信 openid 关联到已有的学号/工号记录上
 */

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()

exports.main = async (event, context) => {
    try {
        const { openid, userID } = event
        if (!openid || !userID) {
            return { code: 400, message: '参数不完整', data: null }
        }

        // 1. 检查当前 openid 是否已绑定过学号（可能有多条记录）
        const selfResult = await db.collection('Users').where({ openid }).get()
        const alreadyBound = selfResult.data.find(u => !!u.userID)
        if (alreadyBound) {
            return { code: 409, message: '该微信账号已绑定过学号: ' + alreadyBound.userID, data: null }
        }

        // 2. 按 userID 查找目标用户记录
        const userResult = await db.collection('Users').where({ userID }).get()
        if (userResult.data.length === 0) {
            return { code: 404, message: '该学号/工号未在系统中注册，请联系管理员', data: null }
        }

        const user = userResult.data[0]

        // 3. 更新该用户的 openid
        // 情况A: user.openid 为空 → 首次绑定
        // 情况B: user.openid 已有关联 → 允许覆盖（用户切换微信时）
        // 情况C: user.openid === openid → 已绑定自己，返回成功
        if (user.openid === openid) {
            return {
                code: 0, message: '已绑定',
                data: {
                    openid, userID: user.userID, userName: user.userName,
                    identity: user.identity, department: user.department || '',
                    phone: user.phone || '', isBlacklisted: user.isBlacklisted || false,
                    avatarUrl: user.avatarUrl || '', nickName: user.nickName || user.userName,
                    isBound: true
                }
            }
        }

        // 如果之前有别的 openid 关联，先清除旧关联
        if (user.openid) {
            // 把拥有这个 userID 的记录的 openid 替换掉
            await db.collection('Users').doc(user._id).update({
                data: { openid, updatedAt: Date.now() }
            })

            // 删除旧 openid 对应的空记录（如果有的话——之前的自注册）
            const oldRecords = await db.collection('Users')
                .where({ openid: user.openid, userID: '' })
                .get()
            for (const r of oldRecords.data) {
                await db.collection('Users').doc(r._id).remove()
            }
        } else {
            // 首次绑定
            await db.collection('Users').doc(user._id).update({
                data: { openid, updatedAt: Date.now() }
            })
        }

        // 清理孤儿记录：同 openid 但无 userID 的空记录
        const orphanRecords = await db.collection('Users')
            .where({ openid, userID: '' })
            .get()
        for (const r of orphanRecords.data) {
            if (r._id !== user._id) {
                await db.collection('Users').doc(r._id).remove()
                console.log('已清理孤儿记录:', r._id)
            }
        }

        return {
            code: 0, message: '绑定成功',
            data: {
                openid, userID: user.userID, userName: user.userName,
                identity: user.identity, department: user.department || '',
                phone: user.phone || '', isBlacklisted: user.isBlacklisted || false,
                avatarUrl: user.avatarUrl || '', nickName: user.nickName || user.userName,
                isBound: true
            }
        }
    } catch (error) {
        console.error('bindStudentId 错误:', error)
        return { code: 500, message: '绑定失败', error: error.message }
    }
}
