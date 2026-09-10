const {ipcRenderer}=require('electron');
const {schedule}=require('./core/schedule');
const {visibleAI}=require('./core/ai');
let state={config:ipcRenderer.sendSync('get-config'),snapshot:{providers:{}},activeApps:{},caffeine:{}};
let otStarted=null,clockTimer,activeAIId=null,carouselHovered=false,lastCarouselChange=Date.now();
const $=id=>document.getElementById(id);
function theme(dark){document.documentElement.dataset.theme=state.config.theme==='system'?(dark?'dark':'light'):state.config.theme;document.body.classList.toggle('light-mode',document.documentElement.dataset.theme==='light');}
function configure(){
 const c=state.config;theme(state.dark);
 document.body.dataset.layout=c.layout;document.body.dataset.aiLayout=c.aiLayout;
 document.documentElement.style.setProperty('--font-scale',c.fontScale);
 document.body.classList.toggle('reduce-motion',c.reduceMotion);
 document.body.classList.toggle('no-fan-effects',!c.fanEffects);
 $('systemThemeLabel').textContent=c.theme==='system'?'System':c.theme==='dark'?'Dark':'Light';
 window.dispatchEvent(new CustomEvent('music-settings',{detail:c}));
 renderAI();tick();renderCaffeine();
}
function element(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
function resetText(iso){if(!iso)return 'Reset time unavailable';const d=new Date(iso);if(!Number.isFinite(d.getTime()))return 'Reset time unavailable';const minutes=Math.ceil((d-Date.now())/60000);return (minutes<=0?'Resetting…':'Resets '+d.toLocaleString('en-GB',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}));}
function metric(parent,label,m,cached){
 const row=element('div','quota-metric'),head=element('div','quota-label');
 const valid=Number.isFinite(m?.remaining);head.append(element('span','',label),element('span','remaining',valid?Math.round(m.remaining)+'%':'—'));
 row.append(head);const meter=element('div','meter'),bar=element('span');bar.style.width=valid?Math.min(100,Math.max(0,m.remaining))+'%':'0%';meter.append(bar);row.append(meter,element('div','reset-time',(cached?'Cached · ':'')+(valid?resetText(m.resetAt):'Usage unavailable')));parent.append(row);
}
function renderAI(){
 const c=state.config,ids=visibleAI(c,state.activeApps);
 $('aiSection').hidden=!c.showQuota||!ids.length;$('aiCount').textContent=ids.length?String(ids.length):'';
 const root=$('aiCards');root.replaceChildren();
 const names={codex:'Codex / ChatGPT',antigravity:'Antigravity',claude:'Claude'};
 for(const id of ids){
  const providers=id==='antigravity'?[['Gemini','antigravity_gemini'],['Claude / GPT','antigravity_claude_gpt']]:[['',id]];
  const values=providers.map(([,key])=>state.snapshot.providers?.[key]);
  const status=values.every(p=>p?.status==='ok')?'ok':values.some(p=>p?.lastKnownGoodAt)?'cached':values.some(Boolean)?'error':'loading';
  const card=element('details','ai-card');card.dataset.provider=id;card.open=!c.collapsedAI.includes(id);
  const summary=element('summary');summary.append(element('span','name',names[id]),element('span','provider-status '+status,{ok:'Connected',cached:'Cached',error:'Check connection',loading:'Loading'}[status]));card.append(summary);
  summary.addEventListener('click',e=>{e.preventDefault();const collapsed=new Set(c.collapsedAI);card.open?collapsed.add(id):collapsed.delete(id);ipcRenderer.invoke('save-settings',{collapsedAI:[...collapsed]});});
  for(const [name,key] of providers){
   const p=state.snapshot.providers?.[key];if(name)card.append(element('div','model-label',name));
   if(!p){card.append(element('p','provider-error','Reading local account…'));continue;}
   if(p.status!=='ok'&&!p.lastKnownGoodAt){const msg=p.status==='not_authenticated'?'Open the app and sign in first':p.error||'Usage is temporarily unavailable';card.append(element('p','provider-error',msg));continue;}
   const mins=p.metrics?.session?.windowDurationMins;
   metric(card,id==='antigravity'?'Current left':(mins?mins%60===0?mins/60+'h left':mins+'m left':'5h left'),p.metrics?.session,p.lastKnownGoodAt);
   if(c.showWeekly&&id!=='antigravity')metric(card,'Weekly left',p.metrics?.weekly,p.lastKnownGoodAt);

  }
  root.append(card);
 }
 updateCarousel();
 const stamp=state.snapshot.updatedAt;
 $('connectionInfo').textContent=stamp?'Updated '+new Date(stamp).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'Waiting for usage';
}
function renderCaffeine(){
 const c=state.caffeine||{};$('caffeineToggle').setAttribute('aria-pressed',String(!!c.enabled));
 $('caffeineLabel').textContent=c.error?'Caffeine needs attention':!c.enabled?'Caffeine off':!c.active?'Caffeine paused':c.mode==='system'?'System awake':'Display awake';
 $('caffeineDetail').textContent=c.error?'Check settings':c.enabled?(c.deadline?'Until '+new Date(c.deadline).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'Until switched off'):'Click to enable';
 $('caffeineToggle').title=c.error||'Toggle Caffeine';
 $('headerCaffeine').setAttribute('aria-pressed',String(!!c.enabled));
 $('headerCaffeine').title=$('caffeineLabel').textContent+' · '+$('caffeineDetail').textContent;
}
function hms(ms){const seconds=Math.max(0,Math.floor(ms/1000));return [Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(v=>String(v).padStart(2,'0')).join(':');}
function tick(){
 const now=new Date(),c=state.config,s=schedule(now,c),ot=otStarted!==null;
 const title=ot?'Overtime':s.phase==='lunch'?'Lunch ends in':s.stage==='lunch'?'Lunch starts in':s.stage==='home'?'Time until home':'Next shift starts in';
 const display=ot?hms(now-otStarted):s.target?hms(s.target-now):'Day off';
 $('phaseLabel').textContent=title;$('clock').textContent=display;
 document.querySelector('.brand').textContent=display;
 document.querySelector('.brand').title=title+' · '+c.startTime+' — '+c.endTime;
 const activeStage=ot?'home':s.stage;
 for(const stage of document.querySelectorAll('#stageStrip [data-stage]')){
  const active=stage.dataset.stage===activeStage;stage.classList.toggle('active',active);stage.setAttribute('aria-current',active?'step':'false');
 }
 $('stageStrip').dataset.phase=s.phase;$('stageStrip').title=title;
 if(!carouselHovered&&!document.hidden&&Date.now()-lastCarouselChange>=c.carouselSeconds*1000)cycleAI(1);
 $('scheduleLabel').textContent=c.startTime+' — '+c.endTime;$('progressLabel').textContent=Math.round(s.progress)+'%';$('workProgress').style.width=s.progress+'%';
 $('otActions').hidden=!c.enableOt||(['work','lunch'].includes(s.phase)&&!ot);$('otButton').textContent=ot?'Stop overtime':'Start overtime';
 const rate=c.salaryType==='hourly'?c.hourlyRate:c.monthlySalary/(c.workDaysPerMonth*c.workHoursPerDay);
 $('otPay').textContent=ot?new Intl.NumberFormat('en-GB',{style:'currency',currency:c.currency}).format((now-otStarted)/3600000*rate*c.otMultiplier):'';
}
function updateCarousel(){
 const cards=[...document.querySelectorAll('.ai-card')];
 if(!cards.some(c=>c.dataset.provider===activeAIId))activeAIId=cards[0]?.dataset.provider||null;
 const dots=$('carouselDots');dots.replaceChildren();
 for(const card of cards){
  const selected=card.dataset.provider===activeAIId;card.hidden=!selected;
  const dot=element('button');dot.setAttribute('aria-label','Show '+card.querySelector('.name').textContent);dot.setAttribute('aria-pressed',String(selected));
  dot.onclick=()=>{activeAIId=card.dataset.provider;lastCarouselChange=Date.now();updateCarousel();};dots.append(dot);
 }
 $('carouselNav').hidden=cards.length<2;
}
function cycleAI(direction){
 const ids=[...document.querySelectorAll('.ai-card')].map(c=>c.dataset.provider);
 if(ids.length>1){activeAIId=ids[(Math.max(0,ids.indexOf(activeAIId))+direction+ids.length)%ids.length];updateCarousel();}
 lastCarouselChange=Date.now();
}
$('aiSection').onmouseenter=()=>{carouselHovered=true;};
$('aiSection').onmouseleave=()=>{carouselHovered=false;lastCarouselChange=Date.now();};
$('previousAI').onclick=()=>cycleAI(-1);
$('nextAI').onclick=()=>cycleAI(1);
$('headerCaffeine').onclick=()=>ipcRenderer.send('toggle-caffeine');
$('settingsButton').onclick=()=>ipcRenderer.send('open-settings');
$('hideButton').onclick=()=>ipcRenderer.send('hide-widget');
$('caffeineToggle').onclick=()=>ipcRenderer.send('toggle-caffeine');
$('layoutToggle').onclick=()=>ipcRenderer.invoke('save-settings',{layout:state.config.layout==='compact'?'standard':'compact'});
$('otButton').onclick=()=>{otStarted=otStarted===null?Date.now():null;tick();};
$('refreshAI').onclick=async()=>{const b=$('refreshAI');b.disabled=true;b.textContent='Loading';try{await ipcRenderer.invoke('refresh-quota');}finally{b.disabled=false;b.textContent='Refresh';}};
ipcRenderer.on('widget-state',(_,next)=>{state=next;configure();});
ipcRenderer.on('caffeine-state',(_,value)=>{state.caffeine=value;renderCaffeine();});
ipcRenderer.on('system-theme',(_,dark)=>{state.dark=dark;theme(dark);});
ipcRenderer.invoke('get-state').then(next=>{state=next;configure();});
new ResizeObserver(()=>ipcRenderer.send('resize-widget',$('shell').getBoundingClientRect().height)).observe($('shell'));
configure();clockTimer=setInterval(tick,1000);
window.addEventListener('unload',()=>clearInterval(clockTimer));
