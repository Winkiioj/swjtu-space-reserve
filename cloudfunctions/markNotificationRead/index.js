/**
 * markNotificationRead - 标记通知为已读
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

exports.main = async (event, context) => {
    try {
        const { notificationId } = event

        if (!notificationId) {
            return {
                code: 400,
                message: '通知ID不能为空',
                data: null
            }
        }

        const result = await db.collection('Notifications')
            .doc(notificationId)
            .update({
                data: {
                    isRead: true,
                    updatedAt: Date.now()
                }
            })

        if (result.stats.updated === 0) {
            return {
                code: 404,
                message: '通知不存在',
                data: null
            }
        }

        return {
            code: 0,
            message: '更新成功',
            data: null
        }
    } catch (error) {
        console.error('markNotificationRead 错误:', error)
        return {
            code: 500,
            message: '更新失败',
            error: error.message
        }
    }
}