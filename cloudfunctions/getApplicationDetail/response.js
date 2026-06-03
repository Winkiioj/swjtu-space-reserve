/**
 * response.js — 统一响应格式工厂（共享模块）
 *
 * 所有云函数统一使用此模块构建返回值，
 * 保证前端错误处理逻辑一致。
 */

/**
 * 成功响应
 * @param {*} data - 返回数据
 * @param {string} message - 提示信息
 */
function success(data = null, message = 'success') {
  return { code: 0, message, data }
}

/**
 * 失败响应
 * @param {number} code - 错误码（400/403/404/409/500）
 * @param {string} message - 错误描述
 * @param {*} error - 详细错误（可选）
 */
function fail(code = 500, message = '服务器错误', error = null) {
  return { code, message, error }
}

/**
 * 分页响应
 * @param {Array} data - 当前页数据
 * @param {number} total - 总记录数
 * @param {number} page - 当前页码
 * @param {number} pageSize - 每页条数
 */
function paginated(data, total, page, pageSize) {
  return {
    code: 0,
    message: 'success',
    data,
    pagination: { total, page, pageSize }
  }
}

module.exports = { success, fail, paginated }
