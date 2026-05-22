/**
 * dbutils.js — 数据库工具函数（共享模块）
 *
 * 提供分页查询、全量获取等高频使用的数据库操作封装。
 */

/**
 * 分页查询
 * @param {Object} db - cloud.database() 实例
 * @param {string} collection - 集合名称
 * @param {Object} query - 查询条件
 * @param {Object} options
 * @param {number} [options.page=1] - 页码
 * @param {number} [options.pageSize=20] - 每页条数
 * @param {string} [options.orderBy='appliedAt'] - 排序字段
 * @param {string} [options.order='desc'] - 排序方向
 * @returns {Promise<{data:Array, total:number, page:number, pageSize:number}>}
 */
async function getWithPagination(db, collection, query = {}, options = {}) {
  const {
    page = 1,
    pageSize = 20,
    orderBy = 'appliedAt',
    order = 'desc'
  } = options

  const [countResult, listResult] = await Promise.all([
    db.collection(collection).where(query).count(),
    db.collection(collection)
      .where(query)
      .orderBy(orderBy, order)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
  ])

  return {
    data: listResult.data,
    total: countResult.total,
    page,
    pageSize
  }
}

/**
 * 全量获取（突破默认20条限制）
 * 适用于 dailyReset 等需要处理所有数据的场景
 * @param {Object} db
 * @param {string} collection - 集合名称
 * @param {Object} query - 查询条件
 * @param {number} [batch=100] - 每批获取数量
 * @returns {Promise<Array>}
 */
async function getAllDocs(db, collection, query = {}, batch = 100) {
  let all = []
  let skip = 0
  while (true) {
    const res = await db.collection(collection)
      .where(query)
      .skip(skip)
      .limit(batch)
      .get()
    all = all.concat(res.data)
    if (res.data.length < batch) break
    skip += batch
  }
  return all
}

module.exports = { getWithPagination, getAllDocs }
