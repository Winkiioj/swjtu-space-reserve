/**
 * updateUserInfo - 更新用户信息
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

exports.main = async (event, context) => {
    try {
        const { userId, studentId, phone, email, identity } = event

        if (!userId) {
            return {
                code: 400,
                message: '用户ID不能为空',
                data: null
            }
        }

        const updateData = {
            updatedAt: Date.now()
        }

        if (studentId !== undefined) updateData.studentId = studentId
        if (phone !== undefined) updateData.phone = phone
        if (email !== undefined) updateData.email = email
        if (identity !== undefined) updateData.identity = identity

        const result = await db.collection('Users')
            .where({ openid: userId })
            .update({ data: updateData })

        if (result.stats.updated === 0) {
            return {
                code: 404,
                message: '用户不存在',
                data: null
            }
        }

        return {
            code: 0,
            message: '更新成功',
            data: updateData
        }
    } catch (error) {
        console.error('updateUserInfo 错误:', error)
        return {
            code: 500,
            message: '更新失败',
            error: error.message
        }
    }
}