import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterTrains,stateFromQuery,queryFromState,escapeHTML} from '../dist/train-catalogue.js';
const empty=stateFromQuery('');
const rows=[
 {id:'a',brand:'TOMIX',sku:'98861',name:'新幹線 4両増結セット',category:'高速列车',set_type:'增结套装',cars:4,price:12000},
 {id:'b',brand:'KATO',sku:'10-1200',name:'旧型 6両セット',category:'电车・通勤',set_type:'车辆套装',cars:6,price:null},
 {id:'c',brand:'KATO',sku:'10-999',name:'特別企画品 8両セット',category:'电车・通勤',set_type:'车辆套装',cars:8,price:8000,limited:true},
];
test('catalogue filters combine and normalize full width SKUs',()=>{
 assert.deepEqual(filterTrains(rows,{...empty,q:'９８８６１'}).map(x=>x.id),['a']);
 assert.deepEqual(filterTrains(rows,{...empty,q:'新干线',brand:'TOMIX',cars:'2-4',set:'增结套装'}).map(x=>x.id),['a']);
 assert.deepEqual(filterTrains(rows,{...empty,brand:'KATO',cars:'5-8',limited:true}).map(x=>x.id),['c']);
 assert.equal(filterTrains(rows,{...empty,q:'no-such-train'}).length,0);
});
test('unknown prices stay last in both directions; input stays unmodified',()=>{
 assert.deepEqual(filterTrains(rows,{...empty,sort:'price-low'}).map(x=>x.id),['c','a','b']);
 assert.deepEqual(filterTrains(rows,{...empty,sort:'price-high'}).map(x=>x.id),['a','c','b']);
 assert.deepEqual(rows.map(x=>x.id),['a','b','c']);
});
test('search and pagination survive detail/back URL roundtrip',()=>{
 const state={...empty,q:'E5 はやぶさ & 限定',cars:'5-8',brand:'KATO',sort:'price-high',page:2,limited:true};
 assert.deepEqual(stateFromQuery(queryFromState(state)),state);
 assert.equal(stateFromQuery('?page=-5&brand=unknown').page,1);
 assert.equal(escapeHTML('<img onerror="alert(1)">'),'&lt;img onerror=&quot;alert(1)&quot;&gt;');
});
test('published catalogue contains unique vehicle sets and traceable prices',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../dist/data/trains.json',import.meta.url),'utf8'));
 const records=data.trains;
 assert.ok(records.length>2000);
 assert.equal(new Set(records.map(r=>r.id)).size,records.length);
 for(const r of records){
  assert.ok(['KATO','TOMIX'].includes(r.brand));assert.equal(r.scale,'N');
  assert.ok(r.cars==null||(r.cars>1&&r.cars<40),r.id+' invalid car count');
  assert.match(r.name,/セット/,r.id);
  assert.doesNotMatch(r.name,/スターター|トータル|ベーシック|ファーストカーミュージアム/);
  assert.match(r.source_url,/^https:\/\/www\.(katomodels\.com|tomytec\.co\.jp)\//);
  if(r.price!=null){assert.ok(Number.isInteger(r.price)&&r.price>0);assert.equal(r.currency,'JPY');}
  if(r.brand==='KATO')assert.match(r.sku,/^(10-|106-|K\d)/);
 }
});
test('official photos have traceable sources and every local image reference exists',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../dist/data/trains.json',import.meta.url),'utf8'));
 for(const r of data.trains){
  if(!r.image_url)continue;
  assert.match(r.image_source,/^https:\/\/www\.(katomodels\.com|tomytec\.co\.jp)\//);
  for(const photo of [r.image_url,...(r.image_gallery||[])]){
   if(photo.startsWith('train-images/')){
    assert.match(photo,/^train-images\/[a-f0-9]{24}\.(jpg|jpeg|png|gif|webp)$/);
    assert.ok(fs.statSync(new URL('../dist/'+photo,import.meta.url)).size>32,r.id+' missing photo');
    assert.match(r.image_original_url,/^https:\/\//);
   }else assert.match(photo,/^https:\/\/(www\.tomytec\.co\.jp|s3-ap-northeast-1\.amazonaws\.com)\//);
  }
 }
});
