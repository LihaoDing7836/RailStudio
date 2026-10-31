import * as THREE from './lib/three/three.module.js';

// Original parametric models reconstructed against manufacturer/operator photographs.
// Overall dimensions follow the references below where available; fine details and bogie
// positions are visual approximations, not licensed manufacturer CAD or clearance models.
const note='依照实车及官方模型照片重建外形；主要尺寸按参考资料缩比，细部、轮位与涂装为原创近似建模，不能用于精密净空校核。';
const define=(id,name,type,denominator,dimensions,colors,description,sources)=>Object.freeze({
 id,name,type,scaleDenominator:denominator,carLength:dimensions.middle/denominator,headLength:dimensions.head/denominator,
 width:dimensions.width/denominator,height:dimensions.height/denominator,defaultCars:type==='commuter'?6:8,couplerGap:1.8,
 prototypeDimensions:Object.freeze(dimensions),colors:Object.freeze(colors),description,sources:Object.freeze(sources),approximate:true,dimensionNote:note,
});
export const TRAIN_MODELS=Object.freeze([
 define('crh380a','和谐号 CRH380A','high-speed',150,{head:26500,middle:25000,width:3380,height:3700,bogieCentres:17500,wheelbase:2500,wheelDiameter:860,nose:8500},{body:'#e3e9ed',accent:'#2364ad',roof:'#c7d0d8'},'银白圆润长车鼻、泪滴风挡、深蓝窗带与蓝色细腰线',['https://www.crrcgc.cc/en/2016-02/29/article_23B271155942426F9EEC7A23DF4DBD91.html','https://www.crrcgc.cc/sfgf/2013-12/05/article_6DE3945F7E2B4887A2D46B0618286261.html']),
 define('cr400af','复兴号 CR400AF','high-speed',150,{head:27525,middle:25650,width:3360,height:4050,bogieCentres:17500,wheelbase:2500,wheelDiameter:920,nose:8300},{body:'#dce2e6',accent:'#d51e37',roof:'#c2ccd3'},'圆钝鹰隼鼻、红边黑风挡、独立侧驾驶窗与红色翼形涂装',['https://www.crrcgc.cc/crrcgc/2026-05/09/article_2026050917102785945.html','https://www.crrcgc.cc/sfgf/2015-11/04/article_E7691BD1DADD4C799E29B682C86DADD3.html']),
 define('n700s','新干线 N700S','high-speed',160,{head:27350,middle:25000,width:3360,height:3600,bogieCentres:17500,wheelbase:2500,wheelDiameter:860,nose:10700},{body:'#f3f4f1',accent:'#194c93',roof:'#e1e4e4'},'双翼肩棱与宽扁鸭嘴、短竖圆角窗与平行双蓝带',['https://www.n-sharyo.co.jp/business/tetsudo/pages/jrcn700s.htm','https://railway.jr-central.co.jp/train/shinkansen/n700s/index.html','https://www.katomodels.com/product/n/n700s']),
 define('ice3','ICE 3 · BR 403','high-speed',160,{head:25835,middle:24775,width:2950,height:3890,bogieCentres:17500,wheelbase:2500,wheelDiameter:920,nose:5200},{body:'#f2f0e9',accent:'#cc2334',roof:'#d1d4d3'},'圆弧短鼻、宽斜风挡、红色细腰线与分段深色窗带',['https://www.bahn.de/service/ueber-uns/zugtypen/ice-3']),
 define('tgv-duplex','TGV Duplex · 蓝银','double-deck',160,{head:22150,middle:18700,endTrailer:21845,width:2904,height:4320,powerHeight:4100,bogieCentres:14000,wheelbase:3000,wheelDiameter:920,nose:6800},{body:'#c9d2d9',accent:'#23427d',roof:'#aebcc6'},'圆弧动力头、蓝银分界、车顶电气设备与双层拖车',['https://www.katomodels.com/product/n/tgv_duplex']),
 define('e233','E233 系 · 中央线','commuter',150,{head:20000,middle:20000,width:2950,height:3980,bogieCentres:13800,wheelbase:2100,wheelDiameter:860,nose:650},{body:'#bfc7ca',accent:'#ec6b21',roof:'#929fa5'},'不锈钢车身、四对双扇门、黑色平头面罩与上下橙带',['https://www.jreast.co.jp/train/local/e233.html','https://www.katomodels.com/product/n/e233kei']),
]);
const byId=new Map(TRAIN_MODELS.map(m=>[m.id,m]));

