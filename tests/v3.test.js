const test=require('node:test'),assert=require('node:assert/strict');
const {normalizeConfig}=require('../src/core/config');
const {schedule,caffeineDeadline}=require('../src/core/schedule');
const {Caffeine}=require('../src/core/caffeine');
const {visibleAI}=require('../src/core/ai');
test('migration follows system and does not silently enable mouse movement',()=>{
 const c=normalizeConfig({theme:'dark',width:170,enableKeepAwake:true});assert.equal(c.theme,'system');assert.equal(c.width,260);assert.equal(c.mouseJiggle,false);
 assert.deepEqual(visibleAI(c,{codex:true,antigravity:true,claude:true}),['codex','antigravity','claude']);
 assert.deepEqual(visibleAI(c,{antigravity:true}),['antigravity']);
 c.aiModes.claude='always';assert.deepEqual(visibleAI(c,{}),['claude']);
});
test('overnight work and lunch end at correct local dates',()=>{
 const c=normalizeConfig({schemaVersion:3,startTime:'22:00',endTime:'06:00',lunchStart:'01:00',lunchEnd:'02:00'});
 const s=schedule(new Date(2026,8,4,1,30),c);assert.equal(s.phase,'lunch');assert.equal(s.end.getHours(),6);assert.equal(s.target.getHours(),2);
 assert.equal(schedule(new Date(2026,8,4,5),c).phase,'work');
 assert.equal(schedule(new Date(2026,8,6,12),c).phase,'off');
 assert.equal(caffeineDeadline(new Date(2026,8,4,5),{...c,caffeineDuration:'workday'}),new Date(2026,8,4,6).getTime());
});
test('countdown advances through start, lunch and home targets',()=>{
 const c=normalizeConfig({schemaVersion:3,startTime:'09:00',endTime:'18:00',lunchStart:'12:00',lunchEnd:'13:00',workDays:[1,2,3,4,5]});
 const before=schedule(new Date(2026,8,7,8),c);assert.equal(before.stage,'start');assert.equal(before.target.getHours(),9);
 const morning=schedule(new Date(2026,8,7,10),c);assert.equal(morning.stage,'lunch');assert.equal(morning.target.getHours(),12);
 const lunch=schedule(new Date(2026,8,7,12,30),c);assert.equal(lunch.stage,'lunch');assert.equal(lunch.target.getHours(),13);
 const afternoon=schedule(new Date(2026,8,7,15),c);assert.equal(afternoon.stage,'home');assert.equal(afternoon.target.getHours(),18);
});
test('Caffeine creates one real blocker, pauses, resumes and releases on expiry',()=>{
 let clock=100000,sequence=0;const live=new Set();const blocker={start:()=>{live.add(++sequence);return sequence;},stop:id=>live.delete(id),isStarted:id=>live.has(id)};
 const cf=new Caffeine(blocker,()=>{},()=>{},()=>clock);
 const c=normalizeConfig({schemaVersion:3,enableKeepAwake:true,caffeineDuration:'30'});
 cf.configure(c);cf.reconcile();assert.equal(live.size,1);assert.equal(cf.status().active,true);
 cf.locked=true;cf.reconcile();assert.equal(live.size,0);
 cf.locked=false;cf.reconcile();assert.equal(live.size,1);
 cf.configure({...c,caffeineMode:'system'});assert.equal(live.size,1);assert.equal(cf.type,'prevent-app-suspension');
 clock+=31*60000;cf.reconcile();assert.equal(cf.status().enabled,false);assert.equal(live.size,0);
 cf.configure({...c,caffeineDuration:'manual'},true);assert.equal(live.size,1);cf.dispose();assert.equal(live.size,0);
});
test('settings bounds and invalid provider modes cannot corrupt layout',()=>{
 const c=normalizeConfig({schemaVersion:3,carouselVersion:1,width:10000,theme:'invalid',aiModes:{codex:'invalid'},quotaRefresh:0});
 assert.equal(c.width,500);assert.equal(c.theme,'system');assert.equal(c.aiModes.codex,'auto');assert.equal(c.quotaRefresh,15);
});
