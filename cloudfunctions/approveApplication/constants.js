/**
 * constants.js — 常量与工具函数（共享模块）
 *
 * 消除散布在各云函数中的魔法数字，统一管理系统常量。
 */

// 租借审批状态枚举
const RENTAL_STATUS = {
  PENDING: 0,     // 待审核
  APPROVED: 1,    // 已通过
  REJECTED: 2,    // 已拒绝
  CANCELLED: 3,   // 已取消
  COMPLETED: 4    // 已完成
}

// 状态文本映射
const STATUS_TEXT = {
  0: '待审核',
  1: '已通过',
  2: '已拒绝',
  3: '已取消',
  4: '已完成'
}

// 矩阵维度常量
const MATRIX_DAYS = 5     // 周一至周五
const MATRIX_LECTURES = 13 // 每天13讲次/小时段

// 矩阵单元格值
const MATRIX_VALUES = {
  FREE: 0,      // 空闲
  COURSE: 1,    // 课程占用
  OCCUPIED: 2   // 租借占用
}

// 审批操作类型（用于审计日志）
const AUDIT_ACTIONS = {
  APPROVE: 'approve',
  REJECT: 'reject',
  IMPORT_CLASSROOMS: 'import_classrooms',
  IMPORT_COURSES: 'import_courses',
  IMPORT_SEATS: 'import_seats'
}

// 审批撤回窗口期（2小时）
const REVIEW_EXPIRY_MS = 2 * 60 * 60 * 1000

/**
 * 创建空状态矩阵（5天 × 13讲次/小时段，全0）
 * @returns {Array<Array<number>>}
 */
function createEmptyMatrix() {
  return Array(MATRIX_DAYS).fill().map(() => Array(MATRIX_LECTURES).fill(0))
}

/**
 * 深拷贝矩阵
 * @param {Array} matrix
 * @returns {Array}
 */
function deepCopyMatrix(matrix) {
  return JSON.parse(JSON.stringify(matrix))
}

module.exports = {
  RENTAL_STATUS,
  STATUS_TEXT,
  MATRIX_DAYS,
  MATRIX_LECTURES,
  MATRIX_VALUES,
  AUDIT_ACTIONS,
  REVIEW_EXPIRY_MS,
  createEmptyMatrix,
  deepCopyMatrix
}
