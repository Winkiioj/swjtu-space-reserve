/**
 * auth.js — 管理员身份校验（共享模块）
 *
 * 所有管理员云函数统一通过此模块校验身份，
 * 消除各函数重复的 admin 查询代码。
 *
 * 用法：
 *   const { requireAdmin } = require('./auth')
 *   await requireAdmin(db, currentUserID)
 */

/**
 * 校验当前用户是否为管理员，不是则抛异常
 * @param {Object} db - cloud.database() 实例
 * @param {string} userID - 当前用户ID
 * @returns {Object} 用户文档
 */
async function requireAdmin(db, userID) {
  if (!userID) {
    throw { code: 400, message: '未提供用户标识' }
  }
  const res = await db.collection('Users')
    .where({ userID, identity: 'admin' })
    .limit(1)
    .get()
  if (res.data.length === 0) {
    throw { code: 403, message: '无权限' }
  }
  return res.data[0]
}

/**
 * 仅检查是否为管理员，返回 boolean（用于条件路径）
 * @param {Object} db
 * @param {string} userID
 * @returns {boolean}
 */
async function checkAdmin(db, userID) {
  if (!userID) return false
  try {
    await requireAdmin(db, userID)
    return true
  } catch {
    return false
  }
}

module.exports = { requireAdmin, checkAdmin }
