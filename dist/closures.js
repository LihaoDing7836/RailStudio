import {connections,worldGeometry,compatible,angleDiff} from './geometry.js?v=53ebd752d1db3b5a';
export const closurePolicy={ratio:.0015,minGap:.6,maxGap:8,minAngle:.6,maxAngle:3,anglePerMM:.0003};
export const portKey=e=>JSON.stringify([e.pieceId,e.index]);
// These are conservative software design budgets, NOT manufacturer tolerances.
export function closureLimits(length){return {gap:Math.min(closurePolicy.maxGap,Math.max(closurePolicy.minGap,length*closurePolicy.ratio)),angle:Math.min(closurePolicy.maxAngle,closurePolicy.minAngle+length*closurePolicy.anglePerMM)};}
class Heap{
 constructor(){this.items=[];}
 push(value){const a=this.items;let i=a.length;a.push(value);while(i){const p=(i-1)>>1;if(a[p][0]<=value[0])break;a[i]=a[p];i=p;}a[i]=value;}
 pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1][0]<a[c][0])c++;if(a[c][0]>=last[0])break;a[i]=a[c];i=c;}a[i]=last;}return first;}
}
// Route length uses individual physical paths, not the sum of unrelated tracks
// or both rails of a double-track part. Crossings do not create mid-path turns.
function routeGraph(pieces,byId,strict){
 const edges=[],ports=new Map();const add=()=>{edges.push([]);return edges.length-1;};const join=(a,b,d)=>{if(a===b)return;edges[a].push([b,d]);edges[b].push([a,d]);};
 for(const p of pieces){const g=worldGeometry(byId[p.partId],p),local=[];
 const node=q=>{let found=local.find(v=>Math.hypot(v.q.x-q.x,v.q.y-q.y)<.05&&Math.abs(v.q.z-q.z)<.5);if(!found){found={q,id:add()};local.push(found);}return found.id;};
 for(const path of g.paths){if(path.length<=0||path.points.length<2)continue;join(node(path.points[0]),node(path.points.at(-1)),path.length);}
 for(const e of g.endpoints)ports.set(portKey(e),node(e));}
 for(const [a,b] of strict.pairs){const x=ports.get(portKey(a)),y=ports.get(portKey(b));if(x!==undefined&&y!==undefined)join(x,y,Math.hypot(a.x-b.x,a.y-b.y));}
 const components=new Int32Array(edges.length).fill(-1);let component=0;for(let i=0;i<edges.length;i++)if(components[i]<0){const stack=[i];components[i]=component;while(stack.length){const a=stack.pop();for(const [b] of edges[a])if(components[b]<0){components[b]=component;stack.push(b);}}component++;}
 const distances=new Map();
 return (a,b)=>{const start=ports.get(portKey(a)),end=ports.get(portKey(b));if(start===undefined||end===undefined||components[start]!==components[end])return null;const key=[Math.min(start,end),Math.max(start,end)].join(':');if(distances.has(key))return distances.get(key);
 const d=new Float64Array(edges.length).fill(Infinity),heap=new Heap();d[start]=0;heap.push([0,start]);while(heap.items.length){const [length,u]=heap.pop();if(length!==d[u])continue;if(u===end){distances.set(key,length);return length;}for(const [v,weight] of edges[u])if(length+weight<d[v]){d[v]=length+weight;heap.push([d[v],v]);}}return null;};
}
function assess(a,b,distance){
 if(!a||!b)return {eligible:false,reason:'端点已不存在'};
 const gap=Math.hypot(a.x-b.x,a.y-b.y),angle=angleDiff(a.angle,b.angle+180),height=Math.abs(a.z-b.z),result={a,b,gap,angle,height};
 if(!compatible(a,b))return {...result,eligible:false,reason:'品牌、轨距、接口或高度不兼容'};
 if(a.pieceId===b.pieceId)return {...result,eligible:false,reason:'请选择两段不同轨道的端点'};
 const length=distance(a,b);if(length===null||length<=0)return {...result,eligible:false,reason:'两端之间没有已接通的实体轨道路由，不能作为最终闭环'};
 const limits=closureLimits(length),eligible=gap<=limits.gap+1e-8&&angle<=limits.angle+1e-8;
 return {...result,length,limits,eligible,reason:eligible?'':`超过这条线路的估算范围（${limits.gap.toFixed(2)} mm / ${limits.angle.toFixed(2)}°）`};
}
export function closureAnalysis(project,byId,{candidates=false,selected=[]}={}){
 const strict=connections(project.pieces,byId),all=new Map(strict.endpoints.map(e=>[portKey(e),e])),open=new Map(strict.open.map(e=>[portKey(e),e])),taken=new Set(),tolerated=[],invalid=[],records=project.closures||[];let graph;
 const distance=(a,b)=>(graph??=routeGraph(project.pieces,byId,strict))(a,b);
 for(const record of records){const a=all.get(portKey(record.a)),b=all.get(portKey(record.b));let result;
 if(!a||!b)result={a,b,eligible:false,reason:'轨道或端点已不存在'};
 else if(taken.has(portKey(a))||taken.has(portKey(b)))result={a,b,eligible:false,reason:'端点已用于其他容差闭合'};
 else if(!open.has(portKey(a))||!open.has(portKey(b)))result={a,b,eligible:false,reason:'端点已由严格连接占用，可移除此记录'};
 else result=assess(a,b,distance);
 if(result.eligible){taken.add(portKey(a));taken.add(portKey(b));tolerated.push({...result,record});}else invalid.push({...result,record});}
 const result={...strict,strictPairs:strict.pairs,pairs:[...strict.pairs,...tolerated.map(r=>[r.a,r.b])],open:strict.open.filter(e=>!taken.has(portKey(e))),tolerated,invalidClosures:invalid,candidates:[],truncated:false};
 if(!candidates)return result;
 const reserved=new Set(records.flatMap(r=>[portKey(r.a),portKey(r.b)])),selection=new Set(selected),grid=new Map();let inspected=0;
 scan:for(const a of result.open){if(reserved.has(portKey(a)))continue;const x=Math.floor(a.x/8),y=Math.floor(a.y/8);
 for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const b of grid.get((x+dx)+','+(y+dy))||[]){if(++inspected>100000||result.candidates.length>=100){result.truncated=true;break scan;}if(selection.size&&!selection.has(a.pieceId)&&!selection.has(b.pieceId))continue;if(a.pieceId===b.pieceId||!compatible(a,b)||Math.hypot(a.x-b.x,a.y-b.y)>8||angleDiff(a.angle,b.angle+180)>3)continue;const c=assess(a,b,distance);if(c.length)result.candidates.push(c);}
 const key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(a);}
 result.candidates.sort((a,b)=>Number(b.eligible)-Number(a.eligible)||a.gap-b.gap);return result;
}
export const layoutConnections=(project,byId)=>closureAnalysis(project,byId);
export function acceptClosure(project,byId,a,b,id){
 if((project.closures||[]).length>=500)throw Error('容差闭合记录最多 500 条');
 const state=layoutConnections(project,byId),ports=new Map(state.open.map(e=>[portKey(e),e])),reserved=new Set((project.closures||[]).flatMap(r=>[portKey(r.a),portKey(r.b)]));
 if(reserved.has(portKey(a))||reserved.has(portKey(b)))throw Error('请先移除这两个端点已有的闭合记录');
 const pa=ports.get(portKey(a)),pb=ports.get(portKey(b));if(!pa||!pb)throw Error('端点已连接或已不存在，请重新检查');
 const result=assess(pa,pb,routeGraph(project.pieces,byId,connections(project.pieces,byId)));if(!result.eligible)throw Error(result.reason);
 (project.closures??=[]).push({id,a:{pieceId:a.pieceId,index:a.index},b:{pieceId:b.pieceId,index:b.index}});return result;
}
export function pruneClosures(project){if(project.closures){const ids=new Set(project.pieces.map(p=>p.id));project.closures=project.closures.filter(r=>ids.has(r.a.pieceId)&&ids.has(r.b.pieceId));}}
