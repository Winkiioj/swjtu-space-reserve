/**
 * getUserNotifications - 获取用户通知列表
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
    try {
        const { userId, limit = 20 } = event

        if (!userId) {
            return {
                code: 400,
                message: '用户ID不能为空',
                data: null
            }
        }

        const result = await db.collection('Notifications')
            .where({
                targetUsers: _.in([userId, 'all'])
            })
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get()

        return {
            code: 0,
            message: '查询成功',
            data: result.data
        }
    } catch (error) {
        console.error('getUserNotifications 错误:', error)
        return {
            code: 500,
            message: '查询失败',
            error: error.message
        }
    }
}