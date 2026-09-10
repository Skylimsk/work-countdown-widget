// Spotify controls and original TWICE effects, retained from v2.
(()=>{
const { ipcRenderer } = require('electron');
const {parenthesizedMembers}=require('./core/twice-members');
let memberRotationKey='',memberRotationStarted=0;
let musicConfig=ipcRenderer.sendSync('get-config'), lastMusicData=null;
const motionAllowed=()=>musicConfig.fanEffects&&!musicConfig.reduceMotion&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
const spotifyBar          = document.getElementById('spotifyBar');
const spotifyTrack        = document.getElementById('spotifyTrack');
const spotifyArtist       = document.getElementById('spotifyArtist');
const spotifyRollcallName = document.getElementById('spotifyRollcallName');
const fireworksLayer      = document.getElementById('fireworksLayer');
const confettiLayer       = document.getElementById('confettiLayer');
const christmasLayer      = document.getElementById('christmasLayer');
const btnSpotifyPlay      = document.getElementById('btnSpotifyPlay');
const btnSpotifyNext      = document.getElementById('btnSpotifyNext');
const btnSpotifyPrev      = document.getElementById('btnSpotifyPrev');
const spotifyProgressFill = document.getElementById('spotifyProgressFill');
const spotifyProgressBg   = document.getElementById('spotifyProgressBg');
const spotifyTimeText     = document.getElementById('spotifyTimeText');
const spotifyNextRow      = document.getElementById('spotifyNextRow');
const spotifyNextText     = document.getElementById('spotifyNextText');
const spotifyConnectRow   = document.getElementById('spotifyConnectRow');
const btnSpotifyConnect   = document.getElementById('btnSpotifyConnect');
const btnSpotifyMore      = document.getElementById('btnSpotifyMore');
const btnSpotifyRepeat = document.getElementById('btnSpotifyRepeat');
const btnSpotifyShuffle = document.getElementById('btnSpotifyShuffle');
const btnSpotifyQueue = document.getElementById('btnSpotifyQueue');
let spotifyTrackId='';
const {musicIcon}=require('./music-icons');
btnSpotifyPrev.innerHTML=musicIcon('previous');btnSpotifyNext.innerHTML=musicIcon('next');btnSpotifyMore.innerHTML=musicIcon('more');btnSpotifyRepeat.innerHTML=musicIcon('repeat');btnSpotifyShuffle.innerHTML=musicIcon('shuffle');btnSpotifyQueue.innerHTML=musicIcon('queue');
document.getElementById('playlistButton').onclick=()=>ipcRenderer.send('open-spotify-playlists');

let spotifyConnected = false;

// Optimistic state — Spotify's WinRT status is unreliable, track ourselves
let spotifyIsPlaying  = false;  // assume paused until we know
let spotifyLastTrack  = null;   // detect track changes

// Progress tick state — updates once per second, not smooth/interpolated
let currentPosSec = 0;
let currentDurSec = 0;
let lastSyncTime  = Date.now();
let progressTickTimer = null;

function formatSecs(sec) {
  if (!sec || isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function setPlayIcon(playing) {
  btnSpotifyPlay.innerHTML=musicIcon(playing?'pause':'play');
  btnSpotifyPlay.title=playing?'Pause':'Play';btnSpotifyPlay.setAttribute('aria-label',btnSpotifyPlay.title);
}

// Artist fan colors (應援色) — override the day-of-week accent for known artists
const ARTIST_THEME_CLASSES = [
  'artist-twice', 'artist-ag5', 'artist-taylorswift', 'artist-mayday', 'artist-weibird',
  // TWICE members
  'artist-nayeon', 'artist-jeongyeon', 'artist-momo', 'artist-sana',
  'artist-jihyo', 'artist-mina', 'artist-dahyun', 'artist-chaeyoung', 'artist-tzuyu',
  // TWICE sub-units
  'artist-misamo', 'artist-taste',
  // Candy Bong glow animation + Feel Special rollcall
  'candy-bong-active', 'feel-special-rollcall'
];

// TWICE member detection — checks artist name AND track name
function detectTwiceMember(artist, track) {
  const a = (artist || '').toLowerCase();
  const t = (track || '').toLowerCase();
  const combined = a + ' ' + t;

  // Sub-units first (higher priority than solo matches)
  if (combined.includes('misamo')) return 'artist-misamo';
  if (combined.includes('taste') && (a.includes('tzuyu') || a.includes('sana') || t.includes('tzuyu') || t.includes('sana'))) return 'artist-taste';

  // Solo detection: artist name takes priority, fallback to track name
  // Use strict word-boundary-style checks to avoid false matches

  // Nayeon 娜琏 (also romanized Na-yeon)
  if (a === 'nayeon' || a === '나연' || a.includes('nayeon') || t.includes('nayeon')) return 'artist-nayeon';

  // Jeongyeon 定延
  if (a === 'jeongyeon' || a === '정연' || a.includes('jeongyeon') || t.includes('jeongyeon')) return 'artist-jeongyeon';

  // Momo — careful not to match 'moment' etc in track names
  if (a === 'momo' || a === '모모' || a.includes('momo') || t === 'momo') return 'artist-momo';

  // Sana
  if (a === 'sana' || a === '사나' || a.includes('sana') || t === 'sana') return 'artist-sana';

  // Jihyo 志效
  if (a === 'jihyo' || a === '지효' || a.includes('jihyo') || t.includes('jihyo')) return 'artist-jihyo';

  // Mina — careful with common English word 'mina'
  if (a === 'mina' || a === '미나' || a.includes('mina') || t === 'mina') return 'artist-mina';

  // Dahyun 多贤
  if (a === 'dahyun' || a === '다현' || a.includes('dahyun') || t.includes('dahyun')) return 'artist-dahyun';

  // Chaeyoung 彩瑛 (also Chae)
  if (a === 'chaeyoung' || a === '채영' || a.includes('chaeyoung') || t.includes('chaeyoung')) return 'artist-chaeyoung';

  // Tzuyu 子瑜
  if (a === 'tzuyu' || a === '쯔위' || a.includes('tzuyu') || t.includes('tzuyu')) return 'artist-tzuyu';

  return null;
}

function applyArtistTheme(artist, track) {
  const original = artist || '';
  const lower = original.toLowerCase();
  spotifyBar.classList.remove(...ARTIST_THEME_CLASSES);

  // 1. Check for TWICE member / sub-unit first
  const listed=parenthesizedMembers((track||'')+' '+(artist||''));
  const key=(track||'')+'|'+(artist||'');
  if(key!==memberRotationKey){memberRotationKey=key;memberRotationStarted=Date.now();}
  const selected=listed.length?Math.floor((Date.now()-memberRotationStarted)/3000)%listed.length:0;
  if(listed.length){
    const member=listed[selected];
    spotifyArtist.textContent=member.name+(listed.length>1?' · '+(selected+1)+' / '+listed.length:'');
    spotifyBar.classList.add('artist-'+member.id,'candy-bong-active');
    return;
  }
  const memberClass = detectTwiceMember(artist, track);
  if (memberClass) {
    spotifyBar.classList.add(memberClass);
    spotifyBar.classList.add('candy-bong-active'); // 🕯️ Candy Bong breathing glow!
    return;
  }

  // 2. TWICE group (only if artist explicitly says TWICE)
  if (lower.includes('twice')) {
    spotifyBar.classList.add('artist-twice');
    spotifyBar.classList.add('candy-bong-active'); // 🕯️ Candy Bong breathing glow!
    return;
  }

  // 3. Other artists — no candy bong
  spotifyBar.classList.remove('candy-bong-active');
  if (original.includes('告五人') || /\baccuse\s*five\b/i.test(original)) {
    spotifyBar.classList.add('artist-ag5');
  } else if (lower.includes('taylor swift')) {
    spotifyBar.classList.add('artist-taylorswift');
  } else if (original.includes('五月天') || lower.includes('mayday')) {
    spotifyBar.classList.add('artist-mayday');
  } else if (original.includes('韦礼安') || original.includes('韋禮安') || lower.includes('weibird')) {
    spotifyBar.classList.add('artist-weibird');
  }
}

// ── Feel Special Outro Name Roll Call (3:06 ~ 3:16, 10s total) ───────────
// Korean → Momo-chan! Sana-chan! Mina-chan! (direct, no jang beats) → Korean
// Segments are contiguous (each end === next start) so there's never a gap
// where the wrong color (or a color-less flash) could show. Reverts to
// normal TWICE candy bong the instant position >= 196 (3:16).
const FEEL_SPECIAL_ROLLCALL = [
  { member: 'Im Nayeon',      start: 186, end: 187, rgb: '162, 218, 226' },
  { member: 'Yoo Jeongyeon',  start: 187, end: 188, rgb: '200, 223, 82'  },
  { member: 'Momo Chan',      start: 188, end: 189, rgb: '242, 122, 143' }, // Momo-chan 🩷
  { member: 'Sana Chan',      start: 189, end: 190, rgb: '145, 93, 163'  }, // Sana-chan 💜
  { member: 'Park Jihyo',     start: 190, end: 191, rgb: '255, 158, 27'  },
  { member: 'Mina Chan',      start: 191, end: 192, rgb: '78, 192, 168'  }, // Mina-chan 🩵
  { member: 'Kim Dahyun',     start: 192, end: 193, rgb: '255, 255, 255' },
  { member: 'Son Chaeyoung',  start: 193, end: 194, rgb: '226, 35, 26'   },
  { member: 'Chou Tzuyu',     start: 194, end: 196, rgb: '100, 120, 240' },
];

const chantStage=document.getElementById('chantStage');
const chantCount=document.getElementById('chantCount');
const chantNext=document.getElementById('chantNext');
const chantDots=document.getElementById('chantDots');
let chantIndex=-1;
const chantMarkers=FEEL_SPECIAL_ROLLCALL.map(member=>{const dot=document.createElement('i');dot.style.setProperty('--member-rgb',member.rgb);dot.title=member.member;chantDots.append(dot);return dot;});
function checkFeelSpecialRollcall(trackName, artistName, positionSec) {
 const eligible=(trackName||'').toLowerCase().includes('feel special')&&(artistName||'').toLowerCase().includes('twice');
 const index=eligible?FEEL_SPECIAL_ROLLCALL.findIndex(s=>positionSec>=s.start&&positionSec<s.end):-1;
 if(index<0){
  if(chantIndex>=0){spotifyBar.classList.remove('feel-special-rollcall');spotifyBar.style.removeProperty('--glow-rgb');if(eligible)spotifyBar.classList.add('candy-bong-active');}
  chantIndex=-1;chantStage.hidden=true;spotifyRollcallName.classList.remove('active');return false;
 }
 const seg=FEEL_SPECIAL_ROLLCALL[index];
 spotifyBar.classList.remove('candy-bong-active');spotifyBar.classList.add('feel-special-rollcall');
 spotifyBar.style.setProperty('--glow-rgb',seg.rgb);chantStage.hidden=false;
 if(index!==chantIndex){
  chantIndex=index;spotifyRollcallName.textContent=seg.member;
  chantCount.textContent=String(index+1).padStart(2,'0')+' / 09';
  const next=FEEL_SPECIAL_ROLLCALL[index+1];chantNext.textContent=next?'Next: '+next.member:'All nine. One TWICE.';
  chantMarkers.forEach((dot,i)=>{dot.className=i===index?'current':i<index?'done':'';});
  spotifyRollcallName.classList.remove('active');void spotifyRollcallName.offsetWidth;spotifyRollcallName.classList.add('active');
 }
 return true;
}

// ── One Spark Fireworks (2:34 ~ 3:03) ────────────────────────────────────
// Layers a burst of sparks on top of the normal TWICE candy bong glow —
// no member colors here, just fireworks for the song's climax.
const ONE_SPARK_START = 154; // 2:34
const ONE_SPARK_END   = 183; // 3:03
const FIREWORK_COLORS = ['#FFD966', '#FF6FA5', '#7FE7FF', '#C6FF6B', '#FFFFFF', '#B98CFF'];
let fireworksSpawnTimer = null;

function spawnFireworkBurst() {
  const originX = 15 + Math.random() * 70; // % across the bar
  const originY = 20 + Math.random() * 55;
  const count = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < count; i++) {
    const spark = document.createElement('span');
    spark.className = 'spark';
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 22;
    spark.style.setProperty('--x', originX + '%');
    spark.style.setProperty('--y', originY + '%');
    spark.style.setProperty('--dx', (Math.cos(angle) * dist) + 'px');
    spark.style.setProperty('--dy', (Math.sin(angle) * dist) + 'px');
    spark.style.setProperty('--spark-color', FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);
    spark.style.animationDelay = (Math.random() * 0.08) + 's';
    fireworksLayer.appendChild(spark);
    spark.addEventListener('animationend', () => spark.remove());
    setTimeout(() => spark.remove(), 1200); // fallback in case animationend is missed
  }
}

function stopFireworks() {
  if (fireworksSpawnTimer) {
    clearInterval(fireworksSpawnTimer);
    fireworksSpawnTimer = null;
  }
  spotifyBar.classList.remove('fireworks-active');
  fireworksLayer.innerHTML = '';
}

function checkOneSparkFireworks(trackName, artistName, positionSec) {
  const t = (trackName || '').toLowerCase();
  const a = (artistName || '').toLowerCase();
  const inWindow = t.includes('one spark') && a.includes('twice') &&
    positionSec >= ONE_SPARK_START && positionSec < ONE_SPARK_END;

  if (inWindow) {
    if (!fireworksSpawnTimer) {
      spotifyBar.classList.add('fireworks-active');
      spawnFireworkBurst();
      fireworksSpawnTimer = setInterval(spawnFireworkBurst, 380);
    }
  } else if (fireworksSpawnTimer) {
    stopFireworks();
  }
}

// ── MISAMO Confetti (1:30~1:41, 2:10~2:19) ───────────────────────────────
// Paper pieces fall through the bar on top of the normal MISAMO glow.
const CONFETTI_WINDOWS = [
  { start: 90,  end: 101 }, // 1:30 - 1:41
  { start: 130, end: 139 }, // 2:10 - 2:19
];
const CONFETTI_COLORS = ['#4EC0A8', '#915DA3', '#F27A8F', '#FFFFFF', '#FFD966'];
let confettiSpawnTimer = null;

function spawnConfettiPiece() {
  const piece = document.createElement('span');
  piece.className = 'confetti-piece';
  const rotStart = Math.random() * 360;
  const rotEnd = rotStart + 200 + Math.random() * 240;
  piece.style.setProperty('--cx', (Math.random() * 100) + '%');
  piece.style.setProperty('--confetti-color', CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]);
  piece.style.setProperty('--rot-start', rotStart + 'deg');
  piece.style.setProperty('--rot-end', rotEnd + 'deg');
  piece.style.setProperty('--drift', ((Math.random() * 40) - 20) + 'px');
  piece.style.setProperty('--fall-dur', (0.9 + Math.random() * 0.5) + 's');
  confettiLayer.appendChild(piece);
  piece.addEventListener('animationend', () => piece.remove());
  setTimeout(() => piece.remove(), 1700); // fallback in case animationend is missed
}

function spawnConfettiBurst() {
  const count = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) spawnConfettiPiece();
}

function stopConfetti() {
  if (confettiSpawnTimer) {
    clearInterval(confettiSpawnTimer);
    confettiSpawnTimer = null;
  }
  confettiLayer.innerHTML = '';
}

function checkMisamoConfetti(trackName, artistName, positionSec) {
  const t = (trackName || '').toLowerCase();
  const a = (artistName || '').toLowerCase();
  const inWindow = t.includes('confetti') && a.includes('misamo') &&
    CONFETTI_WINDOWS.some(w => positionSec >= w.start && positionSec < w.end);

  if (inWindow) {
    if (!confettiSpawnTimer) {
      spawnConfettiBurst();
      confettiSpawnTimer = setInterval(spawnConfettiBurst, 220);
    }
  } else if (confettiSpawnTimer) {
    stopConfetti();
  }
}

// ── Merry & Happy Christmas Atmosphere (whole song) ──────────────────────
// Falling snow + a twinkling red/green/gold light string, layered on top of
// the normal TWICE glow for the entire track (not a specific timestamp).
// Elements are built once and loop via CSS instead of being re-spawned on
// every tick, since this can run for the whole song length.
const TWINKLE_COLORS = ['#ff4d4d', '#3ecf6b', '#ffd54a'];
let christmasActive = false;

function startChristmasEffect() {
  if (christmasActive) return;
  christmasActive = true;

  for (let i = 0; i < 10; i++) {
    const flake = document.createElement('span');
    flake.className = 'snowflake';
    flake.style.setProperty('--sx', (Math.random() * 100) + '%');
    flake.style.setProperty('--snow-size', (2 + Math.random() * 2.5) + 'px');
    flake.style.setProperty('--snow-dur', (3 + Math.random() * 2.5) + 's');
    flake.style.setProperty('--snow-delay', (Math.random() * 4) + 's');
    flake.style.setProperty('--snow-drift', ((Math.random() * 30) - 15) + 'px');
    christmasLayer.appendChild(flake);
  }

  for (let i = 0; i < 8; i++) {
    const light = document.createElement('span');
    light.className = 'twinkle-light';
    light.style.setProperty('--tx-x', (4 + (i * 92 / 7)) + '%');
    light.style.setProperty('--tx-y', (Math.random() * 12) + '%');
    light.style.setProperty('--twinkle-color', TWINKLE_COLORS[i % TWINKLE_COLORS.length]);
    light.style.setProperty('--twinkle-dur', (1 + Math.random() * 1) + 's');
    light.style.setProperty('--twinkle-delay', (Math.random() * 1.5) + 's');
    christmasLayer.appendChild(light);
  }
}

function stopChristmasEffect() {
  if (!christmasActive) return;
  christmasActive = false;
  christmasLayer.innerHTML = '';
}

function checkMerryHappyChristmas(trackName, artistName) {
  const t = (trackName || '').toLowerCase();
  const a = (artistName || '').toLowerCase();
  const isMerryHappy = t.includes('merry') && t.includes('happy') && a.includes('twice');

  if (isMerryHappy) {
    startChristmasEffect();
  } else {
    stopChristmasEffect();
  }
}

// ── One In A Million / Be As One — 9 member colors + 2 main color cycle ──
// Border/glow cycles through every member's color plus TWICE's two group
// colors (Apricot, Neon Magenta), looping for the whole song.
const MEMBER_MAIN_COLOR_CYCLE = [
  '162, 218, 226', // Nayeon
  '200, 223, 82',  // Jeongyeon
  '242, 122, 143', // Momo
  '145, 93, 163',  // Sana
  '255, 158, 27',  // Jihyo
  '78, 192, 168',  // Mina
  '255, 255, 255', // Dahyun
  '226, 35, 26',   // Chaeyoung
  '100, 120, 240', // Tzuyu
  '252, 200, 155', // Apricot (TWICE main color)
  '255, 95, 162', // Neon Magenta (TWICE main color)
];
let colorCycleTimer = null;
let colorCycleIndex = 0;

function startColorCycle() {
  if (colorCycleTimer) return;
  colorCycleIndex = 0;
  spotifyBar.style.setProperty('--glow-rgb', MEMBER_MAIN_COLOR_CYCLE[0]);
  colorCycleTimer = setInterval(() => {
    colorCycleIndex = (colorCycleIndex + 1) % MEMBER_MAIN_COLOR_CYCLE.length;
    spotifyBar.style.setProperty('--glow-rgb', MEMBER_MAIN_COLOR_CYCLE[colorCycleIndex]);
  }, 900);
}

function stopColorCycle() {
  if (colorCycleTimer) {
    clearInterval(colorCycleTimer);
    colorCycleTimer = null;
    spotifyBar.style.removeProperty('--glow-rgb');
  }
}

function checkMemberColorCycleSongs(trackName, artistName) {
  const t = (trackName || '').toLowerCase();
  const a = (artistName || '').toLowerCase();
  const isCycleSong = a.includes('twice') &&
    (t.includes('one in a million') || t.includes('be as one'));

  if (isCycleSong) {
    startColorCycle();
  } else {
    stopColorCycle();
  }
}

function tickSmoothProgress() {
  if (currentDurSec > 0) {
    const now = Date.now();
    const dt = spotifyIsPlaying ? (now - lastSyncTime) / 1000 : 0;
    const estPos = Math.min(currentDurSec, Math.max(0, currentPosSec + dt));
    const pct = Math.min(100, Math.max(0, (estPos / currentDurSec) * 100));

    spotifyProgressFill.style.width = `${pct}%`;
    spotifyTimeText.textContent = `${formatSecs(estPos)} / ${formatSecs(currentDurSec)}`;

    // 🎀 Feel Special outro name roll call — light up each member's color!
    if(motionAllowed() && spotifyIsPlaying){checkFeelSpecialRollcall(spotifyTrack.textContent, spotifyArtist.textContent, estPos);checkOneSparkFireworks(spotifyTrack.textContent, spotifyArtist.textContent, estPos);checkMisamoConfetti(spotifyTrack.textContent, spotifyArtist.textContent, estPos);}
  } else {
    spotifyProgressFill.style.width = '0%';
    spotifyTimeText.textContent = '0:00 / 0:00';
  }
}

function updateSpotifyUI(data) {
  lastMusicData=data;
  if(!musicConfig.showSpotify) data=null;
  if (!data || !data.running || data.paused !== false || !data.track) {
    spotifyIsPlaying=false;checkFeelSpecialRollcall('', '', 0);
    spotifyBar.style.display = 'none';
    if (progressTickTimer) clearInterval(progressTickTimer);
    progressTickTimer = null;
    stopFireworks();
    stopConfetti();
    stopChristmasEffect();
    stopColorCycle();
    return;
  }
  spotifyBar.style.display = 'flex';

  // Synchronize real play/pause state from Windows Media Session
  spotifyIsPlaying = !data.paused;

  // Show track name always and update title tooltips for full song visibility
  if (data.track) {
    const fullText = `${data.track}${data.artist ? ' - ' + data.artist : ''}`;
    spotifyTrack.textContent = data.track;
    spotifyArtist.textContent = data.artist || '';
    spotifyBar.title = fullText;
    spotifyTrack.title = data.track;
    spotifyArtist.title = data.artist || '';
    spotifyLastTrack = data.track + '|' + (data.artist || '');
    if(musicConfig.artistThemes) applyArtistTheme(data.artist, data.track); else applyArtistTheme('', '');
    if(motionAllowed()&&spotifyIsPlaying) checkMerryHappyChristmas(data.track, data.artist); else stopChristmasEffect();
    if(motionAllowed()&&spotifyIsPlaying) checkMemberColorCycleSongs(data.track, data.artist); else stopColorCycle();
  } else {
    spotifyTrack.textContent = 'Spotify';
    spotifyArtist.textContent = '';
    spotifyBar.title = 'Spotify';
    spotifyTrack.title = '';
    spotifyArtist.title = '';
    applyArtistTheme('', '');
    checkMerryHappyChristmas('', '');
    checkMemberColorCycleSongs('', '');
  }

  if(data.track+'|'+(data.artist||'')!==window.lastTrackIdentity){currentPosSec=data.position_sec||0;lastSyncTime=Date.now();window.lastTrackIdentity=data.track+'|'+(data.artist||'');}
  // Smooth position reconciliation
  const incomingPos = Math.max(0, data.position_sec || 0);
  const incomingDur = Math.max(0, data.duration_sec || 0);
  const now = Date.now();

  currentDurSec = incomingDur;

  if (!spotifyIsPlaying) {
    // PAUSED: Freeze position completely, stop the per-second tick loop!
    currentPosSec = incomingPos;
    lastSyncTime = now;
    if (progressTickTimer) {
      clearInterval(progressTickTimer);
      progressTickTimer = null;
    }
    // Render static paused state cleanly once
    if (currentDurSec > 0) {
      const pct = Math.min(100, Math.max(0, (currentPosSec / currentDurSec) * 100));
      spotifyProgressFill.style.width = `${pct}%`;
      spotifyTimeText.textContent = `${formatSecs(currentPosSec)} / ${formatSecs(currentDurSec)}`;
    } else {
      spotifyProgressFill.style.width = '0%';
      spotifyTimeText.textContent = '0:00 / 0:00';
    }
  } else {
    // PLAYING: Reconcile position if difference > 2.5s
    const currentEst = currentPosSec + (now - lastSyncTime) / 1000;
    if (Math.abs(incomingPos - currentEst) > 2.5) {
      currentPosSec = incomingPos;
      lastSyncTime = now;
    }
    if (!progressTickTimer) {
      tickSmoothProgress();
      // 200ms resolution — 1000ms was too coarse for the 1s-wide rollcall
      // windows and would occasionally skip a member's color entirely.
      progressTickTimer = setInterval(tickSmoothProgress, 200);
    }
  }

  if(spotifyIsPlaying)tickSmoothProgress();
  if(!spotifyIsPlaying||!motionAllowed()){stopFireworks();stopConfetti();stopChristmasEffect();stopColorCycle();checkFeelSpecialRollcall('', '', 0);}
  if(!musicConfig.artistThemes) spotifyBar.classList.remove(...ARTIST_THEME_CLASSES);
  setPlayIcon(spotifyIsPlaying);
  spotifyTrackId=typeof data.trackId==='string'?data.trackId:'';btnSpotifyQueue.classList.toggle('hidden',!spotifyConnected||!spotifyTrackId);
  if(typeof data.shuffleState==='boolean')updateShuffleUI(data.shuffleState);
  if (data.repeatState) {
    updateRepeatUI(data.repeatState);
  }
}

let spotifyShuffleState=false;
function updateShuffleUI(enabled){
 spotifyShuffleState=!!enabled;btnSpotifyShuffle.classList.toggle('active',spotifyShuffleState);
 btnSpotifyShuffle.title=spotifyShuffleState?'Shuffle on':'Shuffle off';
 btnSpotifyShuffle.setAttribute('aria-label',btnSpotifyShuffle.title);btnSpotifyShuffle.setAttribute('aria-pressed',String(spotifyShuffleState));
}

let spotifyRepeatState = 'off';
function updateRepeatUI(state) {
  spotifyRepeatState = state || 'off';
  if (!spotifyConnected) {
    btnSpotifyRepeat.classList.add('hidden');
    return;
  }
  btnSpotifyRepeat.classList.remove('hidden');

  if (spotifyRepeatState === 'track') {
    btnSpotifyRepeat.innerHTML=musicIcon('repeatOne');
    btnSpotifyRepeat.classList.add('active');
    btnSpotifyRepeat.title = 'Repeat Mode: One';
  } else if (spotifyRepeatState === 'context') {
    btnSpotifyRepeat.innerHTML=musicIcon('repeat');
    btnSpotifyRepeat.classList.add('active');
    btnSpotifyRepeat.title = 'Repeat Mode: All';
  } else {
    btnSpotifyRepeat.innerHTML=musicIcon('repeat');
    btnSpotifyRepeat.classList.remove('active');
    btnSpotifyRepeat.title = 'Repeat Mode: Off';
  }
  btnSpotifyRepeat.setAttribute('aria-label',btnSpotifyRepeat.title);
  btnSpotifyRepeat.setAttribute('aria-pressed',String(spotifyRepeatState!=='off'));
}

ipcRenderer.on('spotify-update', (event, data) => {
  updateSpotifyUI(data);
});

// ─── Up Next (requires connecting a Spotify account via Web API) ───
function showSpotifyNext(next) {
  if (next && next.track) {
    spotifyNextText.textContent = next.artist ? `${next.track} — ${next.artist}` : next.track;
    spotifyNextRow.classList.remove('hidden');
    spotifyConnectRow.classList.add('hidden');
  } else {
    spotifyNextRow.classList.add('hidden');
  }
}

function showSpotifyConnectPrompt(show) {
  spotifyConnectRow.classList.toggle('hidden', !show);
  if (show) spotifyNextRow.classList.add('hidden');
  spotifyConnected = !show;

  btnSpotifyRepeat.classList.toggle('hidden', show);
  btnSpotifyShuffle.classList.toggle('hidden', show);
  btnSpotifyQueue.classList.toggle('hidden',show||!spotifyTrackId);

}

ipcRenderer.on('spotify-next-track', (event, next) => {
  showSpotifyNext(next);
});

ipcRenderer.invoke('spotify-auth-status').then((status) => {
  showSpotifyConnectPrompt(!status.connected);
}).catch(() => {});

btnSpotifyConnect.addEventListener('click', () => {
  btnSpotifyConnect.textContent = 'Waiting for Spotify login…';
  btnSpotifyConnect.disabled = true;
  ipcRenderer.invoke('spotify-connect').then((result) => {
    btnSpotifyConnect.disabled = false;
    if (result && result.success) {
      showSpotifyConnectPrompt(false);
    } else {
      btnSpotifyConnect.textContent = 'Connect failed — tap to retry';
    }
  }).catch(() => {
    btnSpotifyConnect.disabled = false;
    btnSpotifyConnect.textContent = 'Connect failed — tap to retry';
  });
});

// ─── Seek — click anywhere on the progress bar to jump there ───
spotifyProgressBg.addEventListener('click', (e) => {
  if (!spotifyConnected || currentDurSec <= 0) return;
  const rect = spotifyProgressBg.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  const seekSec = ratio * currentDurSec;

  // Optimistic UI: jump immediately instead of waiting for the next poll
  currentPosSec = seekSec;
  lastSyncTime = Date.now();
  tickSmoothProgress();

  ipcRenderer.send('spotify-seek', Math.round(seekSec * 1000));
});

// Extra controls live in the independent music window.
btnSpotifyMore.onclick=()=>ipcRenderer.send('open-spotify-playlists');

btnSpotifyPlay.addEventListener('click', () => {
  spotifyIsPlaying = !spotifyIsPlaying;
  lastSyncTime = Date.now();
  setPlayIcon(spotifyIsPlaying);
  ipcRenderer.send('spotify-play-pause');
});

btnSpotifyNext.addEventListener('click', () => {
  ipcRenderer.send('spotify-next');
  spotifyIsPlaying = true;
  lastSyncTime = Date.now();
  setPlayIcon(true);
});

btnSpotifyPrev.addEventListener('click', () => {
  ipcRenderer.send('spotify-prev');
  spotifyIsPlaying = true;
  lastSyncTime = Date.now();
  setPlayIcon(true);
});

btnSpotifyQueue.addEventListener('click',async()=>{
 if(!spotifyConnected||!spotifyTrackId)return;btnSpotifyQueue.disabled=true;
 try{const r=await ipcRenderer.invoke('spotify-add-track-queue',{id:spotifyTrackId});btnSpotifyQueue.classList.toggle('queued',!!r?.ok);btnSpotifyQueue.title=r?.ok?'Added to queue':r?.error||'Could not add to queue';}
 catch{btnSpotifyQueue.title='Could not add to queue';}finally{btnSpotifyQueue.disabled=false;setTimeout(()=>{btnSpotifyQueue.classList.remove('queued');btnSpotifyQueue.title='Add current song to queue';},1800);}
});

btnSpotifyShuffle.addEventListener('click',()=>{
 if(!spotifyConnected)return;updateShuffleUI(!spotifyShuffleState);ipcRenderer.send('spotify-shuffle',spotifyShuffleState);
});

btnSpotifyRepeat.addEventListener('click', () => {
  if (!spotifyConnected) return;
  let nextState = 'off';
  if (spotifyRepeatState === 'off') nextState = 'context';
  else if (spotifyRepeatState === 'context') nextState = 'track';
  else nextState = 'off';

  updateRepeatUI(nextState);
  ipcRenderer.send('spotify-repeat', nextState);
});


window.addEventListener('music-settings',e=>{musicConfig=e.detail;updateSpotifyUI(lastMusicData);});
ipcRenderer.on('spotify-auth-changed',(_,s)=>showSpotifyConnectPrompt(!s.connected));
const memberRotationTimer=setInterval(()=>{
 if(spotifyIsPlaying&&musicConfig.showSpotify&&musicConfig.artistThemes&&lastMusicData?.track&&chantIndex<0&&parenthesizedMembers(lastMusicData.track+' '+(lastMusicData.artist||'')).length>1){
  applyArtistTheme(lastMusicData.artist,lastMusicData.track);
 }
},250);
window.addEventListener('beforeunload',()=>{clearInterval(memberRotationTimer);clearInterval(progressTickTimer);stopFireworks();stopConfetti();stopChristmasEffect();stopColorCycle();});
})();
