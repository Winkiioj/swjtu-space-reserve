/**
 * getAllClassrooms - 获取所有教室列表
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

exports.main = async (event, context) => {
    try {
        const { building } = event

        let query = db.collection('Classrooms')

        if (building && building !== '') {
            query = query.where({ buildingBelong: building })
        }

        const result = await query.get()

        const classrooms = result.data.map(item => ({
            _id: item._id,
            classroomID: item.classroomID,
            building: item.buildingBelong || item.building,
            buildingBelong: item.buildingBelong,
            roomNumber: item.classroomNumber || item.roomNumber,
            containNumber: item.containNumber || item.capacity,
            capacity: item.containNumber || item.capacity,
            status: item.status || 0,
            facilities: item.facilities || '',
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
        }))

        return {
            code: 0,
            message: '查询成功',
            data: classrooms
        }
    } catch (error) {
        console.error('getAllClassrooms 错误:', error)
        return {
            code: 500,
            message: '查询失败',
            error: error.message
        }
    }
}