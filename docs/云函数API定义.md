# 云函数API定义

## 概述

本文档定义了借教室模块的所有关键云函数接口。这些函数提供了核心的业务逻辑：
- 查询可用教室
- 提交/审核/取消申请
- 管理员操作
- 定时任务

---

## 1. 查询类云函数

### 1.1 searchAvailableClassrooms - 查询可用教室

**功能**：根据日期、讲次、容量等条件查询可用教室

**调用方式**：
```javascript
// 小程序端调用
wx.cloud.callFunction({
  name: 'searchAvailableClassrooms',
  data: {
    rentDate: '2026-04-29',      // 租赁日期 YYYY-MM-DD
    rentWeek: 'this',            // this 或 next
    rentDayOfWeek: 1,            // 0-4 (周一-周五)
    rentLectures: [2, 3, 4],     // 讲次索引数组
    minCapacity: 50              // 最小容量
  }
})
```

**返回数据**：
```javascript
{
  code: 0,
  message: 'success',
  data: [
    {
      _id: 'classroom_001',
      classroomID: 'x1337',
      buildingBelong: '一号教学楼',
      containNumber: 90,
      description: '多媒体教室，配备投影仪',
      availability: [0, 0, 0]   // 对应讲次的状态
    },
    // ... 更多教室
  ]
}
```

