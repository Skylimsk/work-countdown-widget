const fs=require('fs'),path=require('path');
const {app,safeStorage}=require('electron');
const {normalizeConfig}=require('./core/config');
const configPath=path.join(app.getPath('userData'),'user-config.json');
let cached;
function loadConfig(){
 if(cached)return structuredClone(cached);
 let raw={};
 try{raw=JSON.parse(fs.readFileSync(configPath,'utf8'));}catch(_){}
 if(raw.schemaVersion!==3&&Object.keys(raw).length)fs.copyFileSync(configPath,configPath+'.v2-backup');
 if(raw.encryptedCredentials&&safeStorage.isEncryptionAvailable()){
   try{raw.credentials=JSON.parse(safeStorage.decryptString(Buffer.from(raw.encryptedCredentials,'base64')));}catch(_){}
 }
 cached=normalizeConfig(raw);return structuredClone(cached);
}
function saveConfig(patch){
 const old=loadConfig();
 const next=normalizeConfig({...old,...patch,credentials:{...old.credentials,...patch.credentials},aiModes:{...old.aiModes,...patch.aiModes}});
 const disk={...next};
 if(safeStorage.isEncryptionAvailable()){disk.encryptedCredentials=safeStorage.encryptString(JSON.stringify(next.credentials)).toString('base64');delete disk.credentials;}
 fs.mkdirSync(path.dirname(configPath),{recursive:true});
 fs.writeFileSync(configPath+'.tmp',JSON.stringify(disk,null,2));
 fs.renameSync(configPath+'.tmp',configPath);cached=next;
 return loadConfig();
}
module.exports={loadConfig,saveConfig,configPath};
