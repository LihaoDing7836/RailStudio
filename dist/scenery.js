import {sceneConfig,sceneCenterline,roadEdges,aircraftPlan,rect,runwayNames,sceneryGeometry} from './scenery-geometry.js?v=d4452c6508974d83';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defs=[
 ['ROAD','road','道路','自由绘制道路',{length:300,width:35,height:0,lanes:2,curved:true,color:'#626b71'}],
 ['RUNWAY','runway','飞行区','跑道',{length:1500,width:225,height:0,runwayNumber:9,runwaySide:'',color:'#505963'}],
 ['TAXIWAY','taxiway','飞行区','自由绘制滑行道',{length:500,width:115,height:0,curved:true,color:'#747c80'}],
 ['APRON','apron','飞行区','自定义机坪',{length:600,width:450,height:0,color:'#abb3b5'}],
 ['STAND','stand','飞行区','停机位',{length:300,width:280,height:0,label:'A01',color:'#e7bc54'}],
 ['TERMINAL','terminal','机场建筑','航站楼',{length:650,width:200,height:90,color:'#7096a3',label:'TERMINAL'}],
 ['TOWER','tower','机场建筑','航管塔台',{length:60,width:60,height:160,color:'#7c9ba5',label:'TOWER'}],
 ['HANGAR','hangar','机场建筑','机库',{length:440,width:420,height:160,color:'#8a969f',label:'HANGAR'}],
 ['JETBRIDGE','jetbridge','机场建筑','登机桥',{length:140,width:30,height:25,color:'#a7b9be',label:''}]
];
export const sceneryParts=defs.map(([id,sceneType,category,label,defaults])=>({id:'SCENE-'+id,sku:id,brand:'规划素材',scale:'1:200',kind:'scenery',sceneType,category,name:label,label,geometry:{type:'scenery'},defaults,dimensions:{length:defaults.length,width:defaults.width,height:defaults.height},source:'',status:'scenery',notes:[]}));
export function sceneArtwork(part,piece={}){
 const c=sceneConfig(part,piece),items=[],poly=(points,fill,stroke,strokeWidth=1)=>items.push({points,closed:true,fill,stroke,strokeWidth}),line=(points,stroke,width=1,dash)=>items.push({points,stroke,strokeWidth:width,dash}),text=(value,x,y,size,color,angle=0)=>items.push({text:value,x,y,size,color,angle});
 const L=c.length,W=c.width,t=part.sceneType;
 if(part.kind==='aircraft'){
  const a=aircraftPlan(part,piece),accent=c.color||'#317b91';poly(a.wings,'#c9d5dc','#7e939f',.7);poly(a.tail,'#d1dce2','#7e939f',.6);
  for(const e of a.engines)poly(rect(e.length,e.width).map(p=>({x:p.x+e.x-e.length/2,y:p.y+e.y})),'#e8eef0','#718894',.7);
  poly(a.body,'#f9fbfc','#7e939f',.75);line([{x:L*.13,y:0},{x:L*.86,y:0}],accent,a.bodyWidth*.2);poly([{x:L*.96,y:0},{x:L*.91,y:-a.bodyWidth*.33},{x:L*.87,y:-a.bodyWidth*.28},{x:L*.87,y:a.bodyWidth*.28},{x:L*.91,y:a.bodyWidth*.33}],'#405869');
  poly([{x:L*.02,y:0},{x:L*.19,y:-a.bodyWidth*.16},{x:L*.25,y:0},{x:L*.19,y:a.bodyWidth*.16}],accent);
  text(c.label||part.label,L*.53,0,Math.max(5,Math.min(11,L*.033)),'#294758');return items;
 }
 if(t==='road'||t==='taxiway'){
  const points=sceneCenterline(part,piece),[a,b]=roadEdges(points,W);poly([...a,...b.reverse()],c.color);
  for(const edge of roadEdges(points,W*.88))line(edge,t==='road'?'#edf0eb':'#e6c365',.8);
  if(t==='taxiway')line(points,'#f5cf65',1.6);else for(let i=1;i<(c.lanes||2);i++){const distance=W*(i/(c.lanes||2)-.5),edge=distance===0?points:roadEdges(points,Math.abs(distance)*2)[distance<0?0:1];line(edge,i*2===c.lanes?'#efcf66':'#e7eceb',.8,i*2===c.lanes?undefined:'10 9');}
 }else if(t==='runway'){
  poly(rect(L,W),c.color);for(const y of [-W*.46,W*.46])line([{x:4,y},{x:L-4,y}],'#f6f7ed',1.8);
  line([{x:L*.22,y:0},{x:L*.78,y:0}],'#f6f7ed',2.5,'25 20');
  for(const side of [0,1]){const start=side?L-L*.055:L*.025,bar=L*.03;for(let i=0;i<8;i++){const y=-W*.36+i*W*.1;poly(rect(bar,W*.045).map(p=>({x:p.x+start,y:p.y+y})),'#f7f8ef');}
   const x=side?L*.74:L*.24;for(const y of [-W*.25,W*.25])poly(rect(Math.min(45,L*.035),W*.08).map(p=>({x:p.x+x,y:p.y+y})),'#f7f8ef');}
  const names=runwayNames(c);text(names[0],L*.14,0,Math.min(W*.23,L*.035),'#ffffff',90);text(names[1],L*.86,0,Math.min(W*.23,L*.035),'#ffffff',-90);
 }else if(t==='apron'){
  const points=c.points||rect(L,W);poly(points,c.color,'#929d9f',1);
 }else if(t==='stand'){
  const col=c.color;line([{x:L*.92,y:-W*.45},{x:L*.08,y:-W*.45},{x:L*.08,y:W*.45},{x:L*.92,y:W*.45}],col,1.4);line([{x:L*.08,y:0},{x:L*.9,y:0}],col,1.4);line([{x:L*.8,y:-W*.1},{x:L*.8,y:W*.1}],col,2);text(c.label||'A01',L*.14,0,Math.min(20,W*.1),col,90);
 }else{
  poly(rect(L,W),c.color,'#46636f',1);for(let x=L*.12;x<L*.9;x+=Math.max(20,L/12))line([{x,y:-W*.44},{x,y:W*.44}],'#d9e4e9',.65);
  if(t==='terminal'||t==='hangar')poly(rect(L*.92,W*.78).map(p=>({x:p.x+L*.04,y:p.y})),'#d4dfe2','#8ba1a9',.6);
  if(t==='tower')poly(rect(L*.72,W*.72).map(p=>({x:p.x+L*.14,y:p.y})),'#314f60','#adc9d3',1);
  text(c.label||part.label,L/2,0,Math.max(5,Math.min(18,W*.13)),'#314b55');
 }return items;
}
export function artworkSVG(items){return items.map(o=>o.text!==undefined?`<text x="${o.x}" y="${o.y}" transform="rotate(${o.angle||0} ${o.x} ${o.y})" text-anchor="middle" dominant-baseline="central" font-family="Arial,sans-serif" font-size="${o.size}" font-weight="600" fill="${o.color}">${esc(o.text)}</text>`:`<path d="${o.points.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ')}${o.closed?'Z':''}" fill="${o.fill||'none'}" ${o.stroke?`stroke="${o.stroke}" stroke-width="${o.strokeWidth}" stroke-linejoin="round"`:''} ${o.dash?`stroke-dasharray="${o.dash}"`:''}/>`).join('');}
export function sceneryMarkup(part,piece,{selected=false,ghost=false,exporting=false}={}){
 const g=sceneryGeometry(part,piece),outline=g.paths.map(path=>({points:path.points,closed:true,stroke:'#dc9447',strokeWidth:2}));
 const hit=!exporting?g.paths.map(p=>`<path d="${p.points.map((q,i)=>`${i?'L':'M'}${q.x},${q.y}`).join(' ')}Z" fill="transparent" pointer-events="all"/>`).join(''):'';
 return `<g ${!exporting?`data-piece="${esc(piece.id)}" class="scenic-piece"`:''} transform="translate(${piece.x} ${piece.y}) rotate(${piece.angle||0}) scale(1 ${piece.flip||1})" opacity="${ghost?.55:1}">${artworkSVG(sceneArtwork(part,piece))}${selected?artworkSVG(outline):''}${hit}</g>`;
}
export function sceneryThumb(part){const points=sceneryGeometry(part).paths.flatMap(p=>p.points),xs=points.map(p=>p.x),ys=points.map(p=>p.y),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y,pad=Math.max(w,h)*.07;return `<svg viewBox="${x-pad} ${y-pad} ${w+2*pad} ${h+2*pad}" aria-hidden="true">${artworkSVG(sceneArtwork(part))}</svg>`;}
export function airportDemo(aircraft){
 const pieces=[],add=(partId,x,y,angle=0,scene={})=>pieces.push({id:'airport-'+pieces.length,partId,x,y,angle,flip:1,z:0,zEnd:0,scene,layerId:'ground'});
 add('SCENE-APRON',420,1050,0,{length:1600,width:700,height:0});add('SCENE-RUNWAY',230,350,0,{length:2400,width:225,height:0});add('SCENE-TAXIWAY',350,650,0,{points:[{x:0,y:0},{x:2100,y:0}],length:2100,width:115,height:0});
 for(const x of [520,2000])add('SCENE-TAXIWAY',x,450,90,{length:410,width:115,height:0});
 add('SCENE-TERMINAL',500,1530,0,{length:1450,width:190,height:90});add('SCENE-TOWER',2150,1520);add('SCENE-HANGAR',2150,1060,0,{length:450,width:450,height:170});
 for(const [i,id] of ['AIR-200-A320neo','AIR-200-787-9','AIR-200-A350-900','AIR-200-C919'].entries()){
  const x=650+i*370;add('SCENE-STAND',x,1050,90,{length:350,width:345,height:0,label:'A0'+(i+1)});if(aircraft.some(p=>p.id===id))add(id,x,1030,90);add('SCENE-JETBRIDGE',x,1480,-90);}
 add('SCENE-ROAD',240,1730,0,{length:2420,width:60,height:0,lanes:4,curved:true,points:[{x:0,y:0},{x:1000,y:70},{x:2420,y:0}]});
 return {version:1,name:'机场规划 · 展示型缩短跑道',board:{width:3000,height:2100},layers:[{id:'ground',name:'机场地面',height:0,color:'#4d7688',visible:true}],activeLayerId:'ground',pieces};
}
