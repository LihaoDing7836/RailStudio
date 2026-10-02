export function validateClosureRecords(raw,byId,geometry){
 if(raw.closures===undefined)return {};
 if(!Array.isArray(raw.closures)||raw.closures.length>500)throw Error('容差闭合记录不能超过 500 条');
 const pieces=new Map(raw.pieces.map(p=>[p.id,p])),ids=new Set(),ports=new Set();
 const closures=raw.closures.map(r=>{if(!r||typeof r.id!=='string'||!r.id||r.id.length>100||ids.has(r.id))throw Error('容差闭合记录编号无效');ids.add(r.id);const copy={id:r.id};
 for(const k of ['a','b']){const e=r[k],p=pieces.get(e?.pieceId);if(!p||!Number.isInteger(e.index)||e.index<0||e.index>=geometry(byId[p.partId],p).endpoints.length)throw Error('容差闭合引用了无效端点');const key=JSON.stringify([e.pieceId,e.index]);if(ports.has(key))throw Error('同一端点不能重复容差闭合');ports.add(key);copy[k]={pieceId:e.pieceId,index:e.index};}return copy;});
 return {closures};
}
