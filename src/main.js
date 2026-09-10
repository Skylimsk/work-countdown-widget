const {app,BrowserWindow,ipcMain,Tray,Menu,screen,nativeTheme,powerSaveBlocker,powerMonitor,dialog,Notification}=require('electron');
const path=require('path'),fs=require('fs'),{execFile}=require('child_process');
const squirrelEvent=process.argv.find(arg=>['--squirrel-install','--squirrel-updated','--squirrel-uninstall','--squirrel-obsolete'].includes(arg));
if(squirrelEvent){
 if(squirrelEvent==='--squirrel-obsolete'){app.quit();return;}
 const update=path.resolve(path.dirname(process.execPath),'..','Update.exe');
 if(fs.existsSync(update))execFile(update,[squirrelEvent==='--squirrel-uninstall'?'--removeShortcut':'--createShortcut',path.basename(process.execPath)],{windowsHide:true,timeout:15000},()=>app.quit());
 else app.quit();
 return;
}
if(process.env.WIDGET_SMOKE_DIR)app.setPath('userData',process.env.WIDGET_SMOKE_DIR);
const {loadConfig,saveConfig,configPath}=require('./store');
const {fetchClaudeQuota,writeLog,logFile}=require('./quotaService');
const {classifyProcesses}=require('./providers/activeApps');
const {Caffeine}=require('./core/caffeine');
const {getSpotifyNowPlaying,spotifyPlayPause,spotifyNext,spotifyPrev}=require('./spotifyService');
const spotifyAuth=require('./spotifyAuth');
let mainWindow,settingsWindow,playlistWindow,tray,quitting=false,scanPending=false,quotaBusy=false,quotaAt=0;
let snapshot={providers:{}},activeApps={},caffeineState={},moveTimer,restAt=Date.now(),lastCaffeineEnabled;
let botStarted=false,botUpdate=Promise.resolve();
function updateBot(){if(smokeDir)return;botUpdate=botUpdate.then(async()=>{const c=loadConfig(),bot=require('./telegramBotService');const wanted=c.enableTelegramBot&&!c.telegramCloudMode;if(botStarted&&!wanted){await bot.stopTelegramBot();botStarted=false;}if(!botStarted&&wanted){bot.initTelegramBot();botStarted=true;}bot.setBotActiveState(wanted);}).catch(e=>writeLog('Bot configuration error: '+e.message));}
const smokeDir=process.env.WIDGET_SMOKE_DIR;
if(smokeDir){app.setPath('userData',smokeDir);app.commandLine.appendSwitch('disable-gpu');}
if(!app.requestSingleInstanceLock()){app.quit();process.exit(0);}
app.on('second-instance',()=>mainWindow?.show());
const broadcast=(channel,data)=>{for(const win of [mainWindow,settingsWindow,playlistWindow])if(win&&!win.isDestroyed())win.webContents.send(channel,data);};
function emitState(){broadcast('widget-state',{config:loadConfig(),snapshot,activeApps,caffeine:caffeineState,dark:nativeTheme.shouldUseDarkColors});}
function protect(win){win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.webContents.on('render-process-gone',(_,details)=>writeLog('Renderer stopped: '+details.reason));}
function applyConfig(){
 const c=loadConfig();nativeTheme.themeSource=c.theme;
 mainWindow?.setAlwaysOnTop(c.alwaysOnTop);mainWindow?.setOpacity(c.opacity);
 if(mainWindow){const [w,h]=mainWindow.getSize();if(w!==c.width)mainWindow.setSize(Math.round(c.width),h);}
 if(!smokeDir)app.setLoginItemSettings({openAtLogin:c.autoStart,name:'WorkCountdownWidget',path:process.execPath,args:app.isPackaged?[]:[app.getAppPath()]});
 caffeine.configure(c);emitState();updateTray();updateBot();
}
function updateTray(){if(!tray)return;tray.setContextMenu(Menu.buildFromTemplate([
 {label:'Spotify library',click:openPlaylists},{label:'Show widget',click:()=>mainWindow.show()},{label:'Settings',click:openSettings},
 {label:'Caffeine keep-awake',type:'checkbox',checked:!!caffeineState.enabled,click:()=>{saveConfig({enableKeepAwake:!caffeineState.enabled});caffeine.configure(loadConfig(),true);emitState();}},
 {type:'separator'},{label:'Quit',click:()=>app.quit()}
]));}
const preferencesWindowSize={width:800,height:730,minWidth:600,minHeight:500};
function openSettings(){
 if(settingsWindow&&!settingsWindow.isDestroyed()){settingsWindow.show();settingsWindow.focus();return;}
 settingsWindow=new BrowserWindow({...preferencesWindowSize,title:'Workday 3 · Settings',icon:path.join(__dirname,'icon.png'),show:false,autoHideMenuBar:true,webPreferences:{nodeIntegration:true,contextIsolation:false}});
 protect(settingsWindow);settingsWindow.loadFile(path.join(__dirname,'settings.html'));settingsWindow.once('ready-to-show',()=>{if(!smokeDir)settingsWindow.show();emitState();});settingsWindow.on('closed',()=>settingsWindow=null);
}
function createWindow(){
 const c=loadConfig(),display=screen.getPrimaryDisplay().workArea;
 let x=c.x??display.x+display.width-c.width-24,y=c.y??display.y+32;
 const area=screen.getDisplayMatching({x:Math.round(x),y:Math.round(y),width:Math.round(c.width),height:100}).workArea;
 x=Math.max(area.x,Math.min(x,area.x+area.width-c.width));y=Math.max(area.y,Math.min(y,area.y+area.height-80));
 mainWindow=new BrowserWindow({width:Math.round(c.width),height:540,x:Math.round(x),y:Math.round(y),minWidth:230,minHeight:40,frame:false,transparent:true,show:false,skipTaskbar:true,resizable:false,icon:path.join(__dirname,'icon.png'),webPreferences:{nodeIntegration:true,contextIsolation:false}});
 protect(mainWindow);mainWindow.loadFile(path.join(__dirname,'index.html'));
 mainWindow.once('ready-to-show',()=>{if(!smokeDir)mainWindow.show();emitState();});
 mainWindow.on('move',()=>{clearTimeout(moveTimer);moveTimer=setTimeout(()=>{if(!quitting&&mainWindow){const [x,y]=mainWindow.getPosition();saveConfig({x,y});}},300);});
 mainWindow.on('close',e=>{if(!quitting&&loadConfig().closeToTray){e.preventDefault();mainWindow.hide();}});
 tray=new Tray(path.join(__dirname,'icon.png'));tray.setToolTip('Workday 3');tray.on('double-click',()=>mainWindow.show());updateTray();
}
function jiggle(){return new Promise((resolve,reject)=>{
 const cmd='Add-Type -AssemblyName System.Windows.Forms; $widgetCursor=[System.Windows.Forms.Cursor]::Position; [System.Windows.Forms.Cursor]::Position=New-Object System.Drawing.Point(($widgetCursor.X+1),$widgetCursor.Y); Start-Sleep -Milliseconds 80; $widgetCursorNow=[System.Windows.Forms.Cursor]::Position; if (($widgetCursorNow.X -eq ($widgetCursor.X+1)) -and ($widgetCursorNow.Y -eq $widgetCursor.Y)) {[System.Windows.Forms.Cursor]::Position=$widgetCursor}';
 execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command',cmd],{timeout:4000,windowsHide:true},err=>err?reject(err):resolve());
});}
const caffeine=new Caffeine(powerSaveBlocker,jiggle,state=>{
 caffeineState=state;broadcast('caffeine-state',state);
 if(!state.enabled&&loadConfig().enableKeepAwake)saveConfig({enableKeepAwake:false});
 if(lastCaffeineEnabled!==state.enabled){lastCaffeineEnabled=state.enabled;updateTray();}
});
async function refreshQuota(){
 if(quotaBusy)return;
 quotaBusy=true;
 try{snapshot=await fetchClaudeQuota();quotaAt=Date.now();emitState();if(loadConfig().enableTelegramBot&&loadConfig().telegramCloudMode)require('./cloudSync').pushQuotaSnapshot(snapshot);}catch(e){writeLog('Quota error: '+e.message);}finally{quotaBusy=false;}
}
function scanApps(){
 if(scanPending)return;scanPending=true;
 execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command','Get-Process | Select-Object ProcessName,Path | ConvertTo-Json -Compress'],{timeout:5000,windowsHide:true},(err,out)=>{
 scanPending=false;if(err)return;
 try{const next=classifyProcesses(JSON.parse(out));if(JSON.stringify(next)!==JSON.stringify(activeApps)){activeApps=next;emitState();refreshQuota();}}catch(_){}
 });
}
ipcMain.on('get-config',(e)=>e.returnValue=loadConfig());
ipcMain.handle('get-state',()=>({config:loadConfig(),snapshot,activeApps,caffeine:caffeineState,dark:nativeTheme.shouldUseDarkColors}));
ipcMain.handle('save-settings',(_,patch)=>{const c=saveConfig(patch);applyConfig();return c;});
ipcMain.on('open-settings',openSettings);
ipcMain.on('hide-widget',()=>mainWindow.hide());
ipcMain.on('quit-widget',()=>app.quit());
ipcMain.on('close-app',()=>mainWindow.close());
ipcMain.on('resize-widget',(event,height)=>{
 if(event.sender!==mainWindow?.webContents||!Number.isFinite(height))return;
 const bounds=mainWindow.getBounds(),area=screen.getDisplayMatching(bounds).workArea;
 const h=Math.min(Math.max(40,Math.ceil(height)),area.height-12);
 if(Math.abs(bounds.height-h)>2){const y=Math.max(area.y,Math.min(bounds.y,area.y+area.height-h));mainWindow.setBounds({...bounds,height:h,y});}
});
function toggleCaffeine(){saveConfig({enableKeepAwake:!caffeineState.enabled});caffeine.configure(loadConfig(),true);emitState();return caffeine.status();}
ipcMain.on('toggle-caffeine',toggleCaffeine);
ipcMain.handle('toggle-caffeine-now',toggleCaffeine);
ipcMain.handle('refresh-quota',async()=>{await refreshQuota();return snapshot;});
ipcMain.handle('export-settings',async()=>{
 const {filePath,canceled}=await dialog.showSaveDialog(settingsWindow,{defaultPath:'workday-settings.json',filters:[{name:'JSON',extensions:['json']}]});
 if(canceled)return null;const c=loadConfig();delete c.credentials;delete c.encryptedCredentials;delete c.x;delete c.y;
 fs.writeFileSync(filePath,JSON.stringify(c,null,2));return filePath;
});
ipcMain.handle('import-settings',async()=>{
 const r=await dialog.showOpenDialog(settingsWindow,{properties:['openFile'],filters:[{name:'JSON',extensions:['json']}]});if(r.canceled)return null;
 const c=JSON.parse(fs.readFileSync(r.filePaths[0],'utf8'));if(!c||typeof c!=='object'||Array.isArray(c))throw Error('Invalid settings file');
 delete c.credentials;delete c.encryptedCredentials;saveConfig(c);applyConfig();return loadConfig();
});
ipcMain.handle('diagnostics',()=>({version:app.getVersion(),configPath,logFile,providers:Object.fromEntries(Object.entries(snapshot.providers).map(([id,p])=>[id,{status:p.status,error:p.error,updatedAt:p.updatedAt}])),caffeine:caffeine.status(),apps:activeApps}));
nativeTheme.on('updated',()=>broadcast('system-theme',nativeTheme.shouldUseDarkColors));
app.whenReady().then(()=>{
 createWindow();applyConfig();
 powerMonitor.on('lock-screen',()=>{caffeine.locked=true;caffeine.reconcile();});
 powerMonitor.on('unlock-screen',()=>{caffeine.locked=false;caffeine.reconcile();});
 powerMonitor.on('suspend',()=>{caffeine.suspended=true;caffeine.reconcile();});
 powerMonitor.on('resume',()=>{caffeine.suspended=false;caffeine.reconcile();refreshQuota();});
 powerMonitor.on('on-battery',()=>{caffeine.battery=true;caffeine.reconcile();});
 powerMonitor.on('on-ac',()=>{caffeine.battery=false;caffeine.reconcile();});
 caffeine.battery=powerMonitor.isOnBatteryPower();caffeine.reconcile();
 screen.on('display-removed',()=>{const a=screen.getPrimaryDisplay().workArea;mainWindow.setPosition(a.x+20,a.y+20);});
 setInterval(()=>caffeine.reconcile(),1000);
 if(!smokeDir){
 scanApps();refreshQuota();
 setInterval(scanApps,6000);
 setInterval(()=>{if(Date.now()-quotaAt>=loadConfig().quotaRefresh*1000)refreshQuota();},5000);
 setInterval(()=>{if(loadConfig().showSpotify){pushSpotifyNowPlaying();pushSpotifyNextTrack();}},5000);
 setInterval(()=>{const c=loadConfig();if(c.enableRest&&Date.now()-restAt>=c.restMinutes*60000&&!caffeine.locked){restAt=Date.now();new Notification({title:'Time for a break',body:'Stand up, stretch and rest your eyes for a minute.',silent:false}).show();}},30000);
 }
});
app.on('before-quit',()=>{quitting=true;clearTimeout(moveTimer);caffeine.dispose();if(botStarted)require('./telegramBotService').stopTelegramBot();});
app.on('window-all-closed',()=>{if(!quitting)app.quit();});

