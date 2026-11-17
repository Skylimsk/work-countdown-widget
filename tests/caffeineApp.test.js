const test=require('node:test'),assert=require('node:assert/strict');
const {normalizeConfig}=require('../src/core/config');
const {CaffeineApp}=require('../src/core/caffeineApp');
function fakeHost(){const h={running:false,starts:0,stops:0,exists:()=>true,isRunning:async()=>h.running,start:()=>{h.running=true;h.starts++;},stop:async()=>{const was=h.running;h.running=false;h.stops++;return was;},stopSync:()=>{h.running=false;}};return h;}
test('opens caffeine at shift start and closes it at shift end',async()=>{
 const c=normalizeConfig({schemaVersion:3,startTime:'09:00',endTime:'18:00',workDays:[1,2,3,4,5]});
 let now=new Date(2026,10,17,8,59).getTime();const host=fakeHost();const app=new CaffeineApp(host,()=>now);
 await app.sync(c);assert.equal(host.running,false);
 now=new Date(2026,10,17,9,0).getTime();await app.sync(c);assert.equal(host.running,true);
 now=new Date(2026,10,17,12,30).getTime();await app.sync(c);assert.equal(host.starts,1,'lunch keeps it open');
 now=new Date(2026,10,17,18,0).getTime();await app.sync(c);assert.equal(host.running,false);
});
test('does not reopen if closed by hand mid-shift, and respects the setting',async()=>{
 const c=normalizeConfig({schemaVersion:3});let now=new Date(2026,10,17,10).getTime();const host=fakeHost();const app=new CaffeineApp(host,()=>now);
 await app.sync(c);host.running=false;await app.sync(c);assert.equal(host.starts,1);
 await app.sync({...c,runCaffeineApp:false});assert.equal(host.running,false);
 const off=new CaffeineApp(fakeHost(),()=>now);await off.sync({...c,runCaffeineApp:false});assert.equal(off.host.starts,0);
});
test('does not start a second copy when one is already running',async()=>{
 const host=fakeHost();host.running=true;const app=new CaffeineApp(host,()=>new Date(2026,10,17,10).getTime());
 await app.sync(normalizeConfig({schemaVersion:3}));assert.equal(host.starts,0);
});
