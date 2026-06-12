/**
 * searchAvailableClassrooms - 查询可用教室
 *
 * 根据日期、讲次、容量、楼栋、教室类型、设施、楼层等条件查询可用教室
 * 查询逻辑：教室状态值为0表示空闲
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
    try {
        const {
            rentDate, rentWeek, rentDayOfWeek, rentLectures,
            minCapacity = 0,
            building,
            roomType,       // 新增：教室类型精确筛选
            facilities,     // 新增：设施多选筛选（数组）
            floor           // 新增：楼层筛选
        } = event

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

        // ===== 构建查询条件 =====
        let queryCondition = { containNumber: _.gte(minCapacity) }

        // 楼栋筛选
        if (building && building !== '') {
            queryCondition.buildingBelong = building
        }

        // 教室类型筛选（精确匹配）
        if (roomType && roomType !== '') {
            queryCondition.roomType = roomType
        }

        // 楼层筛选（精确匹配）
        if (floor !== undefined && floor !== null && floor !== '') {
            queryCondition.floor = parseInt(floor)
        }

        // 设施筛选（教室必须同时包含所有选中的设施）
        if (facilities && Array.isArray(facilities) && facilities.length > 0) {
            queryCondition.facilities = _.all(facilities)
        }

        // ===== 查询符合条件的教室 =====
        const classrooms = await db.collection('Classrooms')
            .where(queryCondition)
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
                    building: classroom.buildingBelong,
                    roomNumber: classroom.classroomID,
                    floor: classroom.floor,
                    containNumber: classroom.containNumber,
                    roomType: classroom.roomType || '',
                    facilities: classroom.facilities || [],
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
