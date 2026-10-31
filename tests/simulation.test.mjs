import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildRailNetwork,traceRoute,sampleRoute,trainBounds,trainPoses,advanceTrain} from '../dist/simulation.js';
import {worldGeometry,demoProject,line,snapToEndpoint} from '../dist/geometry.js';
import {acceptClosure,closureAnalysis} from '../dist/closures.js';

const near=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const part=(id,geometry,extra={})=>({id,sku:id,brand:'KATO',scale:'N',geometry,...extra});
const piece=(id,partId,x=0,y=0,angle=0,z=0,zEnd=z)=>({id,partId,x,y,angle,z,zEnd,flip:1});
const project=pieces=>({version:1,name:'模拟运行',board:{width:2400,height:1400},pieces});
const straight=part('s',{type:'straight',length:200});
const officialCatalog=JSON.parse(fs.readFileSync(new URL('../dist/catalog.json',import.meta.url))),officialParts=Object.fromEntries(officialCatalog.parts.map(p=>[p.id,p]));

function loop(radius=300,gap=0){
 const byId={s:straight,t:part('t',{type:'straight',length:200+gap}),c:part('c',{type:'curve',radius,angle:90})};
 let cursor={x:500,y:100,angle:0};
 const pieces=['s','c','c','t','c','c'].map((id,i)=>{const p={...piece(`p${i}`,id),...cursor};cursor=worldGeometry(byId[id],p).endpoints[1];return p;});
 return {byId,project:project(pieces)};
}

test('different-radius circles run through their own route and wrap continuously',()=>{
 for(const radius of [100,280,315,500]){
  const f=loop(radius),network=buildRailNetwork(f.project,f.byId),route=traceRoute(network,{pieceId:'p0'});
  assert.equal(route.closed,true);assert.equal(route.steps.length,6);near(route.length,400+2*Math.PI*radius,.4);
  const p=sampleRoute(route,22),wrapped=sampleRoute(route,route.length*3+22);near(p.x,wrapped.x);near(p.y,wrapped.y);
  const before=sampleRoute(route,route.length-.001),after=sampleRoute(route,.001);assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<.003);
 }
});

test('existing double-loop demo keeps both physical tracks separate',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../dist/catalog.json',import.meta.url))),byId=Object.fromEntries(catalog.parts.map(p=>[p.id,p])),p=demoProject(byId),network=buildRailNetwork(p,byId);
 const inner=traceRoute(network,{pieceId:p.pieces[0].id}),outer=traceRoute(network,{pieceId:p.pieces[12].id});
 assert.ok(inner.closed&&outer.closed);assert.equal(inner.steps.length,12);assert.equal(outer.steps.length,12);assert.notEqual(inner.length,outer.length);
 assert.ok(inner.steps.every(s=>!outer.steps.some(t=>t.edgeId===s.edgeId)));
});

test('actual TOMIX C280/C317 and KATO R315 tracks make connected runnable circles',()=>{
 for(const id of ['TOMIX-N-1851','TOMIX-N-1852','KATO-N-20-120']){
  const p=officialParts[id],count=Math.round(360/p.geometry.angle),pieces=[];let cursor={x:500,y:100,angle:0};
  for(let i=0;i<count;i++){const instance={...piece(`real-${i}`,id),...cursor};pieces.push(instance);cursor=worldGeometry(p,instance).endpoints[1];}
  const route=traceRoute(buildRailNetwork(project(pieces),officialParts),{pieceId:'real-0'});
  assert.equal(route.closed,true,id);assert.equal(route.steps.length,count,id);near(route.length,2*Math.PI*p.geometry.radius,.5);assert.equal(route.warnings.length,0);
 }
});

