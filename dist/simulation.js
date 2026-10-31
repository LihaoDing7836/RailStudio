import {worldGeometry,angleDiff} from './geometry.js?v=163a119ad935399b';
import {layoutConnections,portKey} from './closures.js?v=163a119ad935399b';

// All distances are model millimetres. The network follows centre-line paths,
// never intersections of their drawings. In particular, a diamond crossing is
// two independent paths, and only accepted closure records can bridge a gap.
const EPS=1e-7;
const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y,(b.z||0)-(a.z||0));
const vector=(a,b)=>{const d=distance(a,b)||1;return {x:(b.x-a.x)/d,y:(b.y-a.y)/d,z:((b.z||0)-(a.z||0))/d};};
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const point=p=>({x:p.x,y:p.y,z:p.z||0});
const length=points=>points.slice(1).reduce((n,p,i)=>n+distance(points[i],p),0);
const oriented=(edge,forward)=>forward?edge.points:[...edge.points].reverse();
const getPart=(byId,id)=>byId instanceof Map?byId.get(id):byId[id];

export function buildRailNetwork(project,byId){
 const nodes=[],edges=[],pieces=[],ports=new Map(),parent=[],warnings=[],approximateRoots=new Set();
 const addNode=(q,pieceId,localIndex)=>{const id=nodes.length;nodes.push({id,key:`${pieceId}:${localIndex}`,pieceId,...point(q),edges:[]});parent.push(id);return id;};
 const root=id=>{while(parent[id]!==id){parent[id]=parent[parent[id]];id=parent[id];}return id;};
 const join=(a,b)=>{a=root(a);b=root(b);if(a!==b)parent[b]=a;};
 const validPieces=[];
 for(const piece of project.pieces||[]){
  const part=getPart(byId,piece.partId);if(!part?.geometry?.type||part.kind==='building'||part.kind==='scenery'||part.kind==='aircraft')continue;
  const g=worldGeometry(part,piece),local=[],terminals=[];
  const node=q=>{let found=local.find(n=>Math.hypot(n.q.x-q.x,n.q.y-q.y)<.05&&Math.abs(n.q.z-(q.z||0))<.05);if(!found){found={q:point(q),id:addNode(q,piece.id,local.length)};local.push(found);}return found.id;};
  const pathIndices=[];
  g.paths.forEach((path,pathIndex)=>{
   const pts=path.points.map(point).filter((q,i,a)=>!i||distance(a[i-1],q)>EPS);
   if(pts.length<2||!pts.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)&&Number.isFinite(q.z)))return;
   const d=length(pts);if(d<EPS||path.length<=0)return;
   const edge={id:edges.length,pieceId:piece.id,partId:piece.partId,pathIndex,a:node(pts[0]),b:node(pts.at(-1)),points:pts,length:d};
   edges.push(edge);pathIndices.push(pathIndex);
   for(const [nodeId,q,inside] of [[edge.a,pts[0],pts[1]],[edge.b,pts.at(-1),pts.at(-2)]])terminals.push({nodeId,q,angle:Math.atan2(q.y-inside.y,q.x-inside.x)*180/Math.PI});
  });
  if(!pathIndices.length)continue;
  validPieces.push(piece);
  let unmatched=0;
  for(const e of g.endpoints){
   // Imported XTrackCAD metadata can place the advertised connector a fraction
   // of a millimetre away from its sampled arc. Map only a nearby end with the
   // same outward direction; never connect to a path interior or distant rail.
   const candidates=terminals.map(t=>({...t,gap:Math.hypot(t.q.x-e.x,t.q.y-e.y)})).filter(t=>t.gap<=.6&&Math.abs(t.q.z-e.z)<.5&&angleDiff(t.angle,e.angle)<=5).sort((a,b)=>a.gap-b.gap);
   const match=candidates[0];
   if(!match){unmatched++;continue;}
   ports.set(portKey(e),match.nodeId);if(match.gap>=.05)approximateRoots.add(match.nodeId);
  }
  if(unmatched)warnings.push(`${part.label||part.name||part.sku||part.id} 有 ${unmatched} 个接口无法与实体路径准确对应，已保持断开。`);
  pieces.push({id:piece.id,partId:piece.partId,label:part.label||part.name||part.sku||piece.partId,scale:part.scale,brand:part.brand,pathIndices});
 }
 // Use the designer's own strict and explicitly accepted tolerance connections.
 const lookup=byId instanceof Map?Object.fromEntries(byId):byId;
 const connectionState=layoutConnections({...project,pieces:validPieces},lookup);
 const tolerated=new Set(connectionState.tolerated.flatMap(c=>[portKey(c.a),portKey(c.b)])),closureRoots=new Set();
 for(const [a,b] of connectionState.pairs){const na=ports.get(portKey(a)),nb=ports.get(portKey(b));if(na===undefined||nb===undefined)continue;join(na,nb);if(tolerated.has(portKey(a)))closureRoots.add(na);}
 const toleratedNodes=new Set([...closureRoots].map(root)),approximateNodes=new Set([...approximateRoots].map(root));
 for(const e of edges){e.a=root(e.a);e.b=root(e.b);nodes[e.a].edges.push(e.id);nodes[e.b].edges.push(e.id);}
 const switches=[];
 for(const n of nodes){
  if(root(n.id)!==n.id||n.edges.length<3)continue;
  // A switch exists only if an arriving train can choose two forward routes.
  const alternatives=new Set();
  for(const incomingId of n.edges){const incoming=edges[incomingId],inPoints=oriented(incoming,incoming.b===n.id),heading=vector(inPoints.at(-2),inPoints.at(-1));
   const candidates=n.edges.filter(id=>id!==incomingId).filter(id=>{const p=oriented(edges[id],edges[id].a===n.id);return dot(heading,vector(p[0],p[1]))>.05;});
   if(candidates.length>1)for(const id of candidates)alternatives.add(id);
  }
  if(alternatives.size<2)continue;
  const opts=[...alternatives].map(id=>edges[id]);
  // Usually all candidates belong to the turnout. The stable piece/path pair
  // also distinguishes imported turnouts made from several short segments.
  const turnoutPiece=opts.find(e=>opts.filter(q=>q.pieceId===e.pieceId).length>1)?.pieceId||opts[0].pieceId;
  const entry={id:n.key,pieceId:turnoutPiece,label:pieces.find(p=>p.id===turnoutPiece)?.label||turnoutPiece,options:opts.map(e=>({pathIndex:e.pathIndex,pieceId:e.pieceId,label:`路径 ${e.pathIndex+1}`,edgeId:e.id}))};
  switches.push(entry);n.switchId=entry.id;n.switchPieceId=turnoutPiece;
 }
 if(connectionState.invalidClosures.length)warnings.push(`${connectionState.invalidClosures.length} 处失效容差闭合已作为断口处理。`);
 return {nodes,edges,pieces,switches,toleratedNodes,approximateNodes,warnings,connectionState};
}

