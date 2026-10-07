// An in-page clipboard works on HTTP deployments without clipboard permissions.
export function copySelection(project,ids){const selected=new Set(ids);return {pieces:structuredClone(project.pieces.filter(p=>selected.has(p.id))),closures:structuredClone((project.closures||[]).filter(c=>selected.has(c.a.pieceId)&&selected.has(c.b.pieceId)))};}
export function pasteSelection(clip,project,uid,offset=30){
 if(!clip?.pieces.length)return {pieces:[],closures:[]};
 if(project.pieces.length+clip.pieces.length>5000)throw Error('单个方案最多 5000 个零件');
 const layers=new Set((project.layers||[]).map(l=>l.id)),active=project.layers?.find(l=>l.id===project.activeLayerId),ids=new Map(clip.pieces.map(p=>[p.id,uid()]));
 const pieces=structuredClone(clip.pieces).map(p=>{p.id=ids.get(p.id);p.x+=offset;p.y+=offset;if(p.layerId&&!layers.has(p.layerId)){p.layerId=active?.id;delete p.ramp;}if(p.endLayerId&&!layers.has(p.endLayerId))delete p.endLayerId;if(p.ramp&&(!layers.has(p.ramp.from)||!layers.has(p.ramp.to)))delete p.ramp;return p;});
 const closures=structuredClone(clip.closures||[]).map(c=>({...c,id:uid(),a:{...c.a,pieceId:ids.get(c.a.pieceId)},b:{...c.b,pieceId:ids.get(c.b.pieceId)}}));return {pieces,closures};
}
