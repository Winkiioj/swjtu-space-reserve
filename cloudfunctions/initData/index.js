/**
 * 初始化数据脚本 - 用于学期初快速导入教室、座位、课程数据
 * 功能：
 * - 1. 清空所有表（可选）
 * - 2. 导入讲次定义
 * - 3. 导入教室基础信息
 * - 4. 导入座位基础信息
 * - 5. 导入初始用户（至少一个管理员）
 * - 6. 导入课程表并填充教室状态矩阵
 */

const cloud = require('wx-server-sdk')

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

// ============ 常量定义 ============

// 讲次定义 - 13讲
const LECTURES = [
    { lecture_no: 1, start_time: '08:00', end_time: '08:45' },
    { lecture_no: 2, start_time: '08:55', end_time: '09:40' },
    { lecture_no: 3, start_time: '09:50', end_time: '10:35' },
    { lecture_no: 4, start_time: '10:45', end_time: '11:30' },
    { lecture_no: 5, start_time: '11:40', end_time: '12:25' },
    { lecture_no: 6, start_time: '14:00', end_time: '14:45' },
    { lecture_no: 7, start_time: '14:50', end_time: '15:35' },
    { lecture_no: 8, start_time: '15:40', end_time: '16:25' },
    { lecture_no: 9, start_time: '16:40', end_time: '17:25' },
    { lecture_no: 10, start_time: '17:30', end_time: '18:15' },
    { lecture_no: 11, start_time: '19:30', end_time: '20:15' },
    { lecture_no: 12, start_time: '20:20', end_time: '21:05' },
    { lecture_no: 13, start_time: '21:10', end_time: '21:55' }
]

// 初始空矩阵模板
const EMPTY_WEEK_MATRIX = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 周一
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 周二
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 周三
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 周四
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]  // 周五
]

const EMPTY_DAY_MATRIX = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

// 示例教室数据
const CLASSROOMS_DATA = [
    {
        buildingBelong: '一号教学楼',
        classroomID: 'x1337',
        containNumber: 90,
        description: '多媒体教室，配备投影仪',
        floor: 3
    },
    {
        buildingBelong: '一号教学楼',
        classroomID: 'x1338',
        containNumber: 80,
        description: '标准教室',
        floor: 3
    },
    {
        buildingBelong: '二号教学楼',
        classroomID: 'x2101',
        containNumber: 120,
        description: '阶梯教室，配备音响',
        floor: 1
    },
    {
        buildingBelong: '二号教学楼',
        classroomID: 'x2102',
        containNumber: 60,
        description: '小型研讨室',
        floor: 1
    }
]

// 示例座位数据（图书馆）
const SEATS_DATA = [
    {
        areaBelong: '2A',
        seatID: '2A001',
        seatType: 'standard',
        floor: 2
    },
    {
        areaBelong: '2A',
        seatID: '2A002',
        seatType: 'standard',
        floor: 2
    },
    {
        areaBelong: '2B',
        seatID: '2B001',
        seatType: 'vip',
        floor: 2
    },
    {
        areaBelong: '3A',
        seatID: '3A001',
        seatType: 'study',
        floor: 3
    }
]

// 示例课程数据
const COURSES_DATA = [
    {
        courseID: 'CS101',
        courseName: '数据结构',
        classroom: 'x1337',
        instructorName: '李教授',
        schedule: {
            dayOfWeek: 0,      // 周一
            startLecture: 0,   // 第1讲
            endLecture: 2      // 第3讲
        }
    },
    {
        courseID: 'CS102',
        courseName: '算法设计',
        classroom: 'x1338',
        instructorName: '张教授',
        schedule: {
            dayOfWeek: 1,      // 周二
            startLecture: 1,   // 第2讲
            endLecture: 3      // 第4讲
        }
    },
    {
        courseID: 'CS103',
        courseName: '数据库',
        classroom: 'x2101',
        instructorName: '王教授',
        schedule: {
            dayOfWeek: 2,      // 周三
            startLecture: 2,   // 第3讲
            endLecture: 4      // 第5讲
        }
    }
]