function nextStep(network,step,choices){
 const edge=network.edges[step.edgeId],at=step.forward?edge.b:edge.a,node=network.nodes[at],pts=oriented(edge,step.forward),incoming=vector(pts.at(-2),pts.at(-1));
 let candidates=node.edges.filter(id=>id!==edge.id).map(id=>({edgeId:id,forward:network.edges[id].a===at})).filter(q=>{const p=oriented(network.edges[q.edgeId],q.forward);return dot(incoming,vector(p[0],p[1]))>.05;});
 if(!candidates.length)return null;
 if(candidates.length>1){
  const selected=choices[node.switchId]??choices[node.key]??choices[node.switchPieceId]??choices[node.pieceId];
  const preferred=candidates.find(q=>network.edges[q.edgeId].pathIndex===Number(selected));
  if(preferred)return preferred;
  candidates.sort((a,b)=>network.edges[a.edgeId].pathIndex-network.edges[b.edgeId].pathIndex||a.edgeId-b.edgeId);
 }
 return candidates[0];
}

function walk(network,seed,choices){
 const steps=[seed],seen=new Set([`${seed.edgeId}:${seed.forward}`]);let reason='end',closed=false;
 for(let i=0;i<network.edges.length*2+1;i++){
  const next=nextStep(network,steps.at(-1),choices);if(!next)break;
  if(next.edgeId===seed.edgeId&&next.forward===seed.forward){closed=true;reason='loop';break;}
  const key=`${next.edgeId}:${next.forward}`;
  if(seen.has(key)){reason='branch-cycle';break;}
  seen.add(key);steps.push(next);
 }
 return {steps,closed,reason};
}

