const {caffeineDeadline,schedule}=require('./schedule');
class Caffeine {
  constructor(blocker,jiggle,changed=()=>{},clock=()=>Date.now(),activityPulse=()=>Promise.resolve()) {this.blocker=blocker;this.jiggle=jiggle;this.changed=changed;this.clock=clock;this.activityPulse=activityPulse;this.id=null;this.enabled=false;this.locked=false;this.battery=false;this.suspended=false;this.error=null;this.busy=false;this.activityBusy=false;this.pulses=0;this.wasInWorkPeriod=null;this.activationSource=null;}
  configure(c,restart=false){const previous=this.config;const relevant=['enableKeepAwake','caffeineMode','caffeineDuration','startTime','endTime','workDays'];const reset=restart||!previous||relevant.some(k=>JSON.stringify(c[k])!==JSON.stringify(previous[k]));this.config={...c};if(reset){this.enabled=c.enableKeepAwake;this.deadline=this.enabled?caffeineDeadline(new Date(this.clock()),c):null;this.activationSource=this.enabled?'manual':null;this.error=null;if(this.enabled&&c.autoCaffeineWorkday){const period=schedule(new Date(this.clock()),c);if(['work','lunch'].includes(period.phase)){this.activationSource='workday';this.deadline=period.end.getTime();}}}if(previous&&['startTime','endTime','workDays'].some(k=>JSON.stringify(c[k])!==JSON.stringify(previous[k])))this.wasInWorkPeriod=null;if(previous?.autoCaffeineWorkday!==c.autoCaffeineWorkday){if(!c.autoCaffeineWorkday&&this.activationSource==='workday'){this.enabled=false;this.deadline=null;this.activationSource=null;}else if(c.autoCaffeineWorkday)this.wasInWorkPeriod=null;}if(c.caffeineMode==='activity'&&previous?.caffeineMode!=='activity')this.lastActivityPulse=this.clock();this.reconcile();}
  release(){if(this.id!==null){this.blocker.stop(this.id);this.id=null;}}
  reconcile(){
    const now=new Date(this.clock());
    const period=schedule(now,this.config||{});
    const inWorkPeriod=['work','lunch'].includes(period.phase);
    if(this.config?.autoCaffeineWorkday&&inWorkPeriod&&this.wasInWorkPeriod!==true&&!this.enabled){this.enabled=true;this.deadline=period.end.getTime();this.activationSource='workday';this.error=null;}
    if(this.wasInWorkPeriod===true&&!inWorkPeriod&&this.activationSource==='workday'){this.enabled=false;this.deadline=null;this.activationSource=null;}
    this.wasInWorkPeriod=inWorkPeriod;
    if(this.enabled&&this.deadline!==null&&this.clock()>=this.deadline)this.enabled=false;
    const paused=this.suspended||(this.locked&&this.config?.pauseOnLock)||(this.battery&&this.config?.pauseOnBattery);
    const type=this.config?.caffeineMode==='system'?'prevent-app-suspension':'prevent-display-sleep';
    try{if(!this.enabled||paused||this.type!==type)this.release();if(this.enabled&&!paused&&(this.id===null||!this.blocker.isStarted(this.id))){this.id=this.blocker.start(type);this.type=type;} }catch(e){this.error=e.message;}
    const active=this.id!==null&&this.blocker.isStarted(this.id);
    if(active&&this.config?.caffeineMode==='activity'&&!this.locked&&!this.activityBusy&&this.clock()-(this.lastActivityPulse??this.clock())>=59000){
      this.activityBusy=true;this.lastActivityPulse=this.clock();
      Promise.resolve().then(()=>this.activityPulse()).then(()=>{this.pulses++;this.error=null;}).catch(e=>{this.error=e.message;}).finally(()=>{this.activityBusy=false;this.changed(this.status());});
    }
    if(active&&this.config.mouseJiggle&&!this.locked&&!this.busy&&this.clock()-(this.lastPulse||0)>=this.config.jiggleMinutes*60000){this.busy=true;this.lastPulse=this.clock();Promise.resolve().then(()=>this.jiggle()).then(()=>{this.pulses++;this.error=null;}).catch(e=>this.error=e.message).finally(()=>{this.busy=false;this.changed(this.status());});}
    this.changed(this.status());
  }
  status(){return {enabled:this.enabled,active:this.id!==null&&this.blocker.isStarted(this.id),scheduled:this.activationSource==='workday',mode:this.config?.caffeineMode,deadline:this.deadline,error:this.error,pulses:this.pulses,locked:this.locked,battery:this.battery};}
  dispose(){this.enabled=false;this.release();}
}
module.exports={Caffeine};
