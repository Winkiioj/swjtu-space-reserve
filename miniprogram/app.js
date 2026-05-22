// app.js
App({
  globalData: {
    currentUserID: null,   // 当前登录用户的 userID
    userRole: null         // 'admin' 或 'student'/'teacher'
  },
  onLaunch: function () {
    // 云环境 ID（已根据你的配置保留）
    const env = "cloud1-d0gbgetcn91021db4";
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: env,
        traceUser: true,
      });
    }
  }
});