**云函数实现**：详见 [searchAvailableClassrooms.js](#)

---

### 1.2 getUserApplications - 查询用户申请列表

**功能**：获取用户的所有申请记录，支持按状态筛选

**调用方式**：
```javascript
wx.cloud.callFunction({
  name: 'getUserApplications',
  data: {
    userID: '2023112593',   // 用户ID
    status: -1              // -1=全部, 0=待审核, 1=已批准, 2=已拒绝, 3=已取消, 4=已完成
  }
})
```

**返回数据**：
```javascript
{
  code: 0,
  message: 'success',
  data: [
    {
      _id: 'app_20260424001',
      classroomApplied: 'classroom_001',
      classroomID: 'x1337',           // 冗余字段便于显示
      rentalDetail: '软件3班班会',
      rentDate: '2026-04-29',
      rentDayOfWeek: 1,
      rentLectures: [0, 1, 2],
      rentalStatus: 1,                // 0=待审核, 1=已批准...
      expectedAttendeeCount: 35,
      actualAttendeeCount: null,
      appliedAt: 1713897600000,
      approvedAt: 1713897600100,
      updatedAt: 1713897600100
    },
    // ... 更多申请
  ]
}
```

---

### 1.3 getClassroomApplications - 查询教室的申请列表（管理员）

**功能**：获取某个教室的所有申请，用于审批

**调用方式**：
```javascript
wx.cloud.callFunction({
  name: 'getClassroomApplications',
  data: {
    classroomID: 'x1337',
    status: 0,              // 0=待审核, -1=全部
    startDate: '2026-04-20',
    endDate: '2026-05-31'
  }
})
```

**返回数据**：
```javascript
{
  code: 0,
  message: 'success',
  data: [
    {
      _id: 'app_20260424001',
      classroomApplied: 'classroom_001',
      proposerID: '2023112593',
      proposerName: '王凯',
      rentalDetail: '软件3班班会',
      rentalDescription: '讨论大作业进度',
      rentDate: '2026-04-29',
      rentLectures: [0, 1, 2],
      expectedAttendeeCount: 35,
      rentalStatus: 0,
      appliedAt: 1713897600000,
      updatedAt: 1713897600000
    }
  ]
}
```

---

### 1.4 getClassroomStatus - 查询教室周计划

**功能**：获取教室本周和下周的完整状态矩阵

**调用方式**：
```javascript
wx.cloud.callFunction({
  name: 'getClassroomStatus',
  data: {
    classroomID: 'x1337',
    week: 'this'  // this 或 next
  }
})
```

**返回数据**：
```javascript
{
  code: 0,
  message: 'success',
  data: {
    classroomID: 'x1337',
    buildingBelong: '一号教学楼',
    containNumber: 90,
    thisWeekStatusMatrix: [
      [0, 0, 1, 1, 1, 0, 0, 0, 0, 2, 0, 0, 0],  // 周一
      [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],  // 周二
      // ... 周三-周五
    ],
    nextWeekStatusMatrix: [
      // ...
    ]
  }
}
```

---

## 2. 申请管理云函数

### 2.1 submitApplication - 提交租赁申请

**功能**：用户提交新的教室租赁申请

**调用方式**：
```javascript
wx.cloud.callFunction({
  name: 'submitApplication',
  data: {
    classroomID: 'x1337',
    rentDate: '2026-04-29',
    rentWeek: 'this',
    rentDayOfWeek: 1,
    rentLectures: [0, 1, 2],
    rentalDetail: '软件3班班会',
    rentalDescription: '讨论大作业进度',
    expectedAttendeeCount: 35
  }
})
```

**返回数据**：
```javascript
{
  code: 0,
  message: '申请提交成功，等待审核',
  data: {
    applicationID: 'app_20260424001',
    status: 0,
    appliedAt: 1713897600000
  }
}
```

**错误情况**：
- `400`：教室已被占用（冲突的讲次）
- `401`：用户被黑名单限制
- `403`：超出预约时间范围
- `500`：服务器错误

---

### 2.2 approveApplication - 批准申请（管理员）

**功能**：管理员批准教室租赁申请，更新教室状态

**调用方式**：
```javascript
wx.cloud.callFunction({
  name: 'approveApplication',
  data: {
    applicationID: 'app_20260424001',
    approverID: 'admin001'
  }
})
```

**返回数据**：
```javascript
{
  code: 0,
  message: '申请已批准',
  data: {
    applicationID: 'app_20260424001',
    status: 1,
    approvedAt: 1713897600100,
    classroomUpdated: true,
    affectedLectures: [0, 1, 2]
  }
}
```

**操作流程**：
1. 获取申请详情
2. 检查教室对应讲次是否仍然可用
3. 更新应用状态为已批准(1)
4. 更新教室矩阵（设置对应讲次为2）
5. 记录审批日志

---

### 2.3 rejectApplication - 拒绝申请（管理员）

**功能**：管理员拒绝教室租赁申请

**调用方式**：
```javascript
wx.cloud.callFunction({
  name: 'rejectApplication',
  data: {
    applicationID: 'app_20260424001',
    rejectReason: '该时段已被占用',
    rejecterID: 'admin001'
  }
})
```

**返回数据**：
```javascript
{
  code: 0,
  message: '申请已拒绝',
  data: {
    applicationID: 'app_20260424001',
    status: 2,
    rejectionReason: '该时段已被占用',
    updatedAt: 1713897600100
  }
}
```

---

### 2.4 cancelApplication - 用户取消申请

**功能**：用户取消已提交的申请（待审核或已批准），恢复教室状态

**调用方式**：
```javascript
wx.cloud.callFunction({
  name: 'cancelApplication',
  data: {
    applicationID: 'app_20260424001',
    cancelReason: '活动取消'  // 可选
  }
})
```

**返回数据**：
```javascript
{
  code: 0,
  message: '申请已取消',
  data: {
    applicationID: 'app_20260424001',
    status: 3,
    classroomRestored: true,  // 是否恢复了教室状态
    updatedAt: 1713897600100
  }
}
```

**限制条件**：
- 仅当状态为 0(待审核) 或 1(已批准) 时可取消
- 若已批准，需要恢复教室状态（对应讲次从2变为0）

---

## 3. 管理员操作云函数

### 3.1 getUserInfo - 获取用户信息

**功能**：查看用户详细信息和黑名单状态

**调用方式**：
```javascript
wx.cloud.callFunction({
  name: 'getUserInfo',
  data: {
    userID: '2023112593'
  }
})
```

**返回数据**：
```javascript
{
  code: 0,
  message: 'success',
  data: {
    _id: 'user_xxx',
    userID: '2023112593',
    userName: '王凯',
    identity: 'student',
    department: '软件学院',
    phone: '13800138000',
    isBlacklisted: false,
    totalRentals: 5,
    createdAt: 1713897600000,
    updatedAt: 1713897600000
  }
}
```

---

### 3.2 addToBlacklist - 将用户加入黑名单（管理员）

**功能**：限制用户后续的教室租赁

**调用方式**：
```javascript
wx.cloud.callFunction({
  name: 'addToBlacklist',
  data: {
    userID: '2023112593',
    reason: '多次违规占用教室',
    adminID: 'admin001'
  }
})
```

**返回数据**：
```javascript
{
  code: 0,
  message: '用户已加入黑名单',
  data: {
    userID: '2023112593',
    isBlacklisted: true,
    updatedAt: 1713897600100
  }
}
```

---

### 3.3 removeFromBlacklist - 从黑名单移除（管理员）

**功能**：恢复用户的租赁权限

**调用方式**：
```javascript
wx.cloud.callFunction({
  name: 'removeFromBlacklist',
  data: {
    userID: '2023112593',
    adminID: 'admin001'
  }
})
```

**返回数据**：
```javascript
{
  code: 0,
  message: '用户已从黑名单移除',
  data: {
    userID: '2023112593',
    isBlacklisted: false,
    updatedAt: 1713897600100
  }
}
```

---

## 4. 定时任务云函数（需要云函数配置）

### 4.1 weeklyProgressTask - 每周六凌晨推进时间

**触发时间**：每周六 00:00:00

**功能**：
1. 将所有教室的 `nextWeekStatusMatrix` → `thisWeekStatusMatrix`
2. 初始化新的 `nextWeekStatusMatrix`（全0）
3. 从Courses表同步新一周的课表到 `thisWeekStatusMatrix`

**实现流程**：
```javascript
exports.main = async (event, context) => {
  const db = cloud.database()
  
  // 1. 获取所有教室
  const classrooms = await db.collection('Classrooms').get()
  
  // 2. 更新所有教室的状态矩阵
  for (let classroom of classrooms.data) {
    // 推进矩阵
    const newNextWeek = [[0]*13]*5  // 全0矩阵
    
    await db.collection('Classrooms')
      .doc(classroom._id)
      .update({
        data: {
          thisWeekStatusMatrix: classroom.nextWeekStatusMatrix,
          nextWeekStatusMatrix: newNextWeek,
          updatedAt: Date.now()
        }
      })
  }
  
  // 3. 从课表同步下周的课程到新的thisWeekStatusMatrix
  // ...
  
  return { code: 0, message: 'weekly progress success' }
}
```

---

### 4.2 lectureCompletionTask - 讲次结束后标记申请完成

**触发时间**：每个讲次结束后 5 分钟

**功能**：
1. 查找该讲次的所有已批准申请
2. 更新申请状态为 4(已完成)
3. 可选：发送通知给用户

**参数**：
```javascript
{
  lectureNo: 1,    // 讲次号
  dayOfWeek: 0     // 周几
}
```

---

## 5. 错误码定义

| 错误码 | 含义 | 说明 |
|--------|------|------|
| 0 | 成功 | 操作成功 |
| 400 | 请求错误 | 参数缺失或格式错误 |
| 401 | 未授权 | 用户无权限或被限制 |
| 402 | 黑名单 | 用户在黑名单中 |
| 403 | 禁止 | 超出预约时间范围 |
| 404 | 未找到 | 资源不存在 |
| 409 | 冲突 | 教室已被占用或时间冲突 |
| 500 | 服务器错误 | 数据库操作失败 |
| 502 | 并发冲突 | 检测到并发修改 |

---

## 6. 数据校验规则

### 6.1 提交申请时的校验

```javascript
// 必须验证以下条件：
1. 用户存在且未被黑名单
2. 教室存在
3. 租赁日期有效（本周 + 下周）
4. 讲次有效（0-12）
5. 对应讲次状态均为0（空闲）
6. 期望参与人数 > 0 且 <= 教室容量的80%
7. 用户在该讲次内没有其他冲突的申请
```

### 6.2 批准申请时的校验

```javascript
// 必须验证以下条件：
1. 申请存在且状态为0（待审核）
2. 教室存在
3. 对应讲次仍然可用（状态为0，防止并发修改）
4. 批准人是管理员
```

---

## 7. 使用示例

### 示例1：学生查询并申请教室

```javascript
// 步骤1：查询可用教室
const searchResult = await wx.cloud.callFunction({
  name: 'searchAvailableClassrooms',
  data: {
    rentDate: '2026-04-29',
    rentWeek: 'this',
    rentDayOfWeek: 1,
    rentLectures: [2, 3, 4],
    minCapacity: 50
  }
})

// 步骤2：显示结果并让用户选择
// ...

// 步骤3：提交申请
const applyResult = await wx.cloud.callFunction({
  name: 'submitApplication',
  data: {
    classroomID: 'x1337',
    rentDate: '2026-04-29',
    rentWeek: 'this',
    rentDayOfWeek: 1,
    rentLectures: [2, 3, 4],
    rentalDetail: '班级活动',
    expectedAttendeeCount: 40
  }
})

console.log('申请ID:', applyResult.data.applicationID)
```

### 示例2：管理员审批申请

```javascript
// 获取待审批列表
const pendingApps = await wx.cloud.callFunction({
  name: 'getClassroomApplications',
  data: {
    classroomID: 'x1337',
    status: 0
  }
})

// 批准第一个申请
const approveResult = await wx.cloud.callFunction({
  name: 'approveApplication',
  data: {
    applicationID: pendingApps.data[0]._id,
    approverID: 'admin001'
  }
})

console.log('批准完成:', approveResult.message)
```

---

## 8. 性能优化建议

1. **添加数据库索引**：
   - `Applications` 表：`classroomApplied + rentalStatus`
   - `Applications` 表：`proposerID + rentalStatus`
   - `Classrooms` 表：`buildingBelong + containNumber`

2. **缓存策略**：
   - 缓存讲次定义（Lectures表）
   - 缓存教室基础信息（不包含动态矩阵）

3. **批量操作**：
   - 使用批量更新API更新多个教室矩阵

4. **异步处理**：
   - 定时任务异步执行
   - 通知发送异步执行

---

## 9. 安全性建议

1. **权限控制**：
   - 所有管理员操作需验证身份（admin）
   - 用户只能操作自己的申请

2. **数据校验**：
   - 后端严格校验所有输入参数
   - 防止教室矩阵被非法修改

3. **并发控制**：
   - 使用版本号实现乐观锁
   - 批准申请前重新检查讲次状态

4. **日志记录**：
   - 记录所有管理员操作
   - 记录教室状态的每次变更
