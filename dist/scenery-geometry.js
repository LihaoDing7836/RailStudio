import {validateOutline} from './board.js?v=d4452c6508974d83';
// Model-space millimetres. Scenic objects never expose railway connectors.
export const isScenery=part=>part?.kind==='aircraft'||part?.kind==='scenery';
export const isTrack=part=>!part?.kind||part.kind==='track';
export const sceneConfig=(part,piece={})=>({...part.dimensions,...part.defaults,...piece.scene});
export const pathLength=points=>points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-points[i].x,p.y-points[i].y),0);
export const rect=(L,W)=>[{x:0,y:-W/2},{x:L,y:-W/2},{x:L,y:W/2},{x:0,y:W/2}];
export function sceneCenterline(part,piece={}){
 const c=sceneConfig(part,piece),pts=c.points||[{x:0,y:0},{x:c.length,y:0}];
 if(!c.curved||pts.length<3)return pts;
 // Chaikin corner rounding stays inside the control polygon, avoiding overshoot.
 let out=pts;for(let pass=0;pass<2;pass++){const next=[out[0]];for(let i=0;i<out.length-1;i++){const a=out[i],b=out[i+1];next.push({x:.75*a.x+.25*b.x,y:.75*a.y+.25*b.y},{x:.25*a.x+.75*b.x,y:.25*a.y+.75*b.y});}next.push(out.at(-1));out=next;}return out;
}
export function roadEdges(points,width){
 return [-1,1].map(sign=>points.map((p,i)=>{const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],normal=(a,b)=>{const L=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:-(b.y-a.y)/L,y:(b.x-a.x)/L};};let a=normal(prev,p),b=normal(p,next);if(i===0)a=b;if(i===points.length-1)b=a;const sum={x:a.x+b.x,y:a.y+b.y},len=Math.hypot(sum.x,sum.y);const n=len>.01?{x:sum.x/len,y:sum.y/len}:a,den=Math.max(.5,n.x*a.x+n.y*a.y),d=sign*width/2/den;return {x:p.x+n.x*d,y:p.y+n.y*d};}));
}
export function aircraftPlan(part,piece={}){
 const {length:L,width:W,height:H}=sceneConfig(part,piece),bodyWidth=Math.min(H*.55,W*.13,L*(part.profile==='doubledeck'?.105:.095)),r=bodyWidth/2;
 const body=Array.from({length:41},(_,i)=>{const a=i/40*Math.PI*2;return {x:L/2+L/2*Math.cos(a),y:r*Math.sin(a)*(.83+.17*Math.cos(a))};});
 const wings=[{x:L*.63,y:-r*.6},{x:L*.37,y:-W/2},{x:L*.29,y:-W/2},{x:L*.4,y:-r},{x:L*.4,y:r},{x:L*.29,y:W/2},{x:L*.37,y:W/2},{x:L*.63,y:r*.6}];
 const tail=[{x:L*.21,y:0},{x:L*.09,y:-W*.2},{x:L*.02,y:-W*.2},{x:L*.07,y:0},{x:L*.02,y:W*.2},{x:L*.09,y:W*.2}];
 const engines=(part.engines===4?[-.34,-.18,.18,.34]:[-.22,.22]).map(t=>({x:L*(Math.abs(t)>.3?.37:.48),y:W*t,length:L*.12,width:bodyWidth*.53}));
 return {L,W,H,bodyWidth,body,wings,tail,engines};
}
export function sceneryGeometry(part,piece={}){
 const c=sceneConfig(part,piece);let polygons;
 if(part.kind==='aircraft'){const a=aircraftPlan(part,piece);polygons=[a.body,a.wings,a.tail];}
 else if(['road','taxiway'].includes(part.sceneType)){const [a,b]=roadEdges(sceneCenterline(part,piece),c.width);polygons=[[...a,...b.reverse()]];}
 else if(part.sceneType==='apron')polygons=[c.points||rect(c.length,c.width)];
 else polygons=[rect(c.length,c.width)];
 return {paths:polygons.map(points=>({points:[...points,points[0]],length:0})),endpoints:[],length:0};
}
export function validateScene(part,piece){
 if(!isScenery(part)){if(piece.scene!==undefined)throw Error('此零件不支持机场或道路参数');return {};}
 if(piece.scene!==undefined&&(!piece.scene||typeof piece.scene!=='object'||Array.isArray(piece.scene)))throw Error('场景参数无效');
 const c=sceneConfig(part,piece),finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
 for(const k of ['length','width','height'])if(!finite(c[k],k==='height'&&part.kind!=='aircraft'?0:1,50000))throw Error('模型长、宽、高须为有效毫米尺寸');
 const out={length:c.length,width:c.width,height:c.height};
 for(const k of ['label','runwaySide'])if(c[k]!==undefined){if(typeof c[k]!=='string'||c[k].length>60)throw Error('名称或编号无效');out[k]=c[k];}
 if(c.color!==undefined){if(!/^#[a-f0-9]{6}$/i.test(c.color))throw Error('模型颜色无效');out.color=c.color;}
 if(c.lanes!==undefined){if(!Number.isInteger(c.lanes)||c.lanes<1||c.lanes>8)throw Error('车道数应为 1–8');out.lanes=c.lanes;}
 if(c.runwayNumber!==undefined){if(!Number.isInteger(c.runwayNumber)||c.runwayNumber<1||c.runwayNumber>36||!['','L','C','R'].includes(c.runwaySide||''))throw Error('跑道编号应为 01–36，可选 L/C/R');out.runwayNumber=c.runwayNumber;}
 if(c.curved!==undefined){if(typeof c.curved!=='boolean')throw Error('曲线参数无效');out.curved=c.curved;}
 if(c.points!==undefined){const min=part.sceneType==='apron'?3:2;if(!['road','taxiway','apron'].includes(part.sceneType)||!Array.isArray(c.points)||c.points.length<min||c.points.length>64)throw Error('道路需要 2–64 个顶点，机坪需要 3–64 个顶点');for(let i=0;i<c.points.length;i++){const q=c.points[i];if(!q||!finite(q.x,-100000,100000)||!finite(q.y,-100000,100000)||(i&&Math.hypot(q.x-c.points[i-1].x,q.y-c.points[i-1].y)<1))throw Error('顶点坐标无效或相邻点间距不足 1 mm');}out.points=c.points.map(({x,y})=>({x,y}));if(part.sceneType==='apron'){const minX=Math.min(...out.points.map(p=>p.x)),minY=Math.min(...out.points.map(p=>p.y)),shifted=out.points.map(p=>({x:p.x-minX,y:p.y-minY}));validateOutline(shifted,200000,200000);}}
 if(piece.slope||piece.ramp||piece.zEnd!==undefined&&Math.abs((piece.zEnd||0)-(piece.z||0))>.00001)throw Error('飞机与机场设施须保持水平，请使用楼层设置高度');
 return {scene:out};
}
export function runwayNames(c){const n=c.runwayNumber||9,side=c.runwaySide||'';return [String(n).padStart(2,'0')+side,String((n+17)%36+1).padStart(2,'0')+({L:'R',R:'L',C:'C','':''}[side])];}
export const sceneryOrder=part=>part.sceneType==='apron'?0:['road','taxiway','runway'].includes(part.sceneType)?1:part.sceneType==='stand'?2:part.kind==='aircraft'?5:4;
