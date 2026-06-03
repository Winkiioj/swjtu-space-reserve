/**
 * markAllNotificationsRead - 标记所有通知为已读
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
            .update({
                data: {
                    isRead: true,
                    updatedAt: Date.now()
                }
            })

        return {
            code: 0,
            message: '更新成功',
            data: { updatedCount: result.stats.updated }
        }
    } catch (error) {
        console.error('markAllNotificationsRead 错误:', error)
        return {
            code: 500,
            message: '更新失败',
            error: error.message
        }
    }
}