test('actual custom KATO and TOMIX turnouts run from attached entry rails through every exit',()=>{
 for(const id of ['KATO-N-20-202','KATO-N-20-203','TOMIX-N-1271','TOMIX-N-1272'])for(const flip of [1,-1]){
  const turnout=officialParts[id],rail=officialParts[turnout.brand==='KATO'?'KATO-N-20-000':'TOMIX-N-1802'],placed={...piece('turnout',id,500,400,73,30),flip},g=worldGeometry(turnout,placed);
  const neighbors=g.endpoints.map((e,i)=>snapToEndpoint(rail,piece(`neighbor-${i}`,rail.id),0,e));
  const network=buildRailNetwork(project([placed,...neighbors]),officialParts);
  for(const pathIndex of [0,1]){
   const route=traceRoute(network,{pieceId:'turnout',pathIndex}),visited=new Set(route.steps.map(s=>network.edges[s.edgeId].pieceId));
   assert.equal(visited.size,3,`${id} path ${pathIndex} must reach two neighbouring rails`);assert.ok(visited.has('neighbor-0'));
   assert.ok(route.length>rail.geometry.length*2);near(route.points[0].z,30);near(route.points.at(-1).z,30);
   if(id.startsWith('KATO')&&pathIndex===1){assert.ok(route.segments.some(s=>s.approximate));assert.ok(route.warnings.some(s=>s.includes('坐标误差')));}
  }
 }
});

test('nearby matching imported ports bridge small metadata errors, never distant or wrong-facing ends',()=>{
 for(const [gap,angle,connect] of [[.4,0,true],[.7,0,false],[.4,90,false]]){
  const custom=part('custom',{type:'custom',paths:[line(100)],endpoints:[{x:0,y:0,angle:180},{x:100+gap,y:0,angle}]}),origin=piece('custom','custom'),port=worldGeometry(custom,origin).endpoints[1],neighbor=snapToEndpoint(straight,piece('neighbor','s'),0,port),network=buildRailNetwork(project([origin,neighbor]),{custom,s:straight}),route=traceRoute(network,{pieceId:'custom'});
  assert.equal(route.steps.length,connect?2:1);if(connect){near(route.length,300.4);assert.ok(route.warnings.some(s=>s.includes('坐标误差')));}else assert.ok(route.warnings.some(s=>s.includes('保持断开')));
 }
});

test('open line extends both ways from selected track, and reverse preserves physical route',()=>{
 const p=project([piece('a','s'),piece('b','s',200),piece('c','s',400)]),network=buildRailNetwork(p,{s:straight});
 const route=traceRoute(network,{pieceId:'b'}),reverse=traceRoute(network,{pieceId:'b',reverse:true});
 assert.equal(route.closed,false);near(route.length,600);near(route.startDistance,300);near(route.points[0].x,0);near(route.points.at(-1).x,600);
 near(reverse.points[0].x,600);near(reverse.points.at(-1).x,0);near(sampleRoute(reverse,100).x,sampleRoute(route,500).x);
 assert.ok(sampleRoute(reverse,100).tangent.x<0);
});

test('gaps, brands, scale, plugs and elevation mismatches stop the train network',()=>{
 for(const [other,second] of [
  [straight,piece('b','s',202)],
  [part('other',{type:'straight',length:200},{brand:'TOMIX'}),piece('b','other',200)],
  [part('other',{type:'straight',length:200},{scale:'HO'}),piece('b','other',200)],
  [straight,piece('b','s',200,0,0,2)],
 ]){
  const network=buildRailNetwork(project([piece('a','s'),second]),{s:straight,[other.id]:other});near(traceRoute(network,{pieceId:'a'}).length,200);
 }
 const plug=part('p',{type:'straight',length:200},{brand:'PLARAIL',scale:'PLARAIL',plugs:['male','male']});
 near(traceRoute(buildRailNetwork(project([piece('a','p'),piece('b','p',200)]),{p:plug}),{pieceId:'a'}).length,200);
});

test('diamond crossing and double tracks cannot switch between intersecting lines',()=>{
 const cross=part('x',{type:'crossing',length:200,angle:90}),double=part('d',{type:'doubleStraight',length:200,spacing:33});
 for(const p of [cross,double]){
  const network=buildRailNetwork(project([piece('a',p.id)]),{[p.id]:p}),a=traceRoute(network,{pieceId:'a',pathIndex:0}),b=traceRoute(network,{pieceId:'a',pathIndex:1});
  near(a.length,200);near(b.length,200);assert.equal(a.steps.length,1);assert.equal(b.steps.length,1);assert.equal(network.switches.length,0);
 }
});

