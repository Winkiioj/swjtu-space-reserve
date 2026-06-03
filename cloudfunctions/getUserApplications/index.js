/**
 * getUserApplications - 查询用户的所有申请
 * 
 * 获取用户的申请列表，支持按状态筛选
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command

/**
 * 获取教室信息（缓存）
 */
const classroomCache = {}

async function getClassroomInfo(classroomID) {
    if (classroomCache[classroomID]) {
        return classroomCache[classroomID]
    }

    try {
        const result = await db.collection('Classrooms')
            .doc(classroomID)
            .get()
        // .doc() 返回单对象 {data: {...}}
        if (result && result.data && result.data._id) {
            classroomCache[classroomID] = result.data
            return result.data
        }
    } catch (err) {
        console.error('获取教室信息失败:', err)
    }
    return null
}

exports.main = async (event, context) => {
    try {
        const { userID, status = -1, limit = 50, skip = 0 } = event

        // ===== 参数校验 =====
        if (!userID) {
            return {
                code: 400,
                message: '用户ID不能为空',
                data: null
            }
        }

        if (status < -1 || status > 4) {
            return {
                code: 400,
                message: '状态值无效，应为 -1 到 4',
                data: null
            }
        }

        // ===== 构建查询条件 =====
        let query = db.collection('Applications')
            .where({ proposerID: userID })

        // 如果指定了状态（不是-1），则按状态筛选
        if (status !== -1) {
            query = query.where({ rentalStatus: status })
        }

        // ===== 执行查询 =====
        const result = await query
            .orderBy('appliedAt', 'desc')
            .skip(skip)
            .limit(limit)
            .get()

        // ===== 丰富应用数据 =====
        const enrichedApplications = []

        for (let app of result.data) {
            // 获取教室信息
            const classroom = await getClassroomInfo(app.classroomApplied)

            enrichedApplications.push({
                ...app,  // 保留原始字段（classroomName, classroomBuilding 等）
                _id: app._id,
                applicationID: app._id,
                classroomApplied: app.classroomApplied,
                classroomID: classroom ? classroom.classroomID : (app.classroomName || 'N/A'),
                classroomName: app.classroomName || (classroom ? classroom.classroomID : 'N/A'),
                classroomBuilding: app.classroomBuilding || (classroom ? classroom.buildingBelong : 'N/A'),
                buildingBelong: classroom ? classroom.buildingBelong : 'N/A',
                building: classroom ? classroom.buildingBelong : 'N/A',
                roomNumber: classroom ? classroom.classroomID : 'N/A',
                proposerID: app.proposerID,
                proposerName: app.proposerName,
                rentalDetail: app.rentalDetail,
                rentalDescription: app.rentalDescription,
                rentDate: app.rentDate,
                rentWeek: app.rentWeek,
                rentDayOfWeek: app.rentDayOfWeek,
                rentLectures: app.rentLectures,
                expectedAttendeeCount: app.expectedAttendeeCount,
                actualAttendeeCount: app.actualAttendeeCount,
                rentalStatus: app.rentalStatus,
                rejectionReason: app.rejectionReason,
                appliedAt: app.appliedAt,
                approvedAt: app.approvedAt,
                completedAt: app.completedAt,
                updatedAt: app.updatedAt
            })
        }

        // ===== 状态值映射 =====
        const statusMap = {
            0: '待审核',
            1: '已批准',
            2: '已拒绝',
            3: '已取消',
            4: '已完成'
        }

        // 添加状态中文
        enrichedApplications.forEach(app => {
            app.statusText = statusMap[app.rentalStatus] || '未知状态'
        })

        return {
            code: 0,
            message: '查询成功',
            data: enrichedApplications,
            pagination: {
                total: enrichedApplications.length,
                skip: skip,
                limit: limit
            }
        }
    } catch (error) {
        console.error('getUserApplications 错误:', error)
        return {
            code: 500,
            message: '查询失败',
            error: error.message
        }
    }
}