export function traceRoute(network,{pieceId,pathIndex=0,reverse=false,switches={}}={}){
 const edge=network.edges.find(e=>e.pieceId===pieceId&&e.pathIndex===Number(pathIndex));
 if(!edge)return {points:[],length:0,closed:false,segments:[],startDistance:0,reason:'missing-track',warnings:['请选择一段可运行的轨道。']};
 const seed={edgeId:edge.id,forward:!reverse},ahead=walk(network,seed,switches);let steps=ahead.steps,reason=ahead.reason;
 if(!ahead.closed){
  const behind=walk(network,{edgeId:edge.id,forward:reverse},switches),used=new Set(ahead.steps.map(q=>q.edgeId));
  const prefix=[];for(const q of behind.steps.slice(1)){if(used.has(q.edgeId)){reason='branch-cycle';break;}prefix.push({edgeId:q.edgeId,forward:!q.forward});used.add(q.edgeId);}
  steps=[...prefix.reverse(),...ahead.steps];if(behind.reason==='branch-cycle')reason='branch-cycle';
 }
 const points=[],segments=[],warnings=[...network.warnings];let total=0,startDistance=0,closureCount=0,approximationCount=0;
 const append=(p,meta)=>{
  if(points.length){const before=points.at(-1),d=distance(before,p);if(d<=EPS)return;segments.push({...meta,start:total,end:total+d,a:before,b:p});total+=d;}
  points.push({...point(p),distance:total});
 };
 for(let i=0;i<steps.length;i++){
  const step=steps[i],e=network.edges[step.edgeId],pts=oriented(e,step.forward),junction=step.forward?e.a:e.b;
  const bridge=network.toleratedNodes.has(junction),approximate=network.approximateNodes.has(junction);if(i&&bridge)closureCount++;if(i&&approximate)approximationCount++;
  append(pts[0],{pieceId:e.pieceId,pathIndex:e.pathIndex,bridge:true,tolerated:bridge,approximate});
  if(e.id===edge.id)startDistance=total+e.length/2;
  for(const p of pts.slice(1))append(p,{pieceId:e.pieceId,pathIndex:e.pathIndex});
 }
 if(ahead.closed&&points.length){const e=network.edges[steps[0].edgeId],junction=steps[0].forward?e.a:e.b,bridge=network.toleratedNodes.has(junction),approximate=network.approximateNodes.has(junction);if(bridge)closureCount++;if(approximate)approximationCount++;append(points[0],{pieceId:e.pieceId,pathIndex:e.pathIndex,bridge:true,tolerated:bridge,approximate});}
 if(closureCount)warnings.push('运行线路包含容差闭合；车辆会跨过已确认的小缝隙，此处为近似模拟。');
 if(approximationCount)warnings.push('导入轨道接口存在 0.6 mm 以内的坐标误差，已按同方向实体路径作近似接续。');
 if(reason==='branch-cycle')warnings.push('当前道岔设置形成不返回发车段的循环，已在重复线路前截断；建议从环线轨道发车。');
 return {points,length:total,closed:ahead.closed,segments,startDistance,reason,warnings,pieceId,pathIndex:Number(pathIndex),reverse,steps};
}

export function sampleRoute(route,distanceAlong){
 if(!route?.segments?.length||route.length<=EPS)return null;
 const d=route.closed?((distanceAlong%route.length)+route.length)%route.length:Math.max(0,Math.min(route.length,distanceAlong));
 let lo=0,hi=route.segments.length-1;
 while(lo<hi){const mid=(lo+hi)>>1;if(route.segments[mid].end<d)lo=mid+1;else hi=mid;}
 const segment=route.segments[lo],t=Math.max(0,Math.min(1,(d-segment.start)/(segment.end-segment.start))),a=segment.a,b=segment.b,tangent=vector(a,b);
 return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,distance:d,tangent,heading:Math.atan2(tangent.y,tangent.x),pitch:Math.atan2(tangent.z,Math.hypot(tangent.x,tangent.y)),pieceId:segment.pieceId,pathIndex:segment.pathIndex};
}

