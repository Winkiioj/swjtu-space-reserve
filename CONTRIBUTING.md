# 团队开发指南

## 项目概述
- **项目名**: SWJTU 空间预约小程序
- **仓库**: https://github.com/Winkiioj/swjtu-space-reserve
- **开发工具**: VS Code + 微信开发者工具

---

## 环境设置

### 前置要求
- Git已安装
- GitHub账户已创建并有仓库访问权限
- VS Code已安装
- 微信开发者工具已安装

### 克隆项目（第一次）
```bash
git clone https://github.com/Winkiioj/swjtu-space-reserve.git
cd swjtu-space-reserve

# 配置本地Git信息
git config user.name "你的名字"
git config user.email "你的邮箱"
```

### 在微信开发者工具中打开
1. 打开微信开发者工具
2. 选择"导入项目"
3. 项目路径: `d:\apps\wieixnapps\projects\swjtu-space-reserve`
4. AppID: 在 `project.config.json` 中查看

---

## 分支策略

### 主分支规则
- **main**: 生产分支，只接受稳定代码，禁止直接修改
- 所有功能开发必须通过 Pull Request 合并

### 分支命名规范

#### 1. 功能分支 (Feature)
```
feature/功能名称
例: feature/room-reservation
例: feature/user-authentication
```

#### 2. Bug修复分支 (Bugfix)
```
bugfix/bug描述
例: bugfix/fix-booking-crash
例: bugfix/fix-date-picker
```

#### 3. 修复分支 (Hotfix) - 生产紧急修复
```
hotfix/问题描述
例: hotfix/fix-critical-bug
```

### 分支操作

#### 拉取最新代码
```bash
git pull origin main
```

#### 创建新分支
```bash
# 方式一：命令行
git checkout -b feature/xxx

# 方式二：VS Code
1. 点击左下角分支名
2. 选择 "Create new branch from..."
3. 输入分支名称
```

#### 推送本地分支到远程
```bash
git push -u origin 分支名
# 或在VS Code中点击"Publish Branch"
```

#### 切换分支
```bash
git checkout 分支名

# 或在VS Code中点击左下角分支名选择
```

---

## 开发工作流

### 第1步：更新代码
```bash
git pull origin main
```

### 第2步：创建功能分支
```bash
git checkout -b feature/新功能名
```

### 第3步：编辑代码
- 在 VS Code 中编辑代码
- 遵循现有代码风格

### 第4步：测试功能
- 在微信开发者工具中预览和测试
- 确保功能正常

### 第5步：提交代码
```bash
# 查看修改文件
git status

# 添加所有修改
git add .

# 提交（写清晰的提交信息）
git commit -m "Add: 功能说明"
# 例: git commit -m "Add: implement room reservation feature"
```

### 第6步：推送到GitHub
```bash
git push origin feature/xxx

# 或在VS Code中：
# 1. 点击左侧"Source Control"（树枝图标）
# 2. 点击"..."菜单
# 3. 选择"Push"
```

### 第7步：创建Pull Request (PR)
1. 打开GitHub仓库
2. 会看到"Compare & pull request"提示
3. 或手动点击"Pull requests" → "New pull request"
4. 选择分支对比（feature/xxx → main）
5. 填写PR描述（说明做了什么）
6. 点击"Create pull request"

### 第8步：代码审查
- 其他团队成员审查代码
- 讨论修改建议
- 进行必要的修改

### 第9步：合并到main
- PR通过审查后
- 点击"Merge pull request"
- 删除分支

---

## 提交信息规范

### 格式
```
<类型>: <简短描述>

<详细描述（可选）>
```

### 类型
- **Add**: 新增功能
- **Fix**: 修复bug
- **Update**: 更新功能
- **Delete**: 删除功能
- **Refactor**: 代码重构
- **Docs**: 文档更新
- **Style**: 代码风格调整
- **Test**: 测试相关

### 示例
```
Add: implement room reservation system

- Add room list page
- Add booking form component
- Add success notification modal
```

```
Fix: fix date picker not showing correctly

The date picker was hidden behind other elements due to z-index issue.
Changed z-index from 100 to 1000.
```

---

## 代码冲突处理

### 发生冲突时
```bash
# 1. 查看冲突文件
git status

# 2. 在VS Code中解决冲突
# - 打开有冲突的文件
# - 选择"Accept Current Change"、"Accept Incoming Change"或手动编辑
# - 保存文件

# 3. 完成冲突解决
git add .
git commit -m "Merge: resolve conflicts"
git push
```

### VS Code中解决冲突
1. 文件中会显示冲突标记
2. 点击"Accept Current Change"或"Accept Incoming Change"
3. 或手动修改代码
4. 保存并提交

---

## 常用命令速查

```bash
# 查看分支
git branch -a

# 查看提交历史
git log

# 查看文件变更
git diff

# 取消未提交的修改
git checkout 文件名

# 查看特定分支信息
git show 分支名

# 重命名本地分支
git branch -m 旧名 新名

# 删除本地分支
git branch -d 分支名

# 删除远程分支
git push origin --delete 分支名

# 查看远程仓库地址
git remote -v
```

---

## 最佳实践

### ✅ 要做
- 每个功能都用单独的分支
- 提交前在微信开发者工具中测试
- 编写清晰的提交信息
- 小粒度提交（不要一次提交过多更改）
- 定期拉取main分支的最新代码
- 及时推送代码到远程
- 在PR中描述改动内容

### ❌ 不要做
- 直接在main分支上开发
- 提交未测试的代码
- 空白或模糊的提交信息
- 一次性提交太多无关的修改
- 长期不推送本地代码
- 忽视其他成员的代码审查意见

---

## 项目目录结构

```
swjtu-space-reserve/
├── miniprogram/              # 小程序前端
│   ├── pages/                # 页面
│   ├── components/           # 组件
│   ├── images/               # 图片资源
│   ├── app.js                # 应用入口
│   ├── app.json              # 应用配置
│   └── app.wxss              # 全局样式
├── cloudfunctions/           # 云函数（后端）
│   └── quickstartFunctions/
│       ├── index.js          # 函数代码
│       └── package.json      # 依赖
├── project.config.json       # 项目配置
├── project.private.config.json  # 私有配置（不上传）
├── .gitignore                # Git忽略规则
├── README.md                 # 项目说明
└── CONTRIBUTING.md           # 本文件
```

---

## 常见问题

### Q: 我提交了不想要的代码怎么办？
A: 
```bash
# 撤销最后一次提交（但保留文件修改）
git reset --soft HEAD~1

# 撤销最后一次提交（并删除文件修改）
git reset --hard HEAD~1
```

### Q: 忘记拉取最新代码就开发了怎么办？
A:
```bash
# 拉取最新代码并自动合并
git pull origin main
# 解决冲突后继续开发
```

### Q: 如何查看某个文件的修改历史？
A:
```bash
git log 文件路径
```

### Q: 不小心删除了本地分支怎么办？
A:
```bash
# 查看删除的分支
git reflog

# 恢复分支
git checkout -b 分支名 <commit-hash>
```

---

## 联系方式

- **项目管理**: 请在GitHub Issues中报告问题
- **讨论功能**: 在Pull Request中讨论
- **快速沟通**: 团队群里讨论

---

## 更新日志

- **2026-04-24**: 初始版本，建立协同开发规范

---

**祝您开发愉快！** 🚀