// A tiny original lettering atlas is shared by all cars of one family. No external logo
// artwork is embedded. Reference counting keeps preview disposal from invalidating a train.
const letteringCache=new Map();
function acquireLettering(model){
 let entry=letteringCache.get(model.id);if(entry){entry.refs++;return entry.texture;}
 const labels={crh380a:['CRH','和谐号'],cr400af:['CR','复兴号'],n700s:['N700S','N700S'],ice3:['ICE','ICE 3'],'tgv-duplex':['TGV','SNCF'],e233:['JR','中央線']};
 let texture;
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');
  if(ctx){ctx.clearRect(0,0,1024,256);ctx.textAlign='center';ctx.textBaseline='middle';
   for(let row=0;row<2;row++){ctx.font=row===0?'italic 700 92px Arial, sans-serif':'600 76px "PingFang SC", "Microsoft YaHei", sans-serif';ctx.fillStyle=row===0&&['crh380a','cr400af','tgv-duplex','e233'].includes(model.id)?'#f0f4f5':'#243b59';ctx.fillText(labels[model.id][row],512,row*128+67,900);}
   texture=new THREE.CanvasTexture(canvas);
  }
 }
 if(!texture)texture=new THREE.DataTexture(new Uint8Array([0,0,0,0]),1,1);
 texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.needsUpdate=true;texture.userData={trainLetteringKey:model.id};
 letteringCache.set(model.id,{texture,refs:1});return texture;
}
function releaseLettering(key){const entry=letteringCache.get(key);if(entry&&--entry.refs===0){entry.texture.dispose();letteringCache.delete(key);}}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
export function getTrainConsist(modelId,count,{scale=1}={}){
 const m=byId.get(modelId);if(!m)throw new Error(`Unknown train model: ${modelId}`);
 count=count??m.defaultCars;if(!Number.isInteger(count)||count<1||count>24||!Number.isFinite(scale)||scale<=0||scale>10)throw new RangeError('Invalid train consist');
 return Array.from({length:count},(_,index)=>{
  const cab=index===0||index===count-1,tail=count>1&&index===count-1,duplex=m.id==='tgv-duplex',p=m.prototypeDimensions,d=m.scaleDenominator;
  const prototypeLength=cab?p.head:duplex&&(index===1||index===count-2)?p.endTrailer:p.middle;
  const length=prototypeLength/d;let rear,front;
  if(duplex&&!cab){rear=-length/2+(index===count-2?16:1);front=length/2-(index===1?16:1);}
  else if(cab&&!['ice3','e233','tgv-duplex'].includes(m.id)){rear=-length/2+3200/d;front=rear+p.bogieCentres/d;}
  else{rear=-p.bogieCentres/d/2;front=-rear;}
  if(tail)[rear,front]=[-front,-rear];
  return Object.freeze({length:length*scale,bogieOffsets:Object.freeze([rear*scale,front*scale]),role:cab?(tail?'tail':'head'):'middle'});
 });
}

// Smooth, bounded cubic interpolation avoids the straight cone silhouettes of v1.
function smoothProfile(points,t){
 let i=0;while(i<points.length-2&&points[i+1][0]<t)i++;
 const a=points[i],b=points[i+1],u=clamp((t-a[0])/(b[0]-a[0]),0,1),out=[];
 for(let k=1;k<a.length;k++){
  const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+2)],dt=b[0]-a[0];
  const ma=(b[k]-prev[k])/(b[0]-prev[0])*dt,mb=(next[k]-a[k])/(next[0]-a[0])*dt;
  const value=(2*u**3-3*u*u+1)*a[k]+(u**3-2*u*u+u)*ma+(-2*u**3+3*u*u)*b[k]+(u**3-u*u)*mb;
  out.push(clamp(value,Math.min(a[k],b[k]),Math.max(a[k],b[k])));
 }
 return out;
}
const noses={
 crh380a:[[0,1,1,0],[.16,.99,.98,.01],[.34,.94,.91,.03],[.55,.78,.75,.07],[.77,.53,.58,.13],[.92,.33,.49,.19],[.985,.17,.42,.25],[1,.015,.345,.335]],
 cr400af:[[0,1,1,0],[.18,.99,1,.01],[.39,.94,.91,.015],[.59,.8,.76,.04],[.8,.57,.59,.13],[.94,.36,.48,.22],[.989,.16,.42,.30],[1,.015,.365,.355]],
 n700s:[[0,1,1,0],[.13,1,1,0],[.28,.96,.88,.01],[.44,.88,.64,.025],[.65,.76,.46,.055],[.84,.63,.38,.09],[.95,.46,.35,.14],[.992,.18,.31,.20],[1,.015,.26,.25]],
 ice3:[[0,1,1,0],[.18,.99,.99,0],[.39,.93,.9,.01],[.61,.78,.72,.055],[.81,.57,.56,.14],[.95,.34,.49,.24],[.993,.13,.44,.32],[1,.015,.385,.375]],
 'tgv-duplex':[[0,1,1,0],[.16,.99,1,0],[.34,.96,.91,0],[.55,.84,.72,.015],[.76,.69,.51,.04],[.91,.52,.38,.1],[.98,.3,.32,.15],[1,.03,.235,.225]],
 e233:[[0,1,1,0],[.35,1,1,0],[.75,.99,.995,0],[1,.95,.96,.025]],
};

