import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as geometry from '../dist/geometry.js';
import * as selection from '../dist/selection.js';
import * as closures from '../dist/closures.js';

const catalog=JSON.parse(fs.readFileSync(new URL('../dist/catalog.json',import.meta.url)));
const byId=Object.fromEntries(catalog.parts.map(p=>[p.id,p]));
const piece=(id,x,y)=>({id,partId:'KATO-N-20-000',x,y,angle:0,flip:1,z:0,zEnd:0});

// Exercise the application's real pointer/keyboard handlers without a browser.
// Replace rendering and storage only; geometry, selection and history stay real.
function editor(){
 const elements=new Map(),windowEvents=new Map(),captures=new Set();
 function element(key){
  if(!elements.has(key))elements.set(key,{events:new Map(),style:{},value:'50',checked:false,open:false,
   addEventListener(name,fn){this.events.set(name,fn);},focus(){},
   setPointerCapture(id){captures.add(id);},hasPointerCapture(id){return captures.has(id);},releasePointerCapture(id){captures.delete(id);},
   clientWidth:1000,getBoundingClientRect:()=>({width:1000,height:600}),
   createSVGPoint(){return {x:0,y:0,matrixTransform(){return {x:this.x*2+10,y:this.y*2+20};}};},
   getScreenCTM:()=>({inverse:()=>({})}),classList:{toggle(){}}});
  return elements.get(key);
 }
 const context=vm.createContext({...geometry,...selection,...closures,URLSearchParams,location:{search:'?qa=1'},
  document:{querySelector:element,querySelectorAll:()=>[]},
  window:{addEventListener:(name,fn)=>windowEvents.set(name,fn)},ResizeObserver:class{observe(){}},
  setTimeout,clearTimeout,console});
 const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8')
  .replace(/^import .*;\n/gm,'').split('try{const response=await fetch')[0];
 vm.runInContext(source+`
 render=()=>{};renderCanvas=()=>{};renderInspector=()=>{};renderLibrary=()=>{};persist=()=>{};
 globalThis.editor={init(data,parts){project=data;byId=parts;setup();},
 state:()=>({project,selected:[...selected],gesture,history,view}),
 select:ids=>{selected.clear();ids.forEach(id=>selected.add(id));}};`,context);
 context.editor.init({version:1,name:'Test',board:{width:1800,height:1000},pieces:[piece('a',50,80),piece('b',50,180),piece('c',600,80)]},byId);
 const empty={closest:()=>null,matches:()=>false};
 return {state:()=>context.editor.state(),select:ids=>context.editor.select(ids),captures,
  pointer(name,x,y,options={}){const {id,handle,...rest}=options;const target=handle?{closest:s=>s==='[data-rotate-handle]'?{}:null}:id?{closest:s=>s==='[data-piece]'?{dataset:{piece:id}}:null}:empty;
   element('#canvas').events.get(name)({clientX:x,clientY:y,pointerId:1,button:0,isPrimary:true,shiftKey:false,preventDefault(){},target,...rest});},
  key(key,options={}){windowEvents.get('keydown')({key,code:key,preventDefault(){},target:empty,...options});},
  blur(){windowEvents.get('blur')();}};
}
const ids=e=>Array.from(e.state().selected).sort();
test('rotation handle rotates a group freely, supports undo and cancellation',()=>{
 const e=editor();e.select(['a','b']);const before=JSON.stringify(e.state().project);
 e.pointer('pointerdown',60,10,{handle:true});e.pointer('pointermove',133,10);e.pointer('pointerup',133,10);
 assert.equal(e.state().project.pieces[0].angle,36.5);
 assert.equal(e.state().project.pieces[1].angle,36.5);
 assert.ok(Math.abs(Math.hypot(e.state().project.pieces[0].x-e.state().project.pieces[1].x,e.state().project.pieces[0].y-e.state().project.pieces[1].y)-100)<1e-8);
 assert.equal(e.state().history.length,1);e.key('z',{ctrlKey:true});assert.equal(JSON.stringify(e.state().project),before);
 e.select(['a']);e.pointer('pointerdown',60,10,{handle:true});e.pointer('pointermove',200,10);e.key('Escape');assert.equal(JSON.stringify(e.state().project),before);
});
test('group snap preserves internal connections, slopes and compatibility',()=>{
 const group=[piece('a',0,0),piece('b',248,0)],target={...piece('target',510,5),angle:35};
 const snapped=selection.snapGroup(group,byId,geometry.connections([target],byId).open,30);
 assert.ok(snapped);assert.equal(geometry.connections([...snapped,target],byId).pairs.length,2);
 assert.equal(selection.snapGroup(group,byId,geometry.connections([{...target,z:20,zEnd:20}],byId).open,30),null);
 const slope=[{...group[0],z:0,zEnd:2},{...group[1],z:2,zEnd:4}];
 const result=selection.snapGroup(slope,byId,geometry.connections([{...target,z:4.2,zEnd:4.2}],byId).open,30);
 assert.ok(result);assert.ok(Math.abs(result[0].zEnd-result[0].z-2)<1e-8);assert.equal(geometry.connections(result,byId).pairs.length,1);
});
function box(e,options={}){e.pointer('pointerdown',0,0,options);e.pointer('pointermove',150,100,options);e.pointer('pointerup',150,100,options);}

