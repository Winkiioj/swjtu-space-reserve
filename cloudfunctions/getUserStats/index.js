/**
 * getUserStats - 获取用户统计信息
 * 
 * 获取用户的申请统计数据
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
    try {
        const { userId } = event

        // 参数校验
        if (!userId) {
            return {
                code: 400,
                message: '用户ID不能为空',
                data: null
            }
        }

        // 查询用户的所有申请
        const result = await db.collection('Applications')
            .where({ proposerID: userId })
            .get()

        const applications = result.data

        // 统计各状态数量
        const stats = {
            total: applications.length,
            approved: applications.filter(a => a.rentalStatus === 1).length,
            pending: applications.filter(a => a.rentalStatus === 0).length,
            rejected: applications.filter(a => a.rentalStatus === 2).length,
            cancelled: applications.filter(a => a.rentalStatus === 3).length,
            completed: applications.filter(a => a.rentalStatus === 4).length
        }

        return {
            code: 0,
            message: '查询成功',
            data: stats
        }
    } catch (error) {
        console.error('getUserStats 错误:', error)
        return {
            code: 500,
            message: '查询失败',
            error: error.message
        }
    }
}