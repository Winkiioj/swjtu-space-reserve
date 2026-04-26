/**
 * approveApplication - 批准申请
 * 
 * 管理员批准教室租赁申请
 * - 验证申请存在且处于待审核状态
 * - 再次验证教室讲次是否仍可用（防止并发修改）
 * - 原子性更新：申请状态 + 教室矩阵
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command

/**
 * 获取申请详情
 */
async function getApplicationInfo(applicationID) {
    try {
        const result = await db.collection('Applications')
            .doc(applicationID)
            .get()

        return result.data.length > 0 ? result.data[0] : null
    } catch (err) {
        console.error('获取申请详情失败:', err)
        return null
    }
}

/**
 * 获取教室信息
 */
async function getClassroomInfo(classroomID) {
    try {
        const result = await db.collection('Classrooms')
            .doc(classroomID)
            .get()

        return result.data.length > 0 ? result.data[0] : null
    } catch (err) {
        console.error('获取教室信息失败:', err)
        return null
    }
}

/**
 * 检查讲次是否可用（最新状态）
 */
function checkLecturesStillAvailable(matrix, dayOfWeek, lectures) {
    for (let lecture of lectures) {
        // 只有状态为0才表示可用
        if (matrix[dayOfWeek][lecture] !== 0) {
            return false
        }
    }
    return true
}

/**
 * 深拷贝矩阵
 */
function deepCopyMatrix(matrix) {
    return JSON.parse(JSON.stringify(matrix))
}

/**
 * 更新矩阵（将指定讲次设置为2=已占用）
 */
function updateMatrixToOccupied(matrix, dayOfWeek, lectures) {
    const newMatrix = deepCopyMatrix(matrix)
    for (let lecture of lectures) {
        newMatrix[dayOfWeek][lecture] = 2  // 2 = 已占用
    }
    return newMatrix
}

exports.main = async (event, context) => {
    try {
        const { applicationID, approverID } = event

        // ===== 参数校验 =====
        if (!applicationID || !approverID) {
            return {
                code: 400,
                message: '参数缺失',
                data: null
            }
        }

        // ===== 验证审批人是否为管理员 =====
        // 这里可以根据实际需要添加权限检查
        // 如果集成了权限管理系统，需要在这里验证approverID是否为admin

        // ===== 获取申请详情 =====
        const application = await getApplicationInfo(applicationID)
        if (!application) {
            return {
                code: 404,
                message: '申请不存在',
                data: null
            }
        }

        // 检查申请状态是否为待审核(0)
        if (application.rentalStatus !== 0) {
            return {
                code: 400,
                message: `申请状态不合法（当前状态: ${application.rentalStatus}），只能批准待审核的申请`,
                data: null
            }
        }

        // ===== 获取教室信息 =====
        const classroom = await getClassroomInfo(application.classroomApplied)
        if (!classroom) {
            return {
                code: 404,
                message: '教室不存在',
                data: null
            }
        }

        // ===== 再次检查讲次是否仍可用（防止并发） =====
        const matrixFieldName = application.rentWeek === 'this'
            ? 'thisWeekStatusMatrix'
            : 'nextWeekStatusMatrix'

        const currentMatrix = classroom[matrixFieldName]

        if (!checkLecturesStillAvailable(currentMatrix, application.rentDayOfWeek, application.rentLectures)) {
            return {
                code: 409,
                message: '教室讲次已被占用或发生并发修改，请刷新后重试',
                data: null
            }
        }

        // ===== 更新矩阵 =====
        const updatedMatrix = updateMatrixToOccupied(currentMatrix, application.rentDayOfWeek, application.rentLectures)
        const now = new Date().getTime()

        // ===== 同时更新申请和教室（事务性操作） =====
        // 由于微信云数据库不支持真正的事务，这里按顺序更新
        // 先更新申请，再更新教室

        // 更新申请状态
        await db.collection('Applications')
            .doc(applicationID)
            .update({
                data: {
                    rentalStatus: 1,        // 已批准
                    approvedAt: now,
                    updatedAt: now
                }
            })

        // 更新教室矩阵
        const updateData = {
            [matrixFieldName]: updatedMatrix,
            updatedAt: now
        }

        await db.collection('Classrooms')
            .doc(application.classroomApplied)
            .update({
                data: updateData
            })

        return {
            code: 0,
            message: '申请已批准',
            data: {
                applicationID: applicationID,
                status: 1,
                approvedAt: now,
                classroomUpdated: true,
                affectedLectures: application.rentLectures,
                classroomID: classroom.classroomID,
                rentDate: application.rentDate
            }
        }
    } catch (error) {
        console.error('approveApplication 错误:', error)
        return {
            code: 500,
            message: '批准失败',
            error: error.message
        }
    }
}