function geometryGrid(nu,nv,point,reverse=false){
 const vertices=[],indices=[];
 for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++)vertices.push(...point(i/nu,j/nv));
 for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=i*(nv+1)+j,b=a+nv+1;if(reverse)indices.push(a,a+1,b,a+1,b+1,b);else indices.push(a,b,a+1,a+1,b,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
 const normals=g.attributes.normal;for(let i=0;i<normals.count;i++)if(normals.getX(i)**2+normals.getY(i)**2+normals.getZ(i)**2<1e-10){let k=i-1;while(k>=0&&normals.getX(k)**2+normals.getY(k)**2+normals.getZ(k)**2<1e-10)k--;if(k>=0)normals.setXYZ(i,normals.getX(k),normals.getY(k),normals.getZ(k));else normals.setXYZ(i,0,1,0);}
 return g;
}
function polygonGeometry(points){const contour=points.map(p=>new THREE.Vector2(p[0],p[1])),indices=THREE.ShapeUtils.triangulateShape(contour,[]).flat(),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(p=>[p[0],p[1],0]),3));g.setIndex(indices);g.computeVertexNormals();return g;}
function batchCarMeshes(assembly){
 const buckets=new Map(),components=[],originals=new Set();
 for(const mesh of [...assembly.children]){
  if(!mesh.isMesh)continue;
  mesh.updateMatrix();
  const transformed=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
  transformed.applyMatrix4(mesh.matrix);
  if(!transformed.attributes.normal)transformed.computeVertexNormals();
  let bucket=buckets.get(mesh.material);
  if(!bucket){bucket={index:buckets.size,positions:[],normals:[],uvs:[],names:[]};buckets.set(mesh.material,bucket);}
  const positions=transformed.attributes.position,normals=transformed.attributes.normal;
  transformed.computeBoundingBox();
  components.push(Object.freeze({name:mesh.name,position:Object.freeze(mesh.position.toArray()),color:mesh.material.color.getHex(),windowCentre:mesh.userData.windowCentre?Object.freeze(mesh.userData.windowCentre):null,batchIndex:bucket.index,vertexStart:bucket.positions.length/3,vertexCount:positions.count,
   min:Object.freeze(transformed.boundingBox.min.toArray()),max:Object.freeze(transformed.boundingBox.max.toArray())}));
  for(let i=0;i<positions.array.length;i++)bucket.positions.push(positions.array[i]);
  for(let i=0;i<normals.array.length;i++)bucket.normals.push(normals.array[i]);
  const uv=transformed.attributes.uv;for(let i=0;i<positions.count;i++)bucket.uvs.push(uv?uv.getX(i):0,uv?uv.getY(i):0);
  bucket.names.push(mesh.name);originals.add(mesh.geometry);transformed.dispose();assembly.remove(mesh);
 }
 for(const [material,bucket] of buckets){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(bucket.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(bucket.normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(bucket.uvs,2));geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,material);mesh.name=`car-material-${bucket.index}`;mesh.userData.componentNames=Object.freeze(bucket.names);assembly.add(mesh);
 }
 for(const geometry of originals)geometry.dispose();
 return Object.freeze(components);
}