test('turnout direction is chosen in advance and never jumps directly between branches',()=>{
 const turn=part('t',{type:'turnout',length:200,radius:300,angle:30}),p=project([piece('entry','s',-200),piece('switch','t')]),network=buildRailNetwork(p,{s:straight,t:turn});
 assert.equal(network.switches.length,1);const junction=network.switches[0];assert.equal(junction.options.length,2);
 const straightRoute=traceRoute(network,{pieceId:'entry',switches:{[junction.id]:0}}),branchRoute=traceRoute(network,{pieceId:'entry',switches:{[junction.id]:1}});
 near(straightRoute.length,400);near(branchRoute.length,200+300*Math.PI/6,.1);assert.ok(branchRoute.points.at(-1).y>30);
 const trailing=traceRoute(network,{pieceId:'switch',pathIndex:0,reverse:true,switches:{[junction.id]:1}});
 near(trailing.length,400);assert.ok(trailing.steps.every(s=>network.edges[s.edgeId].pathIndex===0));
});

test('imported custom paths join at physical segment ends even with reversed segment orientation',()=>{
 const custom=part('custom',{type:'custom',paths:[line(50),line(50,100,0,180),line(80,100),line(80,100,0,25)],endpoints:[{x:0,y:0,angle:180},{x:180,y:0,angle:0},{x:100+80*Math.cos(25*Math.PI/180),y:80*Math.sin(25*Math.PI/180),angle:25}]});
 const network=buildRailNetwork(project([piece('entry','s',-200),piece('custom','custom')]),{s:straight,custom}),junction=network.switches[0];
 const route=traceRoute(network,{pieceId:'entry',switches:{[junction.id]:3}});near(route.length,380);assert.equal(route.steps.length,4);assert.ok(route.points.at(-1).y>30);
});

test('slope height, car pitch and top-floor continuity follow actual 3D paths',()=>{
 const p=project([piece('a','s',0,0,0,0,20),piece('b','s',200,0,0,20),piece('wrong-floor','s',400)]),route=traceRoute(buildRailNetwork(p,{s:straight}),{pieceId:'a'});
 near(route.length,Math.hypot(200,20)+200);const pos=sampleRoute(route,Math.hypot(100,10));near(pos.x,100);near(pos.z,10);near(pos.pitch,Math.atan(.1));
 const cars=trainPoses(route,{distance:100,carCount:1,carLength:60,gap:5});near(cars[0].pitch,Math.atan(.1));assert.ok(route.steps.length===2);
});

test('only valid explicitly accepted closure records can complete a loop',()=>{
 const f=loop(300,3),before=traceRoute(buildRailNetwork(f.project,f.byId),{pieceId:'p0'});assert.equal(before.closed,false);
 const c=closureAnalysis(f.project,f.byId,{candidates:true}).candidates[0];acceptClosure(f.project,f.byId,c.a,c.b,'loop-gap');
 const route=traceRoute(buildRailNetwork(f.project,f.byId),{pieceId:'p0'});assert.equal(route.closed,true);assert.ok(route.warnings.some(s=>s.includes('容差闭合')));assert.ok(route.segments.some(s=>s.tolerated));
 f.project.pieces.at(-1).x+=20;const invalid=traceRoute(buildRailNetwork(f.project,f.byId),{pieceId:'p0'});assert.equal(invalid.closed,false);assert.ok(invalid.warnings.some(s=>s.includes('失效')));
});

test('car spacing is arc-length based and a long consist is rejected rather than scaled',()=>{
 const f=loop(),route=traceRoute(buildRailNetwork(f.project,f.byId),{pieceId:'p0'}),state={distance:350,carCount:4,carLength:100,gap:7};
 const cars=trainPoses(route,state);assert.equal(cars.length,4);for(let i=1;i<cars.length;i++)near((cars[i-1].distance-cars[i].distance+route.length)%route.length,107);
 assert.ok(cars.every(c=>Number.isFinite(c.heading)&&Number.isFinite(c.pitch)));
 const tooLong={...state,carCount:32,carLength:200};assert.equal(trainBounds(route,tooLong).fits,false);assert.equal(trainPoses(route,tooLong).length,0);assert.equal(advanceTrain(route,tooLong,1).stopped,true);
});

