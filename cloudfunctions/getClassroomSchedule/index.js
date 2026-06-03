/**
 * getClassroomSchedule - 获取教室课表
 * 
 * 从 Courses 表查询该教室的课程安排
 */

const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
    try {
        const { classroomId, week = 'this' } = event

        if (!classroomId) {
            return {
                code: 400,
                message: '教室ID不能为空',
                data: null
            }
        }

        // 先获取教室信息（得到 classroomID）
        const classroom = await db.collection('Classrooms')
            .doc(classroomId)
            .get()
            .then(res => res.data)
            .catch(() => null)

        if (!classroom) {
            return {
                code: 400,
                message: '教室不存在',
                data: null
            }
        }

        // 从 Courses 表查询该教室的所有课程
        const result = await db.collection('Courses')
            .where({ classroom: classroom.classroomID })
            .get()

        // 格式化返回数据
        const schedule = result.data.map(course => ({
            courseID: course.courseID,
            courseName: course.courseName,
            instructorName: course.instructorName,
            dayOfWeek: course.schedule?.dayOfWeek,
            startLecture: course.schedule?.startLecture,
            endLecture: course.schedule?.endLecture
        }))

        return {
            code: 0,
            message: '查询成功',
            data: schedule
        }
    } catch (error) {
        console.error('getClassroomSchedule 错误:', error)
        return {
            code: 500,
            message: '查询失败',
            error: error.message
        }
    }
}