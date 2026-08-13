// 📢 自启动强自显补丁：解决程序在后台打开却不在桌面显示的 Bug
(function forceShowOnStartup() {
  const { ipcRenderer } = require('electron');
  
  // 前 15 秒内每隔 1.5 秒就强行显示一次，彻底防守隐匿逻辑
  let wakeCount = 0;
  const wakeInterval = setInterval(() => {
    ipcRenderer.send('force-show-window');
    wakeCount++;
    if (wakeCount >= 10) {
      clearInterval(wakeInterval);
    }
  }, 1500);

  setTimeout(() => {
    // 2. 如果是非工作时间且面板隐藏了，强行把它弹出来
    try {
      const now = new Date();
      const day = now.getDay();
      const isWeekendDay = (day === 0 || day === 6);
      
      // 获取当前用户的配置
      const config = ipcRenderer.sendSync('get-config') || {};
      const [sH, sM] = (config.startTime || '09:00').split(':').map(Number);
      const [eH, eM] = (config.endTime || '18:00').split(':').map(Number);
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const startMins = sH * 60 + sM;
      const endMins = eH * 60 + eM;
      const isOffHours = isWeekendDay || (currentMins < startMins || currentMins >= endMins);

      if (isOffHours) {
        const otPromptView = document.getElementById('otPromptView');
        if (otPromptView && otPromptView.classList.contains('hidden')) {
          otPromptView.classList.remove('hidden');
          // 主动调用重算窗口高度逻辑
          ipcRenderer.send('window-action', { force: true });
        }
      }
    } catch (e) {
      console.error("Startup patch error:", e);
    }
  }, 2000); // 延迟2秒强行呼出
})();
