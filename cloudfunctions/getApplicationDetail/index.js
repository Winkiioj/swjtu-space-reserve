/**
 * getApplicationDetail - 获取申请详情
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

exports.main = async (event, context) => {
    try {
        const { applicationId } = event

        if (!applicationId) {
            return {
                code: 400,
                message: '申请ID不能为空',
                data: null
            }
        }

        const result = await db.collection('Applications')
            .doc(applicationId)
            .get()

        if (!result.data) {
            return {
                code: 404,
                message: '申请不存在',
                data: null
            }
        }

        // 获取教室信息
        let classroom = null
        if (result.data.classroomApplied) {
            const classResult = await db.collection('Classrooms')
                .doc(result.data.classroomApplied)
                .get()
            classroom = classResult.data
        }

        return {
            code: 0,
            message: '查询成功',
            data: {
                ...result.data,
                classroomInfo: classroom
            }
        }
    } catch (error) {
        console.error('getApplicationDetail 错误:', error)
        return {
            code: 500,
            message: '查询失败',
            error: error.message
        }
    }
}