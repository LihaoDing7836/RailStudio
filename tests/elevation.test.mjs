import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureLevels,shiftLayer,terrainHeight} from '../dist/elevation-schema.js';
import {rampPlan,elevatedPaths,elevationWarnings} from '../dist/elevation.js';
import {validateProject,connections,snapToEndpoint,worldGeometry} from '../dist/geometry.js';
const part={id:'s',brand:'KATO',scale:'N',geometry:{type:'straight',length:250}},curve={...part,id:'c',geometry:{type:'curve',radius:300,angle:90}},byId={s:part,c:curve};
const piece=(id,x=0,y=0,z=0)=>({id,partId:'s',x,y,z,zEnd:z,angle:0,flip:1});
const project=()=>ensureLevels({version:1,name:'多层测试',board:{width:1800,height:1000},pieces:[piece('a'),piece('b',250)]});
const addLayer=p=>p.layers.push({id:'upper',name:'高架',height:60,color:'#598db7',visible:true});
test('legacy layouts migrate without changing physical geometry or losing slopes',()=>{
 const p=project();assert.equal(p.layers.length,1);const old={version:1,name:'旧方案',board:p.board,pieces:[{...piece('s',0,0,25),zEnd:35},piece('ground')]};const before=structuredClone(old.pieces);ensureLevels(old);assert.equal(old.layers.length,2);for(let i=0;i<before.length;i++)for(const k of ['x','y','z','zEnd','angle'])assert.equal(old.pieces[i][k],before[i][k]);assert.deepEqual(validateProject(old,byId).pieces,old.pieces);
});
test('layer heights and fractional ramp bindings roundtrip and update both ends',()=>{
 const p=project();addLayer(p);const ground=p.layers[0].id;Object.assign(p.pieces[0],{z:0,zEnd:30,ramp:{from:ground,to:'upper',t0:0,t1:.5}});Object.assign(p.pieces[1],{z:30,zEnd:60,ramp:{from:ground,to:'upper',t0:.5,t1:1}});p.pieces.push({...piece('top',500,0,60),layerId:'upper'});const restored=validateProject(JSON.parse(JSON.stringify(p)),byId);shiftLayer(restored,'upper',100);assert.deepEqual(restored.pieces.map(q=>[q.z,q.zEnd]),[[0,50],[50,100],[100,100]]);assert.equal(connections(restored.pieces,byId).pairs.length,2);shiftLayer(restored,ground,20);assert.deepEqual(restored.pieces.map(q=>[q.z,q.zEnd]),[[20,60],[60,100],[100,100]]);assert.equal(connections(restored.pieces,byId).pairs.length,2);
});
test('imports reject invalid heights, missing layers and malformed terrain',()=>{
 const p=project();for(const modify of [p=>p.layers[0].height=Infinity,p=>p.layers.push({...p.layers[0]}),p=>p.pieces[0].layerId='missing',p=>p.pieces[0].ramp={from:'missing',to:'missing',t0:0,t1:1},p=>p.terrain=[{id:'bad',name:'山',type:'hill',x:10,y:10,rx:0,ry:10,height:20}],p=>p.designLimits.clearance=0]){const bad=structuredClone(p);modify(bad);assert.throws(()=>validateProject(bad,byId));}
});
test('ramp sorts mixed track orientations and input order, reverses without breaking joints',()=>{
 const pieces=[{...piece('reverse',500),angle:180},piece('start')],before=JSON.stringify(pieces);const plan=rampPlan(pieces,byId,0,10);assert.equal(plan.length,500);assert.equal(plan.grade,2);assert.equal(connections(plan.pieces,byId).pairs.length,1);assert.equal(JSON.stringify(pieces),before);const reversed=rampPlan(pieces,byId,0,10,true);assert.equal(connections(reversed.pieces,byId).pairs.length,1);assert.notEqual(plan.pieces.find(p=>p.id==='start').z,reversed.pieces.find(p=>p.id==='start').z);
 assert.equal(rampPlan([piece('a'),piece('disconnected',900)],byId,0,60).mode,'plane');assert.equal(rampPlan([piece('a'),piece('b',250),piece('overlap',250)],byId,0,60).mode,'plane');
});
test('snapping a sloped piece at either endpoint preserves its rise',()=>{
 const slope={...piece('s'),z:0,zEnd:10};for(const index of [0,1]){const target={x:500,y:100,z:80,angle:45};const snapped=snapToEndpoint(part,slope,index,target);assert.equal(snapped.zEnd-snapped.z,10);const e=worldGeometry(part,snapped).endpoints[index];assert.ok(Math.abs(e.z-80)<1e-9);assert.ok(Math.hypot(e.x-500,e.y-100)<1e-9);}
});
test('3D heights interpolate by traveled distance on curves and reversed slopes',()=>{
 const paths=elevatedPaths(curve,{...piece('arc'),partId:'c',z:60,zEnd:0});const pts=paths[0].points;assert.equal(pts[0].z,60);assert.equal(pts.at(-1).z,0);assert.ok(Math.abs(pts[Math.floor(pts.length/2)].z-30)<1);for(let i=1;i<pts.length;i++)assert.ok(pts[i].z<=pts[i-1].z);
});
test('terrain sums smooth patches; grade, terrain and crossing alerts respond to actual heights',()=>{
 const terrain=[{id:'hill',name:'山丘',type:'hill',x:125,y:100,rx:100,ry:100,height:30}];assert.equal(terrainHeight(terrain,125,100),30);assert.equal(terrainHeight(terrain,225,100),0);assert.equal(terrainHeight([...terrain,{...terrain[0],height:-10}],125,100),20);
 const p=project();p.pieces=[piece('a',0,100),{...piece('b',125,0,25),angle:90}];p.terrain=terrain;const warnings=elevationWarnings(p,byId);assert.ok(warnings.some(x=>x.includes('低于地形')));assert.ok(warnings.some(x=>x.includes('上下交叉')));p.pieces[1].z=p.pieces[1].zEnd=60;assert.ok(!elevationWarnings(p,byId).some(x=>x.includes('上下交叉')));p.pieces[0].zEnd=50;assert.ok(elevationWarnings(p,byId).some(x=>x.includes('坡度超过')));
});

test('shared ramp visible and editable in both layers, connects at destination height',async()=>{
 const {belongsToLayer,layerVisible}=await import('../dist/elevation-schema.js');
 const p=project();addLayer(p);const ground=p.layers[0].id;
 p.pieces=rampPlan(p.pieces,byId,0,60).pieces.map(q=>({...q,layerId:ground,ramp:{from:ground,to:'upper',t0:q.z/60,t1:q.zEnd/60}}));
 const before=JSON.stringify(p.pieces);for(const q of p.pieces){assert.ok(belongsToLayer(q,ground));assert.ok(belongsToLayer(q,'upper'));}
 p.layers[0].visible=false;assert.ok(p.pieces.every(q=>layerVisible(q,p.layers)));p.layers[1].visible=false;assert.ok(p.pieces.every(q=>!layerVisible(q,p.layers)));assert.equal(JSON.stringify(p.pieces),before);
 const top={...piece('top',500,0,60),layerId:'upper'};assert.equal(connections([...p.pieces,top],byId).pairs.length,2);assert.equal(connections([...p.pieces,{...top,z:0,zEnd:0}],byId).pairs.length,1);
});
