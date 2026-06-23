/**
 * cancelApplication - 用户取消申请
 * 
 * 用户取消已提交的申请
 * - 仅当状态为 0(待审核) 或 1(已批准) 时可取消
 * - 若已批准，需要恢复教室状态（对应讲次从2变为0）
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

/**
 * 获取申请详情
 * 先用 _id 直接查，失败则用 applicationID 字段查
 */
async function getApplicationInfo(applicationID) {
    // 方式1: 用 _id 直接查 (.doc() 返回单对象，不是数组)
    try {
        const result = await db.collection('Applications')
            .doc(applicationID)
            .get()
        if (result && result.data && result.data._id) {
            return result.data
        }
    } catch (err) {
        console.log('_id 直查失败，改用字段查询:', err.message)
    }

    // 方式2: 用 applicationID 字段查 (.where() 返回数组)
    try {
        const result = await db.collection('Applications')
            .where({ applicationID: applicationID })
            .get()
        if (result && result.data && result.data.length > 0) {
            return result.data[0]
        }
    } catch (err) {
        console.error('字段查询也失败:', err)
    }

    return null
}

/**
 * 获取教室信息
 */
async function getClassroomInfo(classroomID) {
    try {
        const result = await db.collection('Classrooms')
            .doc(classroomID)
            .get()
        // .doc() 返回单对象 {data: {...}}
        if (result && result.data && result.data._id) {
            return result.data
        }
        return null
    } catch (err) {
        console.error('获取教室信息失败:', err)
        return null
    }
}

/**
 * 深拷贝矩阵
 */
function deepCopyMatrix(matrix) {
    return JSON.parse(JSON.stringify(matrix))
}

/**
 * 恢复矩阵（将指定讲次从2恢复为0）
 */
function restoreMatrixToAvailable(matrix, dayOfWeek, lectures) {
    const newMatrix = deepCopyMatrix(matrix)
    for (let lecture of lectures) {
        // 只恢复状态为2的讲次
        if (newMatrix[dayOfWeek][lecture] === 2) {
            newMatrix[dayOfWeek][lecture] = 0
        }
    }
    return newMatrix
}

exports.main = async (event, context) => {
    try {
        const { applicationId, applicationID, cancelReason = '' } = event
        const appId = applicationID || applicationId  // 兼容两种命名

        // ===== 参数校验 =====
        if (!appId) {
            return {
                code: 400,
                message: '申请ID不能为空',
                data: null
            }
        }

        // ===== 获取申请详情 =====
        const application = await getApplicationInfo(appId)
        if (!application) {
            return {
                code: 404,
                message: '申请不存在',
                data: null
            }
        }

        // ===== 检查申请状态 =====
        // 仅当状态为 0(待审核) 或 1(已批准) 时可取消
        if (![0, 1].includes(application.rentalStatus)) {
            const statusMap = {
                2: '已拒绝',
                3: '已取消',
                4: '已完成'
            }
            return {
                code: 400,
                message: `该申请状态为"${statusMap[application.rentalStatus]}"，无法取消`,
                data: null
            }
        }

        const now = new Date().getTime()
        let classroomRestored = false

        // ===== 如果已批准，需要恢复教室状态 =====
        if (application.rentalStatus === 1) {
            // 获取教室信息
            const classroom = await getClassroomInfo(application.classroomApplied)
            if (!classroom) {
                return {
                    code: 404,
                    message: '教室不存在，但需要恢复教室状态',
                    data: null
                }
            }

            // 恢复教室矩阵
            const matrixFieldName = application.rentWeek === 'this'
                ? 'thisWeekStatusMatrix'
                : 'nextWeekStatusMatrix'

            const currentMatrix = classroom[matrixFieldName]
            const restoredMatrix = restoreMatrixToAvailable(currentMatrix, application.rentDayOfWeek, application.rentLectures)

            // 更新教室状态
            await db.collection('Classrooms')
                .doc(application.classroomApplied)
                .update({
                    data: {
                        [matrixFieldName]: restoredMatrix,
                        updatedAt: now
                    }
                })

            classroomRestored = true
        }

        // ===== 更新申请状态为已取消(3) =====
        await db.collection('Applications')
            .doc(appId)
            .update({
                data: {
                    rentalStatus: 3,  // 已取消
                    cancelReason: cancelReason.trim(),
                    updatedAt: now
                }
            })

        return {
            code: 0,
            message: '申请已取消',
            data: {
                applicationID: appId,
                status: 3,
                classroomRestored: classroomRestored,
                updatedAt: now
            }
        }
    } catch (error) {
        console.error('cancelApplication 错误:', error)
        return {
            code: 500,
            message: '取消申请失败',
            error: error.message
        }
    }
}
