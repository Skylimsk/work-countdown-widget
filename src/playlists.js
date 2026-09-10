const {ipcRenderer}=require('electron');
const {musicIcon}=require('./music-icons');
const $=id=>document.getElementById(id);
let items=[],nextOffset=null,busy=false,generation=0,view='playlists',pageOffset=0,artistQuery='';
function status(message){$('status').textContent=message;}
function message(r){return (r.error||'Spotify request failed.')+(r.retryAfter?' Retry after '+r.retryAfter+' seconds.':'');}
function filtered(){const query=$('filter').value.trim().toLowerCase();return view==='artists'?items:items.filter(p=>(p.name+' '+p.owner).toLowerCase().includes(query));}
function render(){
 $('playlists').replaceChildren();
 for(const item of filtered()){
  const button=document.createElement('button');button.className='playlist-item';button.disabled=busy;button.title=item.name;
  const text=document.createElement('span'),name=document.createElement('strong'),details=document.createElement('small'),play=document.createElement('span');
  name.textContent=item.name;details.textContent=[item.owner,item.count==null?'':item.count+' tracks'].filter(Boolean).join(' · ');play.className='play-label';play.innerHTML=musicIcon('play');text.append(name,details);button.append(text,play);
  button.setAttribute('aria-label',(view==='liked'?'Play from ':view==='artists'?'Play artist ':'Play playlist ')+item.name);button.title=button.getAttribute('aria-label');
  button.onclick=()=>view==='liked'?playLiked(filtered().slice(filtered().findIndex(p=>p.id===item.id))):startPlayback(view==='artists'?'spotify-play-artist':'spotify-play-playlist',{id:item.id},item.name);
  if(view==='liked'){
   const row=document.createElement('div');row.className='item-row';const queue=document.createElement('button');queue.className='queue-track';queue.innerHTML=musicIcon('queue');queue.title='Add only this song to queue';queue.setAttribute('aria-label',queue.title);queue.disabled=busy;
   queue.onclick=()=>addQueue(item);row.append(button,queue);$('playlists').append(row);
  }else $('playlists').append(button);
 }
 if(!$('playlists').childElementCount&&items.length){const empty=document.createElement('p');empty.textContent='No matches on loaded pages.';$('playlists').append(empty);}
 $('more').hidden=nextOffset===null;$('more').textContent=view==='liked'?'Next page':'Load more';$('previousPage').hidden=view!=='liked'||pageOffset===0;
 $('playPage').disabled=busy||!filtered().length;
}
function setBusy(value){busy=value;for(const id of ['refresh','more','previousPage','connect','device','switchDevice','setVolume','searchLibrary'])$(id).disabled=value;document.querySelectorAll('[data-view]').forEach(b=>b.disabled=value);render();}
async function startPlayback(channel,payload,name){
 if(busy)return;setBusy(true);status('Starting '+name+'…');
 try{const r=await ipcRenderer.invoke(channel,{...payload,deviceId:$('device').value});status(r.ok?'Playback requested: '+name:message(r));}catch{status('Could not contact Spotify. Please retry.');}finally{setBusy(false);}
}
async function addQueue(track){
 if(busy)return;setBusy(true);status('Adding '+track.name+' to queue…');
 try{const r=await ipcRenderer.invoke('spotify-add-track-queue',{id:track.id,deviceId:$('device').value});status(r.ok?'Added to queue: '+track.name:message(r));}catch{status('Could not add the song to queue. Please retry.');}finally{setBusy(false);}
}
function playLiked(tracks){if(tracks.length)startPlayback('spotify-play-liked',{ids:tracks.map(t=>t.id)},tracks.length+' liked songs from this page');}
async function load(reset=true,requestedOffset=null){
 if(busy)return;
 if(view==='liked'&&reset&&$('filter').value.trim())return searchAllLiked();
 if(view==='artists'&&reset){artistQuery=$('filter').value.trim();if(!artistQuery){status('Enter an artist name, then select Search artists.');return;}}
 const ticket=++generation,offset=requestedOffset??(reset?0:nextOffset);setBusy(true);status('Loading music…');
 const replace=reset||view==='liked';
 if(replace){items=[];nextOffset=null;render();}
 try{
  const channel=view==='liked'?'spotify-liked-songs':view==='artists'?'spotify-search-artists':'spotify-list-playlists';
  const [page,devices]=await Promise.all([ipcRenderer.invoke(channel,view==='artists'?{query:artistQuery,offset}:offset),reset?ipcRenderer.invoke('spotify-playlist-devices'):Promise.resolve(null)]);
  if(ticket!==generation)return;
  if(devices){const selected=$('device').value;$('device').replaceChildren(new Option('Active Spotify device',''));if(devices.ok)for(const d of devices.items)$('device').append(new Option(d.name+(d.active?' · Active':''),d.id));if([...$('device').options].some(o=>o.value===selected))$('device').value=selected;}
  if(!page.ok){status(message(page));return;}
  for(const p of page.items)if(!items.some(i=>i.id===p.id))items.push(p);
  pageOffset=offset;nextOffset=page.nextOffset;
  const label=view==='liked'?'playable liked songs on page '+(Math.floor(offset/50)+1):view==='artists'?'artists':'playlists';
  status(items.length?items.length+' '+label+(devices&&!devices.ok?' · '+message(devices):''):'No '+label+' found.');
 }catch{status('Could not load your music. Please retry.');}finally{if(ticket===generation)setBusy(false);}
}
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>{
 if(busy)return;view=button.dataset.view;items=[];nextOffset=null;pageOffset=0;$('filter').value='';
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 $('likedActions').hidden=view!=='liked';$('searchLibrary').hidden=view==='playlists';$('searchLibrary').textContent=view==='liked'?'Search all Liked Songs':'Search artists';
 $('filterLabel').textContent=view==='artists'?'Search Spotify artists':view==='liked'?'Search all Liked Songs':'Filter loaded playlists';
 $('filter').placeholder=view==='artists'?'TWICE, Accusefive, Mayday…':view==='liked'?'Song or artist':'Playlist or owner';render();
 if(view==='artists')status('Enter an artist name, then select Search artists.');else load();
};
$('filter').oninput=()=>{if(view==='playlists')render();};$('filter').onkeydown=e=>{if(e.key==='Enter'&&view!=='playlists'){e.preventDefault();load();}};
async function searchAllLiked(){
 const query=$('filter').value.trim();if(!query){status('Enter a song or artist name.');return;}const ticket=++generation;setBusy(true);status('Searching your entire Liked Songs library…');
 try{const r=await ipcRenderer.invoke('spotify-search-liked',query);if(ticket!==generation)return;if(!r.ok){status(message(r));return;}items=r.items;nextOffset=null;pageOffset=0;status(items.length?items.length+' matches across '+r.scanned+' playable Liked Songs':'No matches across '+r.scanned+' playable Liked Songs.');}
 catch{status('Could not search Liked Songs. Please retry.');}finally{if(ticket===generation)setBusy(false);}
}
$('searchLibrary').onclick=()=>load();$('refresh').onclick=()=>load();$('more').onclick=()=>load(false);$('previousPage').onclick=()=>load(false,Math.max(0,pageOffset-50));
$('playPage').onclick=()=>playLiked(filtered());
$('openLiked').onclick=async()=>{try{const r=await ipcRenderer.invoke('spotify-open-liked');if(!r.ok)status(message(r));}catch{status('Could not open Spotify.');}};
$('connect').onclick=async()=>{setBusy(true);status('Complete Spotify authorization in your browser…');try{const r=await ipcRenderer.invoke('spotify-connect');if(!r.success){status(r.error||'Connection cancelled.');return;}setBusy(false);await load();}catch{status('Spotify connection failed. Please retry.');}finally{setBusy(false);}};
function theme(dark){document.documentElement.dataset.theme=dark?'dark':'light';}
ipcRenderer.on('system-theme',(_,dark)=>theme(dark));ipcRenderer.on('widget-state',(_,s)=>theme(s.dark));
ipcRenderer.on('spotify-auth-changed',(_,s)=>{if(!s.connected){generation++;items=[];nextOffset=null;pageOffset=0;setBusy(false);status('Spotify disconnected. Connect to browse your music.');}});
ipcRenderer.invoke('get-state').then(s=>theme(s.dark));load();
$('volume').oninput=()=>{$('volumeValue').textContent=$('volume').value+'%';};
async function control(channel,value,success){setBusy(true);try{const ok=await ipcRenderer.invoke(channel,value);status(ok?success:'Spotify could not apply the change. Check your connection, Premium access and active device.');}catch{status('Spotify control failed. Please retry.');}finally{setBusy(false);}}
$('setVolume').onclick=()=>control('spotify-library-volume',Number($('volume').value),'Volume updated.');
$('switchDevice').onclick=()=>{if(!$('device').value){status('Select a device first.');return;}control('spotify-library-switch-device',$('device').value,'Playback transferred to the selected device.');};
