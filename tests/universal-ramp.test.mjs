import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rampPlan,elevatedPaths,maximumGrade} from '../dist/elevation.js';
import {geometry,worldGeometry,connections,snapToEndpoint,validateProject,demoProject} from '../dist/geometry.js';
import {ensureLevels,shiftLayer,worldSlopeGradient} from '../dist/elevation-schema.js';
import {rotatePieces,snapGroup} from '../dist/selection.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../dist/catalog.json',import.meta.url))),byId=Object.fromEntries(catalog.parts.map(p=>[p.id,p]));
const piece=(partId,id='p',x=0,y=0,angle=0,flip=1)=>({id,partId,x,y,angle,flip,z:0,zEnd:0});
const close=(a,b,msg='')=>assert.ok(Math.abs(a-b)<1e-7,msg+': '+a+' vs '+b);
const coords=p=>worldGeometry(byId[p.partId],p);
const plans=()=>catalog.parts.filter(p=>p.geometry.type&&p.kind!=='building');
function attach(partId,id,target,localIndex=0){return snapToEndpoint(byId[partId],piece(partId,id),localIndex,target);}
test('every placeable catalog track supports a finite ramp, including mirrored and rotated variants',()=>{
 let count=0;for(const part of plans())for(const flip of [1,-1]){const p=piece(part.id,'p',200,300,37,flip),r=rampPlan([p],byId,0,60);assert.equal(r.pieces.length,1,part.id);assert.ok(Number.isFinite(r.grade),part.id);const paths=elevatedPaths(part,r.pieces[0]);for(const q of paths.flatMap(p=>p.points)){assert.ok(Number.isFinite(q.z),part.id);assert.ok(q.z>=-1e-7&&q.z<=60+1e-7,part.id);}const doc=ensureLevels({version:1,name:'test',board:{width:1800,height:1000},pieces:r.pieces});assert.doesNotThrow(()=>validateProject(doc,byId),part.id);count++;}assert.ok(count>400);
});
test('double curves and successive double straight/curve pieces share cross-section heights',()=>{
 const part=plans().find(p=>p.geometry.type==='doubleCurve'),p=piece(part.id),q=attach(part.id,'next',coords(p).endpoints[1]),r=rampPlan([q,p],byId,0,40);assert.equal(r.mode,'route');assert.equal(connections(r.pieces,byId).pairs.length,2);for(const p of r.pieces){const g=coords(p);close(g.endpoints[0].z,g.endpoints[2].z);close(g.endpoints[1].z,g.endpoints[3].z);const paths=elevatedPaths(part,p);close(paths[0].points[0].z,paths[1].points[0].z);close(paths[0].points.at(-1).z,paths[1].points.at(-1).z);}assert.ok(r.grade>=Math.abs(40/r.length*100));
});
test('turnout with both branches selected gets continuous heights at all joins',()=>{
 const turnout=plans().find(p=>p.brand==='TOMIX'&&p.scale==='N'&&p.category==='道岔'&&geometry(p).endpoints.length===3),straight=plans().find(p=>p.brand==='TOMIX'&&p.scale==='N'&&p.geometry.type==='straight'),root=piece(turnout.id),ports=coords(root).endpoints;
 const before=[root,attach(straight.id,'main',ports[1]),attach(straight.id,'branch',ports[2])],r=rampPlan(before,byId,10,80);assert.equal(r.mode,'plane');assert.equal(connections(r.pieces,byId).pairs.length,2);const shared=coords(r.pieces[0]).paths.map(p=>p.points[0]);close(shared[0].z,shared[1].z);const reverse=rampPlan(before,byId,10,80,true,{mode:'plane',angle:r.angle});for(let i=0;i<r.pieces.length;i++)coords(r.pieces[i]).endpoints.forEach((p,j)=>close(p.z+coords(reverse.pieces[i]).endpoints[j].z,90));
});
test('crossing tracks have exactly one height at their intersection and variable port elevations',()=>{
 const cross=plans().find(p=>p.geometry.type==='crossing'),p=piece(cross.id,'cross',150,200,23,-1),r=rampPlan([p],byId,0,30,false,{mode:'plane',angle:55});const paths=elevatedPaths(cross,r.pieces[0]);const middle=path=>{const a=path.points[0],b=path.points.at(-1);return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2};};const a=middle(paths[0]),b=middle(paths[1]);close(a.x,b.x);close(a.y,b.y);close(a.z,b.z);assert.ok(new Set(coords(r.pieces[0]).endpoints.map(p=>p.z.toFixed(4))).size>2);
});
test('closed loops use a continuous plane without a height seam',()=>{
 const layout=demoProject(byId),r=rampPlan(layout.pieces,byId,0,60);assert.equal(r.mode,'plane');assert.equal(connections(r.pieces,byId).open.length,0);assert.equal(connections(r.pieces,byId).pairs.length,24);
});
test('slope planes survive JSON roundtrip, layer changes, rotation, group snaps and further connections',()=>{
 const part=plans().find(p=>p.geometry.type==='crossing'),r=rampPlan([piece(part.id,'cross')],byId,0,40),p=ensureLevels({version:1,name:'坡面',board:{width:1800,height:1000},pieces:r.pieces});p.layers=[{id:'a',name:'地面',height:0,color:'#366c58',visible:true},{id:'b',name:'高架',height:40,color:'#598db7',visible:true}];Object.assign(p.pieces[0],{layerId:'a',ramp:{from:'a',to:'b',t0:0,t1:1}});const restored=validateProject(JSON.parse(JSON.stringify(p)),byId);const old=coords(restored.pieces[0]).endpoints;shiftLayer(restored,'b',80);coords(restored.pieces[0]).endpoints.forEach((e,i)=>close(e.z,old[i].z*2));const rotated=rotatePieces(restored.pieces,{x:0,y:0},47)[0];coords(rotated).endpoints.forEach((e,i)=>close(e.z,old[i].z*2));
 const target={...coords(rotated).endpoints[1],pieceId:'outside',x:450,y:500,z:90};const snapped=snapToEndpoint(part,rotated,1,target);close(coords(snapped).endpoints[1].z,90);const outside={...coords(rotated).endpoints[0],pieceId:'outside',x:coords(rotated).endpoints[0].x+2,angle:coords(rotated).endpoints[0].angle+180,z:coords(rotated).endpoints[0].z+.2};const group=snapGroup([rotated],byId,[outside],10);assert.ok(group);close(coords(group[0]).endpoints[0].z,outside.z);
});
test('manual slope heights, grade alerts and import validation use all paths',()=>{
 const part=plans().find(p=>p.geometry.type==='doubleCrossing'),p=rampPlan([piece(part.id)],byId,0,80,false,{mode:'plane',angle:90}).pieces[0];const grades=elevatedPaths(part,p).map(path=>Math.abs(path.points.at(-1).z-path.points[0].z)/path.length*100);close(maximumGrade(part,p),Math.max(...grades));assert.ok(grades.some(g=>g<1e-7));assert.ok(grades.some(g=>g>1));const doc=ensureLevels({version:1,name:'test',board:{width:1800,height:1000},pieces:[p]});for(const slope of [{a:Infinity,b:0,c:0},{a:1,b:1,c:1e9},null])assert.throws(()=>validateProject({...doc,pieces:[{...p,slope}]},byId));
});

test('3D rail and sleeper offsets follow the same plane after rotation and mirroring',()=>{
 const part=plans().find(p=>p.geometry.type==='crossing');for(const flip of [1,-1]){const p=rampPlan([piece(part.id,'p',140,200,35,flip)],byId,0,30,false,{mode:'plane',angle:60}).pieces[0],g=worldSlopeGradient(p),path=coords(p).paths[0].points,a=path[0],b=path.at(-1);close(a.z+g.x*(b.x-a.x)+g.y*(b.y-a.y),b.z);close(g.x,30/rampPlan([piece(part.id,'p',140,200,35,flip)],byId,0,30,false,{mode:'plane',angle:60}).length*.5);}
});
