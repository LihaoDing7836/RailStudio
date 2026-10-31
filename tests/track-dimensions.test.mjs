import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {geometry,worldGeometry,nearestSnap} from '../dist/geometry.js';
import {trackDimensions,trackDimensionSummary} from '../dist/track-dimensions.js';
import {trackSpecification} from '../dist/labels.js';
import {bufferStopPose,bufferStopMarkup} from '../dist/buffer-stop.js';
import {trackSurfaceMarkup} from '../dist/track-style.js';
const parts=JSON.parse(fs.readFileSync(new URL('../dist/catalog.json',import.meta.url))).parts,by=Object.fromEntries(parts.map(p=>[p.id,p]));
test('every KATO catalogue entry exposes numeric dimensions, including pending products',()=>{
 const kato=parts.filter(p=>p.brand==='KATO');assert.ok(kato.length>150);
 for(const p of kato){const rows=trackDimensions(p);assert.ok(rows.length,p.id);assert.match(trackDimensionSummary(p),/\d.*mm/,p.id);assert.doesNotMatch(trackDimensionSummary(p),/NaN|undefined|Infinity/);}
});
test('double crossover reports its 310 mm length, not sum of the branch paths',()=>{
 const p=by['KATO-N-20-210'],rows=trackDimensions(p);
 assert.deepEqual(rows.find(r=>r.name==='长度'),{name:'长度',value:'310',unit:'mm',basis:'official'});
 assert.equal(rows.find(r=>r.name==='线间距').value,'33');
 assert.ok(geometry(p).length>310);assert.match(trackSpecification(p,{}),/310mm/);assert.doesNotMatch(trackSpecification(p,{}),/20-210/);
 const custom={geometry:{type:'custom',paths:[{points:[{x:-12,y:4},{x:88,y:4}],length:100}],endpoints:[]},name:'test'};
 assert.deepEqual(trackDimensions(custom),[{name:'模型轴线范围',value:'100',unit:'mm',basis:'model'}]);
});
test('variable and double curves show selected dimensions and distinct radii',()=>{
 const variable={geometry:{type:'straight',length:246,minLength:212,maxLength:252}};
 assert.equal(trackDimensions(variable,{length:230})[0].value,'230');
 const p={geometry:{type:'doubleCurve',radius:414,spacing:33,angle:45}};
 assert.match(trackDimensionSummary(p),/414.*381.*45°.*33/);
});
test('four TOMIX E terminals are searchable, have one connection and visible stops in SVG',()=>{
 for(const sku of ['1421','1423','1425','1428']){
  const part=by['TOMIX-N-'+sku],g=geometry(part);assert.equal(part.category,'路阻 / 车挡');assert.match(part.label,/路阻/);assert.equal(g.endpoints.length,1);
  assert.ok(bufferStopPose(part,g.paths));assert.match(trackSurfaceMarkup(part,g.paths),/data-buffer-stop/);
  assert.match(bufferStopMarkup(part,g.paths),/<path/);
  const placed={id:'end',partId:part.id,x:150,y:50,angle:90,flip:-1,z:30,zEnd:30},world=worldGeometry(part,placed),stop=bufferStopPose(part,world.paths);
  assert.ok(Math.abs(stop.z-30)<.001);assert.ok(Math.abs(stop.x-world.paths[0].points.at(-1).x)<.001);
  const target={x:0,y:0,angle:0,z:30,brand:'TOMIX',scale:'N',connector:'standard',pieceId:'track'};
  const snap=nearestSnap(part,{...placed,x:0,y:0},[target],100);assert.ok(snap);assert.equal(worldGeometry(part,snap.piece).endpoints.length,1);
 }
 assert.equal(by['TOMIX-N-1425'].geometry.length,40);assert.match(trackDimensionSummary(by['TOMIX-N-1425']),/40 mm.*37 mm/);
 assert.equal(bufferStopPose(by['KATO-N-20-000'],geometry(by['KATO-N-20-000']).paths),null);
});
