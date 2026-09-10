// Spotify playlist requests stay in the main process. Tokens never reach the UI.
function createPlaylists(auth,fetcher=fetch){
 async function request(endpoint,method='GET',body){
  const token=await auth.getValidAccessToken();
  if(!token)return {ok:false,code:'auth',error:'Connect Spotify to browse your playlists.'};
  try{
   const response=await fetcher('https://api.spotify.com/v1'+endpoint,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
   if(!response.ok){
    const messages={401:'Your Spotify connection expired. Reconnect to continue.',403:method==='GET'?'Spotify denied access. Reconnect to allow your library and private playlists; also check that your account can use this Spotify developer app.':'Spotify denied playback. Premium and playback permission are required; the device may also be restricted.',404:'No active Spotify device. Open Spotify on your device, then refresh the device list.',429:'Spotify is rate limiting requests. Please wait before retrying.'};
    return {ok:false,code:String(response.status),error:messages[response.status]||'Spotify request failed ('+response.status+'). Please retry.',retryAfter:response.headers?.get('retry-after')||null};
   }
   return {ok:true,data:response.status===204?null:await response.json()};
  }catch{return {ok:false,code:'network',error:'Spotify did not respond. Check your connection. Playback may have been accepted; check Spotify before retrying.'};}
 }
 let likedCache=null,likedCacheAt=0,likedLoad=null,likedRevision=0;
 const savedTracks=data=>(data.items||[]).map(i=>i?.track).filter(t=>t&&/^[a-zA-Z0-9]{22}$/.test(t.id)&&!t.is_local&&t.is_playable!==false).map(t=>({id:t.id,name:t.name||'Untitled track',owner:(t.artists||[]).map(a=>a.name).join(', '),count:null}));
 async function loadAllLiked(){
  if(likedCache&&Date.now()-likedCacheAt<300000)return {ok:true,items:likedCache,cached:true};
  if(likedLoad)return likedLoad;const revision=likedRevision;
  const job=(async()=>{let offset=0,all=[],seen=new Set();while(true){
   const r=await request('/me/tracks?limit=50&offset='+offset);if(!r.ok)return r;
   for(const item of savedTracks(r.data))if(!seen.has(item.id)){seen.add(item.id);all.push(item);}
   if(!r.data.next)break;const next=offset+50;if(next<=offset)return {ok:false,error:'Spotify returned an invalid library page.'};offset=next;
  }if(revision===likedRevision){likedCache=all;likedCacheAt=Date.now();}return {ok:true,items:all,cached:false};})();likedLoad=job;try{return await job;}finally{if(likedLoad===job)likedLoad=null;}
 }
 return {
  clearLikedCache(){likedCache=null;likedCacheAt=0;likedLoad=null;likedRevision++;},
  async list(offset=0){
   if(!Number.isInteger(offset)||offset<0||offset>100000)return {ok:false,error:'Invalid playlist page.'};
   const r=await request('/me/playlists?limit=50&offset='+offset);if(!r.ok)return r;
   const items=(r.data.items||[]).filter(p=>p&&typeof p.id==='string').map(p=>({id:p.id,name:p.name||'Untitled playlist',owner:p.owner?.display_name||'',count:p.items?.total??p.tracks?.total??null}));
   return {ok:true,items,nextOffset:r.data.next?offset+50:null};
  },
  async liked(offset=0){
   if(!Number.isInteger(offset)||offset<0||offset>100000)return {ok:false,error:'Invalid library page.'};
   const r=await request('/me/tracks?limit=50&offset='+offset);if(!r.ok)return r;
   const items=savedTracks(r.data);
   return {ok:true,items,nextOffset:r.data.next?offset+50:null,total:r.data.total};
  },
  async searchLiked(query){
   if(typeof query!=='string'||!query.trim()||query.length>200)return {ok:false,error:'Enter a song or artist name (up to 200 characters).'};
   const all=await loadAllLiked();if(!all.ok)return all;const q=query.trim().toLocaleLowerCase();
   return {ok:true,items:all.items.filter(item=>(item.name+' '+item.owner).toLocaleLowerCase().includes(q)),scanned:all.items.length,cached:all.cached};
  },
  async artists(query,offset=0){
   if(typeof query!=='string'||!query.trim()||query.length>200||!Number.isInteger(offset)||offset<0||offset>990)return {ok:false,error:'Enter an artist name (up to 200 characters).'};
   const r=await request('/search?type=artist&limit=10&offset='+offset+'&q='+encodeURIComponent(query.trim()));if(!r.ok)return r;
   return {ok:true,items:(r.data.artists?.items||[]).filter(a=>a&&/^[a-zA-Z0-9]{22}$/.test(a.id)).map(a=>({id:a.id,name:a.name,owner:'Artist',count:null})),nextOffset:r.data.artists?.next&&offset<990?offset+10:null};
  },
  async playArtist(id,device=''){
   if(typeof id!=='string'||!/^[a-zA-Z0-9]{22}$/.test(id)||typeof device!=='string'||device.length>200)return {ok:false,error:'Invalid artist or device.'};
   const r=await request('/me/player/play'+(device?'?device_id='+encodeURIComponent(device):''),'PUT',{context_uri:'spotify:artist:'+id});return r.ok?{ok:true}:r;
  },
  async playTracks(ids,device=''){
   if(!Array.isArray(ids)||!ids.length||ids.length>50||ids.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9]{22}$/.test(id))||typeof device!=='string'||device.length>200)return {ok:false,error:'Select between 1 and 50 valid tracks.'};
   const r=await request('/me/player/play'+(device?'?device_id='+encodeURIComponent(device):''),'PUT',{uris:ids.map(id=>'spotify:track:'+id)});return r.ok?{ok:true}:r;
  },
  async devices(){const r=await request('/me/player/devices');return r.ok?{ok:true,items:(r.data.devices||[]).filter(d=>d.id&&!d.is_restricted).map(d=>({id:d.id,name:d.name||'Spotify device',active:!!d.is_active}))}:r;},
  async addTrack(id,device=''){
   if(typeof id!=='string'||!/^[a-zA-Z0-9]{22}$/.test(id)||typeof device!=='string'||device.length>200)return {ok:false,error:'Only an individual Spotify track can be added to the queue.'};
   const params=new URLSearchParams({uri:'spotify:track:'+id});if(device)params.set('device_id',device);
   const r=await request('/me/player/queue?'+params,'POST');return r.ok?{ok:true}:r;
  },
  async play(id,device=''){
   if(typeof id!=='string'||!/^[a-zA-Z0-9]{22}$/.test(id)||typeof device!=='string'||device.length>200)return {ok:false,error:'Invalid playlist or device.'};
   const r=await request('/me/player/play'+(device?'?device_id='+encodeURIComponent(device):''),'PUT',{context_uri:'spotify:playlist:'+id});return r.ok?{ok:true}:r;
  }
 };
}
module.exports={createPlaylists};
