// Match only names inside parentheses, preserving the order in the title.
const members=[
 ['nayeon','Nayeon',['nayeon','na-yeon','나연','娜璉','娜琏']],
 ['jeongyeon','Jeongyeon',['jeongyeon','jeong-yeon','정연','定延']],
 ['momo','Momo',['momo','모모','モモ','桃']],
 ['sana','Sana',['sana','사나','サナ','紗夏','纱夏']],
 ['jihyo','Jihyo',['jihyo','ji-hyo','지효','志效']],
 ['mina','Mina',['mina','미나','ミナ','名井南']],
 ['dahyun','Dahyun',['dahyun','da-hyun','다현','多賢','多贤']],
 ['chaeyoung','Chaeyoung',['chaeyoung','chae-young','채영','彩瑛']],
 ['tzuyu','Tzuyu',['tzuyu','쯔위','子瑜']]
];
function parenthesizedMembers(text=''){
 const found=[];
 for(const group of text.matchAll(/[(（]([^()（）]*)[)）]/g)){
  const hits=[];
  for(const [id,name,aliases] of members)for(const alias of aliases){
   const latin=/^[a-z-]+$/.test(alias),re=new RegExp(latin?'(?<![a-z])'+alias+'(?![a-z])':alias,'gi');
   for(const hit of group[1].matchAll(re))hits.push({id,name,index:hit.index});
  }
  hits.sort((a,b)=>a.index-b.index);
  for(const hit of hits)if(!found.some(m=>m.id===hit.id))found.push({id:hit.id,name:hit.name});
 }
 return found;
}
module.exports={parenthesizedMembers};
