/**
 * 初始化数据脚本 - 清空并重建数据库
 * 功能：
 * - 始终清空所有表（避免重复数据）
 * - 导入讲次定义、教室、座位、用户、课程
 * - 更新教室状态矩阵
 *
 * 注意：微信云数据库单次删除上限1000条，本函数会循环删除直到清空
 */

const cloud = require('wx-server-sdk')

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command
const MAX_BATCH_DELETE = 1000 // 云数据库单次删除上限

// ============ 常量定义 ============

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

const EMPTY_WEEK_MATRIX = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
]

const EMPTY_DAY_MATRIX = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

const CLASSROOMS_DATA = [
    { buildingBelong: '一号教学楼', classroomID: 'x1337', containNumber: 90, description: '多媒体教室，配备投影仪', floor: 3 },
    { buildingBelong: '一号教学楼', classroomID: 'x1338', containNumber: 80, description: '标准教室', floor: 3 },
    { buildingBelong: '二号教学楼', classroomID: 'x2101', containNumber: 120, description: '阶梯教室，配备音响', floor: 1 },
    { buildingBelong: '二号教学楼', classroomID: 'x2102', containNumber: 60, description: '小型研讨室', floor: 1 }
]

const SEATS_DATA = [
    { areaBelong: '2A', seatID: '2A001', seatType: 'standard', floor: 2 },
    { areaBelong: '2A', seatID: '2A002', seatType: 'standard', floor: 2 },
    { areaBelong: '2B', seatID: '2B001', seatType: 'vip', floor: 2 },
    { areaBelong: '3A', seatID: '3A001', seatType: 'study', floor: 3 }
]

const COURSES_DATA = [
    {
        courseID: 'CS101', courseName: '数据结构', classroom: 'x1337', instructorName: '李教授',
        schedule: { dayOfWeek: 0, startLecture: 0, endLecture: 2 }
    },
    {
        courseID: 'CS102', courseName: '算法设计', classroom: 'x1338', instructorName: '张教授',
        schedule: { dayOfWeek: 1, startLecture: 1, endLecture: 3 }
    },
    {
        courseID: 'CS103', courseName: '数据库', classroom: 'x2101', instructorName: '王教授',
        schedule: { dayOfWeek: 2, startLecture: 2, endLecture: 4 }
    }
]

const USERS_DATA = [
    { identity: 'admin', userID: 'admin001', userName: '系统管理员', department: '教务处', phone: '13800000001', isBlacklisted: false, openid: 'dev_openid_admin001' },
    { identity: 'teacher', userID: '202001', userName: '李教授', department: '计算机学院', phone: '13800000002', isBlacklisted: false, openid: 'dev_openid_202001' },
    { identity: 'student', userID: '2023112593', userName: '王凯', department: '软件学院', phone: '13800138000', isBlacklisted: false, openid: 'dev_openid_2023112593' }
]

// ============ 工具函数 ============

function getCurrentTimestamp() { return Date.now() }

function deepCopyMatrix(m) { return JSON.parse(JSON.stringify(m)) }

/**
 * 循环清空集合（突破1000条上限）
 */
async function clearCollection(name) {
    let totalDeleted = 0
    while (true) {
        const { data } = await db.collection(name)
            .where({})
            .limit(MAX_BATCH_DELETE)
            .get()
        if (data.length === 0) break
        const ids = data.map(d => d._id)
        await db.collection(name)
            .where({ _id: _.in(ids) })
            .remove()
        totalDeleted += ids.length
        console.log(`已删除 ${name} 表 ${totalDeleted} 条`)
    }
    return totalDeleted
}

function createClassroomDoc(c) {
    return {
        buildingBelong: c.buildingBelong, classroomID: c.classroomID,
        containNumber: c.containNumber, description: c.description, floor: c.floor || 1,
        thisWeekStatusMatrix: deepCopyMatrix(EMPTY_WEEK_MATRIX),
        nextWeekStatusMatrix: deepCopyMatrix(EMPTY_WEEK_MATRIX),
        createdAt: getCurrentTimestamp(), updatedAt: getCurrentTimestamp()
    }
}

