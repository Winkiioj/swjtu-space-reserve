/**
 * getUserInfo - 获取用户信息
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

exports.main = async (event, context) => {
    try {
        const { userId } = event

        if (!userId) {
            return {
                code: 400,
                message: '用户ID不能为空',
                data: null
            }
        }

        const result = await db.collection('Users')
            .where({ openid: userId })
            .get()

        if (result.data.length === 0) {
            // 如果用户不存在，创建一个新用户记录
            const newUser = {
                openid: userId,
                identity: 'student',
                studentId: '',
                phone: '',
                email: '',
                isBlacklisted: false,
                createdAt: Date.now(),
                updatedAt: Date.now()
            }

            await db.collection('Users').add({ data: newUser })

            return {
                code: 0,
                message: '用户已创建',
                data: newUser
            }
        }

        return {
            code: 0,
            message: '查询成功',
            data: result.data[0]
        }
    } catch (error) {
        console.error('getUserInfo 错误:', error)
        return {
            code: 500,
            message: '查询失败',
            error: error.message
        }
    }
}