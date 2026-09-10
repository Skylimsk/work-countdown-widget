// Desktop presence only: Codex CLI helpers run under bin and must not keep the card visible.
function classifyProcesses(processes) {
  const list = (Array.isArray(processes) ? processes : [processes]).filter(Boolean);
  const has = name => list.some(p => String(p.ProcessName).toLowerCase() === name);
  return {
    claude: has('claude'),
    antigravity: has('antigravity'),
    codex: has('chatgpt') || list.some(p =>
      String(p.ProcessName).toLowerCase() === 'codex' &&
      typeof p.Path === 'string' && !!p.Path &&
      !/[\\/]bin[\\/]/i.test(p.Path)),
    cursor: has('cursor'),
    vscode: has('code')
  };
}
module.exports = { classifyProcesses };
