const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyProcesses } = require('../src/providers/activeApps');
test('Codex card follows desktop exit and reopen, ignoring background helpers', () => {
  const helper = { ProcessName: 'codex', Path: 'C:/Users/user/AppData/Local/OpenAI/Codex/bin/v1/codex.exe' };
  const desktop = { ProcessName: 'ChatGPT', Path: 'C:/Program Files/WindowsApps/OpenAI.Codex/app/ChatGPT.exe' };
  assert.equal(classifyProcesses([helper, desktop]).codex, true);
  assert.equal(classifyProcesses([helper, {ProcessName:'codex-code-mode-host'}]).codex, false);
  assert.equal(classifyProcesses([helper, desktop]).codex, true);
  assert.equal(classifyProcesses([{ProcessName:'Codex',Path:'C:/Apps/Codex/app/Codex.exe'}]).codex, true);
  assert.equal(classifyProcesses([]).codex, false);
  assert.equal(classifyProcesses([{ProcessName:'Code'}]).vscode, true);
});
