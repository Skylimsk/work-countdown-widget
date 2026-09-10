const {execFile}=require('child_process');
const {promisify}=require('util');
const path=require('path');
module.exports=async context=>{
 if(context.electronPlatformName!=='win32')return;
 const root=path.join(__dirname,'..');
 await promisify(execFile)(path.join(root,'node_modules','electron-winstaller','vendor','rcedit.exe'),[
  path.join(context.appOutDir,'WorkCountdownWidget.exe'),
  '--set-icon',path.join(root,'src','icon.ico'),
  '--set-file-version','3.0.0','--set-product-version','3.0.0',
  '--set-version-string','ProductName','Workday 3',
  '--set-version-string','FileDescription','Workday desktop widget'
 ],{windowsHide:true,timeout:30000});
};
