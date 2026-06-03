/**
 * getUserSchedule - 获取用户课表（学生）
 * 
 * 注意：当前 Courses 表没有学生选课信息(studentIDs字段)，
 * 此功能需要后续完善数据模型后才能正常使用。
 * 目前查询 StudentsCourses 关联表（如果存在）或返回空。
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
    try {
        const { userId, week = 'this' } = event

        if (!userId) {
            return {
                code: 400,
                message: '用户ID不能为空',
                data: null
            }
        }

        // 尝试从 Courses 表查询（需要 studentIDs 字段支持）
        // 目前课程数据没有绑定学生，返回空数组
        // TODO: 后续接入教务系统后，通过选课数据查询学生课表

        return {
            code: 0,
            message: '查询成功',
            data: [],
            note: '学生课表功能需接入教务数据后方可使用'
        }
    } catch (error) {
        console.error('getUserSchedule 错误:', error)
        return {
            code: 500,
            message: '查询失败',
            error: error.message
        }
    }
}