// Spotify IPC Handlers
ipcMain.handle('spotify-now-playing', async () => {
  return new Promise((resolve) => {
    getSpotifyNowPlaying((data) => resolve(data));
  });
});

// Real Web API playback control when connected (requires Premium), falls back
// to media-key simulation otherwise — tracked from the last poll so play/pause
// knows which direction to command.
let spotifyLastKnownPaused = true;

// A fallback media-key press is only safe when Spotify gave us a definitive
// rejection (result.attempted). On a network exception (result.attempted ===
// false) we don't know if the command already landed server-side, so we must
// NOT also fire the media key — that ambiguity is what caused "next" to skip
// two tracks (both the Web API call and the fallback executing).
ipcMain.on('spotify-play-pause', async () => {
  if (spotifyAuth.isConnected()) {
    const result = await spotifyAuth.webPlayPause(!spotifyLastKnownPaused);
    if (result.success) { refreshSpotifySoon(); return; }
    if (!result.attempted) return;
    spotifyPlayPause();
    return;
  }
  spotifyPlayPause();
});
ipcMain.on('spotify-next', async () => {
  if (spotifyAuth.isConnected()) {
    const result = await spotifyAuth.webNext();
    if (result.success) { refreshSpotifySoon(); return; }
    if (!result.attempted) return;
    spotifyNext();
    return;
  }
  spotifyNext();
});
ipcMain.on('spotify-prev', async () => {
  if (spotifyAuth.isConnected()) {
    const result = await spotifyAuth.webPrevious();
    if (result.success) { refreshSpotifySoon(); return; }
    if (!result.attempted) return;
    spotifyPrev();
    return;
  }
  spotifyPrev();
});

