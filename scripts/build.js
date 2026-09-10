const path=require('path'),{spawnSync}=require('child_process');
const root=path.join(__dirname,'..');
if(process.platform==='win32'){
 const target=path.join(root,'dist','win-unpacked','WorkCountdownWidget.exe');
 const close=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',
  "Get-CimInstance Win32_Process -Filter \"name = 'WorkCountdownWidget.exe'\" | Where-Object { $_.ExecutablePath -eq $env:WORKDAY_BUILD_EXE } | ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }"
 ],{env:{...process.env,WORKDAY_BUILD_EXE:target},windowsHide:true,encoding:'utf8',timeout:15000});
 if(close.error||close.status!==0){console.error('Could not close the previous widget. Quit it from the tray and retry.',close.error||close.stderr);process.exit(1);}
}
const result=spawnSync(process.execPath,[require.resolve('electron-builder/cli.js'),'--win','dir'],{cwd:root,stdio:'inherit',windowsHide:true});
process.exit(result.status??1);
