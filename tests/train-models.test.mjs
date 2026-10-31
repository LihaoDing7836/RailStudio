import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/lib/three/three.module.js';
import {TRAIN_MODELS,getTrainConsist,createTrainCar,disposeTrainModel} from '../dist/train-models.js';
const meshes=group=>{const out=[];group.traverse(o=>{if(o.isMesh)out.push(o);});return out;};
const components=(group,name)=>group.userData.components.filter(c=>c.name===name);
const componentWorld=(group,component)=>new THREE.Vector3(...component.position).applyMatrix4(group.children[0].matrixWorld);
const componentVertices=(group,component)=>{const positions=group.children[0].children[component.batchIndex].geometry.attributes.position.array;return Array.from(positions.slice(component.vertexStart*3,(component.vertexStart+component.vertexCount)*3));};

test('six train families have finite original models, rail-level wheels, and explicit schematic dimensions',()=>{
 assert.equal(TRAIN_MODELS.length,6);assert.equal(new Set(TRAIN_MODELS.map(m=>m.id)).size,6);
 for(const model of TRAIN_MODELS){
  assert.equal(model.approximate,true);assert.match(model.dimensionNote,/近似/);assert.ok(model.scaleDenominator>0);
  for(const index of [0,1,3]){
   const group=createTrainCar(model.id,{index,count:4}),bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3());
   const bodyComponent=components(group,'body')[0];assert.ok(Math.abs(bodyComponent.max[0]-bodyComponent.min[0]-getTrainConsist(model.id,4)[index].length)<.001,`${model.id} body length`);
   assert.ok(Math.abs(size.z-model.width)<1,`${model.id} width ${size.z}`);
   assert.ok(bounds.min.y>=-.001,`${model.id} wheels below rail`);
   assert.ok(size.y>=model.height*.8&&size.y<model.height+5,`${model.id} height`);
   for(const mesh of meshes(group))for(const value of mesh.geometry.attributes.position.array)assert.ok(Number.isFinite(value));
   for(const name of ['chassis','underfloor-equipment','lower-skirt'])assert.equal(components(group,name).length,0);
   assert.equal(components(group,'wheel').length,8);assert.equal(components(group,'bogie').length,2);
   disposeTrainModel(group);
  }
 }
});

test('families use different nose geometry and meaningful body details',()=>{
 const signatures=new Set();
 for(const model of TRAIN_MODELS){
  const head=createTrainCar(model.id,{index:0,count:4});
  signatures.add(JSON.stringify(componentVertices(head,components(head,'body')[0])));
  assert.equal(components(head,'cab-light').length,2);
  if(model.id==='e233'){assert.equal(components(head,'door').length,8);assert.equal(components(head,'flat-cab-window').length,1);}
  if(model.id==='n700s')assert.equal(components(head,'double-blue-stripe').length,4);
  const middle=createTrainCar(model.id,{index:1,count:4});
  assert.equal(components(middle,'cab-light').length,0);
  assert.equal(components(middle,'pantograph-contact').length,model.id==='tgv-duplex'?0:1);
  if(model.id==='tgv-duplex'){
   const rows=new Set([...components(middle,'upper-deck-window'),...components(middle,'lower-deck-window')].map(o=>o.windowCentre[1]));assert.equal(rows.size,2);
   assert.ok(components(head,'power-grille-slat').length>0);
  }
  disposeTrainModel(head);disposeTrainModel(middle);
 }
 assert.equal(signatures.size,6);
});

test('head and tail face outwards, and uniform scale affects complete body and wheel spacing',()=>{
 for(const model of TRAIN_MODELS){
  const head=createTrainCar(model.id,{index:0,count:4}),tail=createTrainCar(model.id,{index:3,count:4});
  const headLamp=componentWorld(head,components(head,'cab-light')[0]),tailLamp=componentWorld(tail,components(tail,'cab-light')[0]);
  assert.ok(headLamp.x>0);assert.ok(tailLamp.x<0);assert.ok(Math.abs(headLamp.x+tailLamp.x)<1e-6);
  assert.notEqual(components(head,'cab-light')[0].color,components(tail,'cab-light')[0].color);
  const large=createTrainCar(model.id,{index:0,count:4,scale:150/87});
  const a=new THREE.Box3().setFromObject(head).getSize(new THREE.Vector3()),b=new THREE.Box3().setFromObject(large).getSize(new THREE.Vector3());
  assert.ok(Math.abs(b.x/a.x-150/87)<1e-7);assert.ok(Math.abs(b.z/a.z-150/87)<1e-7);
  for(const g of [head,tail,large])disposeTrainModel(g);
 }
});

test('model disposal releases every shared resource once, and rejects invalid model inputs',()=>{
 const group=createTrainCar('n700s',{index:1,count:4}),resources=new Set();
 for(const mesh of meshes(group)){resources.add(mesh.geometry);resources.add(mesh.material);}
 const count=new Map();for(const resource of resources)resource.addEventListener('dispose',()=>count.set(resource,(count.get(resource)||0)+1));
 disposeTrainModel(group);disposeTrainModel(group);
 for(const resource of resources)assert.equal(count.get(resource),1);
 assert.throws(()=>createTrainCar('missing'),/Unknown/);
 for(const options of [{count:0},{count:25},{count:4,index:4},{scale:0},{scale:NaN},{index:1.5}])assert.throws(()=>createTrainCar('e233',options),RangeError);
});