// Spotify Web API — up-next queue + real playback control (Windows Media Session has neither)
ipcMain.handle('spotify-auth-status', async () => {
  return { connected: spotifyAuth.isConnected() };
});

ipcMain.handle('spotify-connect', async () => {
  return new Promise((resolve) => {
    spotifyAuth.startAuthFlow((result) => { if(result.success)playlists.clearLikedCache(); broadcast('spotify-auth-changed',{connected:spotifyAuth.isConnected()}); resolve(result); });
  });
});

ipcMain.on('spotify-disconnect', () => {
  spotifyAuth.disconnect();
  playlists.clearLikedCache();
  broadcast('spotify-auth-changed',{connected:false});
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('spotify-next-track', null);
  }
});

ipcMain.handle('spotify-get-devices', async () => {
  if (!spotifyAuth.isConnected()) return [];
  return spotifyAuth.getDevices();
});
ipcMain.on('spotify-switch-device', async (event, deviceId) => {
  await spotifyAuth.switchDevice(deviceId);
  refreshSpotifySoon();
});
ipcMain.on('spotify-set-volume', (event, percent) => {
  spotifyAuth.setVolume(percent);
});
ipcMain.on('spotify-seek', (event, positionMs) => {
  spotifyAuth.seek(positionMs);
});
ipcMain.on('spotify-shuffle', async (event, enabled) => {
  if(typeof enabled!=='boolean')return;
  await spotifyAuth.setShuffleMode(enabled);
  refreshSpotifySoon();
});
ipcMain.on('spotify-repeat', async (event, state) => {
  await spotifyAuth.setRepeatMode(state);
  refreshSpotifySoon();
});

