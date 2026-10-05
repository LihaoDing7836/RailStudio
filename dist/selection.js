import {layoutConnections} from './closures.js?v=c5604777f33f6308';
import {bounds,connections,compatible,norm,rad} from './geometry.js?v=c5604777f33f6308';

export function selectionCenter(pieces,byId){const b=bounds(pieces,byId);return b?{x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2}:null;}
export function rotatePieces(pieces,center,degrees){
 const c=Math.cos(rad(degrees)),s=Math.sin(rad(degrees));
 return pieces.map(p=>{const x=p.x-center.x,y=p.y-center.y;return {...p,x:center.x+x*c-y*s,y:center.y+x*s+y*c,angle:norm(p.angle+degrees)};});
}
// Snap only exposed group endpoints, applying one rigid transform to all tracks.
export function snapGroup(pieces,byId,targets,threshold,options={}){
 let best=null;const ids=new Set(pieces.map(p=>p.id));
 for(const source of (options.closures?layoutConnections({pieces,closures:options.closures},byId):connections(pieces,byId)).open)for(const target of targets){
  if(ids.has(target.pieceId)||!compatible(source,target))continue;
  const distance=Math.hypot(source.x-target.x,source.y-target.y);
  if(distance<threshold&&(!best||distance<best.distance))best={source,target,distance};
 }
 if(!best)return null;
 const {source,target}=best,delta=norm(target.angle+180-source.angle),dz=(target.z||0)-(source.z||0);
 return rotatePieces(pieces,source,delta).map(p=>({...p,x:p.x+target.x-source.x,y:p.y+target.y-source.y,z:(p.z||0)+dz,zEnd:(p.zEnd??p.z??0)+dz}));
}
// World-space bounds keep selection independent of zoom and drag direction.
export function selectionRect(start,end){
 return {minX:Math.min(start.x,end.x),minY:Math.min(start.y,end.y),maxX:Math.max(start.x,end.x),maxY:Math.max(start.y,end.y)};
}
export function boxedSelection(items,start,end,previous=[]){
 const r=selectionRect(start,end),ids=new Set(previous),epsilon=1e-7;
 for(const {id,bounds:b} of items){
  if(b&&b.minX>=r.minX-epsilon&&b.minY>=r.minY-epsilon&&b.maxX<=r.maxX+epsilon&&b.maxY<=r.maxY+epsilon)ids.add(id);
 }
 return ids;
}
