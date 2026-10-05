import {isTrack} from './scenery-geometry.js?v=c5604777f33f6308';
import {worldGeometry,angleDiff} from './geometry.js?v=c5604777f33f6308';
import {terrainHeight} from './elevation-schema.js?v=c5604777f33f6308';
// Resample the same 3D geometry that is used by endpoint snapping.
export function elevatedPaths(part,piece,step=30){return worldGeometry(part,piece).paths.map(path=>{
 const points=[];let length=0;
 for(let i=0;i<path.points.length-1;i++){const a=path.points[i],b=path.points[i+1],distance=Math.hypot(b.x-a.x,b.y-a.y),n=Math.max(1,Math.ceil(distance/step));length+=distance;for(let j=0;j<n;j++){const t=j/n;points.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});}}
 if(path.points.length)points.push({...path.points.at(-1)});return {...path,points,length};
});}
export function maximumGrade(part,piece){let grade=0;for(const path of worldGeometry(part,piece).paths)for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i],length=Math.hypot(b.x-a.x,b.y-a.y);if(length>1e-8)grade=Math.max(grade,Math.abs(b.z-a.z)/length*100);}return grade;}
const corridorTypes=new Set(['straight','curve','flex','doubleStraight','doubleCurve','transition']);
// A corridor can contain parallel rails. Multiple connections to the same
// neighboring piece are one link; true branches and closed loops use a plane.
export function rampChain(pieces,byId,reverse=false){
 if(!pieces.length||pieces.length>5000)throw Error('请选择轨道');
 const nodes=pieces.map(p=>{const part=byId[p.partId],g=worldGeometry(part,p);if(part.kind==='building'||(!corridorTypes.has(part.geometry.type)&&!(g.paths.length===1&&g.endpoints.length===2)))throw Error('复杂选区采用方向坡面');const sides=g.endpoints.map(e=>{let start=Infinity,end=Infinity;for(const path of g.paths){const a=path.points[0],b=path.points.at(-1);start=Math.min(start,Math.hypot(e.x-a.x,e.y-a.y));end=Math.min(end,Math.hypot(e.x-b.x,e.y-b.y));}if(Math.min(start,end)>.01||Math.abs(start-end)<.00001)throw Error('复杂端口采用方向坡面');return start<end?0:1;});return {p,g,sides,links:[new Set(),new Set()]};});
 const ports=nodes.flatMap((n,i)=>n.g.endpoints.map((e,j)=>({e,i,side:n.sides[j]}))),grid=new Map();
 for(const v of ports){const {e,i,side}=v,x=Math.floor(e.x/.6),y=Math.floor(e.y/.6);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const q of grid.get((x+dx)+','+(y+dy))||[]){const f=q.e;if(q.i!==i&&e.brand===f.brand&&e.scale===f.scale&&e.connector===f.connector&&Math.hypot(e.x-f.x,e.y-f.y)<.6&&angleDiff(e.angle,f.angle+180)<.6){nodes[i].links[side].add(q.i+':'+q.side);nodes[q.i].links[q.side].add(i+':'+side);if(nodes[i].links[side].size>1||nodes[q.i].links[q.side].size>1)throw Error('分支选区采用方向坡面');}}const key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(v);}
 if(nodes.some(n=>n.links.some(l=>l.size>1)))throw Error('分支选区采用方向坡面');
 const ends=nodes.flatMap((n,i)=>n.links.map((l,e)=>l.size?null:[i,e]).filter(Boolean));if(ends.length!==2)throw Error('闭环或分离选区采用方向坡面');
 let [i,entry]=ends[reverse?1:0],seen=new Set(),ordered=[];
 const center=(n,side)=>{const ports=n.g.endpoints.filter((_,j)=>n.sides[j]===side);return {x:ports.reduce((sum,e)=>sum+e.x,0)/ports.length,y:ports.reduce((sum,e)=>sum+e.y,0)/ports.length};};
 while(!seen.has(i)){seen.add(i);const n=nodes[i];ordered.push({piece:n.p,entry,length:n.g.paths.reduce((sum,path)=>sum+path.length,0)/n.g.paths.length,start:center(n,entry),end:center(n,1-entry)});const link=[...n.links[1-entry]][0];if(!link)break;[i,entry]=link.split(':').map(Number);}
 if(seen.size!==nodes.length)throw Error('分离选区采用方向坡面');return ordered;
}
function planePlan(pieces,byId,start,end,reverse,angle){
 const geometry=pieces.map(p=>({p,g:worldGeometry(byId[p.partId],p)})),points=geometry.flatMap(n=>[...n.g.paths.flatMap(path=>path.points),...n.g.endpoints]);
 if(!points.length)throw Error('选区没有可计算的轨道几何');
 if(angle===undefined){let x=0,y=0;for(const p of points){x+=p.x/points.length;y+=p.y/points.length;}let xx=0,yy=0,xy=0;for(const p of points){xx+=(p.x-x)**2;yy+=(p.y-y)**2;xy+=(p.x-x)*(p.y-y);}angle=Math.atan2(2*xy,xx-yy)*90/Math.PI;const line=geometry[0].g.paths[0].points,a=line[0],b=line.at(-1);if((b.x-a.x)*Math.cos(angle*Math.PI/180)+(b.y-a.y)*Math.sin(angle*Math.PI/180)<0)angle+=180;}
 if(!Number.isFinite(angle))throw Error('请输入有效的坡面方向');const radians=angle*Math.PI/180,ux=Math.cos(radians),uy=Math.sin(radians);let lo=Infinity,hi=-Infinity,A,B;for(const p of points){const d=p.x*ux+p.y*uy;if(d<lo){lo=d;A=p;}if(d>hi){hi=d;B=p;}}
 const span=hi-lo;if(span<.001)throw Error('此方向没有足够跨度，请调整坡面方向');const sign=reverse?-1:1;
 return {mode:'plane',angle,length:span,start:reverse?B:A,end:reverse?A:B,pieces:pieces.map(p=>{const a=p.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),f=p.flip||1;return {...p,z:start,zEnd:end,slope:{a:sign*(ux*c+uy*s)/span,b:sign*f*(-ux*s+uy*c)/span,c:reverse?1-(p.x*ux+p.y*uy-lo)/span:(p.x*ux+p.y*uy-lo)/span}};})};
}
export function rampPlan(selection,byId,start,end,reverse=false,options={}){
 const pieces=selection.filter(p=>isTrack(byId[p.partId]));if(!pieces.length||pieces.length>5000)throw Error('请至少选择一段可放置轨道');
 if(!Number.isFinite(start)||!Number.isFinite(end))throw Error('楼层高度无效');let plan;
 if(options.mode!=='plane'){try{const ordered=rampChain(pieces,byId,reverse),length=ordered.reduce((n,p)=>n+p.length,0);if(length<.001)throw Error('坡道长度无效');let at=0;plan={mode:'route',length,start:ordered[0].start,end:ordered.at(-1).end,pieces:ordered.map(n=>{const a=start+(end-start)*at/length;at+=n.length;const b=start+(end-start)*at/length;const p={...n.piece,z:n.entry===0?a:b,zEnd:n.entry===0?b:a};delete p.slope;return p;})};}catch{/* A shared plane defines all junctions and crossings continuously. */}}
 plan??=planePlan(pieces,byId,start,end,reverse,options.angle);
 plan.grade=plan.pieces.reduce((max,p)=>Math.max(max,maximumGrade(byId[p.partId],p)),0);plan.ignored=selection.length-pieces.length;
 return plan;
}
export function elevationWarnings(project,byId){
 const issues=[],segments=[],limit=project.designLimits||{maxGrade:3,clearance:50};let buried=0,steep=0;
 for(const p of project.pieces){const part=byId[p.partId];if(!isTrack(part))continue;const paths=elevatedPaths(part,p,45);if(maximumGrade(part,p)>limit.maxGrade+.001)steep++;
 if(paths.some(path=>path.points.some(q=>terrainHeight(project.terrain||[],q.x,q.y)>q.z+2)))buried++;
 for(const path of paths)for(let i=1;i<path.points.length;i++)segments.push({a:path.points[i-1],b:path.points[i],id:p.id});}
 if(steep)issues.push(`${steep} 段坡度超过设定的 ${limit.maxGrade}%`);if(buried)issues.push(`${buried} 段轨道低于地形表面（隧道需单独设计净空）`);
 // Spatial hash bounds the work on large layouts. Centerline crossings only.
 const cells=new Map(),pairs=new Set(),conflicts=new Set();let comparisons=0;
 check: for(let i=0;i<segments.length;i++){const s=segments[i],x0=Math.floor(Math.min(s.a.x,s.b.x)/100),x1=Math.floor(Math.max(s.a.x,s.b.x)/100),y0=Math.floor(Math.min(s.a.y,s.b.y)/100),y1=Math.floor(Math.max(s.a.y,s.b.y)/100);
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const key=x+','+y,bin=cells.get(key)||[];for(const j of bin){const t=segments[j],pk=j+','+i;if(t.id===s.id||pairs.has(pk))continue;pairs.add(pk);if(++comparisons>300000)break check;const dx=s.b.x-s.a.x,dy=s.b.y-s.a.y,ex=t.b.x-t.a.x,ey=t.b.y-t.a.y,den=dx*ey-dy*ex;if(Math.abs(den)<1e-7)continue;const u=((t.a.x-s.a.x)*ey-(t.a.y-s.a.y)*ex)/den,v=((t.a.x-s.a.x)*dy-(t.a.y-s.a.y)*dx)/den;if(u<0||u>1||v<0||v>1)continue;const gap=Math.abs(s.a.z+u*(s.b.z-s.a.z)-t.a.z-v*(t.b.z-t.a.z));if(gap>.6&&gap<limit.clearance)conflicts.add([s.id,t.id].sort().join('|'));}bin.push(i);cells.set(key,bin);}}
 if(conflicts.size)issues.push(`${conflicts.size} 组上下交叉轨道的轨面高度差小于 ${limit.clearance} mm`);if(comparisons>300000)issues.push('布局较大，交叉检查已达到计算上限，请分区复核');return issues;
}
