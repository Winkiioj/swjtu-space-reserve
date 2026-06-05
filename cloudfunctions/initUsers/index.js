/**
 * initUsers - 用户表独立初始化
 *
 * 只操作 Users 集合，不碰其他表（Classroom/Seats/Courses/Applications）
 * 不影响张涛（座位模块）和潘星宇（管理员模块）的测试数据
 */

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const MAX_BATCH_DELETE = 1000

// ============ 测试用户数据 ============

const TEST_USERS = [
    {
        identity: 'admin',
        userID: 'admin001',
        userName: '系统管理员',
        department: '教务处',
        phone: '13800000001',
        openid: 'dev_openid_admin001',
        isBlacklisted: false
    },
    {
        identity: 'teacher',
        userID: '202001',
        userName: '李教授',
        department: '计算机学院',
        phone: '13800000002',
        openid: 'dev_openid_202001',
        isBlacklisted: false
    },
    {
        identity: 'student',
        userID: '2023112593',
        userName: '王凯',
        department: '软件学院',
        phone: '13800138000',
        openid: 'dev_openid_2023112593',
        isBlacklisted: false
    },
    {
        identity: 'student',
        userID: '2023112419',
        userName: '张涛',
        department: '软件学院',
        phone: '',
        openid: 'dev_openid_2023112419',
        isBlacklisted: false
    },
    {
        identity: 'student',
        userID: '2023112425',
        userName: '潘星宇',
        department: '软件学院',
        phone: '',
        openid: 'dev_openid_2023112425',
        isBlacklisted: false
    }
]

// ============ 工具函数 ============

function getCurrentTimestamp() { return Date.now() }

/**
 * 循环清空 Users 集合
 */
async function clearUsers() {
    let totalDeleted = 0
    while (true) {
        const { data } = await db.collection('Users')
            .where({})
            .limit(MAX_BATCH_DELETE)
            .get()
        if (data.length === 0) break
        const ids = data.map(d => d._id)
        await db.collection('Users')
            .where({ _id: _.in(ids) })
            .remove()
        totalDeleted += ids.length
        console.log(`已删除 Users 表 ${totalDeleted} 条`)
    }
    return totalDeleted
}

function createUserDoc(u) {
    return {
        identity: u.identity,
        userID: u.userID,
        userName: u.userName,
        department: u.department || '',
        phone: u.phone || '',
        openid: u.openid || '',
        isBlacklisted: u.isBlacklisted || false,
        totalRentals: 0,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp()
    }
}

// ============ 主流程 ============

exports.main = async (event, context) => {
    try {
        console.log('========== Users 表初始化开始 ==========')

        // 1. 清空 Users 表
        const deleted = await clearUsers()
        console.log(`✓ Users 表已清空，共删除 ${deleted} 条`)

        // 2. 导入测试用户
        let added = 0
        for (const u of TEST_USERS) {
            await db.collection('Users').add({ data: createUserDoc(u) })
            added++
        }

        const summary = {
            code: 0,
            message: 'Users 表初始化成功',
            data: {
                deleted,
                added,
                users: TEST_USERS.map(u => ({ userID: u.userID, userName: u.userName, openid: u.openid })),
                timestamp: getCurrentTimestamp()
            }
        }
        console.log('========== Users 表初始化完成 ==========')
        return summary

    } catch (error) {
        console.error('初始化失败:', error)
        return { code: 500, message: 'Users 表初始化失败', error: error.message }
    }
}