test('wheel gauge follows the chosen track independently of body scale',()=>{
 for(const [scale,gauge] of [[1,9],[150/87,16.5],[1,26]]){
  const group=createTrainCar('cr400af',{index:0,count:4,scale,gauge});
  const wheels=components(group,'wheel').map(c=>componentWorld(group,c));
  assert.ok(Math.abs(Math.max(...wheels.map(p=>p.z))-Math.min(...wheels.map(p=>p.z))-gauge)<1e-7);
  disposeTrainModel(group);
 }
 assert.throws(()=>createTrainCar('e233',{gauge:NaN}),RangeError);
});


test('material batching keeps car draw calls low, preserves transforms and unit normals',()=>{
 for(const model of TRAIN_MODELS)for(const index of [0,1,3]){
  const group=createTrainCar(model.id,{index,count:4,scale:150/87,gauge:16.5});
  assert.ok(meshes(group).length<=12,`${model.id} has too many draw calls`);
  assert.ok(group.userData.components.length>45);
  for(const mesh of meshes(group)){
   const normals=mesh.geometry.attributes.normal;
   for(let i=0;i<normals.count;i++){
    const length=Math.hypot(normals.getX(i),normals.getY(i),normals.getZ(i));
    assert.ok(Math.abs(length-1)<.0001,`${model.id} normal ${length}`);
   }
  }
  // The baked wheel cylinders must have their axle along Z (not the default Y).
  const wheel=components(group,'wheel')[0],size=wheel.max.map((n,i)=>n-wheel.min[i]);
  assert.ok(Math.abs(size[1]-model.prototypeDimensions.wheelDiameter/model.scaleDenominator)<.001);assert.ok(Math.abs(size[2]-1.2)<.001);
  const bounds=new THREE.Box3().setFromObject(group),componentBounds=new THREE.Box3();
  for(const component of group.userData.components)componentBounds.union(new THREE.Box3(new THREE.Vector3(...component.min),new THREE.Vector3(...component.max)).applyMatrix4(group.children[0].matrixWorld));
  assert.ok(bounds.min.distanceTo(componentBounds.min)<1e-6);assert.ok(bounds.max.distanceTo(componentBounds.max)<1e-6);
  disposeTrainModel(group);
 }
});

test('batching frees replaced and temporary geometry without disposing live batched geometry',()=>{
 const original=THREE.BufferGeometry.prototype.dispose,released=[];let group;
 try{THREE.BufferGeometry.prototype.dispose=function(){released.push(this.uuid);original.call(this);};group=createTrainCar('n700s',{index:0,count:4});}
 finally{THREE.BufferGeometry.prototype.dispose=original;}
 assert.ok(released.length>100);assert.equal(new Set(released).size,released.length);
 for(const mesh of meshes(group))assert.ok(!released.includes(mesh.geometry.uuid));
 disposeTrainModel(group);
});


test('prototype family dimensions and differing car lengths drive both rendered body and runtime wheelbases',()=>{
 for(const m of TRAIN_MODELS){
  assert.equal(m.scaleDenominator,['crh380a','cr400af','e233'].includes(m.id)?150:160);
  const specs=getTrainConsist(m.id,8),ho=getTrainConsist(m.id,8,{scale:m.scaleDenominator/87});
  assert.equal(specs[0].length,m.headLength);assert.equal(specs[7].length,m.headLength);
  assert.ok(Math.abs(specs[2].length-m.carLength)<1e-8);
  assert.deepEqual(specs[7].bogieOffsets,[-specs[0].bogieOffsets[1],-specs[0].bogieOffsets[0]]);
  for(let i=0;i<8;i++){
   assert.ok(ho[i].length>specs[i].length);
   const car=createTrainCar(m.id,{index:i,count:8});assert.equal(car.userData.carLength,specs[i].length);
   assert.deepEqual(car.userData.bogieOffsets,specs[i].bogieOffsets);disposeTrainModel(car);
  }
 }
 assert.throws(()=>getTrainConsist('missing',4));assert.throws(()=>getTrainConsist('n700s',0));
});

test('reference-based details distinguish Chinese, Japanese, European power-head and commuter shapes',()=>{
 for(const id of ['crh380a','cr400af']){const head=createTrainCar(id);assert.equal(components(head,'continuous-window-band').length,2);if(id==='cr400af')assert.equal(components(head,'red-eagle-wing').length,2);disposeTrainModel(head);}
 const n700=createTrainCar('n700s'),e233=createTrainCar('e233'),tgv=createTrainCar('tgv-duplex');
 assert.equal(components(n700,'nose-blue-arrow').length,2);assert.equal(components(n700,'lower-skirt').length,0);
 assert.equal(components(e233,'front-orange-corner').length,2);assert.equal(components(e233,'roof-air-conditioner').length,1);assert.equal(components(e233,'commuter-pilot').length,2);assert.ok(components(e233,'flat-cab-window')[0].min[1]>11);
 assert.equal(components(tgv,'pantograph-contact').length,1);assert.equal(components(tgv,'passenger-window').length,0);assert.ok(components(tgv,'power-grille-slat').length>25);
 const trailer=createTrainCar('tgv-duplex',{index:2,count:8});assert.equal(components(trailer,'bogie').length,1);assert.equal(components(trailer,'pantograph-contact').length,0);
 for(const car of [n700,e233,tgv,trailer])disposeTrainModel(car);
});


