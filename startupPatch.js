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
      // 🎹 动态 Spotify 检测显示：只有正在播放音乐时，才显示播放卡片
      const spotifyBar = document.getElementById('spotifyBar');
      const spotifyTrack = document.getElementById('spotifyTrack');
      const btnSpotifyPlay = document.getElementById('btnSpotifyPlay'); // 用以辅助判断播放/暂停状态
      
      if (spotifyBar && spotifyTrack) {
        const trackName = (spotifyTrack.textContent || '').trim();
        const isNotPlaying = !trackName || trackName === 'Not Playing' || trackName === 'Not playing';
        
        // 只有当歌曲名字不是 "Not Playing" 且播放按钮上处于播放状态（可以通过按钮文本或者属性判断）
        // renderer.js 会在暂停时更新图标，或者我们可以直接检测有没有正在放歌
        // 我们甚至可以通过全局状态判断。但为了安全，直接通过 trackName 和播放状态：
        const isPaused = btnSpotifyPlay ? (btnSpotifyPlay.textContent.includes('▶') || btnSpotifyPlay.textContent.includes('Play')) : false;

        if (isNotPlaying || isPaused) {
          if (spotifyBar.style.display !== 'none') {
            spotifyBar.style.display = 'none';
          }
        } else {
          if (spotifyBar.style.display !== 'block') {
            spotifyBar.style.display = 'block';
          }
        }
      }

      // 🤖 动态 AI 开发 App 检测显示：只有对应的 EXE 软件被打开时才显示对应卡片和 AI 区域
      const appCards = document.querySelectorAll('.ai-app-card');
      let anyAppVisible = false;
      appCards.forEach(card => {
        // 主进程检测到 EXE 没开时，会在卡片 class 上加上 'hidden'
        // 所以我们只需判断是否有任何卡片去除了 'hidden'
        if (card && !card.classList.contains('hidden')) {
          anyAppVisible = true;
          // 显式确保正在运行的 EXE 卡片有高度
          card.style.display = 'flex';
        } else if (card) {
          // 没开的 EXE 卡片直接彻底不显示，不占高度
          card.style.display = 'none';
        }
      });

      // 如果没有任何 AI/Dev 软件正在运行，把包含 quota 整体和卡片的容器都彻底折叠起来
      const sectionClaudeApp = document.getElementById('sectionClaudeApp');
      const sectionAntigravityApp = document.getElementById('sectionAntigravityApp');
      const quotaHeader = document.querySelector('.quota-header'); // Quota 面板标题

      if (!anyAppVisible) {
        if (sectionClaudeApp) sectionClaudeApp.style.display = 'none';
        if (sectionAntigravityApp) sectionAntigravityApp.style.display = 'none';
        if (quotaHeader) quotaHeader.style.display = 'none';
      } else {
        if (quotaHeader) quotaHeader.style.display = 'block';
      }

      // 📏 物理高度实时自适应计算，允许自由收缩回 42px 的超窄倒计时桌面条！
      const mainContainer = document.querySelector('.container') || document.body;
      const visibleHeight = mainContainer.scrollHeight || 42;
      const currentWidth = mainContainer.clientWidth || 170;
      
      ipcRenderer.send('window-action', { 
        width: currentWidth, 
        height: visibleHeight, 
        force: true 
      });

    } catch (e) {
      console.error("Auto-layout patch error:", e);
    }
  }, 800);

  // 3. 非工作时间自启询问控制：只有检测到 AI App 打开时才弹 OT 面板
  setTimeout(() => {
    try {
      const now = new Date();
      const day = now.getDay();
      const isWeekendDay = (day === 0 || day === 6);
      
      const config = ipcRenderer.sendSync('get-config') || {};
      const [sH, sM] = (config.startTime || '09:00').split(':').map(Number);
      const [eH, eM] = (config.endTime || '18:00').split(':').map(Number);
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const startMins = sH * 60 + sM;
      const endMins = eH * 60 + eM;
      const isOffHours = isWeekendDay || (currentMins < startMins || currentMins >= endMins);

      if (isOffHours) {
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
