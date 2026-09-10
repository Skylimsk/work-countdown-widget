const test=require('node:test'),assert=require('node:assert/strict');
const {createPlaylists}=require('../src/core/spotify-playlists');
const auth={getValidAccessToken:async()=>'test-token'};
const response=(data,status=200)=>({ok:status<400,status,json:async()=>data,headers:{get:()=>null}});
test('playlist pages skip removed entries and support current/legacy item counts',async()=>{
 let url;const api=createPlaylists(auth,async u=>{url=u;return response({items:[null,{id:'a',name:'One',items:{total:9}},{id:'b',tracks:{total:4}}],next:'next-page'});});
 const r=await api.list(50);assert(url.endsWith('limit=50&offset=50'));assert.equal(r.nextOffset,100);assert.equal(r.items[0].count,9);assert.equal(r.items[1].count,4);
});
test('queue accepts one track ID and never accepts playlist or artist input',async()=>{
 let calls=0;const api=createPlaylists(auth,async(u,o)=>{calls++;assert(u.includes('/me/player/queue?'));assert(u.includes('uri=spotify%3Atrack%3A1111111111111111111111'));assert.equal(o.method,'POST');return response(null,204);});
 assert.equal((await api.addTrack('1111111111111111111111','desktop')).ok,true);assert.equal(calls,1);
 for(const id of ['bad','spotify:playlist:1111111111111111111111','spotify:artist:1111111111111111111111'])assert.equal((await api.addTrack(id)).ok,false);assert.equal(calls,1);
});
test('playlist playback sends selected context and device exactly once',async()=>{
 let calls=0;const api=createPlaylists(auth,async(url,options)=>{calls++;assert(url.endsWith('device_id=desk%20one'));assert.equal(options.method,'PUT');assert.deepEqual(JSON.parse(options.body),{context_uri:'spotify:playlist:1234567890123456789012'});return response(null,204);});
 assert.deepEqual(await api.play('1234567890123456789012','desk one'),{ok:true});assert.equal(calls,1);assert.equal((await api.play('bad')).ok,false);assert.equal(calls,1);
});
test('authentication, permissions, device and rate-limit failures are actionable',async()=>{
 assert.equal((await createPlaylists({getValidAccessToken:async()=>null}).list()).code,'auth');
 for(const status of [401,403,404,429]){const api=createPlaylists(auth,async()=>response(null,status));assert.equal((await api.list()).code,String(status));}
 let calls=0;const api=createPlaylists(auth,async()=>{calls++;throw Error('timeout');});assert.equal((await api.play('1234567890123456789012')).code,'network');assert.equal(calls,1);
});
test('restricted and unavailable devices cannot be selected',async()=>{
 const api=createPlaylists(auth,async()=>response({devices:[{id:null},{id:'restricted',is_restricted:true},{id:'desktop',name:'PC',is_active:true}]}));assert.deepEqual((await api.devices()).items,[{id:'desktop',name:'PC',active:true}]);
});
test('liked songs paginate past unavailable/local tracks without losing the cursor',async()=>{
 const api=createPlaylists(auth,async u=>{assert(u.endsWith('/me/tracks?limit=50&offset=50'));return response({items:[{track:null},{track:{id:'1111111111111111111111',name:'Song',artists:[{name:'TWICE'}]}},{track:{id:'2222222222222222222222',is_local:true}},{track:{id:'3333333333333333333333',is_playable:false}}],next:'next',total:120});});
 const r=await api.liked(50);assert.equal(r.items.length,1);assert.equal(r.items[0].owner,'TWICE');assert.equal(r.nextOffset,100);
});
test('artist search encodes queries and plays artist context',async()=>{
 let requests=[];const api=createPlaylists(auth,async(u,o)=>{requests.push([u,o]);return o.method==='PUT'?response(null,204):response({artists:{items:[{id:'1111111111111111111111',name:'TWICE'}],next:'next'}});});
 assert.equal((await api.artists('A & B')).nextOffset,10);assert(requests[0][0].includes('q=A%20%26%20B'));
 assert.equal((await api.playArtist('1111111111111111111111','pc')).ok,true);assert.deepEqual(JSON.parse(requests[1][1].body),{context_uri:'spotify:artist:1111111111111111111111'});
 assert.equal((await api.artists('',0)).ok,false);
});
test('liked song playback submits ordered URIs and rejects oversized or unsafe input',async()=>{
 let calls=0;const api=createPlaylists(auth,async(u,o)=>{calls++;assert.deepEqual(JSON.parse(o.body),{uris:['spotify:track:1111111111111111111111','spotify:track:2222222222222222222222']});return response(null,204);});
 assert.equal((await api.playTracks(['1111111111111111111111','2222222222222222222222'])).ok,true);
 for(const ids of [[],['bad'],Array(51).fill('1111111111111111111111')])assert.equal((await api.playTracks(ids)).ok,false);assert.equal(calls,1);
});
test('full liked-song search scans every page once and reuses its short cache',async()=>{
 let calls=[];const api=createPlaylists(auth,async u=>{calls.push(u);const second=u.endsWith('offset=50');return response({items:[{track:{id:second?'2222222222222222222222':'1111111111111111111111',name:second?'Hidden Match':'Other song',artists:[{name:second?'Artist':'Someone'}]}}],next:second?null:'next'});});
 let r=await api.searchLiked('hidden');assert.deepEqual(r.items.map(i=>i.id),['2222222222222222222222']);assert.equal(r.scanned,2);assert.equal(calls.length,2);
 r=await api.searchLiked('someone');assert.equal(r.items.length,1);assert.equal(calls.length,2,'second search uses complete cache');
 api.clearLikedCache();await api.searchLiked('hidden');assert.equal(calls.length,4);
});
