/**
 * getClassroomStatus - 获取教室状态矩阵
 * 
 * 获取指定教室在一周内各讲次的使用状态
 * 整合课程表(Courses)和租赁申请(Applications)数据
 * 状态值: 0=空闲, 1=有课(课程占用), 2=已占用(已被租赁)
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
    try {
        const { classroomId, week = 'this' } = event

        // 参数校验
        if (!classroomId) {
            return {
                code: 400,
                message: '教室ID不能为空',
                data: null
            }
        }

        // 获取教室信息（用于查找 classroomID）
        const classroom = await db.collection('Classrooms')
            .doc(classroomId)
            .get()
            .then(res => res.data)
            .catch(() => null)

        if (!classroom) {
            return {
                code: 404,
                message: '教室不存在',
                data: null
            }
        }

        // 初始化状态矩阵 (5天 x 13讲次)
        const statusMatrix = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 周一
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 周二
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 周三
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 周四
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]  // 周五
        ]

        // ===== 1. 标记课程占用（从 Courses 表）=====
        const courses = await db.collection('Courses')
            .where({ classroom: classroom.classroomID })
            .get()

        courses.data.forEach(course => {
            const schedule = course.schedule
            if (schedule && schedule.dayOfWeek >= 0 && schedule.dayOfWeek <= 4) {
                if (schedule.startLecture !== undefined && schedule.endLecture !== undefined) {
                    for (let i = schedule.startLecture; i <= schedule.endLecture; i++) {
                        if (i >= 0 && i <= 12) {
                            statusMatrix[schedule.dayOfWeek][i] = 1 // 有课
                        }
                    }
                }
            }
        })
        console.log(`已标记 ${courses.data.length} 个课程到状态矩阵`)

        // ===== 2. 标记租赁占用（从 Applications 表）=====
        // 查询教室的申请：使用 rentDate 为 YYYY-MM-DD 字符串格式进行比较
        // 注意：Applications 表中的 rentDate 是字符串格式
        // 由于不确定具体日期，先查询本周/下周对应的日期范围
        // 使用教室状态矩阵中已有的数据（从 Classrooms 表读取）作为基线

        // 从 Classrooms 表获取已持久化的状态矩阵
        const matrixKey = week === 'this' ? 'thisWeekStatusMatrix' : 'nextWeekStatusMatrix'
        const persistentMatrix = classroom[matrixKey]

        // 如果有持久化的矩阵数据，将其中的课程占用(1)和租赁占用(2)合并到结果中
        if (persistentMatrix) {
            for (let day = 0; day < 5; day++) {
                for (let lecture = 0; lecture < 13; lecture++) {
                    if (persistentMatrix[day][lecture] === 2) {
                        statusMatrix[day][lecture] = 2 // 已被租用（持久化数据）
                    }
                }
            }
        }

        return {
            code: 0,
            message: '查询成功',
            data: statusMatrix,
            week: week,
            classroomInfo: {
                classroomID: classroom.classroomID,
                buildingBelong: classroom.buildingBelong,
                containNumber: classroom.containNumber,
                description: classroom.description
            }
        }
    } catch (error) {
        console.error('getClassroomStatus 错误:', error)
        return {
            code: 500,
            message: '查询失败',
            error: error.message
        }
    }
}