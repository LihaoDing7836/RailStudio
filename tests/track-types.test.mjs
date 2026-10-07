import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {worldGeometry,compatible,connections,nearestSnap,snapToEndpoint} from '../dist/geometry.js';
import {snapGroup} from '../dist/selection.js';
import {trackStyle,trackSurfaceMarkup} from '../dist/track-style.js';
import {trackSpecification} from '../dist/labels.js';
import {rampPlan} from '../dist/elevation.js';
const parts=JSON.parse(fs.readFileSync(new URL('../dist/catalog.json',import.meta.url))).parts,by=Object.fromEntries(parts.map(p=>[p.id,p]));
const piece=(partId,x=0,angle=0)=>({id:partId,partId,x,y:0,angle,flip:1,z:0,zEnd:0});
const kato=parts.find(p=>p.brand==='KATO'&&p.sku==='20-000'),tomix=parts.find(p=>p.brand==='TOMIX'&&p.geometry.type==='straight'&&!p.adapterBrands&&p.scale==='N');
test('both ends of both adapters accept either brand, but regular tracks and incompatible gauges stay isolated',()=>{
 for(const id of ['TOMIX-N-1529','KATO-N-20-045'])for(const end of [0,1])for(const brandPart of [kato,tomix]){
  const part=by[id],p=piece(id),source=worldGeometry(part,p).endpoints[end],target=worldGeometry(brandPart,piece(brandPart.id)).endpoints[0];assert.ok(compatible(source,target));assert.ok(compatible(target,source));assert.ok(!compatible(source,{...target,scale:'HO'}));assert.ok(!compatible(source,{...target,z:2}));assert.ok(!compatible(source,{...target,connector:'bare'}));
  const joined=snapToEndpoint(part,p,end,target),result=connections([joined,piece(brandPart.id)],by);assert.equal(result.pairs.length,1);
 }
 assert.ok(!compatible(worldGeometry(kato,piece(kato.id)).endpoints[0],worldGeometry(tomix,piece(tomix.id)).endpoints[0]));
});
test('automatic and group snapping find a cross-brand adapter with the shared compatibility policy',()=>{
 const adapter=by['TOMIX-N-1529'],fixed=piece(adapter.id),target=worldGeometry(adapter,fixed).endpoints[1],moving=piece(kato.id,target.x+2);const snap=nearestSnap(kato,moving,[target],10);assert.ok(snap);assert.equal(connections([fixed,snap.piece],by).pairs.length,1);
 const result=snapGroup([moving],by,[target],10);assert.ok(result);
});
test('set components retain distinct approach identifiers and correct 1641 mm / 5 degree geometry',()=>{
 const set=parts.filter(p=>p.sku==='91045');assert.equal(set.length,4);assert.equal(set.reduce((n,p)=>n+p.pack,0),7);
 for(const p of set.filter(p=>p.geometry.type==='curve')){assert.equal(p.geometry.radius,1641);assert.equal(p.geometry.angle,5);assert.match(trackSpecification(p,{}),/1641-5-EM/);}
 assert.equal(by['TOMIX-N-91046-C1641-5-EM'].pack,6);
});
test('track surfaces and labels distinguish ordinary, PC, wide, slab, viaduct, embankment and adapters',()=>{
 const names=['ストレートレールS140','PCレールS140-PC','ワイドPCレールS140-WP','スラブレールS140','高架レールS140','築堤 S140'];const styles=names.map(name=>trackStyle({...tomix,name,label:'S140'}).type);assert.equal(new Set(styles).size,6);
 const wide={...tomix,name:'ワイドPCレールS140-WP',geometry:{type:'straight',length:140}};assert.match(trackSpecification(wide,{}),/WP/);const g=worldGeometry(wide,piece(wide.id));assert.match(trackSurfaceMarkup(wide,g.paths,true),/data-track-style="wide"/);assert.match(trackSurfaceMarkup(wide,g.paths,true),/#c1d1db/);assert.equal(trackStyle(by['KATO-N-20-045']).type,'adapter');
});