test('rigid car body follows the chord between bogies and shifts inward on a curve',()=>{
 const curve=part('curve',{type:'curve',radius:200,angle:90}),route=traceRoute(buildRailNetwork(project([piece('curve','curve')]),{curve}),{pieceId:'curve'}),distanceAlong=route.length/2,state={distance:distanceAlong,carCount:1,carLength:100,gap:5},car=trainPoses(route,state)[0],centreLine=sampleRoute(route,distanceAlong),front=sampleRoute(route,distanceAlong+32),back=sampleRoute(route,distanceAlong-32);
 near(car.x,(front.x+back.x)/2);near(car.y,(front.y+back.y)/2);near(car.distance,centreLine.distance);
 assert.ok(Math.hypot(car.x,car.y-200)<Math.hypot(centreLine.x,centreLine.y-200));assert.ok(Number.isFinite(car.heading)&&Number.isFinite(car.pitch));near(car.heading,Math.PI/4,.02);
});

test('open-line stops keep every car on rails and reversing never teleports or swaps cars',()=>{
 const route=traceRoute(buildRailNetwork(project([piece('a','s'),piece('b','s',200),piece('c','s',400)]),{s:straight}),{pieceId:'a'});
 const base={distance:350,carCount:3,carLength:80,gap:10,speed:100,direction:1};
 const bounds=trainBounds(route,base);near(bounds.min,220);near(bounds.max,560);
 const end=advanceTrain(route,base,20);near(end.distance,560);assert.equal(end.stopped,true);const atEnd=trainPoses(route,end);
 const reverse={...end,direction:-1},unchanged=trainPoses(route,reverse);assert.deepEqual(unchanged,atEnd);
 const backing=advanceTrain(route,reverse,.2);near(backing.distance,540);assert.equal(backing.stopped,false);
 const start=advanceTrain(route,backing,20);near(start.distance,220);assert.equal(start.stopped,true);
 const cars=trainPoses(route,start);near(cars.at(-1).x,40);near(cars[0].x,220);assert.ok(cars.every(c=>c.tangent.x>0));
});

test('non-track objects and empty layouts produce no runnable paths',()=>{
 const building=part('b',{type:'building'},{kind:'building',dimensions:{width:200,depth:100}}),network=buildRailNetwork(project([piece('building','b')]),{b:building});
 assert.equal(network.edges.length,0);assert.equal(network.pieces.length,0);const route=traceRoute(network,{pieceId:'building'});assert.equal(route.length,0);assert.equal(sampleRoute(route,0),null);
});

test('mixed vehicle lengths use actual consist extent and centre spacing at both end stops',()=>{
 const route=traceRoute(buildRailNetwork(project(Array.from({length:5},(_,i)=>piece(`p${i}`,'s',i*200))),{s:straight}),{pieceId:'p0'}),state={distance:700,speed:100,direction:1,carCount:99,carLength:999,couplerGap:10,gap:500,carSpecs:[{length:200,bogieOffsets:[-64,48]},{length:100},{length:150,bogieOffsets:[48,-36]}]};
 const bounds=trainBounds(route,state);assert.equal(bounds.fits,true);near(bounds.length,470);near(bounds.min,370);near(bounds.max,900);
 const cars=trainPoses(route,state);assert.deepEqual(cars.map(c=>c.carLength),[200,100,150]);assert.deepEqual(cars.map(c=>c.distance),[700,540,405]);assert.deepEqual(cars[2].bogieOffsets,[-36,48]);
 const end=advanceTrain(route,state,20),endCars=trainPoses(route,end);near(end.distance,900);near(endCars[0].x+100,1000);assert.equal(end.stopped,true);
 const reversed={...end,direction:-1};assert.deepEqual(trainPoses(route,reversed),endCars);
 const moved=advanceTrain(route,reversed,.1);near(moved.distance,890);assert.equal(moved.stopped,false);for(let i=0;i<cars.length;i++)near(trainPoses(route,moved)[i].x,endCars[i].x-10);
 const start=advanceTrain(route,moved,20),startCars=trainPoses(route,start);near(start.distance,370);near(startCars.at(-1).x-75,0);assert.equal(start.stopped,true);assert.ok(startCars.every(c=>c.tangent.x>0));
});

