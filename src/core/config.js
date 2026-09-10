const defaults = {
  schemaVersion: 3, theme: 'system', width: 260, layout: 'standard', aiLayout: 'carousel', carouselVersion: 1, carouselSeconds: 6,
  alwaysOnTop: true, autoStart: true, closeToTray: true, opacity: 1, fontScale: 1,
  startTime: '09:00', endTime: '18:00', enableLunch: true, lunchStart: '12:00', lunchEnd: '13:00',
  workDays: [1,2,3,4,5], enableOt: true, salaryType: 'hourly', hourlyRate: 15,
  monthlySalary: 3000, workDaysPerMonth: 22, workHoursPerDay: 8, otMultiplier: 1.5, currency: 'MYR',
  showQuota: true, showWeekly: true, aiModes: { codex: 'auto', antigravity: 'auto', claude: 'auto' },
  aiOrder: ['codex','antigravity','claude'], collapsedAI: [], quotaRefresh: 60,
  enableKeepAwake: false, caffeineMode: 'display', caffeineDuration: 'workday',
  mouseJiggle: false, jiggleMinutes: 3, pauseOnLock: true, pauseOnBattery: false,
  showSpotify: true, artistThemes: true, fanEffects: true, reduceMotion: false,
  restMinutes: 30, enableRest: true, enableTelegramBot: false, telegramCloudMode: false,
  credentials: {}, x: null, y: null
};
function normalizeConfig(input = {}) {
  const c = { ...defaults, ...input, aiModes: { ...defaults.aiModes, ...input.aiModes }, credentials: {...input.credentials} };
  if (input.schemaVersion !== 3) { c.theme = 'system'; c.width = 260; c.mouseJiggle = false; }
  if (input.carouselVersion !== 1) { c.width = 260; c.layout = 'standard'; }
  c.carouselVersion = 1;
  c.schemaVersion = 3;
  const choice = (key, values) => { if (!values.includes(c[key])) c[key] = defaults[key]; };
  choice('theme', ['system','dark','light']); choice('layout', ['standard','compact','music']);
  choice('aiLayout',['carousel']); choice('caffeineMode',['system','display']);
  choice('caffeineDuration',['manual','30','60','120','workday']); choice('salaryType',['hourly','monthly']);
  choice('currency',['MYR','USD','SGD','TWD','CNY']);
  for (const key of ['startTime','endTime','lunchStart','lunchEnd']) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(c[key])) c[key] = defaults[key];
  }
  for (const [key,min,max] of [['width',230,500],['carouselSeconds',3,30],['opacity',0.65,1],['fontScale',0.9,1.3],['quotaRefresh',15,300],['jiggleMinutes',1,30],['restMinutes',5,180],['hourlyRate',0,100000],['monthlySalary',0,1000000],['workDaysPerMonth',1,31],['workHoursPerDay',1,24],['otMultiplier',1,10]]) {
    c[key] = Number.isFinite(Number(c[key])) ? Math.min(max,Math.max(min,Number(c[key]))) : defaults[key];
  }
  for (const [key,value] of Object.entries(defaults)) if (typeof value === 'boolean') c[key] = typeof c[key] === 'boolean' ? c[key] : value;
  c.workDays = Array.isArray(c.workDays) ? [...new Set(c.workDays.filter(v=>Number.isInteger(v)&&v>=0&&v<=6))] : defaults.workDays;
  for (const id of Object.keys(defaults.aiModes)) if (!['auto','always','hidden'].includes(c.aiModes[id])) c.aiModes[id]='auto';
  c.aiOrder = [...new Set([...(Array.isArray(c.aiOrder)?c.aiOrder:[]), ...defaults.aiOrder])].filter(id=>defaults.aiOrder.includes(id));
  c.collapsedAI = (Array.isArray(c.collapsedAI)?c.collapsedAI:[]).filter(id=>defaults.aiOrder.includes(id));
  c.x = Number.isFinite(c.x) ? c.x : null; c.y = Number.isFinite(c.y) ? c.y : null;
  return c;
}
module.exports={defaults,normalizeConfig};
