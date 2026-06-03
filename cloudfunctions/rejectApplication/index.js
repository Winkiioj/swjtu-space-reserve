/**
 * rejectApplication - 拒绝申请（管理员）
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

exports.main = async (event, context) => {
    try {
        const { applicationId, approverID, reason } = event

        // 参数校验
        if (!applicationId || !approverID) {
            return {
                code: 400,
                message: '申请ID和审批人ID不能为空',
                data: null
            }
        }

        // 查询申请
        const appResult = await db.collection('Applications')
            .doc(applicationId)
            .get()

        if (!appResult.data) {
            return {
                code: 404,
                message: '申请不存在',
                data: null
            }
        }

        const application = appResult.data

        // 检查状态
        if (application.rentalStatus !== 0) {
            return {
                code: 400,
                message: '只能拒绝待审核的申请',
                data: null
            }
        }

        // 更新申请状态
        const result = await db.collection('Applications')
            .doc(applicationId)
            .update({
                data: {
                    rentalStatus: 2, // 已拒绝
                    rejectionReason: reason || '',
                    approvedAt: Date.now(),
                    updatedAt: Date.now()
                }
            })

        if (result.stats.updated === 0) {
            return {
                code: 500,
                message: '更新失败',
                data: null
            }
        }

        return {
            code: 0,
            message: '拒绝成功',
            data: null
        }
    } catch (error) {
        console.error('rejectApplication 错误:', error)
        return {
            code: 500,
            message: '拒绝失败',
            error: error.message
        }
    }
}