import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {geometry,worldGeometry,snapToEndpoint,connections,compatible,angleDiff,validateProject} from '../dist/geometry.js';
import {trackStyle,trackSurfaceMarkup} from '../dist/track-style.js';
const parts=JSON.parse(readFileSync(new URL('../dist/catalog.json',import.meta.url))).parts;
const byId=Object.fromEntries(parts.map(p=>[p.id,p]));
const piece=(part,id='p')=>({id,partId:part.id,x:0,y:0,angle:0,flip:1,z:0,zEnd:0});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} ≠ ${b}`);
for(const sku of ['1278','1279'])test(`${sku}: nominal exits and continuation stay parallel at 37 mm after 90°`,()=>{
 const part=byId['TOMIX-N-'+sku],g=geometry(part),p=piece(part);assert.equal(g.endpoints.length,3);close(angleDiff(g.endpoints[1].angle,g.endpoints[2].angle),0);
 const end=[];
 for(const [index,radius] of [[1,317],[2,280]]){
  const curve={id:'curve'+index,brand:'TOMIX',scale:'N',geometry:{type:'curve',radius,angle:part.geometry.angle}};
  const q=snapToEndpoint(curve,piece(curve,'c'+index),0,worldGeometry(part,p).endpoints[index]);
  assert.equal(connections([p,q],{...byId,[curve.id]:curve}).pairs.length,1);
  end.push(worldGeometry(curve,q).endpoints[1]);
 }
 close(angleDiff(end[0].angle,end[1].angle),0);close(Math.abs(end[0].x-end[1].x),37);
 for(const flip of [-1,1]){const e=worldGeometry(part,{...p,angle:137,flip}).endpoints;close(angleDiff(e[1].angle,e[2].angle),0);}
});
test('Plarail full circle closes; gender and system compatibility are enforced',()=>{
 const part=byId['PLARAIL-PLARAIL-R-03'],loop=[];let target={x:500,y:500,angle:0,z:0};
 for(let i=0;i<8;i++){const p=snapToEndpoint(part,piece(part,'c'+i),0,target);loop.push(p);target=worldGeometry(part,p).endpoints[1];}
 const state=connections(loop,byId);assert.equal(state.open.length,0);assert.equal(state.pairs.length,8);
 const e=worldGeometry(part,piece(part)).endpoints;
 assert.equal(compatible(e[0],e[0]),false);assert.equal(compatible(e[0],e[1]),true);
 for(const brand of ['KATO','TOMIX'])assert.ok(!compatible(e[0],{...e[1],brand,scale:'N'}));
 const ff=worldGeometry(byId['PLARAIL-PLARAIL-R-20-FF'],piece(part)).endpoints;
 assert.ok(ff.every(p=>p.plug==='female'));assert.ok(ff.every(p=>compatible(p,e[1])));
 const saved=validateProject({version:1,name:'普乐乐路',board:{width:1800,height:1000},pieces:loop},byId);assert.equal(saved.pieces.length,8);
});
test('Plarail catalogue has visible usable geometry and plastic appearance',()=>{
 const plarail=parts.filter(p=>p.brand==='PLARAIL');assert.equal(plarail.length,16);
 for(const part of plarail){const g=geometry(part);assert.ok(g.paths.length);assert.ok(g.endpoints.length>=2);assert.ok(g.paths.every(p=>p.length>0));assert.equal(trackStyle(part).gauge,26);assert.match(trackSurfaceMarkup(part,g.paths),/#1756a0/);}
 const straight=byId['PLARAIL-PLARAIL-R-01'];close(geometry(straight).length,216);
});
