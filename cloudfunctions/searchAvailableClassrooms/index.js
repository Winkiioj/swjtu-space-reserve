/**
 * searchAvailableClassrooms - 查询可用教室
 * 
 * 根据日期、讲次、容量等条件查询可用教室
 * 查询逻辑：教室状态值为0表示空闲
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
    try {
        const { rentDate, rentWeek, rentDayOfWeek, rentLectures, minCapacity = 0 } = event

        // ===== 参数校验 =====
        if (!rentDate || !rentWeek || rentDayOfWeek === undefined || !rentLectures || rentLectures.length === 0) {
            return {
                code: 400,
                message: '参数缺失',
                data: null
            }
        }

        if (!['this', 'next'].includes(rentWeek)) {
            return {
                code: 400,
                message: 'rentWeek 必须为 "this" 或 "next"',
                data: null
            }
        }

        if (rentDayOfWeek < 0 || rentDayOfWeek > 4) {
            return {
                code: 400,
                message: 'rentDayOfWeek 必须为 0-4',
                data: null
            }
        }

        // 检查所有讲次都有效
        for (let lecture of rentLectures) {
            if (lecture < 0 || lecture > 12) {
                return {
                    code: 400,
                    message: 'rentLectures 中的讲次必须为 0-12',
                    data: null
                }
            }
        }

        // ===== 查询所有符合容量的教室 =====
        const classrooms = await db.collection('Classrooms')
            .where({
                containNumber: _.gte(minCapacity)
            })
            .get()

        if (classrooms.data.length === 0) {
            return {
                code: 0,
                message: '没有找到符合条件的教室',
                data: []
            }
        }

        // ===== 检查每个教室的指定讲次是否可用 =====
        const available = []

        for (let classroom of classrooms.data) {
            let isAvailable = true
            const matrixName = rentWeek === 'this' ? 'thisWeekStatusMatrix' : 'nextWeekStatusMatrix'
            const matrix = classroom[matrixName]

            // 检查所有讲次的状态
            for (let lecture of rentLectures) {
                // 状态值：0=空闲, 1=有课, 2=已占用
                if (matrix[rentDayOfWeek][lecture] !== 0) {
                    isAvailable = false
                    break
                }
            }

            if (isAvailable) {
                available.push({
                    _id: classroom._id,
                    classroomID: classroom.classroomID,
                    buildingBelong: classroom.buildingBelong,
                    floor: classroom.floor,
                    containNumber: classroom.containNumber,
                    description: classroom.description,
                    availability: rentLectures.map(l => matrix[rentDayOfWeek][l])
                })
            }
        }

        return {
            code: 0,
            message: `找到 ${available.length} 间可用教室`,
            data: available
        }
    } catch (error) {
        console.error('searchAvailableClassrooms 错误:', error)
        return {
            code: 500,
            message: '查询失败',
            error: error.message
        }
    }
}