// 示例用户数据
const USERS_DATA = [
    {
        identity: 'admin',
        userID: 'admin001',
        userName: '系统管理员',
        department: '教务处',
        phone: '13800000001',
        isBlacklisted: false
    },
    {
        identity: 'teacher',
        userID: '202001',
        userName: '李教授',
        department: '计算机学院',
        phone: '13800000002',
        isBlacklisted: false
    },
    {
        identity: 'student',
        userID: '2023112593',
        userName: '王凯',
        department: '软件学院',
        phone: '13800138000',
        isBlacklisted: false
    }
]

// ============ 工具函数 ============

/**
 * 深拷贝多维数组
 */
function deepCopyMatrix(matrix) {
    return JSON.parse(JSON.stringify(matrix))
}

/**
 * 生成讲次空矩阵
 */
function generateEmptyMatrix(rows = 5, cols = 13) {
    return Array(rows)
        .fill(null)
        .map(() => Array(cols).fill(0))
}

/**
 * 生成当前时间戳
 */
function getCurrentTimestamp() {
    return new Date().getTime()
}

/**
 * 创建教室文档
 */
function createClassroomDoc(classroom) {
    return {
        buildingBelong: classroom.buildingBelong,
        classroomID: classroom.classroomID,
        containNumber: classroom.containNumber,
        description: classroom.description,
        floor: classroom.floor || 1,
        thisWeekStatusMatrix: deepCopyMatrix(EMPTY_WEEK_MATRIX),
        nextWeekStatusMatrix: deepCopyMatrix(EMPTY_WEEK_MATRIX),
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp()
    }
}

/**
 * 创建座位文档
 */
function createSeatDoc(seat) {
    return {
        areaBelong: seat.areaBelong,
        seatID: seat.seatID,
        seatType: seat.seatType,
        floor: seat.floor || 2,
        thisDayStatusMatrix: deepCopyMatrix(EMPTY_DAY_MATRIX),
        nextDayStatusMatrix: deepCopyMatrix(EMPTY_DAY_MATRIX),
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp()
    }
}

/**
 * 创建用户文档
 */
function createUserDoc(user) {
    return {
        identity: user.identity,
        userID: user.userID,
        userName: user.userName,
        department: user.department || '',
        phone: user.phone || '',
        isBlacklisted: user.isBlacklisted || false,
        totalRentals: 0,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp()
    }
}

/**
 * 创建课程文档
 */
function createCourseDoc(course) {
    return {
        courseID: course.courseID,
        courseName: course.courseName,
        classroom: course.classroom,
        instructorName: course.instructorName,
        schedule: course.schedule,
        createdAt: getCurrentTimestamp()
    }
}

// ============ 主要初始化流程 ============

