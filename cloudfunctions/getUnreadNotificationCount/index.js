/**
 * getUnreadNotificationCount - 获取未读通知数量
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command

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

        const result = await db.collection('Notifications')
            .where({
                targetUsers: _.in([userId, 'all']),
                isRead: false
            })
            .count()

        return {
            code: 0,
            message: '查询成功',
            data: { count: result.total }
        }
    } catch (error) {
        console.error('getUnreadNotificationCount 错误:', error)
        return {
            code: 500,
            message: '查询失败',
            error: error.message
        }
    }
}