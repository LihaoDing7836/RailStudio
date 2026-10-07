import * as THREE from './lib/three/three.module.js';
import {sceneConfig,aircraftPlan,roadEdges,sceneryOrder} from './scenery-geometry.js?v=d4452c6508974d83';
import {sceneArtwork} from './scenery.js?v=d4452c6508974d83';
export function createScenery3D(part,piece){
 const group=new THREE.Group(),c=sceneConfig(part,piece),material=color=>new THREE.MeshStandardMaterial({color,roughness:.65,side:THREE.DoubleSide});
 const mesh=(geo,color,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,material(color));m.position.set(x,y,z);group.add(m);return m;};
 const polygon=(points,color,height)=>{const contour=points.map(p=>new THREE.Vector2(p.x,p.y));if(contour.length>2&&contour[0].distanceTo(contour.at(-1))<1e-8)contour.pop();const indices=THREE.ShapeUtils.triangulateShape(contour,[]).flat(),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(contour.flatMap(p=>[p.x,height,p.y]),3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(geo,color);};
 const box=(x,z,L,W,H,y,color)=>mesh(new THREE.BoxGeometry(L,H,W),color,x+L/2,y+H/2,z);
 const text=(o,height)=>{if(!o.text)return;const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=512;canvas.height=128;ctx.font='600 76px Arial';ctx.fillStyle=o.color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(o.text,256,64,500);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(o.size*4,o.size),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.rotation.z=-(o.angle||0)*Math.PI/180;m.position.set(o.x,height,o.y);group.add(m);};
 const stroke=(points,color,width,dash,height)=>{
  if(dash){const [on,off]=dash.split(' ').map(Number);let traveled=0;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],L=Math.hypot(b.x-a.x,b.y-a.y);for(let t=0;t<L;){const cycle=(traveled+t)%(on+off),step=Math.min(L-t,(cycle<on?on:on+off)-cycle||.01);if(cycle<on){const p=u=>({x:a.x+(b.x-a.x)*u/L,y:a.y+(b.y-a.y)*u/L});stroke([p(t),p(t+step)],color,width,null,height);}t+=step;}traveled+=L;}return;}
  const [a,b]=roadEdges(points,width);for(let i=1;i<a.length;i++)polygon([a[i-1],a[i],b[i],b[i-1]],color,height);
 };
 if(part.kind==='aircraft'){
  const a=aircraftPlan(part,piece),{L,W,H,bodyWidth:B}=a,accent=c.color||'#317b91',bodyZ=H*.32;
  const body=mesh(new THREE.SphereGeometry(1,32,16),'#f3f6f7',L/2,bodyZ,0);body.scale.set(L/2,B/2,B/2);
  polygon(a.wings,'#c3d0d7',bodyZ-B*.2);polygon(a.tail,'#cbd8de',bodyZ+B*.12);
  const fin=new THREE.BufferGeometry();fin.setAttribute('position',new THREE.Float32BufferAttribute([L*.04,bodyZ,0,L*.09,H,0,L*.2,H*.95,0,L*.29,bodyZ,0],3));fin.setIndex([0,1,2,0,2,3]);fin.computeVertexNormals();mesh(fin,accent);
  for(const e of a.engines){const h=bodyZ-B*.43,engine=mesh(new THREE.CylinderGeometry(e.width/2,e.width*.43,e.length,18), '#e0e7eb',e.x,h,e.y);engine.rotation.z=Math.PI/2;const inlet=mesh(new THREE.CylinderGeometry(e.width*.37,e.width*.37,.8,18),'#273a45',e.x+e.length/2+.1,h,e.y);inlet.rotation.z=Math.PI/2;}
  const cockpit=mesh(new THREE.SphereGeometry(1,16,8),'#284b60',L*.91,bodyZ+B*.22,0);cockpit.scale.set(L*.025,B*.12,B*.34);
  if(part.profile==='hump'||part.profile==='doubledeck'){const upper=mesh(new THREE.SphereGeometry(1,24,12),'#f4f7f8',part.profile==='hump'?L*.73:L*.53,bodyZ+B*.3,0);upper.scale.set(L*(part.profile==='hump'?.2:.39),B*.3,B*.42);}
  for(const [x,z] of [[L*.85,0],[L*.4,-B*.65],[L*.4,B*.65]]){box(x-1,z,2,2,bodyZ-B*.4,0,'#75818a');const wheel=mesh(new THREE.CylinderGeometry(H*.033,H*.033,B*.1,10),'#303b42',x,H*.033,z);wheel.rotation.x=Math.PI/2;}
  // Small cabin windows keep the neutral livery readable from oblique views.
  for(let x=L*.25;x<L*.84;x+=Math.max(6,L/28))for(const sign of [-1,1]){const o=mesh(new THREE.SphereGeometry(1,6,4),'#466474',x,bodyZ+B*.1,sign*B*.46*Math.sqrt(Math.max(0,1-((x-L/2)/(L/2))**2)));o.scale.set(L*.006,B*.06,B*.025);}
 }else{
  const t=part.sceneType,H=c.height||0;
  if(H>0){if(t==='tower'){box(c.length*.35,0,c.length*.3,c.width*.3,H*.75,0,'#c5d0d4');box(0,0,c.length,c.width,H*.25,H*.75,c.color);}else if(t==='jetbridge'){box(0,0,c.length,c.width,H*.42,H*.58,c.color);for(const x of [c.length*.12,c.length*.85])box(x,0,3,3,H*.6,0,'#84949b');}else box(0,0,c.length,c.width,H,0,c.color);}
  const surface=H+.4+sceneryOrder(part)*.5;let n=0;for(const o of sceneArtwork(part,piece)){const h=surface+(n++)*.04;
   const before=group.children.length;if(o.text!==undefined)text(o,h+.1);else{if(o.fill)polygon(o.points,o.fill,h);if(o.stroke)stroke(o.closed?[...o.points,o.points[0]]:o.points,o.stroke,o.strokeWidth,o.dash,h+.03);}
   // Decals need stable depth separation even when the entire airport is in view.
   for(const m of group.children.slice(before)){m.material.polygonOffset=true;m.material.polygonOffsetFactor=-n;m.material.polygonOffsetUnits=-n;}
  }
 }
 group.position.set(piece.x,piece.z||0,piece.y);group.rotation.y=-(piece.angle||0)*Math.PI/180;group.scale.z=piece.flip||1;group.userData={pieceId:piece.id,kind:part.kind};return group;
}
