import test from 'node:test';
import assert from 'node:assert/strict';
import {worldGeometry,connections,validateProject} from '../dist/geometry.js';
import {closureLimits,closureAnalysis,acceptClosure,layoutConnections,pruneClosures} from '../dist/closures.js';
import {snapGroup} from '../dist/selection.js';
function fixture(L=200,R=300,gap=3){
 const part=(id,g)=>({id,sku:id,brand:'KATO',scale:'N',geometry:g});
 const byId={s:part('s',{type:'straight',length:L}),t:part('t',{type:'straight',length:L+gap}),c:part('c',{type:'curve',radius:R,angle:90})};
 let cursor={x:500,y:100,angle:0};const pieces=['s','c','c','t','c','c'].map((partId,i)=>{const p={id:'p'+i,partId,...cursor,flip:1,z:0,zEnd:0};cursor=worldGeometry(byId[partId],p).endpoints[1];return p;});
 return {byId,project:{version:1,name:'closure test',board:{width:1800,height:1200},pieces}};
}
function accept(f){const c=closureAnalysis(f.project,f.byId,{candidates:true}).candidates[0];assert.ok(c);acceptClosure(f.project,f.byId,c.a,c.b,'closure-1');return c;}
test('final loop gap accepted explicitly without changing dimensions; persists in JSON',()=>{
 const f=fixture(),before=structuredClone(f.project.pieces);assert.equal(connections(before,f.byId).open.length,2);
 const c=accept(f);assert.ok(Math.abs(c.gap-3)<1e-8);assert.ok(Math.abs(c.length-(403+600*Math.PI))<1e-8);
 const state=layoutConnections(f.project,f.byId);assert.equal(state.open.length,0);assert.equal(state.strictPairs.length,5);assert.equal(state.tolerated.length,1);assert.deepEqual(f.project.pieces,before);
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(f.project)),f.byId).closures,f.project.closures);
 assert.throws(()=>acceptClosure(f.project,f.byId,c.a,c.b,'duplicate'));
 const targets=[{...c.a,pieceId:'external',x:c.a.x+1}];assert.equal(snapGroup(f.project.pieces,f.byId,targets,10,{closures:f.project.closures}),null);
});
test('longer route has more allowance but remains capped; short loop is refused',()=>{
 assert.ok(closureLimits(3000).gap>closureLimits(1000).gap);assert.equal(closureLimits(100000).gap,8);assert.equal(closureLimits(100000).angle,3);
 const f=fixture(100,50),c=closureAnalysis(f.project,f.byId,{candidates:true}).candidates[0];assert.equal(c.eligible,false);assert.throws(()=>acceptClosure(f.project,f.byId,c.a,c.b,'bad'),/超过/);
});
test('unrelated branch paths and second rail do not inflate route length',()=>{
 const f=fixture(),expected=closureAnalysis(f.project,f.byId,{candidates:true}).candidates[0].length;
 const g=worldGeometry(f.byId.s,{id:'local',x:0,y:0,angle:0,flip:1,z:0});
 f.byId.s.geometry={type:'custom',paths:[...g.paths,{points:[{x:0,y:0},{x:0,y:10000}],length:10000},{points:[{x:0,y:33},{x:10000,y:33}],length:10000}],endpoints:g.endpoints};
 assert.equal(closureAnalysis(f.project,f.byId,{candidates:true}).candidates[0].length,expected);
});
test('disconnected routes, height or interface mismatches cannot be forced closed',()=>{
 for(const change of [f=>f.project.pieces.splice(2,1),f=>f.project.pieces[0].z=5,f=>f.byId.s.brand='TOMIX',f=>f.byId.s.scale='HO']){
 const f=fixture(),c=closureAnalysis(f.project,f.byId,{candidates:true}).candidates[0];change(f);assert.throws(()=>acceptClosure(f.project,f.byId,c.a,c.b,'bad'));assert.equal(closureAnalysis(f.project,f.byId,{candidates:true}).candidates.length,0);
 }
});
test('changed geometry invalidates accepted closure and reopens ends; deleted records prune',()=>{
 const f=fixture();accept(f);f.project.pieces.at(-1).x+=12;let state=layoutConnections(f.project,f.byId);assert.equal(state.tolerated.length,0);assert.equal(state.invalidClosures.length,1);assert.ok(state.open.length>=2);
 f.project.pieces.shift();pruneClosures(f.project);assert.equal(f.project.closures.length,0);
});
test('excessive angular mismatch refused even when final endpoints are near',()=>{
 const f=fixture(),c=closureAnalysis(f.project,f.byId,{candidates:true}).candidates[0];f.project.pieces.at(-1).angle+=4;assert.throws(()=>acceptClosure(f.project,f.byId,c.a,c.b,'bad'));
});
test('imports reject malformed, duplicate and missing closure endpoints',()=>{
 const f=fixture();accept(f);for(const edit of [p=>p.closures[0].a.index=999,p=>p.closures[0].a.pieceId='missing',p=>p.closures.push({...p.closures[0],id:'other'}),p=>p.closures[0].id='']){const p=structuredClone(f.project);edit(p);assert.throws(()=>validateProject(p,f.byId));}
});