test('asymmetric bogie positions locate the body origin by their actual chord on curves',()=>{
 const f=loop(),route=traceRoute(buildRailNetwork(f.project,f.byId),{pieceId:'p0'}),state={distance:420,couplerGap:7,carSpecs:[{length:180,bogieOffsets:[-60,40]},{length:100,bogieOffsets:[-28,35]},{length:160,bogieOffsets:[-40,55]}]},before=JSON.stringify(state),cars=trainPoses(route,state);
 assert.equal(JSON.stringify(state),before);assert.deepEqual(cars.map(c=>c.carLength),[180,100,160]);
 for(let i=0;i<cars.length;i++){
  const car=cars[i],[rear,front]=state.carSpecs[i].bogieOffsets,a=sampleRoute(route,car.distance+rear),b=sampleRoute(route,car.distance+front),t=-rear/(front-rear);
  near(car.x,a.x+(b.x-a.x)*t);near(car.y,a.y+(b.y-a.y)*t);near(car.z,a.z+(b.z-a.z)*t);assert.ok(Number.isFinite(car.heading)&&Number.isFinite(car.pitch));
  if(i)near((cars[i-1].distance-car.distance+route.length)%route.length,(state.carSpecs[i-1].length+state.carSpecs[i].length)/2+7);
 }
 assert.ok(Math.hypot(cars[0].x-(sampleRoute(route,360).x+sampleRoute(route,460).x)/2,cars[0].y-(sampleRoute(route,360).y+sampleRoute(route,460).y)/2)>5,'asymmetric axle midpoint must not become the body centre');
 const wrapState={...state,distance:10},wrapped=trainPoses(route,wrapState);assert.equal(wrapped.length,3);assert.ok(wrapped.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.heading)));
});

test('mixed cab and trailer poses follow grades without a position jump when reversing',()=>{
 const p=project([piece('a','s',0,0,0,0,20),piece('b','s',200,0,0,20,40),piece('c','s',400,0,0,40,60)]),route=traceRoute(buildRailNetwork(p,{s:straight}),{pieceId:'a'}),state={distance:420,speed:30,direction:1,couplerGap:5,carSpecs:[{length:150,bogieOffsets:[-50,30]},{length:90,bogieOffsets:[-29,29]},{length:130,bogieOffsets:[-30,45]}]},cars=trainPoses(route,state);
 assert.equal(cars.length,3);for(const c of cars){near(c.z,c.x*.1);near(c.pitch,Math.atan(.1));}
 const reverse={...state,direction:-1};assert.deepEqual(trainPoses(route,reverse),cars);const moved=trainPoses(route,advanceTrain(route,reverse,.1));for(let i=0;i<cars.length;i++){assert.ok(moved[i].x<cars[i].x);near(moved[i].pitch,cars[i].pitch);}
});

test('legacy uniform API and missing bogie offsets remain compatible; malformed specs are rejected',()=>{
 const route=traceRoute(buildRailNetwork(project([piece('a','s'),piece('b','s',200),piece('c','s',400)]),{s:straight}),{pieceId:'a'}),legacy={distance:400,carCount:3,carLength:100,gap:7},specs={...legacy,carSpecs:[{length:100},{length:100},{length:100}]};
 assert.deepEqual(trainBounds(route,legacy),trainBounds(route,specs));assert.deepEqual(trainPoses(route,legacy),trainPoses(route,specs));assert.deepEqual(trainPoses(route,{...legacy,carSpecs:undefined}),trainPoses(route,legacy));
 for(const carSpecs of [null,[],[{length:NaN}],[{length:-1}],[{length:100,bogieOffsets:[0,0]}],[{length:100,bogieOffsets:[-60,30]}],[{length:100,bogieOffsets:[-30,Infinity]}],[{length:100,bogieOffsets:null}],Array(2)]){
  const state={...legacy,carSpecs};assert.equal(trainBounds(route,state).fits,false);assert.equal(trainPoses(route,state).length,0);const advanced=advanceTrain(route,state,1);assert.equal(advanced.stopped,true);assert.equal(advanced.fits,false);
 }
 assert.equal(trainBounds(route,{...specs,couplerGap:-1}).fits,false);
 const tooLong={...legacy,carSpecs:[{length:350},{length:300}]};assert.equal(trainBounds(route,tooLong).fits,false);assert.match(trainBounds(route,tooLong).reason,/657 mm/);
 // Body origin interpolation also works when both bogies lie on one side.
 const extrapolated=trainPoses(route,{distance:200,carSpecs:[{length:100,bogieOffsets:[10,40]}]})[0];near(extrapolated.x,200);
});
