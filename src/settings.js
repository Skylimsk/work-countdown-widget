const {ipcRenderer}=require('electron');
let config=ipcRenderer.sendSync('get-config'),dark=matchMedia('(prefers-color-scheme: dark)').matches;
const $=id=>document.getElementById(id);
const sections=[
 ['appearance','Appearance','Follow Windows appearance and customize your desktop layout.',[
 ['theme','Theme','select',[['system','System'],['dark','Dark'],['light','Light']]],
 ['layout','Widget layout','select',[['standard','AI carousel'],['compact','Clock only'],['music','Music focus']]],
 ['width','Window width','number',230,500],['fontScale','Text scale','number',0.9,1.3,0.05],['opacity','Opacity','number',0.65,1,0.05],
 ['carouselSeconds','AI rotation (seconds)','number',3,30],
 ['alwaysOnTop','Always on top','checkbox'],['reduceMotion','Reduce motion','checkbox']]],
 ['work','Work & overtime','Uses your local time zone and supports overnight shifts.',[
 ['startTime','Work starts','time'],['endTime','Work ends','time'],['enableLunch','Lunch break','checkbox'],
 ['lunchStart','Lunch starts','time'],['lunchEnd','Lunch ends','time'],['enableOt','Overtime tracking','checkbox'],
 ['salaryType','Pay basis','select',[['hourly','Hourly rate'],['monthly','Monthly salary']]],
 ['hourlyRate','Hourly rate','number',0,100000,0.5],['monthlySalary','Monthly salary','number',0,1000000,50],
 ['workDaysPerMonth','Workdays per month','number',1,31],['workHoursPerDay','Work hours per day','number',1,24,0.5],
 ['otMultiplier','Overtime multiplier','number',1,10,0.1],['currency','Currency','select',['MYR','USD','SGD','TWD','CNY']]]],
 ['caffeine','Caffeine','System sleep prevention and mouse movement are separate. Outside work hours, choose a duration instead of end of shift. Chat presence is not guaranteed.',[
 ['enableKeepAwake','Enable Caffeine','checkbox'],['caffeineMode','Keep-awake mode','select',[['system','System only · screen may sleep'],['display','System and display']]],
 ['caffeineDuration','Stop automatically','select',[['workday','At the end of this shift'],['30','After 30 minutes'],['60','After 1 hour'],['120','After 2 hours'],['manual','Until switched off']]],
 ['pauseOnLock','Pause when locked','checkbox'],['pauseOnBattery','Pause on battery','checkbox'],
 ['mouseJiggle','Mouse movement','checkbox'],['jiggleMinutes','Movement interval (min)','number',1,30]]],
 ['ai','AI workspace','One card at a time, automatically rotating between running apps. Antigravity includes Gemini and Claude / GPT.',[
 ['showQuota','Show AI cards','checkbox'],['showWeekly','Show weekly limits','checkbox'],
 ['aiModes.codex','Codex / ChatGPT','select',[['auto','Follow running app'],['always','Always show'],['hidden','Hide']]],
 ['aiModes.antigravity','Antigravity','select',[['auto','Follow running app'],['always','Always show'],['hidden','Hide']]],
 ['aiModes.claude','Claude','select',[['auto','Follow running app'],['always','Always show'],['hidden','Hide']]],
 ['quotaRefresh','Refresh interval (sec)','number',15,300]]],
 ['music','Music & fan effects','Spotify controls, TWICE member colors, Feel Special roll call and song effects.',[
 ['showSpotify','Show Spotify','checkbox'],['artistThemes','Artist / TWICE member themes','checkbox'],
 ['fanEffects','TWICE chant & song effects','checkbox']]],
 ['system','System & alerts','Startup, tray behavior and break reminders.',[
 ['autoStart','Launch at startup','checkbox'],['closeToTray','Close to system tray','checkbox'],
 ['enableRest','Break reminders','checkbox'],['restMinutes','Reminder interval (min)','number',5,180],
 ['enableTelegramBot','Enable existing Telegram bot','checkbox'],['telegramCloudMode','Use cloud bot','checkbox'],
 ['credentials.cloudSyncUrl','Cloud bot URL','text'],['credentials.cloudSyncSecret','Cloud shared secret','password']]],
 ['diagnostics','Diagnostics & backup','Inspect connections and back up preferences. Exports exclude tokens and secrets.',[]]
];
function value(key){return key.split('.').reduce((o,k)=>o?.[k],config);}
function theme(){const t=$('theme')?.value||config.theme;document.documentElement.dataset.theme=t==='system'?(dark?'dark':'light'):t;}
for(const [id,title,description,fields] of sections){
 const nav=document.createElement('button');nav.type='button';nav.textContent=title;nav.dataset.tab=id;nav.onclick=()=>selectTab(id);$('settingsNav').append(nav);
 const section=document.createElement('section');section.id='panel-'+id;section.hidden=true;
 const h=document.createElement('h1');h.textContent=title;const p=document.createElement('p');p.className='settings-description';p.textContent=description;section.append(h,p);
 const list=document.createElement('div');list.className='settings-fields';
 for(const [key,label,type,options,max,step] of fields){
 const row=document.createElement('label');row.className='setting-field';const name=document.createElement('span');name.textContent=label;
 const input=document.createElement(type==='select'?'select':'input');input.id=key;input.dataset.key=key;
 if(type==='select'){for(const entry of options){const [v,text]=Array.isArray(entry)?entry:[entry,entry];const opt=document.createElement('option');opt.value=v;opt.textContent=text;input.append(opt);}input.value=value(key);}
 else {input.type=type;if(type==='checkbox')input.checked=!!value(key);else{input.value=value(key)??'';if(type==='number'){input.min=options;input.max=max;input.step=step??1;}if(type==='time')input.required=true;}}
 row.append(name,input);list.append(row);
 }
 section.append(list);$('settingsPanels').append(section);
}
function selectTab(id){for(const [key] of sections){$('panel-'+key).hidden=key!==id;document.querySelector('[data-tab="'+key+'"]').classList.toggle('selected',key===id);}}
const weekdays=document.createElement('div');weekdays.className='status-box';weekdays.textContent='Workdays';const days=document.createElement('div');days.className='weekdays';
['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((name,i)=>{const label=document.createElement('label');label.className='weekday';const input=document.createElement('input');input.type='checkbox';input.dataset.day=i;input.checked=config.workDays.includes(i);label.append(input,document.createTextNode(name));days.append(label);});weekdays.append(days);$('panel-work').insertBefore(weekdays,$('panel-work').querySelector('.settings-fields'));
function button(parent,label,handler){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=handler;parent.append(b);return b;}
const caffeineBox=document.createElement('div');caffeineBox.className='status-box';caffeineBox.id='caffeineStatus';$('panel-caffeine').append(caffeineBox);
button($('panel-caffeine'),'Toggle now',async()=>{const s=await ipcRenderer.invoke('toggle-caffeine-now');$('enableKeepAwake').checked=s.enabled;config.enableKeepAwake=s.enabled;});
button($('panel-music'),'Browse Spotify library',()=>ipcRenderer.send('open-spotify-playlists'));
const musicBox=document.createElement('div');musicBox.className='status-box';musicBox.id='spotifyStatus';$('panel-music').append(musicBox);
button($('panel-music'),'Connect Spotify',async(e)=>{const b=e.target;b.disabled=true;musicBox.textContent='Complete Spotify sign-in in your browser…';try{const r=await ipcRenderer.invoke('spotify-connect');musicBox.textContent=r?.success?'Spotify connected':'Connection not completed. Please retry.';}finally{b.disabled=false;}});
button($('panel-music'),'Disconnect',()=>{ipcRenderer.send('spotify-disconnect');musicBox.textContent='Spotify disconnected';});
ipcRenderer.invoke('spotify-auth-status').then(s=>musicBox.textContent=s.connected?'Spotify connected · device and volume controls available':'Not connected · local Spotify playback detection is available');
const orderBox=document.createElement('div');orderBox.className='status-box';$('panel-ai').append(orderBox);
function renderOrder(){orderBox.replaceChildren(document.createTextNode('Card order'));config.aiOrder.forEach((id,index)=>{const row=document.createElement('div');row.className='settings-actions';row.append(document.createTextNode({codex:'Codex',antigravity:'Antigravity',claude:'Claude'}[id]));const b=button(row,'↑',()=>{[config.aiOrder[index-1],config.aiOrder[index]]=[config.aiOrder[index],config.aiOrder[index-1]];renderOrder();});b.disabled=index===0;orderBox.append(row);});}renderOrder();
const diag=document.createElement('div');diag.className='status-box';const pre=document.createElement('pre');pre.id='diagnosticOutput';diag.append(pre);$('panel-diagnostics').append(diag);
async function diagnose(){const result=await ipcRenderer.invoke('diagnostics');pre.textContent=JSON.stringify(result,null,2);}
button($('panel-diagnostics'),'Refresh diagnostics',diagnose);
button($('panel-ai'),'Test connections / refresh usage',async(e)=>{const b=e.target;b.disabled=true;b.textContent='Reading…';try{await ipcRenderer.invoke('refresh-quota');await diagnose();selectTab('diagnostics');}finally{b.disabled=false;b.textContent='Test connections / refresh usage';}});
button($('panel-diagnostics'),'Export settings',async()=>{const path=await ipcRenderer.invoke('export-settings');if(path)$('saveStatus').textContent='Exported to '+path;});
button($('panel-diagnostics'),'Import settings',async()=>{try{if(await ipcRenderer.invoke('import-settings'))location.reload();}catch(e){$('saveStatus').textContent='Import failed: '+e.message;}});
$('settingsForm').oninput=()=>{$('saveStatus').textContent='You have unsaved changes';theme();};
$('settingsForm').onsubmit=async e=>{
 e.preventDefault();if(!$('settingsForm').reportValidity())return;
 const patch={aiModes:{},credentials:{},workDays:[],aiOrder:config.aiOrder};
 document.querySelectorAll('[data-key]').forEach(input=>{const v=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;const [key,sub]=input.dataset.key.split('.');if(sub)patch[key][sub]=v;else patch[key]=v;});
 document.querySelectorAll('[data-day]:checked').forEach(input=>patch.workDays.push(Number(input.dataset.day)));
 if(patch.startTime===patch.endTime){$('saveStatus').textContent='Start and end times must be different';selectTab('work');return;}
 $('saveSettings').disabled=true;
 try{config=await ipcRenderer.invoke('save-settings',patch);$('saveStatus').textContent='Saved and applied to the widget';}catch(e){$('saveStatus').textContent='Save failed: '+e.message;}finally{$('saveSettings').disabled=false;}
};
function caffeine(s){caffeineBox.textContent=s.error?'Error: '+s.error:!s.enabled?'Off':(s.active?'OS keep-awake request active':'Enabled, currently paused')+(s.deadline?' · Until '+new Date(s.deadline).toLocaleTimeString():' · Until switched off')+' · Mouse pulses: '+s.pulses+'';}
ipcRenderer.on('caffeine-state',(_,s)=>caffeine(s));
ipcRenderer.on('system-theme',(_,v)=>{dark=v;theme();});
ipcRenderer.invoke('get-state').then(s=>{dark=s.dark;theme();caffeine(s.caffeine);});
selectTab('appearance');theme();diagnose();
