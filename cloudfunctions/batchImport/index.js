/**
 * batchImport - 批量导入测试数据
 *
 * 用法：传入任意表的数据，自动追加（不删除现有数据）
 * 适合测试阶段灵活添加教室、用户、课程等
 *
 * 调用示例：
 * { "table": "Classrooms", "data": [{ "classroomID": "x3101", "buildingBelong": "三号教学楼", "containNumber": 100 }] }
 *
 * 传入参数：
 * - table: 表名 (Classrooms | Users | Courses | Seats | Applications)
 * - data: 要导入的数据数组
 * - mode: "insert"（追加，默认）| "upsert"（重复时覆盖）
 * - uniqueKey: upsert模式下的去重字段名（如 classroomID, userID 等）
 */

const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
    try {
        const { table, data, mode = 'insert', uniqueKey } = event

        // 参数校验
        if (!table) return { code: 400, message: '请指定表名', data: null }
        if (!data || !Array.isArray(data) || data.length === 0) {
            return { code: 400, message: '请传入要导入的数据数组', data: null }
        }

        // 检查表名是否在白名单中
        const allowedTables = ['Classrooms', 'Users', 'Courses', 'Seats', 'Applications', 'Lectures']
        if (!allowedTables.includes(table)) {
            return { code: 400, message: `不支持的表名: ${table}，允许: ${allowedTables.join(', ')}`, data: null }
        }

        let inserted = 0, skipped = 0, updated = 0

        for (const item of data) {
            // upsert模式：检查是否已存在
            if (mode === 'upsert' && uniqueKey && item[uniqueKey]) {
                const existing = await db.collection(table)
                    .where({ [uniqueKey]: item[uniqueKey] })
                    .get()

                if (existing.data.length > 0) {
                    // 已存在 → 更新
                    const docId = existing.data[0]._id
                    await db.collection(table).doc(docId).update({
                        data: { ...item, updatedAt: Date.now() }
                    })
                    updated++
                    continue
                }
            }

            // 不存在或 insert 模式 → 新增
            await db.collection(table).add({
                data: { ...item, createdAt: Date.now(), updatedAt: Date.now() }
            })
            inserted++
        }

        return {
            code: 0,
            message: `导入完成`,
            data: {
                table,
                mode,
                total: data.length,
                inserted,
                updated,
                skipped,
                uniqueKey: uniqueKey || '无'
            }
        }
    } catch (error) {
        console.error('batchImport 错误:', error)
        return { code: 500, message: '导入失败', error: error.message }
    }
}