exports.main = async (event, context) => {
    try {
        console.log('========== 开始数据库初始化 ==========')

        let stats = {
            lecturesAdded: 0,
            classroomsAdded: 0,
            seatsAdded: 0,
            usersAdded: 0,
            coursesAdded: 0,
            successfulUpdates: 0,
            failedUpdates: 0
        }

        // ===== 步骤1：清空所有表（可选）=====
        if (event.clearDatabase) {
            console.log('清空数据库中...')
            try {
                await db.collection('Lectures').where({}).remove()
                await db.collection('Classrooms').where({}).remove()
                await db.collection('Seats').where({}).remove()
                await db.collection('Users').where({}).remove()
                await db.collection('Courses').where({}).remove()
                await db.collection('Applications').where({}).remove()
                console.log('✓ 数据库已清空')
            } catch (err) {
                console.warn('清空数据库出错（可能是首次初始化）:', err.message)
            }
        }

        // ===== 步骤2：导入讲次定义 =====
        console.log('\n正在导入讲次定义...')
        for (const lecture of LECTURES) {
            await db.collection('Lectures').add({
                data: {
                    lecture_no: lecture.lecture_no,
                    start_time: lecture.start_time,
                    end_time: lecture.end_time,
                    createdAt: getCurrentTimestamp()
                }
            })
            stats.lecturesAdded++
        }
        console.log(`✓ 已导入 ${stats.lecturesAdded} 条讲次定义`)

        // ===== 步骤3：导入教室基础信息 =====
        console.log('\n正在导入教室信息...')
        const classroomIds = {} // 用于映射教室名称到ID
        for (const classroom of CLASSROOMS_DATA) {
            const docId = await db.collection('Classrooms').add({
                data: createClassroomDoc(classroom)
            })
            classroomIds[classroom.classroomID] = docId.id
            stats.classroomsAdded++
        }
        console.log(`✓ 已导入 ${stats.classroomsAdded} 间教室`)

        // ===== 步骤4：导入座位信息 =====
        console.log('\n正在导入座位信息...')
        for (const seat of SEATS_DATA) {
            await db.collection('Seats').add({
                data: createSeatDoc(seat)
            })
            stats.seatsAdded++
        }
        console.log(`✓ 已导入 ${stats.seatsAdded} 个座位`)

        // ===== 步骤5：导入用户信息 =====
        console.log('\n正在导入用户信息...')
        for (const user of USERS_DATA) {
            await db.collection('Users').add({
                data: createUserDoc(user)
            })
            stats.usersAdded++
        }
        console.log(`✓ 已导入 ${stats.usersAdded} 个用户`)

        // ===== 步骤6：导入课程表 =====
        console.log('\n正在导入课程表...')
        const classroomMatrices = {} // 临时存储教室的矩阵

        // 首先导入所有课程
        for (const course of COURSES_DATA) {
            await db.collection('Courses').add({
                data: createCourseDoc(course)
            })
            stats.coursesAdded++

            // 初始化该教室的矩阵副本（如果还没初始化）
            if (!classroomMatrices[course.classroom]) {
                classroomMatrices[course.classroom] = deepCopyMatrix(EMPTY_WEEK_MATRIX)
            }

            // 更新矩阵：将对应讲次设置为1（有课）
            const schedule = course.schedule
            for (let lecture = schedule.startLecture; lecture <= schedule.endLecture; lecture++) {
                classroomMatrices[course.classroom][schedule.dayOfWeek][lecture] = 1
            }
        }
        console.log(`✓ 已导入 ${stats.coursesAdded} 个课程`)

        // ===== 步骤7：根据课程表更新教室状态矩阵 =====
        console.log('\n正在更新教室状态矩阵...')
        for (const classroomID in classroomMatrices) {
            const docId = classroomIds[classroomID]
            if (!docId) {
                console.warn(`⚠️ 教室 ${classroomID} 未找到，跳过状态矩阵更新`)
                stats.failedUpdates++
                continue
            }

            try {
                await db.collection('Classrooms').doc(docId).update({
                    data: {
                        thisWeekStatusMatrix: classroomMatrices[classroomID],
                        updatedAt: getCurrentTimestamp()
                    }
                })
                stats.successfulUpdates++
                console.log(`✓ 已更新教室 ${classroomID} 的状态矩阵`)
            } catch (err) {
                console.error(`✗ 更新教室 ${classroomID} 失败:`, err.message)
                stats.failedUpdates++
            }
        }

        // ===== 返回初始化结果 =====
        console.log('\n========== 初始化完成 ==========')
        const result = {
            success: true,
            code: 0,
            message: '数据初始化成功',
            data: {
                timestamp: getCurrentTimestamp(),
                stats: stats,
                summary: `
          成功导入：
          - ${stats.lecturesAdded} 条讲次
          - ${stats.classroomsAdded} 间教室
          - ${stats.seatsAdded} 个座位
          - ${stats.usersAdded} 个用户
          - ${stats.coursesAdded} 个课程
          教室矩阵更新：${stats.successfulUpdates} 成功, ${stats.failedUpdates} 失败
        `
            }
        }

        console.log(result.data.summary)
        return result
    } catch (error) {
        console.error('========== 数据初始化失败 ==========')
        console.error('错误信息:', error.message)
        console.error('错误堆栈:', error.stack)
        return {
            success: false,
            code: 500,
            message: '数据初始化失败',
            error: error.message
        }
    }
}
