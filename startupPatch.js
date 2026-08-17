// 📢 自启动强自显与自由收缩补丁
(function forceShowAndAutoResize() {
  const { ipcRenderer } = require('electron');
  
  // 1. 前 15 秒内以每 1.5 秒一次的频率强行呼出主窗口，防止被混淆代码隐身
  let wakeCount = 0;
  const wakeInterval = setInterval(() => {
    ipcRenderer.send('force-show-window');
    wakeCount++;
    if (wakeCount >= 10) {
      clearInterval(wakeInterval);
    }
  }, 1500);

  // 2. 动态感知与自动收缩布局：每 800ms 执行一次状态刷新
  setInterval(() => {
    try {
      // 🎹 动态 Spotify 检测显示：只有正在放歌才显示 Spotify Now Playing Bar
      const spotifyBar = document.getElementById('spotifyBar');
      const spotifyTrack = document.getElementById('spotifyTrack');
      
      if (spotifyBar && spotifyTrack) {
        const trackName = (spotifyTrack.textContent || '').trim();
        const isNotPlaying = !trackName || trackName === 'Not Playing';
        
        if (isNotPlaying) {
          if (spotifyBar.style.display !== 'none') {
            spotifyBar.style.display = 'none';
          }
        } else {
          if (spotifyBar.style.display !== 'block') {
            spotifyBar.style.display = 'block';
          }
        }
      }

      // 🤖 动态 AI 开发 App 检测显示：如果没有正在运行的 AI / Dev App 卡片，把它们归类隐藏
      // 判断机制：如果所有 App 卡片里面都是 hidden 状态或者没有活跃数据，我们就整体折叠起来
      const appCards = document.querySelectorAll('.ai-app-card');
      let anyAppVisible = false;
      appCards.forEach(card => {
        // 如果卡片没有 hidden 类，说明检测到了它的运行
        if (card && !card.classList.contains('hidden')) {
          anyAppVisible = true;
        }
      });

      // 📏 物理高度实时自适应计算，允许自由收缩回 42px 的紧凑桌面条！
      // 获取当前所有可见内容的真实物理高度
      const mainContainer = document.querySelector('.container') || document.body;
      const visibleHeight = mainContainer.scrollHeight || 42;
      
      // 读取当前小工具宽度（默认 170px 紧凑版，展开时可能稍大）
      const currentWidth = mainContainer.clientWidth || 170;
      
      // 主动把真实高度推送给主进程，绝不强占 100px！
      ipcRenderer.send('window-action', { 
        width: currentWidth, 
        height: visibleHeight, 
        force: true 
      });

    } catch (e) {
      console.error("Auto-layout patch error:", e);
    }
  }, 800);

  // 3. 非工作时间自启询问控制
  setTimeout(() => {
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
        // 如果当前是加班时间，并且确实检测到了 AI 开发 App 运行，才强制唤醒弹窗！
        const otPromptView = document.getElementById('otPromptView');
        const appCards = document.querySelectorAll('.ai-app-card');
        let hasActiveDevApp = false;
        appCards.forEach(card => {
          if (card && !card.classList.contains('hidden')) {
            hasActiveDevApp = true;
          }
        });

        if (isOffHours && hasActiveDevApp && otPromptView && otPromptView.classList.contains('hidden')) {
          otPromptView.classList.remove('hidden');
          ipcRenderer.send('window-action', { force: true });
        }
      }
    } catch (e) {
      console.error("Startup prompt patch error:", e);
    }
  }, 2500);
})();
