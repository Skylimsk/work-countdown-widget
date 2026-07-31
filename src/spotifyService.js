/**
 * spotifyService.js
 * Uses Windows Media Session API (via Python/winsdk) to get real-time Spotify track info.
 * Falls back to media key simulation for play/pause/next/prev controls.
 */
const { execFile, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

function getSpotifyScriptPath() {
  const candidates = [
    path.join(process.resourcesPath, 'spotify_now_playing.py'),
    path.join(__dirname, '..', 'scripts', 'spotify_now_playing.py'),
    path.join(__dirname, 'spotify_now_playing.py'),
    path.join(process.resourcesPath, 'app', 'spotify_now_playing.py'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function getSpotifyNowPlaying(callback) {
  const scriptPath = getSpotifyScriptPath();
  const scriptDir = path.dirname(scriptPath);

  execFile('python', [scriptPath], { cwd: scriptDir, timeout: 5000, encoding: 'utf8' }, (err, stdout) => {
    if (err || !stdout || !stdout.trim()) {
      return callback({ running: false, track: '', artist: '', paused: false });
    }
    try {
      const data = JSON.parse(stdout.trim());
      callback(data);
    } catch (e) {
      callback({ running: false, track: '', artist: '', paused: false });
    }
  });
}

// Send media key via WScript.Shell — works across all Windows versions
function sendMediaKey(keyCode, callback) {
  exec(
    `powershell -NonInteractive -WindowStyle Hidden -Command "$wsh = New-Object -ComObject WScript.Shell; $wsh.SendKeys([char]${keyCode})"`,
    { timeout: 3000 },
    (err) => { if (callback) callback(err); }
  );
}

function spotifyPlayPause(callback) { sendMediaKey(179, callback); }  // VK_MEDIA_PLAY_PAUSE
function spotifyNext(callback)      { sendMediaKey(176, callback); }  // VK_MEDIA_NEXT_TRACK
function spotifyPrev(callback)      { sendMediaKey(177, callback); }  // VK_MEDIA_PREV_TRACK

module.exports = { getSpotifyNowPlaying, spotifyPlayPause, spotifyNext, spotifyPrev };
