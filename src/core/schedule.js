function at(date, time) { const d=new Date(date); const [h,m]=time.split(':').map(Number); d.setHours(h,m,0,0); return d; }
function shiftFor(date,c) { const start=at(date,c.startTime),end=at(date,c.endTime); if(end<=start)end.setDate(end.getDate()+1); return {start,end}; }
function schedule(now,c) {
  const today=shiftFor(now,c); const yesterday=new Date(now); yesterday.setDate(yesterday.getDate()-1);
  const previous=shiftFor(yesterday,c);
  let shift=(now<previous.end && c.workDays.includes(previous.start.getDay()))?previous:today;
  const workingDay=c.workDays.includes(shift.start.getDay());
  if(workingDay && now>=shift.start && now<shift.end){
    let lunchStart=at(shift.start,c.lunchStart),lunchEnd=at(shift.start,c.lunchEnd);
    if(lunchStart<shift.start)lunchStart.setDate(lunchStart.getDate()+1);
    if(lunchEnd<=lunchStart)lunchEnd.setDate(lunchEnd.getDate()+1);
    const validLunch=c.enableLunch && lunchStart>=shift.start && lunchEnd<=shift.end;
    const lunch=validLunch && now>=lunchStart && now<lunchEnd;
    const beforeLunch=validLunch && now<lunchStart;
    return {...shift,lunchStart,lunchEnd,phase:lunch?'lunch':'work',stage:beforeLunch?'lunch':lunch?'lunch':'home',target:beforeLunch?lunchStart:lunch?lunchEnd:shift.end,progress:Math.max(0,Math.min(100,100*(now-shift.start)/(shift.end-shift.start)))};
  }
  let next=null;
  for(let i=0;i<=7;i++){const d=new Date(now);d.setDate(d.getDate()+i);const candidate=shiftFor(d,c);if(c.workDays.includes(d.getDay())&&candidate.start>now){next=candidate.start;break;}}
  return {...shift,phase:workingDay&&now>=shift.end?'done':'off',stage:'start',target:next,progress:workingDay&&now>=shift.end?100:0};
}
function caffeineDeadline(now,c) {
  if(c.caffeineDuration==='manual')return null;
  if(c.caffeineDuration!=='workday')return now.getTime()+Number(c.caffeineDuration)*60000;
  const s=schedule(now,c);
  return ['work','lunch'].includes(s.phase)?s.end.getTime():now.getTime();
}
module.exports={schedule,caffeineDeadline};
