const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'state.json');

let state = {
  snapshot: null,
  lastSyncAt: null,
  alerted: {}
};

function load() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      state = { ...state, ...raw, alerted: raw.alerted || {} };
    }
  } catch (e) {
    console.error('Failed to load state.json, starting fresh:', e.message);
  }
}

function persist() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8');
  } catch (e) {
    console.error('Failed to persist state.json:', e.message);
  }
}

function setSnapshot(snapshot) {
  state.snapshot = snapshot;
  state.lastSyncAt = new Date().toISOString();
  persist();
}

function getSnapshot() {
  return state.snapshot;
}

function getLastSyncAt() {
  return state.lastSyncAt;
}

function getAlerted(key) {
  return !!state.alerted[key];
}

function setAlerted(key, value) {
  state.alerted[key] = value;
  persist();
}

load();

module.exports = { setSnapshot, getSnapshot, getLastSyncAt, getAlerted, setAlerted };