/** Local +X forward, +Y up, +Z sideways, rail at Y=0. gauge is world mm after scale. */
export function createTrainCar(modelId,{index=0,count,scale=1,gauge=9*scale}={}){
 const m=byId.get(modelId);if(!m)throw new Error(`Unknown train model: ${modelId}`);count=count??m.defaultCars;
 if(!Number.isFinite(scale)||scale<=0||scale>10)throw new RangeError('Invalid train model scale');
 if(!Number.isInteger(index)||index<0||index>=count||!Number.isFinite(gauge)||gauge<=0||gauge>100)throw new RangeError('Invalid train car index or gauge');
 const specs=getTrainConsist(modelId,count),spec=specs[index],p=m.prototypeDimensions,d=m.scaleDenominator;
 const L=spec.length,W=m.width,H=(m.id==='tgv-duplex'&&spec.role!=='middle'?p.powerHeight:p.height)/d,half=L/2,cab=spec.role!=='middle',tail=spec.role==='tail',duplex=m.id==='tgv-duplex',commuter=m.id==='e233';
 const group=new THREE.Group(),assembly=new THREE.Group();group.add(assembly);group.scale.setScalar(scale);if(tail)assembly.rotation.y=Math.PI;
 group.name=`${m.id}-${index+1}`;group.userData={modelId:m.id,carIndex:index,carCount:count,role:spec.role,approximate:true,carLength:L*scale,bogieOffsets:spec.bogieOffsets.map(x=>x*scale),features:[],modelRevision:2};
 const mats=new Map();
 function material(color,options={}){const key=JSON.stringify([color,options]);if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness:.38,metalness:.22,side:THREE.DoubleSide,...options}));return mats.get(key);}
 const body=material(m.colors.body),accent=material(m.colors.accent),roof=material(m.colors.roof),glass=material('#102a3c',{roughness:.14,metalness:.4}),band=material(m.id==='crh380a'?'#152c44':'#202c36',{roughness:.32}),dark=material('#333b42',{roughness:.68}),steel=material('#8f9ba3',{roughness:.42,metalness:.6}),white=material('#ebeff0'),red=material('#c23332');
 function add(g,mat,name){const mesh=new THREE.Mesh(g,mat);mesh.name=name;assembly.add(mesh);return mesh;}
 function box(name,x,y,z,l,h,w,mat){const mesh=add(new THREE.BoxGeometry(l,h,w),mat,name);mesh.position.set(x,y,z);return mesh;}
 function beam(name,a,b,r,mat=dark){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.clone().sub(va),mesh=add(new THREE.CylinderGeometry(r,r,delta.length(),6),mat,name);mesh.position.copy(va.add(vb).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;}
 const bottom=commuter?5.8:duplex&&!cab?4.8:5.6,top=H-(commuter?2.2:duplex&&!cab?.6:.5),noseLength=cab?p.nose/d:0,shoulder=half-noseLength;
 function profile(x){
  if(!cab||x<=shoulder){const taper=x<-half+1?mix(.95,1,clamp(x+half,0,1)):1;return {w:W*.5*taper,bottom,top,n:commuter?5.5:duplex?4.2:3.9,t:0};}
  const t=clamp((x-shoulder)/noseLength,0,1),[w,h,b]=smoothProfile(noses[m.id],t);
  return {w:W*.5*w,bottom:bottom+(top-bottom)*b,top:bottom+(top-bottom)*h,n:mix(commuter?5.5:3.9,m.id==='n700s'?3.0:2.3,t),t};
 }
 function sectionPoint(x,theta,lift=0){const q=profile(x),c=Math.cos(theta),s=Math.sin(theta),a=2/q.n;let y=(q.top+q.bottom)/2+(q.top-q.bottom)/2*Math.sign(c)*Math.abs(c)**a;
  if(m.id==='n700s'&&q.t>0&&c>0)y+=Math.exp(-(((Math.abs(theta)-.65)/.25)**2))*Math.sin(q.t*Math.PI)*.8;
  return [x,y+lift,Math.sign(s)*Math.abs(s)**a*q.w];
 }
 function sidePoint(x,y,side,offset=.045){const q=profile(x),v=clamp((y-q.bottom)/(q.top-q.bottom),.015,.985)*2-1,c=Math.sign(v)*Math.abs(v)**(q.n/2),theta=Math.acos(clamp(c,-1,1))*side,r=sectionPoint(x,theta);r[2]+=side*offset;return r;}
 function roofPoint(x,lateral,offset=.04){const q=profile(x),s=clamp(lateral,-.99,.99),theta=Math.asin(Math.sign(s)*Math.abs(s)**(q.n/2)),r=sectionPoint(x,theta,offset);return r;}
 const xs=cab?[-half,-half+1,shoulder-1,...Array.from({length:57},(_,i)=>shoulder+noseLength*i/56)]:[-half,-half+1,-L*.25,0,L*.25,half-1,half];
 const vertices=[],indices=[],nr=64;
 for(const x of xs)for(let j=0;j<=nr;j++)vertices.push(...sectionPoint(x,j/nr*Math.PI*2));
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<nr;j++){const a=i*(nr+1)+j,b=a+nr+1;indices.push(a,a+1,b,a+1,b+1,b);}
 for(const side of [0,xs.length-1]){const start=vertices.length/3,q=profile(xs[side]);vertices.push(xs[side],(q.top+q.bottom)/2,0);for(let j=0;j<nr;j++){const a=side*(nr+1)+j;if(side===0)indices.push(start,a,a+1);else indices.push(start,a+1,a);}}
 const skin=new THREE.BufferGeometry();skin.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));skin.setIndex(indices);skin.computeVertexNormals();add(skin,body,'body');group.userData.features.push(cab?`${m.id}-sculpted-nose`:'passenger-body','smooth-surface');
 function sideRibbon(name,x0,x1,lower,upper,side,mat,offset=.05){
  // Wide paint panels need vertical tessellation too: a three-row chord cut through
  // the rounded belly of the Duplex. Nose sections also require shorter X intervals.
  const steps=Math.max(3,Math.ceil((x1-x0)/(cab&&x1>shoulder?.7:1.6)));
  const height=Math.max(...Array.from({length:17},(_,i)=>{const x=mix(x0,x1,i/16);return Math.abs(upper(x)-lower(x));}));
  const rows=Math.max(3,Math.min(64,Math.ceil(height/.4)));
  add(geometryGrid(steps,rows,(u,v)=>{const x=mix(x0,x1,u);return sidePoint(x,mix(lower(x),upper(x),v),side,offset);}),mat,name);
 }
 function sidePolygon(name,points,side,mat,offset=.16){
  const triangles=THREE.ShapeUtils.triangulateShape(points.map(p=>new THREE.Vector2(...p)),[]),vertices=[];
  function emit(a,b,c,depth=0){
   const edges=[[a,b,c],[b,c,a],[c,a,b]].sort((a,b)=>Math.hypot(b[0][0]-b[1][0],b[0][1]-b[1][1])-Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1])),[p,q,r]=edges[0];
   if(depth<11&&Math.hypot(p[0]-q[0],p[1]-q[1])>1.15){const mid=[(p[0]+q[0])/2,(p[1]+q[1])/2];emit(p,mid,r,depth+1);emit(mid,q,r,depth+1);}
   else vertices.push(...sidePoint(...a,side,offset),...sidePoint(...b,side,offset),...sidePoint(...c,side,offset));
  }
  for(const tri of triangles)emit(...tri.map(i=>points[i]));
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();add(g,mat,name);
 }
 function window(name,x,y,width,height,side,mat=glass,offset=mat===glass?.24:mat===body||mat===red?.14:.075){
  // Rounded, surface-conforming panels instead of floating box windows.
  const r=Math.min(width,height)*.19;
  const g=geometryGrid(10,12,(u,v)=>{const xx=mix(-width/2,width/2,u),inset=Math.max(0,Math.abs(xx)-(width/2-r)),cap=r-Math.sqrt(Math.max(0,r*r-inset*inset));return sidePoint(x+xx,y+mix(-height/2+cap,height/2-cap,v),side,offset);});
  const mesh=add(g,mat,name);mesh.userData.windowCentre=[x,y,side];
 }
 const bodyEnd=cab?shoulder:half-1,bodyStart=-half+1,span=bodyEnd-bodyStart,low=bottom+(top-bottom)*.34,high=bottom+(top-bottom)*.67;
 // A dark mechanical floor and separately modelled wheels, axles, springs and brake discs.
 // The continuous chassis slab and underfloor blocks are intentionally omitted.
 const localBogies=tail?spec.bogieOffsets.map(x=>-x).reverse():spec.bogieOffsets;
 const wheelRadius=p.wheelDiameter/d/2,wheelbase=p.wheelbase/d,wheelZ=gauge/scale/2;
 let wheelBogies=localBogies;
 if(duplex&&!cab){wheelBogies=index===1?localBogies:[localBogies[0]];group.userData.features.push('jacobs-articulation');}
 for(const x of wheelBogies){
  box('bogie',x,wheelRadius+1,0,wheelbase+3,2.2,gauge/scale*.83,dark);
  for(const ax of [-wheelbase/2,wheelbase/2]){
   beam('axle',[x+ax,wheelRadius,-wheelZ],[x+ax,wheelRadius,wheelZ],.47,steel);
   for(const side of [-1,1]){const wheel=add(new THREE.CylinderGeometry(wheelRadius,wheelRadius,1.2,20),dark,'wheel');wheel.position.set(x+ax,wheelRadius,side*wheelZ);wheel.rotation.x=Math.PI/2;
    const disc=add(new THREE.CylinderGeometry(wheelRadius*.57,wheelRadius*.57,1.24,16),steel,'wheel-disc');disc.position.copy(wheel.position);disc.rotation.x=Math.PI/2;
    box('suspension',x+ax,wheelRadius+1.5,side*(wheelZ+.7),3.2,.7,1.1,steel);
   }
  }
 }

 group.userData.features.push('bogies','wheels');
 for(const side of [-1,1]){
  if(m.id==='crh380a'||m.id==='cr400af'){
   sideRibbon('continuous-window-band',bodyStart,bodyEnd,x=>low+2.0,x=>high+2.2,side,band);
   sideRibbon('waist-stripe',bodyStart,bodyEnd,x=>low+.4,x=>low+1.05,side,accent,.08);
   if(cab){
    const tEnd=m.id==='crh380a'?.58:.64,xEnd=shoulder+noseLength*tEnd;
    sideRibbon('tapered-window-band',shoulder,xEnd,x=>{const t=(x-shoulder)/(xEnd-shoulder);return mix(low+2,low+1,t);},x=>{const t=(x-shoulder)/(xEnd-shoulder);return mix(high+2.2,low+1,t);},side,band);
    if(m.id==='cr400af')sidePolygon('red-eagle-wing',[[shoulder-7,high+2.5],[shoulder+noseLength*.29,high+1.9],[shoulder+noseLength*.78,low-1],[shoulder+noseLength*.57,low+.5],[shoulder+noseLength*.30,high+.7]],side,accent,.12);
    else sideRibbon('nose-blue-line',shoulder,shoulder+noseLength*.8,x=>{const t=(x-shoulder)/noseLength;return mix(low+.4,bottom+3,t);},x=>{const t=(x-shoulder)/noseLength;return mix(low+1.05,bottom+3.3,t);},side,accent,.10);
   }
  }else if(m.id==='n700s'){
   for(const [yy,hh] of [[low-1,.6],[low+.5,.85]])sideRibbon('double-blue-stripe',bodyStart,bodyEnd,x=>yy,x=>yy+hh,side,accent);
   if(cab)sidePolygon('nose-blue-arrow',[[shoulder-12,high-1.1],[shoulder+noseLength*.04,high-.6],[shoulder+noseLength*.41,low+2.5],[shoulder+noseLength*.12,low+3.6],[shoulder-12,high-1.9]],side,accent,.09);
  }else if(m.id==='ice3')sideRibbon('red-waist-line',bodyStart,cab?shoulder+noseLength*.66:bodyEnd,x=>low+.45,x=>low+1.6,side,accent);
  else if(duplex){
   const end=cab?shoulder+noseLength*.88:bodyEnd;
   sideRibbon('duplex-blue-body',bodyStart,end,x=>bottom+.7,x=>bottom+(profile(x).top-bottom)*.55,side,accent,.06);
   sideRibbon('duplex-white-divider',bodyStart,end,x=>bottom+(profile(x).top-bottom)*.55,x=>bottom+(profile(x).top-bottom)*.55+.32,side,white,.10);
  }else{
   sideRibbon('orange-waist-band',bodyStart,bodyEnd,x=>low-.8,x=>low+2.1,side,accent);
   sideRibbon('orange-roof-line',bodyStart,bodyEnd,x=>top-2.3,x=>top-1.45,side,accent);
  }
  if(duplex&&cab){
   sideRibbon('power-shoulder-grille',bodyStart+4,bodyEnd-3,x=>top-4.5,x=>top-2.4,side,dark,.10);
   for(let x=bodyStart+5;x<bodyEnd-3;x+=2.3)sideRibbon('power-grille-slat',x,x+.23,y=>top-4.45,y=>top-2.45,side,steel,.14);
   sideRibbon('power-side-recess',bodyStart+4,bodyEnd-7,x=>low-.2,x=>high-1.6,side,material('#1c386d'),.10);
   group.userData.features.push('power-car-grilles');
  }else if(duplex){
   for(let x=bodyStart+12;x<bodyEnd-10;x+=10){window('upper-deck-window',x,top-4.4,7.8,3.8,side);window('lower-deck-window',x,bottom+5.8,7.4,3.1,side);}
   group.userData.features.push('double-deck-windows');
  }else if(commuter){
   const doors=Array.from({length:4},(_,i)=>bodyStart+11+i*(span-22)/3);
   for(const x of doors){window('door-outline',x,bottom+7.5,9.3,14.7,side,dark);window('door',x,bottom+7.5,8.8,14.2,side,body);for(const dx of [-2.2,2.2])window('door-window',x+dx,high+.5,3.4,5.6,side);sideRibbon('door-centre-seam',x-.06,x+.06,q=>bottom+.7,q=>bottom+14.5,side,dark,.14);}
   for(let i=0;i<3;i++){const x=(doors[i]+doors[i+1])/2;window('commuter-window-frame',x,high+.6,doors[i+1]-doors[i]-11,6.0,side,dark);window('commuter-window',x,high+.6,doors[i+1]-doors[i]-11.6,5.6,side);}
   group.userData.features.push('four-door-side');
  }else{
   const winW=m.id==='n700s'?4.6:m.id==='ice3'?7.1:7.2,winH=m.id==='n700s'?4.6:4.2,pitch=m.id==='n700s'?8.6:10.6;
   for(let x=bodyStart+15;x<bodyEnd-11;x+=pitch){if(m.id==='ice3')window('window-border',x,high+.1,winW+.7,winH+.5,side,band);window('passenger-window',x,high+.1,winW,winH,side);}
  }
  if(!commuter&&!(duplex&&cab)){
   const doorXs=duplex?[bodyStart+6,bodyEnd-5]:[bodyStart+7,...(cab?[]:[bodyEnd-7])];
   for(const x of doorXs){const yy=duplex?bottom+5.2:bottom+7.5,hh=duplex?10.1:14.2;
    window('door-outline',x,yy,5.3,hh,side,steel);window('door',x,yy,4.95,hh-.35,side,duplex?red:body);window('door-window',x,duplex?bottom+7:high+.1,2.7,duplex?3.5:4.2,side);
    sideRibbon('door-handle',x+1.2,x+1.45,q=>yy-.7,q=>yy+.2,side,dark,.16);
   }
  }
 }
 // Inter-car bellows and realistic end connections.
 for(const sign of [-1,1])if(!(cab&&sign===1)){
  box('gangway',sign*(half-.4),bottom+8,0,.8,14,W*.58,dark);
  for(let i=-2;i<=2;i++)box('bellows-rib',sign*(half-.5+i*.2),bottom+8,0,.12,14.2,W*.6,steel);
  box('coupler',sign*(half-.9),3.3,0,1.8,.9,2.6,dark);
 }
 // Roof electrical appliances are shaped components, not a single strip.
 const roofEnd=cab?shoulder-3:half-4;
 if(commuter){
  const air=box('roof-air-conditioner',-3,top+.7,0,42,1.6,W*.61,roof);
  for(let x=-21;x<16;x+=1.6)box('air-conditioner-grille',x,top+1.53,0,.35,.08,W*.47,dark);
 }else if(duplex&&cab){
  box('roof-electric-well',-L*.20,top+.02,0,L*.45,.5,W*.55,dark);
  for(const x of [-L*.29,-L*.09])for(const z of [-2,2]){const insulator=add(new THREE.CylinderGeometry(.8,.9,1.7,10),steel,'roof-insulator');insulator.position.set(x,top+.8,z);}
  group.userData.features.push('power-head-roof');
 }else if(!duplex){
  for(const x of [-L*.25,Math.min(L*.19,roofEnd-10)]){box('roof-service-panel',x,top+.03,0,24,.25,W*.43,roof);for(let k=-3;k<=3;k++)box('roof-vent',x+k*2.3,top+.19,0,.25,.09,W*.3,steel);}
 }
 const hasPantograph=duplex?cab:!cab&&(index===1||index===count-2);
 if(hasPantograph){
  const x=duplex?-L*.34:-L*.1,y=top+.6;box('pantograph-plinth',x,y,0,9,.55,5,steel);
  for(const s of [-1,1]){beam('pantograph-lower',[x-4,y,s*1.6],[x+2,y+2.4,s*1.6],.23);beam('pantograph-upper',[x+2,y+2.4,s*1.6],[x-2,y+4.6,s*.8],.19);}
  box('pantograph-contact',x-2,y+4.6,0,1,.25,9,dark);group.userData.features.push('pantograph');
  if(m.id==='n700s'||m.id==='crh380a')for(const s of [-1,1])box('pantograph-wind-shield',x,top+1,s*4.6,13,2.1,.7,body);
 }
 if(cab){
  if(commuter){
   // The full black face is surrounded by a silver/white frame, with split orange corners.
   const x=half+.03,fy=bottom+9.7;
   const face=add(new THREE.PlaneGeometry(W*.89,top-bottom-1.1),white,'cab-face-frame');face.rotation.y=Math.PI/2;face.position.set(x,fy,0);
   const maskHeight=top-bottom-7.4,mask=add(new THREE.PlaneGeometry(W*.78,maskHeight),glass,'flat-cab-window');mask.rotation.y=Math.PI/2;mask.position.set(x+.025,bottom+6.4+maskHeight/2,0);
   for(const s of [-1,1]){box('front-orange-corner',x+.08,bottom+4.5,s*W*.36,.15,2.7,W*.22,accent);box('front-cab-divider',x+.1,fy,s*W*.18,.1,top-bottom-3,.12,steel);}
   box('front-silver-apron',x+.11,bottom+1.2,0,.16,1.7,W*.85,body);box('front-silver-centre',x+.12,bottom+4.2,0,.15,4.2,W*.47,body);box('destination-display',x+.13,top-2,0,.12,1.5,W*.35,dark);
   for(const side of [-1,1])box('commuter-pilot',half-.8,2.6,side*W*.25,2,1.7,W*.32,steel);box('front-coupler',half+.05,3.15,0,.9,1.4,2.2,dark);group.userData.features.push('flat-cab');
  }else{
   const spans={crh380a:[.08,.52,.62],cr400af:[.12,.54,.70],n700s:[.1,.36,.66],ice3:[.16,.57,.72],'tgv-duplex':[.18,.64,.68]},[a,b,w]=spans[m.id];
   const canopy=(mat,expand=0)=>add(geometryGrid(30,16,(u,v)=>{
    const t=mix(a-expand,b+expand,u),x=shoulder+t*noseLength,cap=Math.max(.001,Math.sqrt(Math.min(1,u/.11,(1-u)/.11))),lateral=(v*2-1)*(w+expand)*cap*mix(1,.76,u);
    return roofPoint(x,lateral,mat===glass?.13:.065);
   }),mat,mat===glass?'windscreen':'windscreen-border');
   canopy(m.id==='cr400af'?accent:steel,.035);canopy(glass);
   const aX=shoulder+(a+.01)*noseLength,bX=shoulder+(b-.025)*noseLength;
   for(let i=0;i<10;i++){const u=i/10,v=(i+1)/10;beam('windscreen-divider',roofPoint(mix(aX,bX,u),0,.18),roofPoint(mix(aX,bX,v),0,.18),.10,dark);}
   for(const s of [-1,1]){const q0=roofPoint(mix(aX,bX,.6),s*.06,.23),q1=roofPoint(mix(aX,bX,.79),s*.42,.23);beam('windscreen-wiper',q0,q1,.105,dark);
    if(['cr400af','tgv-duplex'].includes(m.id))sidePolygon('driver-side-window',[[shoulder-2,top-4],[shoulder+noseLength*.2,top-4.4],[shoulder+noseLength*.28,top-6.7],[shoulder+.4,top-6.3]],s,glass,.14);
   }
   // Fine coupler-hatch seam follows the rounded surface near the tip.
   const seamX=shoulder+noseLength*(m.id==='tgv-duplex'?.88:.92);
   for(let j=0;j<48;j++){const t0=j/48*Math.PI*2,t1=(j+1)/48*Math.PI*2;beam('coupler-hatch-seam',sectionPoint(seamX,t0,.025),sectionPoint(seamX,t1,.025),.045,steel);}
  }
  const lampMat=material(tail?'#dd2544':'#fff2c8',{emissive:tail?'#b70d27':'#fff0bc',emissiveIntensity:.7});
  for(const s of [-1,1]){
   const t=m.id==='crh380a'?.68:m.id==='n700s'?.72:m.id==='cr400af'?.51:m.id==='ice3'?.73:.69,x=shoulder+t*noseLength,q=profile(x);
   if(commuter){box('cab-light',half+.15,top-3.2,s*W*.30,.22,1.2,2.1,lampMat);}
   else{
    const y=q.bottom+(q.top-q.bottom)*.70,loc=sidePoint(x,y,s,.17),lamp=add(new THREE.SphereGeometry(1,14,8),lampMat,'cab-light');lamp.position.set(...loc);lamp.scale.set(m.id==='cr400af'?3.6:1.7,.48,.18);
    const frame=add(new THREE.SphereGeometry(1,14,8),steel,'lamp-surround');frame.position.set(...sidePoint(x,y,s,.13));frame.scale.set(m.id==='cr400af'?3.9:1.95,.67,.18);
   }
  }
  group.userData.features.push('windscreen',tail?'tail-lights':'headlights');
 }

 // Sparse typographic identifiers make the six families recognisable at close range.
 const lettering=new THREE.MeshBasicMaterial({map:acquireLettering(m),color:'#ffffff',alphaTest:.3,side:THREE.DoubleSide,toneMapped:false});group.userData.trainLetteringKey=m.id;
 function labelGeometry(nu,nv,point,row,flip=false,flipV=false){const g=geometryGrid(nu,nv,point),uv=[];for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++)uv.push(flip?1-i/nu:i/nu,(1-(row+1)/2)+(flipV?1-j/nv:j/nv)/2);g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return g;}
 const lx=cab?shoulder+(m.id==='crh380a'||m.id==='cr400af'?4:-12):0,ly=m.id==='ice3'?bottom+3.9:duplex?bottom+6.5:commuter?low+.5:m.id==='n700s'?bottom+3.5:low+3.7;
 for(const side of [-1,1]){const width=commuter?4.8:m.id==='ice3'?13:10,height=commuter?2:3.3;add(labelGeometry(10,5,(u,v)=>sidePoint(lx+(u-.5)*width,ly+(v-.5)*height,side,.34),0,side<0),lettering,'family-lettering');}
 if(cab&&!commuter){const cx=shoulder+noseLength*(m.id==='n700s'?.55:duplex?.75:.70),width=duplex?6:9,height=duplex?1.8:2.8;
  add(labelGeometry(14,8,(u,v)=>{const x=cx+(v-.5)*height;return roofPoint(x,(u-.5)*width/profile(x).w,.21);},1,true,true),lettering,'nose-lettering');
 }
 group.userData.features.push('family-lettering');
 group.userData.components=batchCarMeshes(assembly);group.updateMatrixWorld(true);return group;
}

export function disposeTrainModel(group){
 if(!group||group.userData?.trainModelDisposed)return;
 const geometries=new Set(),materials=new Set(),textures=new Set(),visited=[];
 function visit(o){if(o.userData?.trainModelDisposed)return;visited.push(o);if(o.geometry)geometries.add(o.geometry);for(const mat of (Array.isArray(o.material)?o.material:o.material?[o.material]:[])){materials.add(mat);for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);}for(const child of o.children||[])visit(child);}
 visit(group);
 for(const o of visited)if(o.userData.trainLetteringKey&&!o.userData.trainLetteringReleased){releaseLettering(o.userData.trainLetteringKey);o.userData.trainLetteringReleased=true;o.userData.trainModelDisposed=true;}
 for(const t of textures)if(!t.userData?.trainLetteringKey)t.dispose();for(const g of geometries)g.dispose();for(const mat of materials)mat.dispose();group.userData.trainModelDisposed=true;
}
