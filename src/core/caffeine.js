const {caffeineDeadline}=require('./schedule');
class Caffeine {
  constructor(blocker,jiggle,changed=()=>{},clock=()=>Date.now()) {this.blocker=blocker;this.jiggle=jiggle;this.changed=changed;this.clock=clock;this.id=null;this.enabled=false;this.locked=false;this.battery=false;this.suspended=false;this.error=null;this.busy=false;this.pulses=0;}
  configure(c,restart=false){const relevant=['enableKeepAwake','caffeineMode','caffeineDuration','startTime','endTime','workDays'];const reset=restart||!this.config||relevant.some(k=>JSON.stringify(c[k])!==JSON.stringify(this.config[k]));this.config={...c};if(reset){this.enabled=c.enableKeepAwake;this.deadline=this.enabled?caffeineDeadline(new Date(this.clock()),c):null;this.error=null;}this.reconcile();}
  release(){if(this.id!==null){this.blocker.stop(this.id);this.id=null;}}
  reconcile(){
    if(this.enabled&&this.deadline!==null&&this.clock()>=this.deadline)this.enabled=false;
    const paused=this.suspended||(this.locked&&this.config?.pauseOnLock)||(this.battery&&this.config?.pauseOnBattery);
    const type=this.config?.caffeineMode==='system'?'prevent-app-suspension':'prevent-display-sleep';
    try{if(!this.enabled||paused||this.type!==type)this.release();if(this.enabled&&!paused&&(this.id===null||!this.blocker.isStarted(this.id))){this.id=this.blocker.start(type);this.type=type;} }catch(e){this.error=e.message;}
    const active=this.id!==null&&this.blocker.isStarted(this.id);
    if(active&&this.config.mouseJiggle&&!this.locked&&!this.busy&&this.clock()-(this.lastPulse||0)>=this.config.jiggleMinutes*60000){this.busy=true;this.lastPulse=this.clock();Promise.resolve().then(()=>this.jiggle()).then(()=>{this.pulses++;this.error=null;}).catch(e=>this.error=e.message).finally(()=>{this.busy=false;this.changed(this.status());});}
    this.changed(this.status());
  }
  status(){return {enabled:this.enabled,active:this.id!==null&&this.blocker.isStarted(this.id),mode:this.config?.caffeineMode,deadline:this.deadline,error:this.error,pulses:this.pulses,locked:this.locked,battery:this.battery};}
  dispose(){this.enabled=false;this.release();}
}
module.exports={Caffeine};
