const finite=(n,lo,hi)=>typeof n==='number'&&Number.isFinite(n)&&n>=lo&&n<=hi;
export const layerColors=['#366c58','#598db7','#b67c41','#9473b3','#b66571','#4d9698'];
export function validateElevation(raw){
 const out={};
 if(raw.layers!==undefined){
  if(!Array.isArray(raw.layers)||!raw.layers.length||raw.layers.length>32)throw Error('需要 1–32 个楼层');
  const ids=new Set();out.layers=raw.layers.map(l=>{if(!l||typeof l.id!=='string'||!l.id||l.id.length>80||ids.has(l.id)||typeof l.name!=='string'||!l.name.trim()||l.name.length>60||!finite(l.height,-10000,10000)||!/^#[a-f\d]{6}$/i.test(l.color))throw Error('楼层资料无效');ids.add(l.id);return {id:l.id,name:l.name,height:l.height,color:l.color,visible:l.visible!==false};});
  for(const p of raw.pieces)if((p.layerId!==undefined&&!ids.has(p.layerId))||(p.endLayerId!==undefined&&!ids.has(p.endLayerId)))throw Error('零件引用了不存在的楼层');
  for(const p of raw.pieces)if(p.ramp&&(!ids.has(p.ramp.from)||!ids.has(p.ramp.to)||!finite(p.ramp.t0,0,1)||!finite(p.ramp.t1,0,1)))throw Error("坡道楼层关联无效");
  out.activeLayerId=ids.has(raw.activeLayerId)?raw.activeLayerId:out.layers[0].id;
 }else if(raw.pieces.some(p=>p.layerId!==undefined||p.endLayerId!==undefined||p.ramp!==undefined))throw Error('方案缺少楼层定义');
 if(raw.terrain!==undefined){
  if(!Array.isArray(raw.terrain)||raw.terrain.length>100)throw Error('地形区域不能超过 100 个');const ids=new Set();
  out.terrain=raw.terrain.map(t=>{if(!t||typeof t.id!=='string'||!t.id||t.id.length>80||ids.has(t.id)||typeof t.name!=='string'||t.name.length>60||!['hill','plateau','valley'].includes(t.type)||!finite(t.x,0,raw.board.width)||!finite(t.y,0,raw.board.height)||!finite(t.rx,10,50000)||!finite(t.ry,10,50000)||!finite(t.height,-1000,3000)||(t.type==='valley'?t.height>0:t.height<0))throw Error('地形资料无效');ids.add(t.id);return {id:t.id,name:t.name,type:t.type,x:t.x,y:t.y,rx:t.rx,ry:t.ry,height:t.height};});
 }
 if(raw.designLimits!==undefined){if(!raw.designLimits||!finite(raw.designLimits.maxGrade,.1,20)||!finite(raw.designLimits.clearance,1,1000))throw Error('坡度或净空阈值无效');out.designLimits={maxGrade:raw.designLimits.maxGrade,clearance:raw.designLimits.clearance};}
 return out;
}
export function ensureLevels(project){
 if(!project.layers){const heights=[...new Set(project.pieces.map(p=>p.z||0))].sort((a,b)=>a-b);if(!heights.includes(0))heights.unshift(0);const chosen=heights.slice(0,32);project.layers=chosen.map((h,i)=>({id:'level-'+i,name:h===0?'地面层':`高度 ${h} mm`,height:h,color:layerColors[i%layerColors.length],visible:true}));}
 for(const p of project.pieces)if(!project.layers.some(l=>l.id===p.layerId))p.layerId=[...project.layers].sort((a,b)=>Math.abs(a.height-(p.z||0))-Math.abs(b.height-(p.z||0)))[0].id;
 if(!project.layers.some(l=>l.id===project.activeLayerId))project.activeLayerId=project.layers[0].id;
 project.terrain??=[];project.designLimits??={maxGrade:3,clearance:50};return project;
}
export function shiftLayer(project,id,height){
 const l=project.layers.find(l=>l.id===id);if(!l||!finite(height,-10000,10000))throw Error('楼层高度无效');const delta=height-l.height;l.height=height;
 for(const p of project.pieces){if(p.ramp){const a=project.layers.find(l=>l.id===p.ramp.from).height,b=project.layers.find(l=>l.id===p.ramp.to).height;p.z=a+(b-a)*p.ramp.t0;p.zEnd=a+(b-a)*p.ramp.t1;continue;}const old=p.z||0;if(p.layerId===id){p.z=old+delta;if(!p.endLayerId)p.zEnd=(p.zEnd??old)+delta;}if(p.endLayerId===id)p.zEnd=(p.zEnd??old)+delta;}
}
export function terrainHeight(terrain,x,y){return terrain.reduce((z,t)=>{const r=Math.hypot((x-t.x)/t.rx,(y-t.y)/t.ry);if(r>=1)return z;const f=t.type==='plateau'?Math.max(0,Math.min(1,(1-r)/.25)):Math.pow(1-r*r,2);return z+t.height*f;},0);}

// Slope planes are stored in piece-local millimetres, so rigid moves and mirrors
// preserve each rail's height. z/zEnd are the plane's A/B reference elevations.
export function pieceElevation(piece,point,fraction=0){
 const s=piece.slope,t=s?s.a*point.x+s.b*point.y+s.c:fraction;
 return (piece.z||0)+((piece.zEnd??piece.z??0)-(piece.z||0))*t;
}
export function validateSlope(piece,g){
 if(piece.slope===undefined)return;
 const s=piece.slope;if(!s||!['a','b','c'].every(k=>finite(s[k],-1e6,1e6)))throw Error('坡面参数无效');
 for(const point of [...g.paths.flatMap(p=>p.points),...g.endpoints])if(!finite(pieceElevation(piece,point),-10000.00001,10000.00001))throw Error('坡面轨道高度超出范围');
}

export function worldSlopeGradient(piece){
 if(!piece.slope)return {x:0,y:0};const angle=(piece.angle||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),f=piece.flip||1,rise=(piece.zEnd??piece.z??0)-(piece.z||0);
 return {x:rise*(piece.slope.a*c-piece.slope.b*f*s),y:rise*(piece.slope.a*s+piece.slope.b*f*c)};
}

// One ramp instance is shared by both its source and destination layers.
export function pieceLayerIds(piece){return [...new Set([piece.layerId,piece.endLayerId,piece.ramp?.from,piece.ramp?.to].filter(Boolean))];}
export function belongsToLayer(piece,id){return !!piece&&pieceLayerIds(piece).includes(id);}
export function layerVisible(piece,layers){const ids=pieceLayerIds(piece);return !ids.length||ids.some(id=>layers?.find(l=>l.id===id)?.visible!==false);}
