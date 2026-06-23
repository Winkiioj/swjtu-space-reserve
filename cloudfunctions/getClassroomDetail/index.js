/**
 * getClassroomDetail - 获取教室详情
 * 
 * 根据教室ID获取教室的详细信息
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

exports.main = async (event, context) => {
    try {
        const { classroomId } = event

        // 参数校验
        if (!classroomId) {
            return {
                code: 400,
                message: '教室ID不能为空',
                data: null
            }
        }

        // 查询教室详情
        const result = await db.collection('Classrooms')
            .doc(classroomId)
            .get()

        if (!result.data) {
            return {
                code: 404,
                message: '教室不存在',
                data: null
            }
        }

        return {
            code: 0,
            message: '查询成功',
            data: {
                _id: result.data._id,
                classroomID: result.data.classroomID,
                building: result.data.buildingBelong || result.data.building,
                buildingBelong: result.data.buildingBelong,
                roomNumber: result.data.classroomNumber || result.data.roomNumber,
                containNumber: result.data.containNumber || result.data.capacity,
                capacity: result.data.containNumber || result.data.capacity,
                status: result.data.status || 0,
                facilities: result.data.facilities || '',
                description: result.data.description || '',
                createdAt: result.data.createdAt,
                updatedAt: result.data.updatedAt
            }
        }
    } catch (error) {
        console.error('getClassroomDetail 错误:', error)
        return {
            code: 500,
            message: '查询失败',
            error: error.message
        }
    }
}