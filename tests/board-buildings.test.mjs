import test from 'node:test';
import assert from 'node:assert/strict';
import {boardPreset,validateOutline,containsPoint,containsSegment} from '../dist/board.js';
import {geometry,worldGeometry,validateProject,connections,bounds} from '../dist/geometry.js';
import {rotatePieces,selectionCenter} from '../dist/selection.js';
const part={id:'house',kind:'building',brand:'KATO',scale:'N',geometry:{type:'building'},dimensions:{width:100,depth:80,height:51}};
const piece={id:'one',partId:'house',x:50,y:60,angle:0,flip:1};
test('concave boards reject crossing and preserve recesses',()=>{
 const u=boardPreset('U',1000,800);assert.equal(validateOutline(u,1000,800).length,8);
 assert.equal(containsPoint({x:500,y:500},u),false);
 assert.equal(containsSegment({x:100,y:700},{x:900,y:700},u),false);
 assert.equal(containsSegment({x:100,y:100},{x:900,y:100},u),true);
 assert.throws(()=>validateOutline([{x:0,y:0},{x:800,y:800},{x:0,y:800},{x:800,y:0}],1000,800));
 assert.throws(()=>validateOutline([{x:0,y:0},{x:Infinity,y:0},{x:1,y:1}],1000,800));
});
test('buildings occupy model dimensions without rail endpoints or track length',()=>{
 assert.equal(geometry(part,piece).length,0);assert.deepEqual(connections([piece],{house:part}).endpoints,[]);
 assert.deepEqual(bounds([piece],{house:part}),{minX:50,minY:60,maxX:150,maxY:140});
 const rotated=rotatePieces([piece],selectionCenter([piece],{house:part}),90);
 const b=bounds(rotated,{house:part});assert.ok(Math.abs(b.maxX-b.minX-80)<1e-6);assert.ok(Math.abs(b.maxY-b.minY-100)<1e-6);
});
test('custom outline and frozen building dimensions survive import/export',()=>{
 const raw={version:1,name:'Test',board:{width:1000,height:800,outline:boardPreset('L',1000,800)},pieces:[{...piece,buildingSize:{width:120,depth:70}}]};
 const restored=validateProject(JSON.parse(JSON.stringify(raw)),{house:part});assert.deepEqual(restored.board,raw.board);assert.deepEqual(restored.pieces[0].buildingSize,{width:120,depth:70});
 assert.throws(()=>validateProject({...raw,pieces:[{...piece,buildingSize:{width:-1,depth:80}}]},{house:part}));
 const old=validateProject({...raw,board:{width:1000,height:800},pieces:[]},{house:part});assert.equal(old.board.outline,undefined);
});
test('building geometry honors a user dimension snapshot and mirrored position',()=>{
 const custom={...piece,flip:-1,buildingSize:{width:60,depth:40}};
 assert.deepEqual(bounds([custom],{house:part}),{minX:50,minY:20,maxX:110,maxY:60});
 assert.equal(worldGeometry(part,custom).endpoints.length,0);
});