// Push the current now-playing state to the renderer. When connected, the
// Web API's track/artist/paused/progress/volume are authoritative — the local
// Windows Media Session (SMTC) can lag several seconds behind a remotely
// issued command (e.g. right after a Web API skip), and its paused status is
// known to misreport for Spotify. It also works when spotify.exe isn't even
// running locally (e.g. controlling Spotify open on your phone), so an active
// Web API device takes over showing/driving the card in that case too.
function pushSpotifyNowPlaying() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  getSpotifyNowPlaying((localData) => {
    if (spotifyAuth.isConnected()) {
      spotifyAuth.getPlayerState().then((state) => {
        if (state && state.active) {
          localData.running = true;
          localData.paused = !state.isPlaying;
          localData.position_sec = state.progressMs / 1000;
          if (state.durationMs) localData.duration_sec = state.durationMs / 1000;
          localData.volumePercent = state.volumePercent;
          localData.deviceName = state.deviceName;
          localData.repeatState = state.repeatState;
          localData.shuffleState = state.shuffleState;
          if (state.track) {
            localData.track = state.track;
            localData.trackId = state.trackId;
            localData.artist = state.artist;
          }
        }
        spotifyLastKnownPaused = !!localData.paused;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('spotify-update', localData);
        }
      }).catch(() => {
        spotifyLastKnownPaused = !!localData.paused;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('spotify-update', localData);
      });
    } else {
      spotifyLastKnownPaused = !!localData.paused;
      mainWindow.webContents.send('spotify-update', localData);
    }
  });
}