test('dragging a blank area selects complete tracks in transformed canvas coordinates',()=>{
 const e=editor(),before=JSON.stringify(e.state().project);box(e);
 assert.deepEqual(ids(e),['a','b']);assert.equal(e.state().gesture,null);assert.equal(e.captures.size,0);
 assert.equal(JSON.stringify(e.state().project),before);assert.equal(e.state().history.length,0);
});
test('reverse drag works, partial tracks stay out, Shift adds without retaining transient hits',()=>{
 const e=editor();e.select(['c']);
 e.pointer('pointerdown',150,100,{shiftKey:true});e.pointer('pointermove',0,0);
 assert.deepEqual(ids(e),['a','b','c']);
 e.pointer('pointermove',0,60);e.pointer('pointerup',0,60);
 assert.deepEqual(ids(e),['b','c']);
 box(e);assert.deepEqual(ids(e),['a','b']);
});
test('release position completes selection, clicks do not accidentally box select',()=>{
 const e=editor();e.pointer('pointerdown',0,0);e.pointer('pointerup',150,100);assert.deepEqual(ids(e),['a','b']);
 e.pointer('pointerdown',0,0,{shiftKey:true});e.pointer('pointerup',1,1);assert.deepEqual(ids(e),['a','b']);
 e.pointer('pointerdown',0,0);e.pointer('pointerup',1,1);assert.deepEqual(ids(e),[]);
});
test('Escape, pointer cancellation, capture loss and window blur restore the previous selection',()=>{
 for(const reason of ['Escape','pointercancel','lostpointercapture','blur']){
  const e=editor();e.select(['c']);e.pointer('pointerdown',0,0);e.pointer('pointermove',150,100);
  if(reason==='Escape')e.key(reason);else if(reason==='blur')e.blur();else e.pointer(reason,150,100);
  assert.deepEqual(ids(e),['c'],reason);assert.equal(e.state().gesture,null);assert.equal(e.captures.size,0);
  e.pointer('pointerup',150,100);assert.deepEqual(ids(e),['c']);
 }
});
test('box-selected tracks move together and undo as one operation; Escape restores a move',()=>{
 const e=editor();box(e);const before=JSON.stringify(e.state().project);
 e.pointer('pointerdown',30,30,{id:'a'});e.pointer('pointermove',40,45);e.pointer('pointerup',40,45);
 assert.equal(e.state().project.pieces[0].x,70);assert.equal(e.state().project.pieces[1].y,210);assert.equal(e.state().project.pieces[2].x,600);
 assert.equal(e.state().history.length,1);e.key('z',{ctrlKey:true});assert.equal(JSON.stringify(e.state().project),before);
 box(e);e.pointer('pointerdown',30,30,{id:'a'});e.pointer('pointermove',40,45);e.key('Escape');
 assert.equal(JSON.stringify(e.state().project),before);assert.equal(e.state().history.length,0);
});
test('space and middle-button panning preserve selection; unrelated pointers are ignored',()=>{
 for(const middle of [false,true]){const e=editor();e.select(['c']);if(!middle)e.key(' ',{code:'Space'});
  e.pointer('pointerdown',0,0,{button:middle?1:0});e.pointer('pointermove',40,30);e.pointer('pointerup',40,30);assert.deepEqual(ids(e),['c']);
 }
 const e=editor();e.pointer('pointerdown',0,0);e.pointer('pointermove',150,100,{pointerId:2});e.pointer('pointerup',150,100,{pointerId:2});
 assert.equal(e.state().gesture.type,'box');assert.deepEqual(ids(e),[]);e.pointer('pointerup',150,100);assert.deepEqual(ids(e),['a','b']);
});
test('curved and mirrored tracks must fit entirely, not just their endpoints',()=>{
 const part=byId['KATO-N-20-120'],p={...piece('curve',100,100),partId:part.id,angle:40,flip:-1};
 const b=geometry.bounds([p],byId),items=[{id:p.id,bounds:b}];
 assert.deepEqual([...selection.boxedSelection(items,{x:b.maxX+1,y:b.maxY+1},{x:b.minX-1,y:b.minY-1})],['curve']);
 assert.deepEqual([...selection.boxedSelection(items,{x:b.minX,y:b.minY},{x:b.maxX-1,y:b.maxY})],[]);
});
