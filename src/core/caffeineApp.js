// Opens the bundled Zhorn Caffeine app (caffeine64.exe) when the work shift
// starts and closes it when the shift ends. Acts only on transitions, so if
// you close Caffeine yourself mid-shift it is not reopened until the next shift.
const path=require('path'),fs=require('fs'),{spawn,spawnSync,execFile}=require('child_process');
const {schedule}=require('./schedule');

const exePath=path.join(__dirname,'..','vendor','caffeine','caffeine64.exe');

// Only touches caffeine64.exe processes launched from our bundled copy.
function psQuery(action){
 const kill=action==='stop'?' | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $_.ProcessId }':' | ForEach-Object { $_.ProcessId }';
 return "Get-CimInstance Win32_Process -Filter \"name = 'caffeine64.exe'\" | Where-Object { $_.ExecutablePath -eq $env:WORKDAY_CAFFEINE_EXE }"+kill;
}
function runPs(action){return new Promise((resolve,reject)=>{
 execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command',psQuery(action)],{env:{...process.env,WORKDAY_CAFFEINE_EXE:exePath},windowsHide:true,timeout:15000},(err,out)=>err?reject(err):resolve(String(out).trim().length>0));
});}
const windowsHost={
 exists:()=>fs.existsSync(exePath),
 isRunning:()=>runPs('list'),
 start:()=>{const child=spawn(exePath,[],{detached:true,stdio:'ignore',windowsHide:false});child.on('error',()=>{});child.unref();},
 stop:()=>runPs('stop'),
 stopSync:()=>spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',psQuery('stop')],{env:{...process.env,WORKDAY_CAFFEINE_EXE:exePath},windowsHide:true,timeout:10000})
};

class CaffeineApp {
 constructor(host=windowsHost,clock=()=>Date.now(),log=()=>{}){this.host=host;this.clock=clock;this.log=log;this.wanted=null;this.queue=Promise.resolve();this.error=null;}
 // Call often (e.g. every second); does work only when the desired state flips.
 sync(config){
  const phase=schedule(new Date(this.clock()),config).phase;
  const want=!!config.runCaffeineApp&&['work','lunch'].includes(phase);
  if(want===this.wanted)return this.queue;
  this.wanted=want;
  // On startup outside work hours this also cleans up a copy left by a crashed widget.
  return this.enqueue(want?()=>this.open():()=>this.close());
 }
 enqueue(fn){this.queue=this.queue.then(fn).then(()=>{this.error=null;},e=>{this.error=e.message;this.log('Caffeine app: '+e.message);});return this.queue;}
 async open(){
  if(!this.host.exists())throw Error('Bundled caffeine64.exe is missing');
  if(await this.host.isRunning())return;
  this.host.start();this.log('Caffeine app opened for work hours');
 }
 async close(){if(await this.host.stop())this.log('Caffeine app closed after work hours');}
 // Synchronous so it finishes before the widget process exits.
 dispose(){if(this.wanted)this.host.stopSync?.();this.wanted=false;}
}
module.exports={CaffeineApp,exePath};
