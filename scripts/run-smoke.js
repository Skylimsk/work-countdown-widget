const {spawnSync}=require('child_process');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const result=spawnSync(require('electron'),['scripts/smoke-test.js'],{stdio:'inherit',env,windowsHide:true,timeout:45000});
if(result.error)console.error(result.error);
process.exit(result.status??1);