function createSeatDoc(s) {
    return {
        areaBelong: s.areaBelong, seatID: s.seatID, seatType: s.seatType, floor: s.floor || 2,
        thisDayStatusMatrix: deepCopyMatrix(EMPTY_DAY_MATRIX),
        nextDayStatusMatrix: deepCopyMatrix(EMPTY_DAY_MATRIX),
        createdAt: getCurrentTimestamp(), updatedAt: getCurrentTimestamp()
    }
}

function createUserDoc(u) {
    return {
        identity: u.identity, userID: u.userID, userName: u.userName,
        department: u.department || '', phone: u.phone || '',
        openid: u.openid || '',
        isBlacklisted: u.isBlacklisted || false, totalRentals: 0,
        createdAt: getCurrentTimestamp(), updatedAt: getCurrentTimestamp()
    }
}

function createCourseDoc(c) {
    return {
        courseID: c.courseID, courseName: c.courseName, classroom: c.classroom,
        instructorName: c.instructorName, schedule: c.schedule,
        createdAt: getCurrentTimestamp()
    }
}

// ============ 主流程 ============

exports.main = async (event, context) => {
    try {
        console.log('========== 数据库初始化开始 ==========')

        const tables = ['Lectures', 'Classrooms', 'Seats', 'Users', 'Courses', 'Applications']
        let cleared = {}
        for (const t of tables) {
            cleared[t] = await clearCollection(t)
        }
        console.log('✓ 数据库已全部清空')

        // 导入讲次
        let added = { lectures: 0, classrooms: 0, seats: 0, users: 0, courses: 0 }
        for (const l of LECTURES) {
            await db.collection('Lectures').add({ data: { lecture_no: l.lecture_no, start_time: l.start_time, end_time: l.end_time, createdAt: getCurrentTimestamp() } })
            added.lectures++
        }

        // 导入教室
        const classroomIds = {}
        for (const c of CLASSROOMS_DATA) {
            const doc = await db.collection('Classrooms').add({ data: createClassroomDoc(c) })
            classroomIds[c.classroomID] = doc.id
            added.classrooms++
        }

        // 导入座位
        for (const s of SEATS_DATA) {
            await db.collection('Seats').add({ data: createSeatDoc(s) })
            added.seats++
        }

        // 导入用户
        for (const u of USERS_DATA) {
            await db.collection('Users').add({ data: createUserDoc(u) })
            added.users++
        }

        // 导入课程
        const matrices = {}
        for (const c of COURSES_DATA) {
            await db.collection('Courses').add({ data: createCourseDoc(c) })
            added.courses++
            if (!matrices[c.classroom]) matrices[c.classroom] = deepCopyMatrix(EMPTY_WEEK_MATRIX)
            for (let i = c.schedule.startLecture; i <= c.schedule.endLecture; i++) {
                matrices[c.classroom][c.schedule.dayOfWeek][i] = 1
            }
        }

        // 更新教室矩阵
        let updated = 0, failed = 0
        for (const [cid, matrix] of Object.entries(matrices)) {
            const docId = classroomIds[cid]
            if (!docId) { failed++; continue }
            await db.collection('Classrooms').doc(docId).update({
                data: { thisWeekStatusMatrix: matrix, updatedAt: getCurrentTimestamp() }
            })
            updated++
        }

        const summary = {
            code: 0, message: '数据库初始化成功',
            data: {
                cleared,
                added,
                matrixUpdated: { updated, failed },
                timestamp: getCurrentTimestamp()
            }
        }
        console.log('========== 初始化完成 ==========')
        return summary

    } catch (error) {
        console.error('初始化失败:', error)
        return { code: 500, message: '数据库初始化失败', error: error.message }
    }
}
