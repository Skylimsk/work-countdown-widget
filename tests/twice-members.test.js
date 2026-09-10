const test=require('node:test'),assert=require('node:assert/strict');
const {parenthesizedMembers}=require('../src/core/twice-members');
test('parenthesized members preserve order, recognize full-width brackets and deduplicate',()=>{
 assert.deepEqual(parenthesizedMembers('Song (SANA, JIHYO & TZUYU)').map(m=>m.id),['sana','jihyo','tzuyu']);
 assert.deepEqual(parenthesizedMembers('Song（子瑜、Sana、子瑜）').map(m=>m.id),['tzuyu','sana']);
 assert.deepEqual(parenthesizedMembers('Mina Song (Remastered) (MOMOLAND)'),[]);
 assert.deepEqual(parenthesizedMembers('Song (MOMO)').map(m=>m.id),['momo']);
});