function trainConsist(state){
 const gap=Number(state.couplerGap??state.gap??5);let specs;
 if(!Number.isFinite(gap)||gap<0)return null;
 if(state.carSpecs!==undefined){
  if(!Array.isArray(state.carSpecs)||state.carSpecs.length<1||state.carSpecs.length>32)return null;
  specs=state.carSpecs;
 }else{
  const count=Number(state.carCount??1),length=Number(state.carLength??140);
  if(!Number.isInteger(count)||count<1||count>32)return null;
  specs=Array.from({length:count},()=>({length}));
 }
 const cars=[];let centreOffset=0,total=0;
 for(const spec of specs){
  const length=Number(spec?.length);if(!Number.isFinite(length)||length<=0)return null;
  const offsets=spec.bogieOffsets===undefined?[-length*.32,length*.32]:spec.bogieOffsets;
  if(!Array.isArray(offsets)||offsets.length!==2||!offsets.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=length/2))return null;
  const bogieOffsets=[...offsets].sort((a,b)=>a-b);if(bogieOffsets[1]-bogieOffsets[0]<=EPS)return null;
  // The first car's centre is the state's distance reference. Adjacent centres
  // are separated by their two half-lengths and the same coupler clearance.
  if(cars.length)centreOffset+=cars.at(-1).length/2+gap+length/2;
  cars.push({length,bogieOffsets,centreOffset});total+=length+(cars.length>1?gap:0);
 }
 return {cars,gap,total,frontExtent:cars[0].length/2,rearExtent:centreOffset+cars.at(-1).length/2};
}

function consistBounds(route,consist){
 if(!consist)return {min:0,max:0,length:0,fits:false,reason:'列车尺寸、转向架位置或编组数量无效。'};
 const {total,frontExtent,rearExtent}=consist,fits=!!route&&Number.isFinite(route.length)&&route.length+EPS>=total;
 return {min:route?.closed?0:rearExtent,max:route?.closed?route.length:(route?.length||0)-frontExtent,length:total,fits,reason:fits?'':`当前线路长 ${Math.round(route?.length||0)} mm，短于整列 ${Math.round(total)} mm；请减少车厢或选择更长线路。`};
}

export function trainBounds(route,state){return consistBounds(route,trainConsist(state));}

export function trainPoses(route,state){
 const consist=trainConsist(state),bounds=consistBounds(route,consist);if(!bounds.fits)return [];
 const distanceAlong=Number.isFinite(state.distance)?state.distance:route.startDistance,lead=route.closed?distanceAlong:Math.max(bounds.min,Math.min(bounds.max,distanceAlong));
 return consist.cars.map((car,index)=>{
  const d=lead-car.centreOffset,pose=sampleRoute(route,d),[rearOffset,frontOffset]=car.bogieOffsets,front=sampleRoute(route,d+frontOffset),back=sampleRoute(route,d+rearOffset),tangent=vector(back,front),originFraction=-rearOffset/(frontOffset-rearOffset);
  // The rigid body spans its bogies rather than placing its centre directly on
  // a curved centre line. This moves the body inward on curves and bridges a
  // grade transition smoothly. Arc distance remains the unshifted route value.
  // Cab bogies may be asymmetric. Interpolate (or extrapolate) their chord to
  // the body origin at offset zero, rather than mistaking the axle midpoint for
  // the centre of the vehicle. The reversed tail cab keeps its own offsets.
  return {...pose,index,carLength:car.length,bogieOffsets:[...car.bogieOffsets],x:back.x+(front.x-back.x)*originFraction,y:back.y+(front.y-back.y)*originFraction,z:back.z+(front.z-back.z)*originFraction,tangent,heading:Math.atan2(tangent.y,tangent.x),pitch:Math.atan2(tangent.z,Math.hypot(tangent.x,tangent.y))};
 });
}

export function advanceTrain(route,state,dt){
 const bounds=trainBounds(route,state);if(!bounds.fits)return {...state,stopped:true,fits:false,reason:bounds.reason};
 const direction=state.direction===-1?-1:1,speed=Math.max(0,Number(state.speed)||0),elapsed=Math.max(0,Number(dt)||0),initial=Number.isFinite(state.distance)?state.distance:route.startDistance;
 const current=route.closed?initial:Math.max(bounds.min,Math.min(bounds.max,initial)),next=current+direction*speed*elapsed;
 const d=route.closed?((next%route.length)+route.length)%route.length:Math.max(bounds.min,Math.min(bounds.max,next));
 const stopped=!route.closed&&(direction===1?next>=bounds.max-EPS:next<=bounds.min+EPS);
 return {...state,distance:d,direction,stopped,fits:true,reason:stopped?'列车已到达可运行线路的末端。':''};
}
