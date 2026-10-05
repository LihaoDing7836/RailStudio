import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {isScenery,sceneConfig,sceneCenterline,sceneryGeometry,validateScene,runwayNames,pathLength} from '../dist/scenery-geometry.js';
import {sceneryParts,sceneryMarkup,airportDemo} from '../dist/scenery.js';
import {geometry,worldGeometry,validateProject,connections,bounds} from '../dist/geometry.js';
import {rampPlan} from '../dist/elevation.js';
import {rotatePieces} from '../dist/selection.js';
const aircraft=JSON.parse(fs.readFileSync(new URL('../dist/data/aircraft.json',import.meta.url))).parts;
const tracks=JSON.parse(fs.readFileSync(new URL('../dist/catalog.json',import.meta.url))).parts;
const byId=Object.fromEntries([...aircraft,...sceneryParts,...tracks].map(p=>[p.id,p]));
const piece=(partId,scene={})=>({id:'item',partId,x:500,y:500,z:0,zEnd:0,angle:0,flip:1,scene});
const project=p=>({version:1,name:'机场',board:{width:4000,height:3000},pieces:p});
test('all preset aircraft use sourced 1:200 dimensions and have no railway endpoints or length',()=>{
 assert.ok(aircraft.length>=27);assert.equal(new Set(aircraft.map(p=>p.id)).size,aircraft.length);
 for(const p of aircraft){if(p.prototype){assert.match(p.source,/^https:\/\//);for(const [key,orig] of [['length','length'],['width','wingspan'],['height','height']])assert.ok(Math.abs(p.dimensions[key]-p.prototype[orig]*5)<1e-7);}
 const g=geometry(p);assert.equal(g.length,0);assert.equal(g.endpoints.length,0);const b=bounds([piece(p.id)],byId);assert.ok(Math.abs(b.maxX-b.minX-p.dimensions.length)<1e-7);assert.ok(Math.abs(b.maxY-b.minY-p.dimensions.width)<1e-7);assert.ok(g.paths.every(p=>p.points.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y))));}
});
test('airport demo roundtrips all configurable geometry and is isolated from track connectivity',()=>{
 const demo=airportDemo(aircraft),copy=validateProject(demo,byId),again=validateProject(JSON.parse(JSON.stringify(copy)),byId);assert.deepEqual(copy,again);assert.equal(copy.pieces.length,demo.pieces.length);assert.equal(connections(copy.pieces,byId).endpoints.length,0);assert.equal(copy.pieces.reduce((n,p)=>n+geometry(byId[p.partId],p).length,0),0);assert.throws(()=>rampPlan(copy.pieces,byId,0,60),/至少选择/);
});
test('road width, smooth bends and rotated footprint remain consistent with model dimensions',()=>{
 const part=byId['SCENE-ROAD'],p=piece(part.id,{points:[{x:0,y:0},{x:200,y:0},{x:200,y:200}],width:40,curved:true});const center=sceneCenterline(part,p);assert.deepEqual(center[0],{x:0,y:0});assert.deepEqual(center.at(-1),{x:200,y:200});assert.ok(center.length>3);assert.ok(pathLength(center)<400);const b=bounds([p],byId);assert.equal(b.minY,480);const rotated=rotatePieces([p],{x:500,y:500},90)[0];assert.ok(Math.abs(worldGeometry(part,rotated).paths[0].points[0].z)<1e-8);assert.deepEqual(rotated.scene,p.scene);
});
test('airport labels escape HTML and runway opposite ends swap L/R correctly',()=>{
 assert.deepEqual(runwayNames({runwayNumber:36,runwaySide:'L'}),['36L','18R']);assert.deepEqual(runwayNames({runwayNumber:9,runwaySide:''}),['09','27']);const p=piece('SCENE-STAND',{label:'<script>bad</script>'});assert.ok(!sceneryMarkup(byId[p.partId],p).includes('<script>'));assert.match(sceneryMarkup(byId[p.partId],p),/&lt;script&gt;/);
});
test('invalid scene sizes, runway designators and degenerate/self-crossing polygons are rejected',()=>{
 for(const p of [piece('AIR-200-A320neo',{width:-5}),piece('SCENE-ROAD',{lanes:9}),piece('SCENE-RUNWAY',{runwayNumber:37}),piece('SCENE-RUNWAY',{runwaySide:'bad'}),piece('SCENE-ROAD',{points:[{x:0,y:0},{x:0,y:0}]}),piece('SCENE-APRON',{points:[{x:0,y:0},{x:100,y:100},{x:0,y:100},{x:100,y:0}]}),piece('SCENE-ROAD',{color:'url(bad)'}),{...piece('AIR-200-A320neo'),zEnd:50}])assert.throws(()=>validateProject(project([p]),byId));
 const p=piece('SCENE-ROAD',{points:Array.from({length:65},(_,i)=>({x:i*10,y:0}))});assert.throws(()=>validateScene(byId[p.partId],p));
});
test('editing one copied scene does not mutate normalized imports or catalogue defaults',()=>{
 const p=piece('SCENE-ROAD',{points:[{x:0,y:0},{x:100,y:0}],width:40}),before=structuredClone(p);const saved=validateProject(project([p]),byId);saved.pieces[0].scene.points[1].x=200;assert.deepEqual(p,before);assert.equal(sceneConfig(byId[p.partId]).width,35);
});

test('3D aircraft match footprint and total height, remain above ground and rotate with the plan',async()=>{
 const {createScenery3D}=await import('../dist/scenery3d.js');const THREE=await import('../dist/lib/three/three.module.js');
 for(const part of aircraft){const p=piece(part.id);const group=createScenery3D(part,p),box=new THREE.Box3().setFromObject(group),size=box.getSize(new THREE.Vector3());assert.ok(Math.abs(size.x-part.dimensions.length)<.01,part.id);assert.ok(Math.abs(size.z-part.dimensions.width)<.01,part.id);assert.ok(Math.abs(box.max.y-part.dimensions.height)<.01,part.id);assert.ok(box.min.y>=-.01,part.id);group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
 assert.throws(()=>validateScene(byId['AIR-200-CUSTOM'],piece('AIR-200-CUSTOM',{height:0})));
});
