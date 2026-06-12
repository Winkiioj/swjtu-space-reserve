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

// 撤回时限常量（2小时，单位毫秒）
const REVIEW_EXPIRY_MS = 2 * 60 * 60 * 1000

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

// 教室类型枚举
const ROOM_TYPES = [
  { value: '普通教室', label: '普通教室', icon: '🏫' },
  { value: '多媒体教室', label: '多媒体教室', icon: '🖥️' },
  { value: '阶梯教室', label: '阶梯教室', icon: '🏛️' },
  { value: '智慧教室', label: '智慧教室', icon: '📡' },
  { value: '机房', label: '机房', icon: '💻' },
  { value: '研讨室', label: '研讨室', icon: '👥' },
  { value: '实验室', label: '实验室', icon: '🔬' },
  { value: '报告厅', label: '报告厅', icon: '🎤' }
]

// 设施标签枚举（云数据库存储英文key，前端展示中文label）
const FACILITIES = [
  { key: 'projector', label: '投影仪' },
  { key: 'sound', label: '音响/话筒' },
  { key: 'aircon', label: '空调' },
  { key: 'computer', label: '教学电脑' },
  { key: 'recording', label: '录播系统' },
  { key: 'smartBoard', label: '智慧白板' },
  { key: 'wifi', label: '高速WiFi' },
  { key: 'labEquipment', label: '实验设备' }
]

// 设施 key → label 映射
function getFacilityLabel(key) {
  const f = FACILITIES.find(item => item.key === key)
  return f ? f.label : key
}

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
  REVIEW_EXPIRY_MS,
  MATRIX_DAYS,
  MATRIX_LECTURES,
  MATRIX_VALUES,
  AUDIT_ACTIONS,
  ROOM_TYPES,
  FACILITIES,
  getFacilityLabel,
  createEmptyMatrix,
  deepCopyMatrix
}
