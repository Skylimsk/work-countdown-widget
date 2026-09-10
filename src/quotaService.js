const fs=require('fs'),path=require('path'),os=require('os');
const {fetchClaudeProvider}=require('./providers/claude');
const {fetchAntigravityProviders}=require('./providers/antigravity');
const {fetchCodexProvider}=require('./providers/codex');
const logFile=path.join(os.homedir(),'widget-debug.log');
function writeLog(message){try{fs.appendFileSync(logFile,new Date().toISOString()+' '+message+'\n');}catch(_){}}
const cache={};
let pending;
function merge(id,result){
 if(result.status==='ok'){cache[id]=result;return result;}
 if(cache[id]&&!['not_authenticated','not_configured'].includes(result.status))return {...result,status:'unavailable',metrics:cache[id].metrics,lastKnownGoodAt:cache[id].updatedAt};
 return result;
}
async function fetchClaudeQuota(){
 if(pending)return pending;
 pending=(async()=>{
 const jobs=await Promise.allSettled([fetchClaudeProvider(),fetchAntigravityProviders(),fetchCodexProvider()]);
 const fallback={status:'error',metrics:{},error:'Provider request failed'};
 const [claude,ag,codex]=jobs.map(j=>j.status==='fulfilled'?j.value:fallback);
 const providers={claude:merge('claude',claude),codex:merge('codex',codex),
 antigravity_gemini:merge('antigravity_gemini',ag.antigravity_gemini||fallback),
 antigravity_claude_gpt:merge('antigravity_claude_gpt',ag.antigravity_claude_gpt||fallback)};
 writeLog('Quota snapshot: '+Object.entries(providers).map(([id,p])=>id+'='+p.status).join(', '));
 return {providers,updatedAt:new Date().toISOString()};
 })();
 try{return await pending;}finally{pending=null;}
}
module.exports={fetchClaudeQuota,writeLog,logFile};
