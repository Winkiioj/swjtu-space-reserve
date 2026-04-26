# Git克隆常见问题解决方案

## 问题1: 网络连接超时 (Timed out)

### 症状
```
fatal: unable to access 'https://github.com/...': Failed to connect to github.com port 443: Timed out
```

### 解决方案

#### 方案A: 更换DNS
```bash
# 检查当前DNS
ipconfig /all

# 使用公共DNS（以管理员身份运行PowerShell）
netsh interface ipv4 set dnsservers name="以太网" static 8.8.8.8
netsh interface ipv4 add dnsservers name="以太网" 8.8.4.4 index=2
```

#### 方案B: 使用SSH替代HTTPS
```bash
# 生成SSH密钥
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 按Enter三次（使用默认设置）

# 将公钥内容添加到GitHub
# 1. 打开 C:\Users\用户名\.ssh\id_rsa.pub
# 2. 复制全部内容
# 3. 访问 https://github.com/settings/keys
# 4. 点击 "New SSH key"，粘贴内容保存

# 测试SSH连接
ssh -T git@github.com

# 使用SSH克隆
git clone git@github.com:Winkiioj/swjtu-space-reserve.git
```

#### 方案C: 重试
GitHub有时会有临时网络问题，稍等几分钟后重试。

---

## 问题2: SSL证书问题

### 症状
```
fatal: unable to access 'https://github.com/...': SSL certificate problem: unable to get local issuer certificate
```
或
```
error setting certificate verify locations:
  CAfile: D:\Download\Edge\cacert.pem
```

### 解决方案

#### 🚨 警告：仅用于开发环境，不要在生产环境禁用证书验证

#### 方案A: 临时禁用SSL验证（快速修复）
```bash
git clone --config http.sslVerify=false https://github.com/Winkiioj/swjtu-space-reserve.git
```

#### 方案B: 全局禁用SSL验证（不推荐）
```bash
git config --global http.sslVerify false
git clone https://github.com/Winkiioj/swjtu-space-reserve.git
```

恢复验证：
```bash
git config --global http.sslVerify true
```

#### 方案C: 安装正确的CA证书（推荐）

**对于Windows系统：**
```bash
# 下载最新的CA证书包
# 访问 https://curl.se/docs/caextract.html
# 下载 cacert.pem

# 配置Git使用该证书
git config --global http.cainfo "D:\Path\to\cacert.pem"
```

或者，设置证书路径（如果上面下载失败）：
```bash
# 使用Windows的证书存储
git config --global http.sslBackend schannel
```

#### 方案D: 使用SSH（最安全）
参考上面"问题1"的方案B。

---

## 其他常见问题

### 问题3: 空间不足
```
fatal: unable to access 'https://github.com/...': error setting certificate verify locations
```

**解决:** 检查磁盘空间
```bash
# Windows中检查磁盘
Get-Volume | Select-Object DriveLetter, @{N='SizeGB';E={[math]::Round($_.Size/1GB,2)}}, @{N='UsedGB';E={[math]::Round(($_.Size-$_.SizeRemaining)/1GB,2)}}
```

### 问题4: 凭证问题
```
fatal: Authentication failed
```

**解决:** 使用凭证管理器
```bash
# 清除旧凭证
git config --global --unset credential.helper

# 重新设置凭证管理
git config --global credential.helper manager

# 重新克隆，系统会要求输入GitHub凭证
```

---

## 推荐方案总结

| 问题 | 优先方案 |
|------|--------|
| 网络超时 | 方案B: 使用SSH |
| SSL证书问题 | 方案C/D: 证书或SSH |
| 快速临时修复 | 方案A: 禁用验证 |

---

## 对组员的建议

**推荐给所有组员的一次性设置（一劳永逸）：**

```bash
# 1. 生成SSH密钥
ssh-keygen -t rsa -b 4096 -C "your_email@qq.com"
# 按3次Enter

# 2. 查看公钥
Get-Content C:\Users\$env:USERNAME\.ssh\id_rsa.pub | Set-Clipboard
# 或手动打开 C:\Users\你的用户名\.ssh\id_rsa.pub 复制内容

# 3. 添加到GitHub
# 访问 https://github.com/settings/keys → New SSH key → 粘贴

# 4. 测试
ssh -T git@github.com
# 看到 "successfully authenticated" 说明成功

# 5. 配置Git全局使用SSH
git config --global url."git@github.com:".insteadOf "https://github.com/"

# 以后所有HTTPS URL会自动转换为SSH
```

---

## 快速参考表

### 组员一的解决方案
1. 首先尝试SSH方案（推荐）
2. 如不行，更换DNS
3. 如仍不行，使用临时禁用SSL

### 组员二的解决方案
1. 首先尝试SSH方案（推荐）
2. 如不行，临时禁用SSL：`git clone --config http.sslVerify=false https://github.com/Winkiioj/swjtu-space-reserve.git`
3. 然后配置SSH以便后续使用