test('family lettering retains UVs after batching and its shared atlas is reference counted',()=>{
 const a=createTrainCar('crh380a'),b=createTrainCar('crh380a',{index:1,count:8});
 const textureA=meshes(a).find(mesh=>mesh.material.map)?.material.map,textureB=meshes(b).find(mesh=>mesh.material.map)?.material.map;
 assert.ok(textureA);assert.equal(textureA,textureB);let released=0;textureA.addEventListener('dispose',()=>released++);
 assert.equal(components(a,'family-lettering').length,2);assert.equal(components(a,'nose-lettering').length,1);
 const labelled=meshes(a).find(mesh=>mesh.material.map);assert.equal(labelled.geometry.attributes.uv.count,labelled.geometry.attributes.position.count);
 const coordinates=Array.from(labelled.geometry.attributes.uv.array);assert.ok(Math.max(...coordinates)-Math.min(...coordinates)>.9);
 disposeTrainModel(a);assert.equal(released,0);disposeTrainModel(b);assert.equal(released,1);disposeTrainModel(b);assert.equal(released,1);
});


test('side and nose lettering remains upright and unmirrored on head and tail cars',()=>{
 const covariance=(a,b)=>{const ma=a.reduce((s,v)=>s+v,0)/a.length,mb=b.reduce((s,v)=>s+v,0)/b.length;return a.reduce((s,v,i)=>s+(v-ma)*(b[i]-mb),0);};
 for(const index of [0,3]){
  const group=createTrainCar('crh380a',{index,count:4}),forward=index===0?1:-1;
  for(const component of group.userData.components.filter(c=>c.name.endsWith('lettering'))){
   const mesh=group.children[0].children[component.batchIndex],position=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv,x=[],z=[],u=[],v=[];
   for(let i=component.vertexStart;i<component.vertexStart+component.vertexCount;i++){const p=new THREE.Vector3(position.getX(i),position.getY(i),position.getZ(i)).applyMatrix4(group.children[0].matrixWorld);x.push(p.x);z.push(p.z);u.push(uv.getX(i));v.push(uv.getY(i));}
   if(component.name==='family-lettering')assert.ok(covariance(x,u)*Math.sign(z.reduce((a,b)=>a+b,0))>0);
   else{assert.ok(covariance(z,u)*forward<0);assert.ok(covariance(x,v)*forward<0);}
  }
  disposeTrainModel(group);
 }
});

test('disposing cars and then their parent train never releases the same resources twice',()=>{
 const train=new THREE.Group(),a=createTrainCar('n700s'),b=createTrainCar('n700s',{index:1,count:4});train.add(a,b);
 const counts=new Map(),resources=new Set();for(const car of [a,b])for(const mesh of meshes(car)){resources.add(mesh.geometry);resources.add(mesh.material);if(mesh.material.map)resources.add(mesh.material.map);}
 for(const resource of resources)resource.addEventListener('dispose',()=>counts.set(resource,(counts.get(resource)||0)+1));
 disposeTrainModel(a);disposeTrainModel(train);disposeTrainModel(b);
 for(const resource of resources)assert.equal(counts.get(resource),1);
});


test('wide Duplex livery stays outside the sculpted body across nose and rounded belly',()=>{
 const group=createTrainCar('tgv-duplex'),body=components(group,'body')[0],bodyGeometry=new THREE.BufferGeometry();bodyGeometry.setAttribute('position',new THREE.Float32BufferAttribute(componentVertices(group,body),3));
 const bodyMesh=new THREE.Mesh(bodyGeometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));bodyMesh.updateMatrixWorld();
 const ray=new THREE.Raycaster(),point=new THREE.Vector3();
 for(const component of components(group,'duplex-blue-body')){
  const values=componentVertices(group,component),triangles=values.length/9,step=Math.max(1,Math.floor(triangles/80));
  for(let t=0;t<triangles;t+=step){const i=t*9;point.set((values[i]+values[i+3]+values[i+6])/3,(values[i+1]+values[i+4]+values[i+7])/3,(values[i+2]+values[i+5]+values[i+8])/3);const side=Math.sign(point.z);
   ray.set(new THREE.Vector3(point.x,point.y,side*100),new THREE.Vector3(0,0,-side));const hit=ray.intersectObject(bodyMesh)[0];
   if(hit)assert.ok((point.z-hit.point.z)*side>=-.015,`paint intrudes into body at ${point.toArray()}`);
  }
 }
 bodyGeometry.dispose();bodyMesh.material.dispose();disposeTrainModel(group);
});
