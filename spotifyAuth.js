/**
 * spotifyAuth.js
 * Spotify Web API OAuth (Authorization Code + PKCE) — used for the playback
 * queue ("next song") and real playback control (play/pause/skip), since the
 * local Windows Media Session API has no queue info and media-key simulation
 * is unreliable. No client secret needed/stored.
 * NOTE: the /me/player/* control endpoints require Spotify Premium.
 */
const crypto = require('crypto');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { app, shell } = require('electron');

const CLIENT_ID = '6ba2b130b3fe4e7c83bd16c1bb40d81b';
const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const SCOPES = 'user-read-playback-state user-read-currently-playing user-modify-playback-state';

function tokenPath() {
  return path.join(app.getPath('userData'), 'spotify-tokens.json');
}

function loadTokens() {
  try {
    if (fs.existsSync(tokenPath())) {
      return JSON.parse(fs.readFileSync(tokenPath(), 'utf8'));
    }
  } catch (e) {}
  return null;
}

function saveTokens(tokens) {
  try {
    fs.writeFileSync(tokenPath(), JSON.stringify(tokens, null, 2), 'utf8');
  } catch (e) {}
}

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generatePkcePair() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

let authServer = null;

function startAuthFlow(onComplete) {
  const { verifier, challenge } = generatePkcePair();

  if (authServer) {
    try { authServer.close(); } catch (e) {}
    authServer = null;
  }

  authServer = http.createServer((req, res) => {
    let url;
    try {
      url = new URL(req.url, REDIRECT_URI);
    } catch (e) {
      res.writeHead(400); res.end(); return;
    }
    if (url.pathname !== '/callback') {
      res.writeHead(404); res.end(); return;
    }

    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (error || !code) {
      res.end('<html><body><h2>Spotify authorization failed. You can close this window.</h2></body></html>');
      onComplete({ success: false, error: error || 'missing_code' });
      closeAuthServer();
      return;
    }

    res.end('<html><body><h2>Spotify connected! You can close this window.</h2></body></html>');
    exchangeCodeForTokens(code, verifier)
      .then((tokens) => {
        saveTokens(tokens);
        onComplete({ success: true });
      })
      .catch((e) => {
        onComplete({ success: false, error: e.message });
      })
      .finally(closeAuthServer);
  });

  authServer.on('error', (e) => {
    onComplete({ success: false, error: e.message });
    authServer = null;
  });

  authServer.listen(8888, '127.0.0.1', () => {
    const authUrl = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      scope: SCOPES
    }).toString();
    shell.openExternal(authUrl);
  });
}

function closeAuthServer() {
  setTimeout(() => {
    if (authServer) {
      try { authServer.close(); } catch (e) {}
      authServer = null;
    }
  }, 500);
}

async function exchangeCodeForTokens(code, verifier) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier
  });
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!resp.ok) throw new Error(`Token exchange failed: ${resp.status}`);
  const data = await resp.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000)
  };
}

async function refreshAccessToken(tokens) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token
  });
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!resp.ok) throw new Error(`Token refresh failed: ${resp.status}`);
  const data = await resp.json();
  const updated = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || tokens.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000)
  };
  saveTokens(updated);
  return updated;
}

async function getValidAccessToken() {
  let tokens = loadTokens();
  if (!tokens || !tokens.refresh_token) return null;
  if (Date.now() > tokens.expires_at - 30000) {
    try {
      tokens = await refreshAccessToken(tokens);
    } catch (e) {
      return null;
    }
  }
  return tokens.access_token;
}

function isConnected() {
  const tokens = loadTokens();
  return !!(tokens && tokens.refresh_token);
}

function disconnect() {
  try {
    if (fs.existsSync(tokenPath())) fs.unlinkSync(tokenPath());
  } catch (e) {}
}

async function getNextTrack() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;
  try {
    const resp = await fetch('https://api.spotify.com/v1/me/player/queue', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.queue && data.queue.length > 0) {
      const next = data.queue[0];
      return {
        track: next.name || '',
        artist: (next.artists || []).map((a) => a.name).join(', ')
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Authoritative playback state from Spotify's own servers — the local Windows
// Media Session status (session.get_playback_info().playback_status) is known
// to misreport paused/playing for Spotify, so when connected we prefer this
// over the local reading.
async function getPlayerState() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;
  try {
    const resp = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (resp.status === 204) return { active: false };
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data || !data.device) return { active: false };
    return {
      active: true,
      isPlaying: !!data.is_playing,
      progressMs: data.progress_ms || 0,
      durationMs: data.item ? data.item.duration_ms : 0,
      // Spotify's own server-side track state — reflects a skip/prev almost
      // immediately, unlike the local Windows SMTC session which can lag
      // several seconds (or more) after a remotely-issued command.
      track: data.item ? (data.item.name || '') : '',
      artist: data.item ? (data.item.artists || []).map((a) => a.name).join(', ') : '',
      deviceId: data.device.id,
      deviceName: data.device.name,
      volumePercent: data.device.volume_percent
    };
  } catch (e) {
    return null;
  }
}

async function getDevices() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return [];
  try {
    const resp = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.devices || []).map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      isActive: !!d.is_active,
      volumePercent: d.volume_percent
    }));
  } catch (e) {
    return [];
  }
}

async function switchDevice(deviceId) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return false;
  try {
    const resp = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_ids: [deviceId], play: true })
    });
    return resp.ok;
  } catch (e) {
    return false;
  }
}

async function setVolume(percent) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return false;
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  try {
    const resp = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${clamped}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    return resp.ok;
  } catch (e) {
    return false;
  }
}

async function seek(positionMs) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return false;
  const clamped = Math.max(0, Math.round(positionMs));
  try {
    const resp = await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${clamped}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    return resp.ok;
  } catch (e) {
    return false;
  }
}

// Real playback control via Web API — requires Spotify Premium.
// `success` = command confirmed applied (204). `attempted` = we got a definitive
// HTTP response (so the caller can safely fall back to media keys, e.g. on 403
// no-Premium/404 no-device). On a network exception `attempted` is false —
// whether the command landed server-side is unknown, so callers must NOT fall
// back in that case, or a media key could double it up.
async function webPlayerCommand(method, endpoint) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return { attempted: false, success: false };
  try {
    const resp = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
      method,
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    // Spotify docs say 204, but be lenient and accept any 2xx as success —
    // treating a real success as a failure is what causes a double-fire fallback.
    // 404 = no active device, 403 = no Premium / missing scope.
    return { attempted: true, success: resp.ok };
  } catch (e) {
    return { attempted: false, success: false };
  }
}

function webPlayPause(isCurrentlyPlaying) {
  return webPlayerCommand('PUT', isCurrentlyPlaying ? 'pause' : 'play');
}
function webNext()     { return webPlayerCommand('POST', 'next'); }
function webPrevious() { return webPlayerCommand('POST', 'previous'); }

module.exports = {
  startAuthFlow, isConnected, disconnect, getNextTrack,
  webPlayPause, webNext, webPrevious,
  getPlayerState, getDevices, switchDevice, setVolume, seek
};