function pushSpotifyNextTrack() {
  if (!spotifyAuth.isConnected() || !mainWindow || mainWindow.isDestroyed()) return;
  spotifyAuth.getNextTrack().then((next) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('spotify-next-track', next);
    }
  });
}

// After a command actually changes something (skip/prev), refresh right away
// instead of waiting for the next scheduled poll — Spotify's servers are
// usually caught up within a few hundred ms of accepting the command.
function refreshSpotifySoon() {
  setTimeout(() => {
    pushSpotifyNowPlaying();
    pushSpotifyNextTrack();
  }, 400);
}


const playlists=require('./core/spotify-playlists').createPlaylists(spotifyAuth);
function openPlaylists(){
 if(playlistWindow&&!playlistWindow.isDestroyed()){playlistWindow.show();playlistWindow.focus();return;}
 playlistWindow=new BrowserWindow({...preferencesWindowSize,title:'Spotify library',show:false,autoHideMenuBar:true,icon:path.join(__dirname,'icon.png'),webPreferences:{nodeIntegration:true,contextIsolation:false}});
 protect(playlistWindow);playlistWindow.loadFile(path.join(__dirname,'playlists.html'));
 playlistWindow.once('ready-to-show',()=>{if(!smokeDir)playlistWindow.show();emitState();});playlistWindow.on('closed',()=>playlistWindow=null);
}
ipcMain.on('open-spotify-playlists',openPlaylists);
ipcMain.handle('spotify-list-playlists',(_,offset)=>playlists.list(offset));
ipcMain.handle('spotify-playlist-devices',()=>playlists.devices());
ipcMain.handle('spotify-add-track-queue',(_,input)=>playlists.addTrack(input?.id,input?.deviceId||''));
ipcMain.handle('spotify-play-playlist',async(_,input)=>{const result=await playlists.play(input?.id,input?.deviceId||'');if(result.ok&&!smokeDir)refreshSpotifySoon();return result;});

ipcMain.handle('spotify-library-volume',async(_,value)=>{if(!Number.isFinite(value)||value<0||value>100)return false;return spotifyAuth.setVolume(value);});
ipcMain.handle('spotify-library-switch-device',async(_,id)=>{if(typeof id!=='string'||!id||id.length>200)return false;const ok=await spotifyAuth.switchDevice(id);if(ok&&!smokeDir)refreshSpotifySoon();return ok;});

ipcMain.handle('spotify-liked-songs',(_,offset)=>playlists.liked(offset));
ipcMain.handle('spotify-search-artists',(_,input)=>playlists.artists(input?.query,input?.offset));
ipcMain.handle('spotify-play-artist',async(_,input)=>{const r=await playlists.playArtist(input?.id,input?.deviceId||'');if(r.ok&&!smokeDir)refreshSpotifySoon();return r;});
ipcMain.handle('spotify-play-liked',async(_,input)=>{const r=await playlists.playTracks(input?.ids,input?.deviceId||'');if(r.ok&&!smokeDir)refreshSpotifySoon();return r;});
ipcMain.handle('spotify-open-liked',async()=>{try{await require('electron').shell.openExternal('https://open.spotify.com/collection/tracks');return {ok:true};}catch{return {ok:false,error:'Could not open Spotify.'};}});

ipcMain.handle('spotify-search-liked',(_,query)=>playlists.searchLiked(query));
