/**
 * submitApplication - 提交租赁申请
 * 
 * 用户提交新的教室租赁申请
 * - 验证用户是否被黑名单
 * - 验证教室和讲次是否可用
 * - 创建新的申请记录（状态=0 待审核）
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command

/**
 * 获取用户信息（包含黑名单状态）
 * 支持通过 userID(学号) 或 openid(微信) 查找
 */
async function getUserInfo(userID) {
    // 先按 userID 查找
    let result = await db.collection('Users')
        .where({ userID: userID })
        .get()

    if (result.data.length > 0) {
        return result.data[0]
    }

    // 再按 openid 查找
    result = await db.collection('Users')
        .where({ openid: userID })
        .get()

    return result.data.length > 0 ? result.data[0] : null
}

/**
 * 获取教室信息
 */
async function getClassroomInfo(classroomID) {
    const result = await db.collection('Classrooms')
        .where({ classroomID: classroomID })
        .get()

    return result.data.length > 0 ? result.data[0] : null
}

/**
 * 检查讲次是否可用
 */
function checkLecturesAvailable(matrix, dayOfWeek, lectures) {
    for (let lecture of lectures) {
        if (matrix[dayOfWeek][lecture] !== 0) {
            return false
        }
    }
    return true
}

/**
 * 获取用户未完成的申请数（用于速率限制）
 */
async function getPendingApplicationsCount(userID) {
    const result = await db.collection('Applications')
        .where({
            proposerID: userID,
            rentalStatus: _.in([0, 1])  // 待审核或已批准
        })
        .get()

    return result.data.length
}

exports.main = async (event, context) => {
    try {
        const {
            classroomID,
            rentDate,
            rentWeek,
            rentDayOfWeek,
            rentLectures,
            rentalDetail,
            rentalDescription = '',
            expectedAttendeeCount
        } = event

        // 获取当前用户ID（从云函数上下文获取）
        const userID = event.userOpenID || context.userInfo?.openid
        if (!userID) {
            return {
                code: 401,
                message: '需要用户登录',
                data: null
            }
        }

        // ===== 参数校验 =====
        if (!classroomID || !rentDate || !rentWeek || rentDayOfWeek === undefined || !rentLectures) {
            return {
                code: 400,
                message: '参数缺失',
                data: null
            }
        }

        if (!rentalDetail || rentalDetail.trim() === '') {
            return {
                code: 400,
                message: '租赁事由不能为空',
                data: null
            }
        }

        if (!expectedAttendeeCount || expectedAttendeeCount <= 0) {
            return {
                code: 400,
                message: '期望参与人数必须大于0',
                data: null
            }
        }

        if (rentLectures.length === 0) {
            return {
                code: 400,
                message: '必须选择至少一个讲次',
                data: null
            }
        }

        // ===== 获取用户信息 =====
        const user = await getUserInfo(userID)
        if (!user) {
            return {
                code: 404,
                message: '用户不存在',
                data: null
            }
        }

        // 检查用户是否被黑名单
        if (user.isBlacklisted) {
            return {
                code: 402,
                message: '您已被加入黑名单，无法申请教室',
                data: null
            }
        }

        // ===== 获取教室信息 =====
        const classroom = await getClassroomInfo(classroomID)
        if (!classroom) {
            return {
                code: 404,
                message: '教室不存在',
                data: null
            }
        }

        // 检查期望人数是否超过教室容量
        if (expectedAttendeeCount > classroom.containNumber) {
            return {
                code: 400,
                message: `期望人数(${expectedAttendeeCount})超过教室容量(${classroom.containNumber})`,
                data: null
            }
        }

        // ===== 检查讲次是否可用 =====
        const matrix = rentWeek === 'this'
            ? classroom.thisWeekStatusMatrix
            : classroom.nextWeekStatusMatrix

        if (!checkLecturesAvailable(matrix, rentDayOfWeek, rentLectures)) {
            return {
                code: 409,
                message: '该时段已被占用或有课程安排',
                data: null
            }
        }

        // ===== 检查速率限制（可选）=====
        const pendingCount = await getPendingApplicationsCount(userID)
        if (pendingCount >= 5) {
            return {
                code: 403,
                message: '您有过多待处理的申请，请稍后再试',
                data: null
            }
        }

        // ===== 防重复提交：同一用户 10s 内相同的申请视为重复 =====
        const now = Date.now()
        const recentDuplicate = await db.collection('Applications')
          .where({
            proposerID: userID,
            classroomName: classroom.classroomID,
            rentDate: rentDate,
            rentLectures: rentLectures,
            appliedAt: _.gte(now - 10000)
          })
          .count()
        if (recentDuplicate.total > 0) {
            return {
                code: 400,
                message: '请勿重复提交',
                data: null
            }
        }

        // ===== 创建新申请 =====
        const applicationData = {
            classroomApplied: classroom._id,
            classroomName: classroom.classroomID,       // 冗余：教室号，如 "x1337"
            classroomBuilding: classroom.buildingBelong, // 冗余：楼栋，如 "一号教学楼"
            proposerID: userID,
            proposerName: user.userName,

            rentalDetail: rentalDetail.trim(),
            rentalDescription: rentalDescription.trim(),

            rentDate: rentDate,
            rentWeek: rentWeek,
            rentDayOfWeek: rentDayOfWeek,
            rentLectures: rentLectures,

            expectedAttendeeCount: expectedAttendeeCount,
            actualAttendeeCount: null,

            rentalStatus: 0,  // 待审核
            rejectionReason: '',

            appliedAt: now,
            approvedAt: null,
            completedAt: null,

            updatedAt: now
        }

        const result = await db.collection('Applications').add({
            data: applicationData
        })

        // ===== 创建新申请通知（通知管理员） =====
        const lectureStr = rentLectures.map(l => l + 1).join(',')
        const dayNames = ['一', '二', '三', '四', '五', '六', '日']
        await db.collection('Notifications').add({
          data: {
            targetUsers: ['admin'],
            title: '📋 新教室申请',
            content: `${user.userName}（${user.userID}）申请了 ${classroom.classroomID}（${classroom.buildingBelong}），${rentDate} 周${dayNames[rentDayOfWeek]} 第${lectureStr}讲`,
            type: 'new_application',
            relatedId: result._id,
            isRead: false,
            createdAt: now,
            updatedAt: now
          }
        })

        return {
            code: 0,
            message: '申请已提交，等待审核',
            data: {
                applicationID: result._id,
                status: 0,
                appliedAt: now
            }
        }
    } catch (error) {
        console.error('submitApplication 错误:', error)
        return {
            code: 500,
            message: '申请提交失败',
            error: error.message
        }
    }
}
